import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["STAFF", "OFFICE", "ADMIN"]).optional(),
  active: z.boolean().optional(),
  assignedIp: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, active: true, assignedIp: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: id,
      details: JSON.stringify(parsed.data),
    },
  });

  return NextResponse.json(updated);
}
