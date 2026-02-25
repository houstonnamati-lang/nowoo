import { Audio } from "expo-av";
import { sounds } from "@nowoo/assets/sounds";
import {
  femaleVoiceInhales,
  femaleVoiceExhales,
  femaleVoiceHold,
  femaleVoiceEncouragement,
  femaleVoiceTransition,
} from "@nowoo/assets/female-voice-assets";
import {
  maleVoiceInhales,
  maleVoiceExhales,
  maleVoiceHold,
  maleVoiceEncouragement,
  maleVoiceTransition,
} from "@nowoo/assets/male-voice-assets";
import { GuidedBreathingMode } from "@nowoo/types/guided-breathing-mode";
import { StepMetadata } from "@nowoo/types/step-metadata";

(async function () {
  Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
})();

export type GuidedBreathingStep = "breatheIn" | "breatheOut" | "hold";

const ENCOURAGEMENT_THRESHOLD_MS = 6000;

// Bell mode: single clips per step
const bellAssets = {
  breatheIn: sounds.cueBell1,
  breatheOut: sounds.cueBell1,
  hold: sounds.cueBell2,
};

let endingBellSound: Audio.Sound | undefined;

// Female mode: preloaded sounds per category
let femaleInhaleSounds: Audio.Sound[] = [];
let femaleExhaleSounds: Audio.Sound[] = [];
let femaleHoldSounds: Audio.Sound[] = [];
let femaleEncouragementSounds: Audio.Sound[] = [];
let femaleTransitionSounds: Audio.Sound[] = [];
let femaleInhaleIndex = 0;
let femaleExhaleIndex = 0;
let femaleHoldIndex = 0;
let femaleEncouragementIndex = 0;
let femaleTransitionIndex = 0;

// Male mode: same structure
let maleInhaleSounds: Audio.Sound[] = [];
let maleExhaleSounds: Audio.Sound[] = [];
let maleHoldSounds: Audio.Sound[] = [];
let maleEncouragementSounds: Audio.Sound[] = [];
let maleTransitionSounds: Audio.Sound[] = [];
let maleInhaleIndex = 0;
let maleExhaleIndex = 0;
let maleHoldIndex = 0;
let maleEncouragementIndex = 0;
let maleTransitionIndex = 0;

let encouragementTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Bell mode: single sounds per step
let bellBreatheInSound: Audio.Sound | undefined;
let bellBreatheOutSound: Audio.Sound | undefined;
let bellHoldSound: Audio.Sound | undefined;

let guidedBreathingVolume = 1;

export function setGuidedBreathingVolume(volume: number) {
  guidedBreathingVolume = Math.max(0, Math.min(1, volume));
}

export function clearEncouragementTimeout() {
  if (encouragementTimeoutId !== null) {
    clearTimeout(encouragementTimeoutId);
    encouragementTimeoutId = null;
  }
}

export async function playSessionTransitionClips(): Promise<void> {
  const transitionSounds = femaleTransitionSounds.length > 0
    ? femaleTransitionSounds
    : maleTransitionSounds;
  if (transitionSounds.length === 0) return;
  const count = 1; // single clip during interlude

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * transitionSounds.length);
    const sound = transitionSounds[idx];
    await sound.setVolumeAsync(guidedBreathingVolume);
    await new Promise<void>((resolve, reject) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish && !status.isLooping) {
          resolve();
        }
      });
      sound.replayAsync().catch(reject);
    });
  }
}

async function playFemaleStepCue(audioId: GuidedBreathingStep): Promise<void> {
  let sounds: Audio.Sound[];
  let indexRef: { value: number };
  if (audioId === "breatheIn") {
    sounds = femaleInhaleSounds;
    indexRef = { value: femaleInhaleIndex };
    femaleInhaleIndex = (femaleInhaleIndex + 1) % femaleInhaleSounds.length;
  } else if (audioId === "breatheOut") {
    sounds = femaleExhaleSounds;
    indexRef = { value: femaleExhaleIndex };
    femaleExhaleIndex = (femaleExhaleIndex + 1) % femaleExhaleSounds.length;
  } else {
    sounds = femaleHoldSounds;
    indexRef = { value: femaleHoldIndex };
    femaleHoldIndex = (femaleHoldIndex + 1) % femaleHoldSounds.length;
  }
  if (sounds.length === 0) return;
  const idx = indexRef.value % sounds.length;
  const s = sounds[idx];
  await s.setVolumeAsync(guidedBreathingVolume);
  await s.replayAsync();
}

