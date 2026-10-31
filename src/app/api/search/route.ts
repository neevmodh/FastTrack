import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ onus: [], customers: [], users: [] });

  const [onus, customers, users] = await Promise.all([
    prisma.onu.findMany({
      where: {
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { macAddress: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { ponSerial: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, companyName: true, macAddress: true, status: true },
      take: 5,
    }),
    prisma.customer.findMany({
      where: { customerId: { contains: q, mode: "insensitive" } },
      select: { id: true, customerId: true },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, role: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ onus, customers, users });
}
