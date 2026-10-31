import { auth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import OnuDetail from "@/components/office/OnuDetail";

export default async function OnuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <NavBar
        portal="office"
        title="Office Dashboard"
        userName={session?.user?.name}
      />
      <OnuDetail onuId={id} />
    </div>
  );
}
