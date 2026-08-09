import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleHome } from "../utils/roleHome";
import { VitalLine } from "../components/VitalLine";
import type { UserRole } from "../types/user";

const roleLabels: Record<UserRole, string> = {
  patient: "Patient",
  doctor: "Médecin",
  admin: "Administrateur",
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("patient");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    try {
      const me = await register(
        fullName,
        email,
        password,
        role
      );

      navigate(roleHome(me.role));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          "Impossible de créer le compte."
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
            Créer un compte
          </h1>

          <p className="mt-2 text-sm text-ink-soft">
            Rejoignez la plateforme de soins numérique.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-8 shadow-sm"
        >

          <div className="space-y-5">

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Nom et prénom
              </span>

              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                E-mail
              </span>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Mot de passe
              </span>

              <input
                type="password"
                value={password}
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Rôle
              </span>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-pine"
              >
                {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                  <option
                    key={r}
                    value={r}
                  >
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
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
              {loading ? "Création..." : "Créer mon compte"}
            </button>

          </div>

        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Déjà inscrit ?{" "}
          <Link
            to="/login"
            className="font-medium text-pine hover:text-pine-dark"
          >
            Se connecter
          </Link>
        </p>

      </div>

    </div>
  );
}