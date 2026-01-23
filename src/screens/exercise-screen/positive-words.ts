export const POSITIVE_WORDS = [
  "gratitude",
  "release",
  "energy",
  "strength",
  "courage",
  "peace",
  "calm",
  "focus",
  "clarity",
  "balance",
  "harmony",
  "healing",
  "renewal",
  "transformation",
  "growth",
  "wisdom",
  "patience",
  "compassion",
  "kindness",
  "love",
  "joy",
  "serenity",
  "tranquility",
  "mindfulness",
  "awareness",
  "presence",
  "acceptance",
  "forgiveness",
  "resilience",
  "hope",
  "inspiration",
  "motivation",
  "determination",
  "confidence",
  "trust",
  "faith",
  "blessing",
  "abundance",
  "freedom",
  "liberation",
  "rebirth",
  "purification",
  "centering",
  "grounding",
  "stability",
  "flow",
  "ease",
  "grace",
  "vitality",
  "empowerment",
];

/**
 * Returns a shuffled copy of the positive words array
 */
export function getShuffledWords(): string[] {
  const shuffled = [...POSITIVE_WORDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
