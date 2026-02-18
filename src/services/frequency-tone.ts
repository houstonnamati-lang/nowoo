import { Audio } from "expo-av";
import { sounds } from "@nowoo/assets/sounds";
import { FrequencyToneMode } from "@nowoo/types/frequency-tone-mode";

export type ScheduleCategory = "rise" | "reset" | "restore";

let frequencyToneSound: Audio.Sound | undefined;
let isPlaying = false;

// Schedule: tone + optional noise bed. Rise uses pink at very low volume; reset/restore use brown.
let scheduleToneSound: Audio.Sound | undefined;
let scheduleNoiseSound: Audio.Sound | undefined;
let schedulePlaying = false;

const frequencyToneAssets: Record<Exclude<FrequencyToneMode, "disabled">, any> = {
  "200hz": sounds.frequency200hz,
  "136hz": sounds.frequency136hz,
  "100hz": sounds.frequency100hz,
  brown: sounds.brownNoise,
  green: sounds.greenNoise,
  pink: sounds.pinkNoise,
};

// Base tone volume; schedule tone louder so it’s audible over noise
const TONE_VOLUME = 0.6;
const TONE_VOLUME_100HZ = 1; // 100Hz needs extra gain
const SCHEDULE_TONE_VOLUME = 0.9;
const SCHEDULE_TONE_VOLUME_100HZ = 1; // Restore 100Hz – max gain
const NOISE_VOLUME_RISE = 0.15;
const NOISE_VOLUME_RESET_RESTORE = 0.3;

let pickerToneTargetVolume = TONE_VOLUME;
let scheduleToneTargetVolume = SCHEDULE_TONE_VOLUME;
let scheduleNoiseTargetVolume = NOISE_VOLUME_RESET_RESTORE;

let toneVolumeMultiplier = 1;

export function setToneVolumeMultiplier(multiplier: number) {
  toneVolumeMultiplier = Math.max(0, Math.min(1, multiplier));
  if (frequencyToneSound && isPlaying) {
    frequencyToneSound.setVolumeAsync(pickerToneTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
  if (scheduleToneSound && schedulePlaying) {
    scheduleToneSound.setVolumeAsync(scheduleToneTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
  if (scheduleNoiseSound && schedulePlaying) {
    scheduleNoiseSound.setVolumeAsync(scheduleNoiseTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
}

const FADE_MS = 800;
const FADE_STEPS = 20;
const FADE_STEP_MS = FADE_MS / FADE_STEPS;

async function fadeVolume(
  sound: Audio.Sound,
  fromVol: number,
  toVol: number
): Promise<void> {
  for (let i = 0; i <= FADE_STEPS; i++) {
    const v = fromVol + (toVol - fromVol) * (i / FADE_STEPS);
    await sound.setVolumeAsync(v);
    if (i < FADE_STEPS) await new Promise((r) => setTimeout(r, FADE_STEP_MS));
  }
}

export async function setupFrequencyTone(frequencyToneMode: FrequencyToneMode) {
  if (frequencyToneMode === "disabled") {
    return;
  }

  try {
    pickerToneTargetVolume =
      frequencyToneMode === "100hz" ? TONE_VOLUME_100HZ : TONE_VOLUME;
    const { sound } = await Audio.Sound.createAsync(frequencyToneAssets[frequencyToneMode], {
      shouldPlay: false,
      isLooping: true,
      volume: pickerToneTargetVolume,
    });
    frequencyToneSound = sound;
  } catch (error) {
    console.error("Error setting up frequency tone:", error);
  }
}

export async function startFrequencyTone() {
  if (frequencyToneSound && !isPlaying) {
    await frequencyToneSound.setVolumeAsync(0);
    await frequencyToneSound.playAsync();
    isPlaying = true;
    fadeVolume(frequencyToneSound, 0, pickerToneTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
}

export async function stopFrequencyTone() {
  if (frequencyToneSound && isPlaying) {
    isPlaying = false;
    await fadeVolume(frequencyToneSound, pickerToneTargetVolume * toneVolumeMultiplier, 0);
    await frequencyToneSound.pauseAsync();
  }
}

export async function releaseFrequencyTone() {
  if (frequencyToneSound) {
    await frequencyToneSound.unloadAsync();
    frequencyToneSound = undefined;
    isPlaying = false;
  }
}

// Schedule-specific: Rise = 200Hz + pink noise (low), Reset = 136Hz + brown, Restore = 100Hz + brown
export async function setupScheduleBackground(category: ScheduleCategory) {
  try {
    await releaseScheduleBackground();
    const toneAsset =
      category === "rise"
        ? sounds.frequency200hz
        : category === "reset"
        ? sounds.frequency136hz
        : sounds.frequency100hz;
    const noiseAsset =
      category === "rise" ? sounds.pinkNoise : sounds.brownNoise;
    const noiseVolume =
      category === "rise" ? NOISE_VOLUME_RISE : NOISE_VOLUME_RESET_RESTORE;
    scheduleToneTargetVolume =
      category === "restore" ? SCHEDULE_TONE_VOLUME_100HZ : SCHEDULE_TONE_VOLUME;
    scheduleNoiseTargetVolume = noiseVolume;

    const { sound: toneSound } = await Audio.Sound.createAsync(toneAsset, {
      shouldPlay: false,
      isLooping: true,
      volume: scheduleToneTargetVolume,
    });
    scheduleToneSound = toneSound;

    const { sound: noiseSound } = await Audio.Sound.createAsync(noiseAsset, {
      shouldPlay: false,
      isLooping: true,
      volume: noiseVolume,
    });
    scheduleNoiseSound = noiseSound;
  } catch (error) {
    console.error("Error setting up schedule background:", error);
  }
}

export async function startScheduleBackground() {
  if (schedulePlaying) return;
  schedulePlaying = true;
  if (scheduleToneSound) {
    await scheduleToneSound.setVolumeAsync(0);
    await scheduleToneSound.playAsync();
    fadeVolume(scheduleToneSound, 0, scheduleToneTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
  if (scheduleNoiseSound) {
    await scheduleNoiseSound.setVolumeAsync(0);
    await scheduleNoiseSound.playAsync();
    fadeVolume(scheduleNoiseSound, 0, scheduleNoiseTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
}

export async function stopScheduleBackground() {
  if (!schedulePlaying) return;
  schedulePlaying = false;
  if (scheduleToneSound) {
    await fadeVolume(scheduleToneSound, scheduleToneTargetVolume * toneVolumeMultiplier, 0);
    await scheduleToneSound.pauseAsync();
  }
  if (scheduleNoiseSound) {
    await fadeVolume(scheduleNoiseSound, scheduleNoiseTargetVolume * toneVolumeMultiplier, 0);
    await scheduleNoiseSound.pauseAsync();
  }
}

export async function releaseScheduleBackground() {
  if (scheduleToneSound) {
    await scheduleToneSound.unloadAsync();
    scheduleToneSound = undefined;
  }
  if (scheduleNoiseSound) {
    await scheduleNoiseSound.unloadAsync();
    scheduleNoiseSound = undefined;
  }
  schedulePlaying = false;
}
