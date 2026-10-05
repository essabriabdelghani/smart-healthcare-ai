export interface AskAssistantPayload {
  question: string;
  patientId?: string;
  intakeId?: string;
}

export interface AssistantSource {
  source: string;
  relevance: number;
}

export interface AssistantAnswer {
  mode: "patient" | "general";
  answer: string;
  sources: AssistantSource[];
  disclaimer: string;
}
