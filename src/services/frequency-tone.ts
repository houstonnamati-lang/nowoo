import { Audio } from "expo-av";
import { sounds } from "@nowoo/assets/sounds";
import { CalmingFrequencyMode, NoiseBedMode } from "@nowoo/types/frequency-tone-mode";

export type ScheduleCategory = "rise" | "reset" | "restore";

const toneAssets: Record<Exclude<CalmingFrequencyMode, "disabled">, any> = {
  "200hz": sounds.frequency200hz,
  "136hz": sounds.frequency136hz,
  "100hz": sounds.frequency100hz,
};

const noiseAssets: Record<Exclude<NoiseBedMode, "disabled">, any> = {
  brown: sounds.brownNoise,
  green: sounds.greenNoise,
  pink: sounds.pinkNoise,
};

// Picker mode: user-selected tone and/or noise
let pickerToneSound: Audio.Sound | undefined;
let pickerNoiseSound: Audio.Sound | undefined;
let pickerPlaying = false;
let pickerToneTargetVolume = 0.6;
let pickerNoiseTargetVolume = 0.3;

// Schedule: tone + noise (Rise/Reset/Restore defaults)
let scheduleToneSound: Audio.Sound | undefined;
let scheduleNoiseSound: Audio.Sound | undefined;
let schedulePlaying = false;

// Base tone volume; schedule tone louder so it’s audible over noise
const TONE_VOLUME = 0.6;
const TONE_VOLUME_100HZ = 1; // 100Hz needs extra gain
const SCHEDULE_TONE_VOLUME = 0.9;
const SCHEDULE_TONE_VOLUME_100HZ = 1; // Restore 100Hz – max gain
const NOISE_VOLUME_RISE = 0.15;
const NOISE_VOLUME_RESET_RESTORE = 0.3;

let scheduleToneTargetVolume = 0.9;
let scheduleNoiseTargetVolume = NOISE_VOLUME_RESET_RESTORE;

let toneVolumeMultiplier = 1;

