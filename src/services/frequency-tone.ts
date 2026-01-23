import { Audio } from "expo-av";
import { sounds } from "@breathly/assets/sounds";
import { FrequencyToneMode } from "@breathly/types/frequency-tone-mode";

let frequencyToneSound: Audio.Sound | undefined;
let isPlaying = false;

const frequencyToneAssets: Record<Exclude<FrequencyToneMode, "disabled">, any> = {
  "852hz": sounds.frequency852hz,
  "777hz": sounds.frequency777hz,
  "432hz": sounds.frequency432hz,
};

export async function setupFrequencyTone(frequencyToneMode: FrequencyToneMode) {
  if (frequencyToneMode === "disabled") {
    return;
  }

  try {
    const { sound } = await Audio.Sound.createAsync(frequencyToneAssets[frequencyToneMode], {
      shouldPlay: false,
      isLooping: true,
      volume: 0.10, // Subtle background tone - 10% volume
    });
    frequencyToneSound = sound;
  } catch (error) {
    console.error("Error setting up frequency tone:", error);
  }
}

export async function startFrequencyTone() {
  if (frequencyToneSound && !isPlaying) {
    await frequencyToneSound.playAsync();
    isPlaying = true;
  }
}

export async function stopFrequencyTone() {
  if (frequencyToneSound && isPlaying) {
    await frequencyToneSound.pauseAsync();
    isPlaying = false;
  }
}

export async function releaseFrequencyTone() {
  if (frequencyToneSound) {
    await frequencyToneSound.unloadAsync();
    frequencyToneSound = undefined;
    isPlaying = false;
  }
}

