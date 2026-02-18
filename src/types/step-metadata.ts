import { GuidedBreathingStep } from "@nowoo/services/audio";

export interface StepMetadata {
  id: string;
  audioId: GuidedBreathingStep;
  label: string;
  duration: number;
  showDots: boolean;
  skipped: boolean;
}
