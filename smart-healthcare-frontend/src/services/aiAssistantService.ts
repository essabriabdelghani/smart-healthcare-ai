import api from "./api";
import type { AskAssistantPayload, AssistantAnswer } from "../types/aiAssistant";

interface AskApiResponse {
  mode: "patient" | "general";
  answer: string;
  sources: { source: string; relevance: number }[];
  disclaimer: string;
}

export async function askAssistant(payload: AskAssistantPayload): Promise<AssistantAnswer> {
  const body = {
    question: payload.question,
    patient_id: payload.patientId ?? null,
    intake_id: payload.intakeId ?? null,
  };

  const { data } = await api.post<AskApiResponse>("/ai-assistant/ask", body, {
  timeout: 90000,
});

  return {
    mode: data.mode,
    answer: data.answer,
    sources: data.sources,
    disclaimer: data.disclaimer,
  };
}
