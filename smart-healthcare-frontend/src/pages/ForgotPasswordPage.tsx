import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as authService from "../services/authService";
import { VitalLine } from "../components/VitalLine";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res.message);
    } catch {
      setMessage("Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-6">
      <VitalLine
        className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-[140%] -translate-x-1/2 -translate-y-1/2 text-sage-light"
        strokeWidth={1.5}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <VitalLine className="mx-auto mb-4 h-6 w-14 text-brass" strokeWidth={2.5} />
          <h1 className="font-display text-3xl text-pine">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        <div className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-8 shadow-sm">
          {message ? (
            <p className="text-sm text-ink">{message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-pine px-4 py-2.5 font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-60"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-ink-soft hover:text-pine">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}