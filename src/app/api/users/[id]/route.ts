import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter =
    from || to
      ? {
          installedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            // include the whole "to" day
            ...(to ? { lt: new Date(new Date(to).getTime() + 86400000) } : {}),
          },
        }
      : {};

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      assignedIp: true,
      createdAt: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [installations, currentlyAssigned, complaints, addedOnus] =
    await Promise.all([
      prisma.installation.findMany({
        where: { staffId: id, ...dateFilter },
        include: {
          onu: {
            select: {
              id: true,
              companyName: true,
              macAddress: true,
              model: true,
              serialNumber: true,
            },
          },
        },
        orderBy: { installedAt: "desc" },
      }),
      prisma.onu.findMany({
        where: { assignedToId: id, status: { not: "INSTALLED" } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.complaint.findMany({
        where: { reportedById: id },
        include: {
          onu: { select: { id: true, companyName: true, macAddress: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.onu.count({ where: { addedById: id } }),
    ]);

  return NextResponse.json({
    user: target,
    installations,
    currentlyAssigned,
    complaints,
    addedOnusCount: addedOnus,
  });
}

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json(
      { error: "You can't delete your own account." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "This user has installation or complaint history and can't be deleted — deactivate them instead to preserve those records.",
        },
        { status: 409 }
      );
    }
    throw err;
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_DELETED",
      entityType: "User",
      entityId: id,
      details: `Deleted ${target.name} (${target.email})`,
    },
  });

  return NextResponse.json({ ok: true });
}
