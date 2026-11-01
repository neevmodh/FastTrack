import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Must be a valid date.");

const querySchema = z.object({
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(200).optional(),
  action: z.string().max(100).optional(),
  userId: z.string().max(200).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { entityType, entityId, action, userId, from, to } = parsed.data;

  // The full unfiltered activity log is office/admin only; a single
  // entity's timeline (e.g. one ONU's history) is fine for staff to see.
  const { error } = await requireUser(
    entityId ? ["STAFF", "OFFICE", "ADMIN"] : ["OFFICE", "ADMIN"]
  );
  if (error) return error;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lt: new Date(new Date(to).getTime() + 86400000) } : {}),
            },
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: entityId ? undefined : 500,
  });

  return NextResponse.json(logs);
}
