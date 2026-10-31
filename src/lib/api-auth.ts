import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

type Role = "STAFF" | "OFFICE" | "ADMIN";

export async function requireUser(allowed: Role[]) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!allowed.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}
