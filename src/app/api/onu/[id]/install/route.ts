import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const installSchema = z.object({
  customerId: z.string().optional(),
  photoUrl: z.string().url().optional(),
  manualOverride: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser(["STAFF", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = installSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const onu = await prisma.onu.findUnique({ where: { id } });
  if (!onu) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let customerIdText: string | undefined;
  if (parsed.data.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: parsed.data.customerId },
      select: { customerId: true },
    });
    customerIdText = customer?.customerId;
  }

  const [installation] = await prisma.$transaction([
    prisma.installation.create({
      data: {
        onuId: id,
        staffId: user.id,
        customerId: parsed.data.customerId,
        customerIdText,
        photoUrl: parsed.data.photoUrl,
        manualOverride: parsed.data.manualOverride,
        notes: parsed.data.notes,
      },
    }),
    prisma.onu.update({
      where: { id },
      data: { status: "INSTALLED", assignedToId: user.id },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ONU_INSTALLED",
        entityType: "Onu",
        entityId: id,
        details: `Installed by ${user.name ?? user.id}`,
      },
    }),
  ]);

  return NextResponse.json(installation, { status: 201 });
}
