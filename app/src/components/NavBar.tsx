import { Link } from "react-router-dom";
import { useSession, signOut } from "../lib/auth-client.js";

export function NavBar() {
  const { data: session, isPending } = useSession();

  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">
          Trail base
        </Link>

        <nav className="flex items-center gap-4">
          {isPending ? null : session ? (
            <>
              <span className="text-sm text-neutral-500">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-button bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-200"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-neutral-800 hover:text-primary"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-button bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-light"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