async function playMaleStepCue(audioId: GuidedBreathingStep): Promise<void> {
  let sounds: Audio.Sound[];
  let indexRef: { value: number };
  if (audioId === "breatheIn") {
    sounds = maleInhaleSounds;
    indexRef = { value: maleInhaleIndex };
    maleInhaleIndex = (maleInhaleIndex + 1) % maleInhaleSounds.length;
  } else if (audioId === "breatheOut") {
    sounds = maleExhaleSounds;
    indexRef = { value: maleExhaleIndex };
    maleExhaleIndex = (maleExhaleIndex + 1) % maleExhaleSounds.length;
  } else {
    sounds = maleHoldSounds;
    indexRef = { value: maleHoldIndex };
    maleHoldIndex = (maleHoldIndex + 1) % maleHoldSounds.length;
  }
  if (sounds.length === 0) return;
  const idx = indexRef.value % sounds.length;
  const s = sounds[idx];
  await s.setVolumeAsync(guidedBreathingVolume);
  await s.replayAsync();
}

async function playFemaleEncouragement(): Promise<void> {
  if (femaleEncouragementSounds.length === 0) return;
  const idx = femaleEncouragementIndex % femaleEncouragementSounds.length;
  femaleEncouragementIndex++;
  const s = femaleEncouragementSounds[idx];
  await s.setVolumeAsync(guidedBreathingVolume);
  await s.replayAsync();
}

async function playMaleEncouragement(): Promise<void> {
  if (maleEncouragementSounds.length === 0) return;
  const idx = maleEncouragementIndex % maleEncouragementSounds.length;
  maleEncouragementIndex++;
  const s = maleEncouragementSounds[idx];
  await s.setVolumeAsync(guidedBreathingVolume);
  await s.replayAsync();
}

export async function setupGuidedBreathingAudio(guidedBreathingMode: GuidedBreathingMode) {
  await releaseGuidedBreathingAudio();

  const [endingBellResult] = await Promise.all([
    Audio.Sound.createAsync(sounds.endingBell),
  ]);
  endingBellSound = endingBellResult.sound;

  if (guidedBreathingMode === "bell") {
    const [breatheInResult, breatheOutResult, holdResult] = await Promise.all([
      Audio.Sound.createAsync(bellAssets.breatheIn),
      Audio.Sound.createAsync(bellAssets.breatheOut),
      Audio.Sound.createAsync(bellAssets.hold),
    ]);
    bellBreatheInSound = breatheInResult.sound;
    bellBreatheOutSound = breatheOutResult.sound;
    bellHoldSound = holdResult.sound;
  }

  if (guidedBreathingMode === "female") {
    femaleInhaleIndex = 0;
    femaleExhaleIndex = 0;
    femaleHoldIndex = 0;
    femaleEncouragementIndex = 0;
    femaleTransitionIndex = 0;
    const allAssets = [
      ...femaleVoiceInhales,
      ...femaleVoiceExhales,
      ...femaleVoiceHold,
      ...femaleVoiceEncouragement,
      ...femaleVoiceTransition,
    ];
    const allSounds = await Promise.all(
      allAssets.map((asset) => Audio.Sound.createAsync(asset, { shouldPlay: false }))
    );
    let idx = 0;
    femaleInhaleSounds = allSounds.slice(idx, idx + femaleVoiceInhales.length).map((r) => r.sound);
    idx += femaleVoiceInhales.length;
    femaleExhaleSounds = allSounds.slice(idx, idx + femaleVoiceExhales.length).map((r) => r.sound);
    idx += femaleVoiceExhales.length;
    femaleHoldSounds = allSounds.slice(idx, idx + femaleVoiceHold.length).map((r) => r.sound);
    idx += femaleVoiceHold.length;
    femaleEncouragementSounds = allSounds
      .slice(idx, idx + femaleVoiceEncouragement.length)
      .map((r) => r.sound);
    idx += femaleVoiceEncouragement.length;
    femaleTransitionSounds = allSounds.slice(idx, idx + femaleVoiceTransition.length).map((r) => r.sound);
  }

  if (guidedBreathingMode === "male") {
    maleInhaleIndex = 0;
    maleExhaleIndex = 0;
    maleHoldIndex = 0;
    maleEncouragementIndex = 0;
    maleTransitionIndex = 0;
    const allAssets = [
      ...maleVoiceInhales,
      ...maleVoiceExhales,
      ...maleVoiceHold,
      ...maleVoiceEncouragement,
      ...maleVoiceTransition,
    ];
    const allSounds = await Promise.all(
      allAssets.map((asset) => Audio.Sound.createAsync(asset, { shouldPlay: false }))
    );
    let idx = 0;
    maleInhaleSounds = allSounds.slice(idx, idx + maleVoiceInhales.length).map((r) => r.sound);
    idx += maleVoiceInhales.length;
    maleExhaleSounds = allSounds.slice(idx, idx + maleVoiceExhales.length).map((r) => r.sound);
    idx += maleVoiceExhales.length;
    maleHoldSounds = allSounds.slice(idx, idx + maleVoiceHold.length).map((r) => r.sound);
    idx += maleVoiceHold.length;
    maleEncouragementSounds = allSounds
      .slice(idx, idx + maleVoiceEncouragement.length)
      .map((r) => r.sound);
    idx += maleVoiceEncouragement.length;
    maleTransitionSounds = allSounds.slice(idx, idx + maleVoiceTransition.length).map((r) => r.sound);
  }
}

