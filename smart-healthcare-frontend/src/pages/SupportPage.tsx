import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const faqs = [
  {
    q: "Comment ajuster le score de risque calculé par l'IA ?",
    a: "Ouvrez la fiche du patient (Patients → Voir), puis dans la section « Revue clinique », cliquez sur « Ajuster le score ». Votre ajustement est enregistré et apparaît dans le journal d'audit d'Administration.",
  },
  {
    q: "Pourquoi je ne peux pas ajouter de patient ou de rendez-vous en tant qu'admin ?",
    a: "Ces actions sont réservées aux comptes médecin, pour garder une traçabilité claire de qui prend en charge chaque patient. L'administrateur garde un accès en lecture à l'ensemble des patients, rendez-vous et au journal d'audit.",
  },
  {
    q: "Comment un patient rejoint-il ma clinique ?",
    a: "À l'inscription, le patient indique le nom exact de la clinique. S'il correspond à une clinique existante, il la rejoint automatiquement ; sinon une nouvelle clinique est créée.",
  },
  {
    q: "Que faire si un compte doit être désactivé ?",
    a: "Depuis Administration, cliquez sur « Désactiver » à côté de l'utilisateur concerné. L'accès est coupé immédiatement, même si la personne est déjà connectée.",
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const subject = encodeURIComponent("Support — Clinique Numérique");
  const body = encodeURIComponent(
    `Bonjour,\n\nJe suis ${user?.full_name ?? ""} (${user?.role ?? ""}), compte ${user?.email ?? ""}.\n\nDécrivez votre problème ici :\n`
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">Aide</span>
        <h1 className="font-display text-4xl text-pine">Support</h1>
        <p className="mt-2 text-ink-soft">Questions fréquentes et contact direct.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm">
        {faqs.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q} className={i > 0 ? "border-t border-sand-dark/40" : ""}>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-ink">{item.q}</span>
                <span className={`ml-3 text-ink-soft transition-transform ${open ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
              {open && <p className="px-5 pb-4 text-sm text-ink-soft">{item.a}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-sand-dark/60 bg-paper-raised p-6 shadow-sm">
        <h2 className="font-display text-lg text-pine">Contacter le support</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Votre question n'est pas dans la liste ? Envoyez-nous un message directement.
        </p>
        <a
          href={`mailto:support@clinique-numerique.ma?subject=${subject}&body=${body}`}
          className="mt-4 inline-block rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark"
        >
          Envoyer un e-mail au support
        </a>
      </div>
    </div>
  );
}