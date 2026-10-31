import { auth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import ActivityLogPage from "@/components/office/ActivityLogPage";

export default async function OfficeActivityPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <NavBar
        portal="office"
        title="Activity Log"
        userName={session?.user?.name}
      />
      <ActivityLogPage />
    </div>
  );
}
