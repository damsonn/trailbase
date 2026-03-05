import { Navigate } from "react-router-dom";
import { useSession } from "../lib/auth-client.js";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
