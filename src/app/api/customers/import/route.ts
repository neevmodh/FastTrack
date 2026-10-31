import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { parseCsv } from "@/lib/csv";

// Accepts common header variants (any case, spaces/underscores/hyphens
// ignored) that all mean "the customer ID" — a Customer has no other field.
const CUSTOMER_ID_HEADERS = new Set([
  "customerid",
  "custid",
  "accountid",
  "accountnumber",
  "account",
  "id",
]);

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function idsFromCsv(text: string): string[] {
  const table = parseCsv(text);
  if (table.length === 0) return [];
  const headers = table[0].map(normalizeHeader);
  const col = headers.findIndex((h) => CUSTOMER_ID_HEADERS.has(h));
  if (col === -1) return [];
  return table.slice(1).map((cells) => (cells[col] ?? "").trim());
}

function idsFromJson(text: string): string[] {
  const parsed = JSON.parse(text);
  const records: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.customers)
      ? parsed.customers
      : [parsed];

  return records.map((rec) => {
    if (rec && typeof rec === "object") {
      for (const [key, value] of Object.entries(rec as Record<string, unknown>)) {
        if (CUSTOMER_ID_HEADERS.has(normalizeHeader(key)) && value != null) {
          return String(value).trim();
        }
      }
    }
    // A bare array of strings (["karam", "priya", ...]) is also accepted.
    return typeof rec === "string" ? rec.trim() : "";
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const text = await file.text();

  let ids: string[];
  try {
    if (name.endsWith(".json")) {
      ids = idsFromJson(text);
    } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
      ids = idsFromCsv(text);
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Export as CSV or JSON (Excel: File → Save As → CSV) and upload that.",
        },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not parse that file — check it's valid CSV/JSON." },
      { status: 400 }
    );
  }

  let created = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < ids.length; i++) {
    const customerId = ids[i];
    if (!customerId) {
      skipped++;
      errors.push({ row: i + 2, message: "No Customer ID — skipped." });
      continue;
    }

    try {
      const existing = await prisma.customer.findUnique({ where: { customerId } });
      if (existing) {
        skipped++;
        errors.push({ row: i + 2, message: "Already exists — skipped." });
        continue;
      }
      await prisma.customer.create({ data: { customerId } });
      created++;
    } catch (err) {
      skipped++;
      const message =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
          ? "Duplicate Customer ID."
          : "Failed to save this row.";
      errors.push({ row: i + 2, message });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CUSTOMERS_IMPORTED",
      entityType: "Customer",
      details: `Imported ${file.name}: ${created} created, ${skipped} skipped`,
    },
  });

  return NextResponse.json({
    total: ids.length,
    created,
    updated: 0,
    skipped,
    errors: errors.slice(0, 20),
  });
}
