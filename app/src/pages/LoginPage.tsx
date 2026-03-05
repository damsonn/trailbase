import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../lib/auth-client.js";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email(
      { email, password },
      {
        onError: (ctx) => {
          setError(ctx.error.message ?? "Login failed");
        },
      },
    );

    setLoading(false);
    if (result.data) {
      navigate("/");
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-8 text-center text-2xl font-bold text-neutral-900">
        Log in
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-button bg-error/10 px-4 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-800">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-button border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-800">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-button border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm">
        <p>
          <Link to="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="text-neutral-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
