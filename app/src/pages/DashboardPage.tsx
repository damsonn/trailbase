import { useSession } from "../lib/auth-client.js";

export function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h2 className="mb-4 text-xl font-bold text-neutral-900">
        Welcome{session?.user.name ? `, ${session.user.name}` : ""}
      </h2>
      <p className="text-neutral-500">
        Your routes will appear here.
      </p>
    </div>
  );
}
