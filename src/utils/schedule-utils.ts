import { patternPresets } from "@breathly/assets/pattern-presets";
import { PatternPreset } from "@breathly/types/pattern-preset";

export type ScheduleCategory = "rise" | "reset" | "restore" | null;

/**
 * Converts time string (HH:mm) to minutes since midnight
 */
const timeToMinutes = (time: string): number => {
  if (!time) return -1;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Determines which schedule category is active based on current time
 */
export const getActiveScheduleCategory = (
  riseStartTime: string,
  riseEndTime: string,
  resetStartTime: string,
  resetEndTime: string,
  restoreStartTime: string,
  restoreEndTime: string
): ScheduleCategory => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const riseStart = timeToMinutes(riseStartTime);
  const riseEnd = timeToMinutes(riseEndTime);
  const resetStart = timeToMinutes(resetStartTime);
  const resetEnd = timeToMinutes(resetEndTime);
  const restoreStart = timeToMinutes(restoreStartTime);
  const restoreEnd = timeToMinutes(restoreEndTime);

  // Check if current time falls within any configured schedule
  if (riseStart >= 0 && riseEnd >= 0) {
    // Handle case where schedule spans midnight (e.g., 22:00 - 06:00)
    if (riseStart > riseEnd) {
      if (currentMinutes >= riseStart || currentMinutes < riseEnd) {
        return "rise";
      }
    } else {
      if (currentMinutes >= riseStart && currentMinutes < riseEnd) {
        return "rise";
      }
    }
  }

  if (resetStart >= 0 && resetEnd >= 0) {
    if (resetStart > resetEnd) {
      if (currentMinutes >= resetStart || currentMinutes < resetEnd) {
        return "reset";
      }
    } else {
      if (currentMinutes >= resetStart && currentMinutes < resetEnd) {
        return "reset";
      }
    }
  }

  if (restoreStart >= 0 && restoreEnd >= 0) {
    if (restoreStart > restoreEnd) {
      if (currentMinutes >= restoreStart || currentMinutes < restoreEnd) {
        return "restore";
      }
    } else {
      if (currentMinutes >= restoreStart && currentMinutes < restoreEnd) {
        return "restore";
      }
    }
  }

  return null;
};

/**
 * Gets a random pattern ID from the specified schedule category
 */
export const getRandomPatternFromSchedule = (
  category: ScheduleCategory,
  risePatternIds: string[],
  resetPatternIds: string[],
  restorePatternIds: string[],
  customPatterns: PatternPreset[]
): string | null => {
  let patternIds: string[] = [];

  switch (category) {
    case "rise":
      patternIds = risePatternIds;
      break;
    case "reset":
      patternIds = resetPatternIds;
      break;
    case "restore":
      patternIds = restorePatternIds;
      break;
    default:
      return null;
  }

  if (patternIds.length === 0) {
    return null;
  }

  // Get random index
  const randomIndex = Math.floor(Math.random() * patternIds.length);
  return patternIds[randomIndex];
};

/**
 * Gets the pattern preset by ID from all available patterns
 */
export const getPatternById = (
  patternId: string,
  customPatterns: PatternPreset[]
): PatternPreset | null => {
  const allPatterns = [...patternPresets, ...customPatterns];
  return allPatterns.find((p) => p.id === patternId) || null;
};

/**
 * Checks if two time ranges overlap
 */
const doTimeRangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  // Handle case where range spans midnight
  if (start1 > end1) {
    // Range 1 spans midnight (e.g., 22:00 - 06:00)
    // It overlaps if range 2 starts or ends within range 1, or if range 2 also spans midnight and overlaps
    if (start2 > end2) {
      // Both span midnight - check if they overlap
      return !(end1 <= start2 && end2 <= start1);
    }
    // Range 1 spans midnight, range 2 doesn't
    return start2 < end1 || end2 > start1 || (start2 >= start1 && end2 <= 1440);
  }
  if (start2 > end2) {
    // Range 2 spans midnight, range 1 doesn't
    return start1 < end2 || end1 > start2 || (start1 >= start2 && end1 <= 1440);
  }
  // Neither spans midnight - standard overlap check
  // Two ranges overlap if: start1 < end2 && start2 < end1
  return start1 < end2 && start2 < end1;
};

/**
 * Validates if a new time range would overlap with other configured schedules
 */
export const validateScheduleTimeRange = (
  category: "rise" | "reset" | "restore",
  newStartTime: string,
  newEndTime: string,
  riseStartTime: string,
  riseEndTime: string,
  resetStartTime: string,
  resetEndTime: string,
  restoreStartTime: string,
  restoreEndTime: string
): { valid: boolean; conflictingCategory?: string } => {
  if (!newStartTime || !newEndTime) {
    return { valid: true }; // Empty times are allowed
  }

  const newStart = timeToMinutes(newStartTime);
  const newEnd = timeToMinutes(newEndTime);

  if (newStart < 0 || newEnd < 0) {
    return { valid: true }; // Invalid time format, but let the picker handle it
  }

  // Check against other categories
  if (category !== "rise") {
    const riseStart = timeToMinutes(riseStartTime);
    const riseEnd = timeToMinutes(riseEndTime);
    if (riseStart >= 0 && riseEnd >= 0) {
      if (doTimeRangesOverlap(newStart, newEnd, riseStart, riseEnd)) {
        return { valid: false, conflictingCategory: "Rise" };
      }
    }
  }

  if (category !== "reset") {
    const resetStart = timeToMinutes(resetStartTime);
    const resetEnd = timeToMinutes(resetEndTime);
    if (resetStart >= 0 && resetEnd >= 0) {
      if (doTimeRangesOverlap(newStart, newEnd, resetStart, resetEnd)) {
        return { valid: false, conflictingCategory: "Reset" };
      }
    }
  }

  if (category !== "restore") {
    const restoreStart = timeToMinutes(restoreStartTime);
    const restoreEnd = timeToMinutes(restoreEndTime);
    if (restoreStart >= 0 && restoreEnd >= 0) {
      if (doTimeRangesOverlap(newStart, newEnd, restoreStart, restoreEnd)) {
        return { valid: false, conflictingCategory: "Restore" };
      }
    }
  }

  return { valid: true };
};