export function setToneVolumeMultiplier(multiplier: number) {
  toneVolumeMultiplier = Math.max(0, Math.min(1, multiplier));
  if (pickerToneSound && pickerPlaying) {
    pickerToneSound.setVolumeAsync(pickerToneTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
  if (pickerNoiseSound && pickerPlaying) {
    pickerNoiseSound.setVolumeAsync(pickerNoiseTargetVolume * toneVolumeMultiplier).catch(() => {});
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

export async function setupPickerBackground(
  calmingFrequency: CalmingFrequencyMode,
  noiseBed: NoiseBedMode
) {
  await releasePickerBackground();
  const hasTone = calmingFrequency !== "disabled";
  const hasNoise = noiseBed !== "disabled";
  if (!hasTone && !hasNoise) return;

  try {
    if (hasTone) {
      pickerToneTargetVolume = calmingFrequency === "100hz" ? TONE_VOLUME_100HZ : TONE_VOLUME;
      const { sound } = await Audio.Sound.createAsync(toneAssets[calmingFrequency], {
        shouldPlay: false,
        isLooping: true,
        volume: pickerToneTargetVolume,
      });
      pickerToneSound = sound;
    }
    if (hasNoise) {
      pickerNoiseTargetVolume = 0.3;
      const { sound } = await Audio.Sound.createAsync(noiseAssets[noiseBed], {
        shouldPlay: false,
        isLooping: true,
        volume: pickerNoiseTargetVolume,
      });
      pickerNoiseSound = sound;
    }
  } catch (error) {
    console.error("Error setting up picker background:", error);
    await releasePickerBackground();
  }
}

export async function startPickerBackground(options?: { quickFade?: boolean }) {
  if (pickerPlaying) return;
  pickerPlaying = true;
  const fadeMs = options?.quickFade ? 150 : FADE_MS;
  const steps = Math.max(5, Math.round(fadeMs / 40));
  const stepMs = fadeMs / steps;
  const runFade = async (sound: Audio.Sound, toVol: number) => {
    await sound.setVolumeAsync(0);
    for (let i = 1; i <= steps; i++) {
      const v = (toVol * i) / steps;
      await sound.setVolumeAsync(v);
      if (i < steps) await new Promise((r) => setTimeout(r, stepMs));
    }
  };
  if (pickerToneSound) {
    await pickerToneSound.setVolumeAsync(0);
    await pickerToneSound.playAsync();
    runFade(pickerToneSound, pickerToneTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
  if (pickerNoiseSound) {
    await pickerNoiseSound.setVolumeAsync(0);
    await pickerNoiseSound.playAsync();
    runFade(pickerNoiseSound, pickerNoiseTargetVolume * toneVolumeMultiplier).catch(() => {});
  }
}

export async function stopPickerBackground() {
  if (!pickerPlaying) return;
  pickerPlaying = false;
  if (pickerToneSound) {
    await fadeVolume(pickerToneSound, pickerToneTargetVolume * toneVolumeMultiplier, 0);
    await pickerToneSound.pauseAsync();
  }
  if (pickerNoiseSound) {
    await fadeVolume(pickerNoiseSound, pickerNoiseTargetVolume * toneVolumeMultiplier, 0);
    await pickerNoiseSound.pauseAsync();
  }
}

export async function releasePickerBackground() {
  const tone = pickerToneSound;
  const noise = pickerNoiseSound;
  pickerToneSound = undefined;
  pickerNoiseSound = undefined;
  pickerPlaying = false;
  try {
    if (tone) await tone.unloadAsync();
  } catch (e) {
    /* ignore */
  }
  try {
    if (noise) await noise.unloadAsync();
  } catch (e) {
    /* ignore */
  }
}

export async function setupFrequencyTone(
  calmingFrequency: CalmingFrequencyMode,
  noiseBed: NoiseBedMode = "disabled"
) {
  await setupPickerBackground(calmingFrequency, noiseBed);
}

export async function startFrequencyTone(options?: { quickFade?: boolean }) {
  await startPickerBackground(options);
}

export async function stopFrequencyTone() {
  await stopPickerBackground();
}

export async function releaseFrequencyTone() {
  await releasePickerBackground();
}

// Delays to reduce iOS AVFoundation -11819 errors (teardown/load race)
const SCHEDULE_RELEASE_DELAY_MS = 300;
const SCHEDULE_BETWEEN_LOADS_MS = 150;
const SCHEDULE_RETRY_DELAY_MS = 600;

async function createSoundWithRetry(
  source: number,
  options: { shouldPlay: boolean; isLooping: boolean; volume: number }
): Promise<Audio.Sound> {
  try {
    const { sound } = await Audio.Sound.createAsync(source, options);
    return sound;
  } catch (err) {
    await new Promise((r) => setTimeout(r, SCHEDULE_RETRY_DELAY_MS));
    const { sound } = await Audio.Sound.createAsync(source, options);
    return sound;
  }
}

// Schedule-specific: Rise = 200Hz + pink noise (low), Reset = 136Hz + brown, Restore = 100Hz + brown
export async function setupScheduleBackground(category: ScheduleCategory) {
  try {
    await releaseScheduleBackground();
    await new Promise((r) => setTimeout(r, SCHEDULE_RELEASE_DELAY_MS));

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

    scheduleToneSound = await createSoundWithRetry(toneAsset, {
      shouldPlay: false,
      isLooping: true,
      volume: scheduleToneTargetVolume,
    });

    await new Promise((r) => setTimeout(r, SCHEDULE_BETWEEN_LOADS_MS));
    scheduleNoiseSound = await createSoundWithRetry(noiseAsset, {
      shouldPlay: false,
      isLooping: true,
      volume: noiseVolume,
    });
  } catch (error) {
    console.error("Error setting up schedule background:", error);
    await releaseScheduleBackground();
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
  const tone = scheduleToneSound;
  const noise = scheduleNoiseSound;
  scheduleToneSound = undefined;
  scheduleNoiseSound = undefined;
  schedulePlaying = false;
  try {
    if (tone) await tone.unloadAsync();
  } catch (e) {
    // Ignore unload errors so we always try to release the other
  }
  try {
    if (noise) await noise.unloadAsync();
  } catch (e) {
    // Ignore unload errors
  }
}
