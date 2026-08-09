export default function AdminPanelPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">
          Configuration
        </span>
        <h1 className="font-display text-4xl text-pine">Administration</h1>
        <p className="mt-2 text-ink-soft">
          Gérez les modèles de questionnaire, les rôles et les journaux d'audit.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Modèles d'admission", desc: "Questionnaires par parcours de soin." },
          { title: "Utilisateurs & rôles", desc: "Patients, médecins, administrateurs." },
          { title: "Journal d'audit", desc: "Décisions IA vs. clinicien." },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised p-6"
          >
            <h2 className="font-display text-lg text-pine">{card.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{card.desc}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-brass">Bientôt disponible</p>
          </div>
        ))}
      </div>
    </div>
  );
}