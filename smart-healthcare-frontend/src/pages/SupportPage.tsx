import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const faqs = [
  {
    q: "How to adjust the AI-calculated risk score?",
    a: "Open the patient record (Patients → View), then in the 'Clinical review' section, click on 'Adjust score'. Your adjustment is saved and appears in the Administration audit log.",
  },
  {
    q: "Why can't I add a patient or appointment as an admin?",
    a: "These actions are reserved for doctor accounts, to maintain clear traceability of who is managing each patient. The administrator retains read-only access to all patients, appointments, and the audit log.",
  },
  {
    q: "How does a patient join my clinic?",
    a: "During registration, the patient enters the exact clinic name. If it matches an existing clinic, they automatically join it; otherwise, a new clinic is created.",
  },
  {
    q: "What to do if an account needs to be disabled?",
    a: "From the Administration panel, click on 'Disable' next to the concerned user. Access is cut immediately, even if the person is already logged in.",
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const subject = encodeURIComponent("Support — Digital Clinic");
  const body = encodeURIComponent(
    `Hello,\n\nI am ${user?.full_name ?? ""} (${user?.role ?? ""}), account ${user?.email ?? ""}.\n\nDescribe your issue here:\n`
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">Help</span>
        <h1 className="font-display text-4xl text-pine">Support</h1>
        <p className="mt-2 text-ink-soft">Frequently asked questions and direct contact.</p>
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
        <h2 className="font-display text-lg text-pine">Contact support</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Your question isn't in the list? Send us a message directly.
        </p>
        <a
          href={`mailto:support@clinique-numerique.ma?subject=${subject}&body=${body}`}
          className="mt-4 inline-block rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark"
        >
          Send an email to support
        </a>
      </div>
    </div>
  );
}