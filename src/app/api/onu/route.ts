import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const createSchema = z.object({
  companyName: z.string().min(1),
  macAddress: z.string().min(1),
  serialNumber: z.string().optional(),
  ponSerial: z.string().optional(),
  model: z.string().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const getQuerySchema = z.object({
  status: z.enum(["IN_STOCK", "ASSIGNED", "INSTALLED", "FAULTY", "RETURNED"]).optional(),
  q: z.string().trim().max(200).optional(),
});

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const parsedQuery = getQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }
  const { status, q } = parsedQuery.data;

  const onus = await prisma.onu.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(user.role === "STAFF"
        ? { OR: [{ assignedToId: user.id }, { status: "IN_STOCK" }] }
        : {}),
      ...(q
        ? {
            OR: [
              { companyName: { contains: q, mode: "insensitive" } },
              { macAddress: { contains: q, mode: "insensitive" } },
              { serialNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      addedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      installation: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(onus);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.onu.findUnique({
    where: { macAddress: parsed.data.macAddress },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An ONU with this MAC address already exists." },
      { status: 409 }
    );
  }

  const onu = await prisma.onu.create({
    data: {
      ...parsed.data,
      addedById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ONU_STOCK_ADDED",
      entityType: "Onu",
      entityId: onu.id,
      details: `Added ${onu.companyName} (${onu.macAddress}) to stock`,
    },
  });

  return NextResponse.json(onu, { status: 201 });
}
