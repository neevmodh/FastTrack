import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const isStaffArea = pathname.startsWith("/staff");
  const isOfficeArea = pathname.startsWith("/office");

  if ((isStaffArea || isOfficeArea) && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isStaffArea && user && user.role !== "STAFF" && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/office", req.url));
  }

  if (
    isOfficeArea &&
    user &&
    user.role !== "OFFICE" &&
    user.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/staff", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/staff/:path*", "/office/:path*"],
};
