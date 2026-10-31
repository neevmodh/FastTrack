import { auth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import StaffDashboard from "@/components/staff/StaffDashboard";

export default async function StaffPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <NavBar title="Staff" userName={session?.user?.name} />
      <StaffDashboard currentUserId={session?.user?.id ?? ""} />
    </div>
  );
}
