import { useEffect, useState } from "react";
import { getMyAppointments } from "../services/appointmentService";
import type { Appointment } from "../types/patient";

const statusLabel: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const statusStyle: Record<string, string> = {
  scheduled: "bg-sage-light text-pine-dark",
  completed: "bg-sand text-ink-soft",
  cancelled: "bg-risk-critical/10 text-risk-critical",
  no_show: "bg-brass/15 text-brass",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAppointments()
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">Schedule</span>
        <h1 className="font-display text-4xl text-pine">My appointments</h1>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-8 py-16 text-center">
          <p className="text-ink-soft">No appointments at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize text-ink">{formatDateTime(a.appointmentDate)}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {a.doctorName ? `With Dr. ${a.doctorName}` : "Doctor not specified"}
                  </p>
                  {a.notes && <p className="mt-1 text-sm text-ink-soft">Reason: {a.notes}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    statusStyle[a.status] ?? "bg-sand text-ink-soft"
                  }`}
                >
                  {statusLabel[a.status] ?? a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}