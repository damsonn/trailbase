import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authClient } from "../lib/auth-client.js";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-neutral-900">
          Invalid link
        </h1>
        <p className="text-sm text-neutral-500">
          This password reset link is invalid or has expired.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await authClient.resetPassword(
      { newPassword, token },
      {
        onSuccess: () => setDone(true),
        onError: (ctx) => {
          setError(ctx.error.message ?? "Reset failed");
        },
      },
    );

    setLoading(false);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-neutral-900">
          Password updated
        </h1>
        <p className="text-sm text-neutral-500">
          Your password has been reset. You can now log in with your new
          password.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-button bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-8 text-center text-2xl font-bold text-neutral-900">
        Set new password
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-button bg-error/10 px-4 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-800">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-button border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-neutral-500">At least 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
