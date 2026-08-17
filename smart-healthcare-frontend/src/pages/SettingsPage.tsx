import { useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as authService from "../services/authService";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-all focus:border-pine focus:ring-2 focus:ring-pine/10";

const labelClass = "text-xs font-medium uppercase tracking-wide text-ink-soft";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await authService.updateProfile({ full_name: fullName, phone });
      await refreshUser();
      setProfileMessage("Profil mis à jour.");
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      setProfileError(typeof apiMessage === "string" ? apiMessage : "Impossible de mettre à jour le profil.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMessage("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      setPasswordError(typeof apiMessage === "string" ? apiMessage : "Impossible de changer le mot de passe.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">Compte</span>
        <h1 className="font-display text-4xl text-pine">Paramètres</h1>
      </div>

      <div className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-6 shadow-sm">
        <h2 className="font-display text-lg text-pine">Profil</h2>
        <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className={labelClass}>Nom complet</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Téléphone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+212 6XX XXX XXX"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>E-mail</span>
            <input value={user?.email ?? ""} disabled className={`${fieldClass} opacity-60`} />
          </label>

          {profileError && <p className="text-sm text-risk-high">{profileError}</p>}
          {profileMessage && <p className="text-sm text-risk-low">{profileMessage}</p>}

          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-60"
          >
            {profileSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-sand-dark/60 bg-paper-raised p-6 shadow-sm">
        <h2 className="font-display text-lg text-pine">Mot de passe</h2>
        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className={labelClass}>Mot de passe actuel</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Nouveau mot de passe</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Confirmer le nouveau mot de passe</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              className={fieldClass}
            />
          </label>

          {passwordError && <p className="text-sm text-risk-high">{passwordError}</p>}
          {passwordMessage && <p className="text-sm text-risk-low">{passwordMessage}</p>}

          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-60"
          >
            {passwordSaving ? "Enregistrement..." : "Changer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}