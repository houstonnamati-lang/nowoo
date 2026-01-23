import { Audio } from "expo-av";
import { sounds } from "@breathly/assets/sounds";
import { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";

(async function () {
  Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
})();

export type GuidedBreathingStep = "breatheIn" | "breatheOut" | "hold";

type GuidedBreathingAudioSounds = {
  [key in GuidedBreathingMode]: {
    [key in GuidedBreathingStep]: any;
  };
};

const guidedBreathingAudioAssets: GuidedBreathingAudioSounds = {
  isabella: {
    breatheIn: sounds.isabellaBreatheIn,
    breatheOut: sounds.isabellaBreatheOut,
    hold: sounds.isabellaHold,
  },
  jameson: {
    breatheIn: sounds.jamesonBreatheIn,
    breatheOut: sounds.jamesonBreatheOut,
    hold: sounds.jamesonHold,
  },
  clara: {
    breatheIn: sounds.claraBreatheIn,
    breatheOut: sounds.claraBreatheOut,
    hold: sounds.claraHold,
  },
  marcus: {
    breatheIn: sounds.marcusBreatheIn,
    breatheOut: sounds.marcusBreatheOut,
    hold: sounds.marcusHold,
  },
  bell: {
    breatheIn: sounds.cueBell1,
    breatheOut: sounds.cueBell1,
    hold: sounds.cueBell2,
  },
  disabled: {
    breatheIn: undefined,
    breatheOut: undefined,
    hold: undefined,
  },
};

type CurrentGuidedBreathingSounds = {
  [key in GuidedBreathingStep]: Audio.Sound;
};

let currentGuidedBreathingSounds: CurrentGuidedBreathingSounds | undefined;
let endingBellSound: Audio.Sound | undefined;

export async function setupGuidedBreathingAudio(guidedBreathingMode: GuidedBreathingMode) {
  const [endingBellLoadResult, breatheInLoadResult, breatheOutLoadResult, holdLoadResult] =
    await Promise.all([
      Audio.Sound.createAsync(sounds.endingBell),
      Audio.Sound.createAsync(guidedBreathingAudioAssets[guidedBreathingMode].breatheIn),
      Audio.Sound.createAsync(guidedBreathingAudioAssets[guidedBreathingMode].breatheOut),
      Audio.Sound.createAsync(guidedBreathingAudioAssets[guidedBreathingMode].hold),
    ]);
  endingBellSound = endingBellLoadResult.sound;
  currentGuidedBreathingSounds = {
    breatheIn: breatheInLoadResult.sound,
    breatheOut: breatheOutLoadResult.sound,
    hold: holdLoadResult.sound,
  };
}

export const releaseGuidedBreathingAudio = async () => {
  await Promise.all([
    endingBellSound?.unloadAsync(),
    currentGuidedBreathingSounds?.breatheIn.unloadAsync(),
    currentGuidedBreathingSounds?.breatheOut.unloadAsync(),
    currentGuidedBreathingSounds?.hold.unloadAsync(),
  ]);
  endingBellSound = undefined;
  currentGuidedBreathingSounds = undefined;
};

export const playGuidedBreathingSound = async (guidedBreathingStep: GuidedBreathingStep) => {
  return currentGuidedBreathingSounds?.[guidedBreathingStep].playFromPositionAsync(0);
};

export const playEndingBellSound = async () => {
  return endingBellSound?.playFromPositionAsync(0);
};
