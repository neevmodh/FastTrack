import { auth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import OfficeDashboard from "@/components/office/OfficeDashboard";

export default async function OfficePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <NavBar
        portal="office"
        title="Office Dashboard"
        userName={session?.user?.name}
      />
      <OfficeDashboard isAdmin={session?.user?.role === "ADMIN"} />
    </div>
  );
}
