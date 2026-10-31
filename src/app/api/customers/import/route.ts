import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { parseCsv } from "@/lib/csv";

type Row = Record<string, string>;

// Accepts common header variants (any case, spaces/underscores/hyphens
// ignored) and maps them to our fields.
const HEADER_ALIASES: Record<string, keyof typeof FIELD_KEYS> = {
  customerid: "customerId",
  custid: "customerId",
  accountid: "customerId",
  accountnumber: "customerId",
  account: "customerId",
  id: "customerId",
  name: "name",
  customername: "name",
  fullname: "name",
  phone: "phone",
  mobile: "phone",
  contact: "phone",
  phonenumber: "phone",
  address: "address",
  location: "address",
  email: "email",
  emailaddress: "email",
  notes: "notes",
  note: "notes",
  remarks: "notes",
};

const FIELD_KEYS = {
  customerId: true,
  name: true,
  phone: true,
  address: true,
  email: true,
  notes: true,
} as const;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function rowsFromCsv(text: string): Row[] {
  const table = parseCsv(text);
  if (table.length === 0) return [];
  const headers = table[0].map(normalizeHeader);
  return table.slice(1).map((cells) => {
    const row: Row = {};
    headers.forEach((h, i) => {
      const field = HEADER_ALIASES[h];
      if (field && cells[i] !== undefined) row[field] = cells[i].trim();
    });
    return row;
  });
}

function rowsFromJson(text: string): Row[] {
  const parsed = JSON.parse(text);
  const records: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.customers)
      ? parsed.customers
      : [parsed];

  return records.map((rec) => {
    const row: Row = {};
    if (rec && typeof rec === "object") {
      for (const [key, value] of Object.entries(rec as Record<string, unknown>)) {
        const field = HEADER_ALIASES[normalizeHeader(key)];
        if (field && value != null) row[field] = String(value).trim();
      }
    }
    return row;
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

  let rows: Row[];
  try {
    if (name.endsWith(".json")) {
      rows = rowsFromJson(text);
    } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
      rows = rowsFromCsv(text);
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
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const customerId = row.customerId || undefined;
    const customerName = row.name || undefined;

    if (!customerId && !customerName) {
      skipped++;
      errors.push({ row: i + 2, message: "No Customer ID or name — skipped." });
      continue;
    }

    const data = {
      customerId,
      name: customerName,
      phone: row.phone || undefined,
      address: row.address || undefined,
      email: row.email || undefined,
      notes: row.notes || undefined,
    };

    try {
      if (customerId) {
        const existing = await prisma.customer.findUnique({
          where: { customerId },
        });
        if (existing) {
          await prisma.customer.update({ where: { customerId }, data });
          updated++;
        } else {
          await prisma.customer.create({ data });
          created++;
        }
      } else {
        await prisma.customer.create({ data });
        created++;
      }
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
      details: `Imported ${file.name}: ${created} created, ${updated} updated, ${skipped} skipped`,
    },
  });

  return NextResponse.json({
    total: rows.length,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 20),
  });
}
