import { Audio } from "expo-av";
import { sounds } from "@nowoo/assets/sounds";
import {
  femaleVoiceInhales,
  femaleVoiceExhales,
  femaleVoiceHold,
  femaleVoiceEncouragement,
  femaleVoiceTransition,
} from "@nowoo/assets/female-voice-assets";
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
  if (femaleTransitionSounds.length === 0) return;
  const count = 1; // single clip during interlude
  
  // Randomly select a transition clip each time instead of cycling sequentially
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * femaleTransitionSounds.length);
    const sound = femaleTransitionSounds[idx];
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

async function playFemaleEncouragement(): Promise<void> {
  if (femaleEncouragementSounds.length === 0) return;
  const idx = femaleEncouragementIndex % femaleEncouragementSounds.length;
  femaleEncouragementIndex++;
  const s = femaleEncouragementSounds[idx];
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
}

export const releaseGuidedBreathingAudio = async () => {
  clearEncouragementTimeout();
  const toUnload: (Audio.Sound | undefined)[] = [endingBellSound];
  if (bellBreatheInSound) toUnload.push(bellBreatheInSound);
  if (bellBreatheOutSound) toUnload.push(bellBreatheOutSound);
  if (bellHoldSound) toUnload.push(bellHoldSound);
  toUnload.push(...femaleInhaleSounds, ...femaleExhaleSounds, ...femaleHoldSounds);
  toUnload.push(...femaleEncouragementSounds, ...femaleTransitionSounds);
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
};

export const playGuidedBreathingSound = async (stepMetadata: StepMetadata) => {
  const { audioId, duration } = stepMetadata;

  if (audioId === "breatheIn" || audioId === "breatheOut" || audioId === "hold") {
    // Female mode (transition plays during countdown, not here)
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

let voicePreviewSound: Audio.Sound | null = null;
let voicePreviewEncouragementIndex = 0;
let voicePreviewPlaying = false;

/** Play a short voice clip at the given volume for settings preview, or adjust volume of the currently playing clip. Cycles through encouragement recordings when starting a new clip. */
export async function playVoiceVolumePreview(volume: number): Promise<void> {
  const v = Math.max(0, Math.min(1, volume));
  if (voicePreviewPlaying) {
    if (voicePreviewSound) {
      await voicePreviewSound.setVolumeAsync(v).catch(() => {});
    }
    return;
  }
  if (femaleVoiceEncouragement.length === 0) return;
  const asset = femaleVoiceEncouragement[voicePreviewEncouragementIndex % femaleVoiceEncouragement.length];
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