export const releaseGuidedBreathingAudio = async () => {
  clearEncouragementTimeout();
  const toUnload: (Audio.Sound | undefined)[] = [endingBellSound];
  if (bellBreatheInSound) toUnload.push(bellBreatheInSound);
  if (bellBreatheOutSound) toUnload.push(bellBreatheOutSound);
  if (bellHoldSound) toUnload.push(bellHoldSound);
  toUnload.push(...femaleInhaleSounds, ...femaleExhaleSounds, ...femaleHoldSounds);
  toUnload.push(...femaleEncouragementSounds, ...femaleTransitionSounds);
  toUnload.push(...maleInhaleSounds, ...maleExhaleSounds, ...maleHoldSounds);
  toUnload.push(...maleEncouragementSounds, ...maleTransitionSounds);
  await Promise.all(toUnload.filter(Boolean).map((s) => s!.unloadAsync()));
  endingBellSound = undefined;
  bellBreatheInSound = undefined;
  bellBreatheOutSound = undefined;
  bellHoldSound = undefined;
  femaleInhaleSounds = [];
  femaleExhaleSounds = [];
  femaleHoldSounds = [];
  femaleEncouragementSounds = [];
  femaleTransitionSounds = [];
  maleInhaleSounds = [];
  maleExhaleSounds = [];
  maleHoldSounds = [];
  maleEncouragementSounds = [];
  maleTransitionSounds = [];
};

export const playGuidedBreathingSound = async (stepMetadata: StepMetadata) => {
  const { audioId, duration } = stepMetadata;

  if (audioId === "breatheIn" || audioId === "breatheOut" || audioId === "hold") {
    // Female voice mode
    if (femaleInhaleSounds.length > 0) {
      clearEncouragementTimeout();
      await playFemaleStepCue(audioId);
      if (duration > ENCOURAGEMENT_THRESHOLD_MS && Math.random() < 0.3) {
        encouragementTimeoutId = setTimeout(() => {
          encouragementTimeoutId = null;
          playFemaleEncouragement().catch(() => {});
        }, duration / 2);
      }
      return;
    }

    // Male voice mode
    if (maleInhaleSounds.length > 0) {
      clearEncouragementTimeout();
      await playMaleStepCue(audioId);
      if (duration > ENCOURAGEMENT_THRESHOLD_MS && Math.random() < 0.3) {
        encouragementTimeoutId = setTimeout(() => {
          encouragementTimeoutId = null;
          playMaleEncouragement().catch(() => {});
        }, duration / 2);
      }
      return;
    }

    // Bell mode
    const s =
      audioId === "breatheIn"
        ? bellBreatheInSound
        : audioId === "breatheOut"
        ? bellBreatheOutSound
        : bellHoldSound;
    if (s) {
      await s.setVolumeAsync(guidedBreathingVolume);
      await s.replayAsync();
    }
  }
};

export const playEndingBellSound = async () => {
  await endingBellSound?.replayAsync();
};

/** Load, play, and unload the ending bell - for splash screen only. Does not rely on setupGuidedBreathingAudio. */
export const playSplashChime = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(sounds.endingBell);
    await sound.replayAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish && !status.isLooping) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    /* ignore - splash chime is non-critical */
  }
};

let voicePreviewSound: Audio.Sound | null = null;
let voicePreviewEncouragementIndex = 0;
let voicePreviewPlaying = false;

/** Play a short voice clip at the given volume for settings preview. Uses the given mode to pick female or male encouragement. */
export async function playVoiceVolumePreview(volume: number, mode: GuidedBreathingMode = "female"): Promise<void> {
  const v = Math.max(0, Math.min(1, volume));
  if (voicePreviewPlaying) {
    if (voicePreviewSound) {
      await voicePreviewSound.setVolumeAsync(v).catch(() => {});
    }
    return;
  }
  const encouragement =
    mode === "male"
      ? maleVoiceEncouragement
      : femaleVoiceEncouragement;
  if (encouragement.length === 0) return;
  const asset = encouragement[voicePreviewEncouragementIndex % encouragement.length];
  voicePreviewEncouragementIndex += 1;
  voicePreviewPlaying = true;
  try {
    const { sound } = await Audio.Sound.createAsync(asset, {
      shouldPlay: true,
      volume: v,
    });
    voicePreviewSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish && !status.isLooping) {
        voicePreviewPlaying = false;
        sound.unloadAsync().catch(() => {});
        if (voicePreviewSound === sound) voicePreviewSound = null;
      }
    });
  } catch (e) {
    voicePreviewPlaying = false;
    console.warn("Voice volume preview failed:", e);
  }
}
