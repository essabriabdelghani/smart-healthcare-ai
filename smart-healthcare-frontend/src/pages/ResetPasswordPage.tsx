import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as authService from "../services/authService";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This reset link is invalid or incomplete.");
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "This link may have expired. Request a new one."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-pine">New password</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Choose a new password for your account.
          </p>
        </div>

        <div className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-8 shadow-sm">
          {success ? (
            <div className="text-center">
              <p className="text-sm font-medium text-risk-low">
                Password reset successfully.
              </p>
              <p className="mt-2 text-sm text-ink-soft">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  New password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={!token}
                  className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Confirm password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={!token}
                  className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine disabled:opacity-60"
                />
              </label>

              {error && (
                <p className="rounded-lg bg-risk-high/10 px-3 py-2 text-sm text-risk-high">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-lg bg-pine px-4 py-2.5 font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-60"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-ink-soft hover:text-pine">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}