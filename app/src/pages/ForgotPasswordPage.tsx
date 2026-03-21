import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authClient } from "../lib/auth-client.js";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await authClient.requestPasswordReset(
      { email, redirectTo: "/reset-password" },
      {
        onSuccess: () => setSent(true),
        onError: (ctx: { error: { message?: string } }) => {
          setError(ctx.error.message ?? "Something went wrong");
        },
      },
    );

    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-neutral-900">
          Check your email
        </h1>
        <p className="text-sm text-neutral-500">
          If an account exists for <strong>{email}</strong>, we've sent a
          password reset link.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <div className="mb-2 flex flex-col items-center gap-3">
        <img src="/logo-icon.svg" alt="Trail base" className="h-16 w-16" />
        <h1 className="text-2xl font-bold text-neutral-900">Reset password</h1>
      </div>
      <p className="mb-8 text-center text-sm text-neutral-500">
        Enter your email and we'll send you a reset link.
      </p>

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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link to="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
