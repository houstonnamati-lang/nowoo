import ms from "ms";
import { PatternPreset } from "../types/pattern-preset";

// Ordered by type: Rise first, then Reset, then Restore (matching PATTERN_BEST_FOR in pattern-schedule-dots.tsx)
export const patternPresets: PatternPreset[] = [
  // Rise
  {
    id: "awake",
    name: "Awake",
    steps: [ms("6s"), 0, ms("2s"), 0],
    description:
      "Use this technique first thing in the morning for quick burst of energy and alertness.",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    steps: [ms("5s"), 0, ms("5s"), 0],
    description:
      "A balanced breathing pattern perfect for starting your day with calm and clarity.",
  },
  // Reset
  {
    id: "performance",
    name: "Performance",
    steps: [ms("4s"), ms("2s"), ms("6s"), 0],
    description:
      "Optimize your breathing rhythm for enhanced physical and mental performance.",
  },
  {
    id: "pranayama",
    name: "Center",
    steps: [ms("7s"), ms("4s"), ms("8s"), ms("4s")],
    description: "A main component of yoga, an exercise for physical and mental wellness.",
  },
  {
    id: "square",
    name: "Square",
    steps: [ms("4s"), ms("4s"), ms("4s"), ms("4s")],
    description:
      "Box breathing, also referred to as square breathing, can help you slow down your breathing and reduce stress.",
  },
  {
    id: "ujjayi",
    name: "Victorious",
    steps: [ms("7s"), 0, ms("7s"), 0],
    description:
      "Balance influence on the cardiorespiratory system, release feelings of irritation, and calm the mind and body.",
  },
  // Restore
  {
    id: "deep-calm",
    name: "Deep Calm",
    steps: [ms("4s"), ms("7s"), ms("8s"), 0],
    description: "A natural tranquilizer for the nervous system. Do it at least twice a day.",
  },
  {
    id: "relaxation",
    name: "Relaxation",
    steps: [ms("4s"), 0, ms("6s"), 0],
    description:
      "Extended exhalation helps activate the parasympathetic nervous system for deep relaxation.",
  },
];
