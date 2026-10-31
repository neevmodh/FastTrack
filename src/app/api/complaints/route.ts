import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const createSchema = z.object({
  onuId: z.string().min(1),
  description: z.string().min(1),
});

export async function GET() {
  const { error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const complaints = await prisma.complaint.findMany({
    include: {
      onu: { select: { id: true, companyName: true, macAddress: true } },
      reportedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(complaints);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const complaint = await prisma.complaint.create({
    data: {
      ...parsed.data,
      reportedById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "COMPLAINT_CREATED",
      entityType: "Complaint",
      entityId: complaint.id,
    },
  });

  return NextResponse.json(complaint, { status: 201 });
}
