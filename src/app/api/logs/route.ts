import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

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
    },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: entityId ? undefined : 200,
  });

  return NextResponse.json(logs);
}
