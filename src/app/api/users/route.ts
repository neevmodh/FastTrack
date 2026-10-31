import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["STAFF", "OFFICE", "ADMIN"]),
  assignedIp: z.string().optional(),
});

export async function GET() {
  const { error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const users = await prisma.user.findMany({
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      role: parsed.data.role,
      assignedIp: parsed.data.assignedIp,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: created.id,
      details: `Created ${created.role} user ${created.email}`,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
