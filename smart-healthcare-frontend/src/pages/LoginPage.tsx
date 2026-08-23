import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleHome } from "../utils/roleHome";
import { VitalLine } from "../components/VitalLine";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const me = await login(email, password);

      navigate(roleHome(me.role));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          "Incorrect email address or password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">

      <div className="relative w-full max-w-sm">

        <div className="mb-8 text-center">
          <VitalLine
            className="mx-auto mb-4 h-6 w-14 text-brass"
            strokeWidth={2.5}
          />

          <h1 className="font-display text-3xl text-pine">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-ink-soft">
            Access your digital clinical space.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-8 shadow-sm"
        >

          <div className="space-y-5">

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Password
              </span>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-risk-high/10 px-3 py-2 text-sm text-risk-high">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pine px-4 py-2.5 font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </div>

        </form>

        <div className="mt-6 flex justify-between text-sm">

          <Link
            to="/forgot-password"
            className="text-ink-soft hover:text-pine"
          >
            Forgot password?
          </Link>

          <Link
            to="/register"
            className="font-medium text-pine hover:text-pine-dark"
          >
            Create account →
          </Link>

        </div>

      </div>

    </div>
  );
}