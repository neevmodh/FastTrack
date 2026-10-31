import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "STAFF" | "OFFICE" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role: "STAFF" | "OFFICE" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "STAFF" | "OFFICE" | "ADMIN";
  }
}
