import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const replaceSchema = z.object({
  newOnuId: z.string().min(1, "Select a replacement ONU."),
  reason: z.enum(["FAULTY", "RETURNED"]),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const { id: oldOnuId } = await params;
  const body = await req.json();
  const parsed = replaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { newOnuId, reason, notes } = parsed.data;

  if (newOnuId === oldOnuId) {
    return NextResponse.json(
      { error: "Replacement ONU must be a different unit." },
      { status: 400 }
    );
  }

  const oldOnu = await prisma.onu.findUnique({
    where: { id: oldOnuId },
    include: { installation: true },
  });
  if (!oldOnu) return NextResponse.json({ error: "ONU not found." }, { status: 404 });
  if (!oldOnu.installation) {
    return NextResponse.json(
      { error: "This ONU has no active installation to replace." },
      { status: 400 }
    );
  }
  if (oldOnu.status !== "INSTALLED") {
    return NextResponse.json(
      { error: "Only an installed ONU can be replaced." },
      { status: 400 }
    );
  }

  const newOnu = await prisma.onu.findUnique({ where: { id: newOnuId } });
  if (!newOnu) return NextResponse.json({ error: "Replacement ONU not found." }, { status: 404 });
  if (newOnu.status !== "IN_STOCK") {
    return NextResponse.json(
      { error: "Replacement ONU must be in stock." },
      { status: 400 }
    );
  }

  const oldInstallation = oldOnu.installation;

  const [newInstallation] = await prisma.$transaction([
    prisma.installation.create({
      data: {
        onuId: newOnuId,
        staffId: user.id,
        customerId: oldInstallation.customerId,
        customerIdText: oldInstallation.customerIdText,
        manualOverride: true,
        notes: notes || `Replacement for ${oldOnu.companyName} (${oldOnu.macAddress})`,
        replacesId: oldInstallation.id,
      },
    }),
    prisma.onu.update({
      where: { id: newOnuId },
      data: { status: "INSTALLED", assignedToId: user.id },
    }),
    prisma.onu.update({
      where: { id: oldOnuId },
      data: { status: reason, assignedToId: null },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ONU_REPLACED",
        entityType: "Onu",
        entityId: oldOnuId,
        details: JSON.stringify({
          reason,
          oldMac: oldOnu.macAddress,
          newMac: newOnu.macAddress,
          newOnuId,
          customerIdText: oldInstallation.customerIdText,
        }),
      },
    }),
  ]);

  return NextResponse.json(newInstallation, { status: 201 });
}
