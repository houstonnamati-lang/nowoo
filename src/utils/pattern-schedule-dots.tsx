import React, { FC } from "react";
import { View, Text } from "react-native";

export type ScheduleCategory = "rise" | "reset" | "restore";

/** Colors matching Rise / Reset / Restore on home screen and in settings */
export const SCHEDULE_DOT_COLORS: Record<ScheduleCategory, string> = {
  rise: "#fbbf24",
  reset: "#23cd32",
  restore: "#a78bfa",
};

/** Which schedule(s) each built-in pattern is best for (time of day). */
export const PATTERN_BEST_FOR: Record<string, ScheduleCategory[]> = {
  awake: ["rise"],
  sunrise: ["rise"],
  "deep-calm": ["restore"],
  relaxation: ["restore"],
  performance: ["reset"],
  pranayama: ["reset"],
  square: ["reset", "restore"],
  ujjayi: ["reset", "restore"],
};

/** Optimal time of day for each calming frequency. */
export const FREQUENCY_BEST_FOR: Record<string, ScheduleCategory[]> = {
  "200hz": ["rise"],
  "136hz": ["reset"],
  "100hz": ["restore"],
};

/** Optimal time of day for each noise bed. */
export const NOISE_BEST_FOR: Record<string, ScheduleCategory[]> = {
  brown: ["reset", "restore"],
  green: ["reset"],
  pink: ["rise"],
};

/** Optimal default patterns when user has not selected any for a schedule. */
export const DEFAULT_SCHEDULE_PATTERNS: Record<ScheduleCategory, string[]> = {
  rise: ["awake"],
  reset: ["performance"],
  restore: ["deep-calm"],
};

const DOT_SIZE = 8;
const DOT_GAP = 4;

interface ScheduleDotsProps {
  patternId: string;
}

export const ScheduleDots: FC<ScheduleDotsProps> = ({ patternId }) => {
  const categories = PATTERN_BEST_FOR[patternId];
  if (!categories || categories.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 6, gap: DOT_GAP }}>
      {categories.map((cat) => (
        <View
          key={cat}
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: SCHEDULE_DOT_COLORS[cat],
          }}
        />
      ))}
    </View>
  );
};

interface ScheduleDotsByCategoriesProps {
  categories: ScheduleCategory[];
  /** Omit left margin when used inside a label with gap (e.g. FrequencyNoiseOptionLabel) */
  noMargin?: boolean;
}

/** Renders colored dots for given schedule categories (used for frequency/noise options). */
export const ScheduleDotsByCategories: FC<ScheduleDotsByCategoriesProps> = ({ categories, noMargin }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginLeft: noMargin ? 0 : 8, gap: DOT_GAP, flexShrink: 0 }}>
      {categories.map((cat) => (
        <View
          key={cat}
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: SCHEDULE_DOT_COLORS[cat],
          }}
        />
      ))}
    </View>
  );
};

interface FrequencyNoiseOptionLabelProps {
  text: string;
  categories: ScheduleCategory[];
  textColor?: string;
}

/** Label with text + schedule dots, with spacing to prevent overlap. */
export const FrequencyNoiseOptionLabel: FC<FrequencyNoiseOptionLabelProps> = ({
  text,
  categories,
  textColor,
}) => (
  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
    <Text
      style={{ color: textColor, flexShrink: 1, minWidth: 0, marginRight: 8 }}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {text}
    </Text>
    <ScheduleDotsByCategories categories={categories} noMargin />
  </View>
);
