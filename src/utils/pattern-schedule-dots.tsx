import React, { FC } from "react";
import { View } from "react-native";

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
