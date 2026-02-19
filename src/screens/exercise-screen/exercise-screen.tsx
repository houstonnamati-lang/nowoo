import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useKeepAwake } from "expo-keep-awake";
import { useColorScheme } from "nativewind";
import React, { FC, useMemo, useState } from "react";
import { Animated, Modal, Switch, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "@nowoo/common/pressable";
import { RootStackParamList } from "@nowoo/core/navigator";
import { colors } from "@nowoo/design/colors";
import { widestDeviceDimension } from "@nowoo/design/metrics";
import { AnimatedDots } from "@nowoo/screens/exercise-screen/animated-dots";
import { StepDescription } from "@nowoo/screens/exercise-screen/step-description";
import { setGuidedBreathingVolume } from "@nowoo/services/audio";
import { setToneVolumeMultiplier } from "@nowoo/services/frequency-tone";
import { useExerciseAudio } from "@nowoo/screens/exercise-screen/use-exercise-audio";
import { useExerciseHaptics } from "@nowoo/screens/exercise-screen/use-exercise-haptics";
import { useExerciseLoop } from "@nowoo/screens/exercise-screen/use-exercise-loop";
import { useFrequencyTone } from "@nowoo/screens/exercise-screen/use-frequency-tone";
import { useSelectedPatternSteps, useSettingsStore } from "@nowoo/stores/settings";
import { patternPresets } from "@nowoo/assets/pattern-presets";
import { StepMetadata } from "@nowoo/types/step-metadata";
import { animate } from "@nowoo/utils/animate";
import { buildStepsMetadata } from "@nowoo/utils/build-steps-metadata";
import { useOnUpdate } from "@nowoo/utils/use-on-update";
import { getActiveScheduleCategory } from "@nowoo/utils/schedule-utils";
import { recordActivity } from "@nowoo/services/activity-tracker";
import { useStreakStore } from "@nowoo/stores/streak";
import { BreathingAnimation } from "./breathing-animation";
import { ExerciseComplete } from "./complete";
import { ExerciseInterlude } from "./interlude";
import { PositiveWord } from "./positive-word";
import { Timer } from "./timer";

export type ExerciseStatus = "interlude" | "running" | "completed";

export const ExerciseScreen: FC<NativeStackScreenProps<RootStackParamList, "Exercise">> = ({
  navigation,
  route,
}) => {
  const customSettings = route.params?.customSettings;
  const mainGuidedBreathingVoice = useSettingsStore((state) => state.guidedBreathingVoice);
  const mainFrequencyTone = useSettingsStore((state) => state.frequencyTone);
  const scheduleRiseStartTime = useSettingsStore((state) => state.scheduleRiseStartTime);
  const scheduleRiseEndTime = useSettingsStore((state) => state.scheduleRiseEndTime);
  const scheduleResetStartTime = useSettingsStore((state) => state.scheduleResetStartTime);
  const scheduleResetEndTime = useSettingsStore((state) => state.scheduleResetEndTime);
  const scheduleRestoreStartTime = useSettingsStore((state) => state.scheduleRestoreStartTime);
  const scheduleRestoreEndTime = useSettingsStore((state) => state.scheduleRestoreEndTime);
  const scheduleRiseGuidedBreathingVoice = useSettingsStore((state) => state.scheduleRiseGuidedBreathingVoice);
  const scheduleResetGuidedBreathingVoice = useSettingsStore((state) => state.scheduleResetGuidedBreathingVoice);
  const scheduleRestoreGuidedBreathingVoice = useSettingsStore((state) => state.scheduleRestoreGuidedBreathingVoice);
  const mainVibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const scheduleRiseVibrationEnabled = useSettingsStore((state) => state.scheduleRiseVibrationEnabled);
  const scheduleResetVibrationEnabled = useSettingsStore((state) => state.scheduleResetVibrationEnabled);
  const scheduleRestoreVibrationEnabled = useSettingsStore((state) => state.scheduleRestoreVibrationEnabled);
  const scheduleRiseColor = useSettingsStore((state) => state.scheduleRiseColor);
  const scheduleResetColor = useSettingsStore((state) => state.scheduleResetColor);
  const scheduleRestoreColor = useSettingsStore((state) => state.scheduleRestoreColor);

  // Use custom settings if provided; otherwise check schedule overrides; else use main settings
  const guidedBreathingVoice = (() => {
    if (customSettings) {
      return customSettings.useDefaults 
        ? mainGuidedBreathingVoice 
        : (customSettings.guidedBreathingVoice ?? mainGuidedBreathingVoice);
    }
    // No custom session - check if active schedule has guided breathing override
    const activeCategory = getActiveScheduleCategory(
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    if (activeCategory === "rise" && scheduleRiseGuidedBreathingVoice !== null) {
      return scheduleRiseGuidedBreathingVoice;
    }
    if (activeCategory === "reset" && scheduleResetGuidedBreathingVoice !== null) {
      return scheduleResetGuidedBreathingVoice;
    }
    if (activeCategory === "restore" && scheduleRestoreGuidedBreathingVoice !== null) {
      return scheduleRestoreGuidedBreathingVoice;
    }
    return mainGuidedBreathingVoice;
  })();
  const frequencyTone = customSettings?.useDefaults
    ? mainFrequencyTone
    : (customSettings?.frequencyTone ?? mainFrequencyTone);
  
  // When no custom session and we're in a schedule window, use schedule tone+noise (Rise/Reset/Restore)
  const scheduleCategoryForAudio = (() => {
    if (customSettings) return null;
    return getActiveScheduleCategory(
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
  })();
  
  const [status, setStatus] = useState<ExerciseStatus>("interlude");
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(() =>
    useSettingsStore.getState().defaultVoiceVolume ?? 1
  );
  const [toneVolume, setToneVolume] = useState(() =>
    useSettingsStore.getState().defaultToneVolume ?? 1
  );
  const [hapticsOverride, setHapticsOverride] = useState<boolean | null>(null);
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  const computedVibrationEnabled = (() => {
    if (customSettings?.useDefaults) return mainVibrationEnabled;
    if (customSettings) return customSettings.vibrationEnabled ?? mainVibrationEnabled;
    const activeCategory = getActiveScheduleCategory(
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    if (activeCategory === "rise" && scheduleRiseVibrationEnabled !== null) return scheduleRiseVibrationEnabled;
    if (activeCategory === "reset" && scheduleResetVibrationEnabled !== null) return scheduleResetVibrationEnabled;
    if (activeCategory === "restore" && scheduleRestoreVibrationEnabled !== null) return scheduleRestoreVibrationEnabled;
    return mainVibrationEnabled;
  })();
  const effectiveVibrationEnabled = hapticsOverride !== null ? hapticsOverride : computedVibrationEnabled;

  const { playExerciseStepAudio, playExerciseCompletedAudio, playSessionTransitionClips, whenAudioReady } =
    useExerciseAudio(guidedBreathingVoice);
  useFrequencyTone(frequencyTone, status === "running" && !isPaused, scheduleCategoryForAudio);

  React.useEffect(() => {
    setGuidedBreathingVolume(voiceVolume);
    setToneVolumeMultiplier(toneVolume);
  }, [voiceVolume, toneVolume]);

  // Calculate breathing animation color based on active schedule
  const breathingAnimationColor = useMemo(() => {
    if (customSettings) {
      // Custom sessions use default color
      return colors.pastel.orange;
    }
    
    // Determine active schedule category for color
    const activeCategory = getActiveScheduleCategory(
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    
    // Use schedule-specific color if set
    if (activeCategory === "rise" && scheduleRiseColor) {
      return scheduleRiseColor;
    }
    if (activeCategory === "reset" && scheduleResetColor) {
      return scheduleResetColor;
    }
    if (activeCategory === "restore" && scheduleRestoreColor) {
      return scheduleRestoreColor;
    }
    
    // Default color
    return colors.pastel.orange;
  }, [
    customSettings,
    scheduleRiseStartTime,
    scheduleRiseEndTime,
    scheduleResetStartTime,
    scheduleResetEndTime,
    scheduleRestoreStartTime,
    scheduleRestoreEndTime,
    scheduleRiseColor,
    scheduleResetColor,
    scheduleRestoreColor,
  ]);

  useKeepAwake();

  const handleInterludeComplete = () => {
    setStatus("running");
    // Record activity when exercise starts
    recordActivity();
  };

  const handleExerciseStepChange = (stepMetadata: StepMetadata) => {
    playExerciseStepAudio(stepMetadata);
  };

  const incrementStreak = useStreakStore((state) => state.incrementStreak);

  const handleTimeLimitReached = () => {
    playExerciseCompletedAudio();
    setStatus("completed");
    // Record activity when exercise completes
    recordActivity();
    // Increment streak
    incrementStreak();
  };

  return (
    <View
      className="flex-1 flex-col justify-between"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: colorScheme === "dark" ? "#1a1a1a" : undefined,
      }}
    >
      {status === "interlude" && (
        <ExerciseInterlude
          onComplete={handleInterludeComplete}
          onCountdownStart={playSessionTransitionClips}
          whenAudioReady={whenAudioReady}
        />
      )}
      {status === "running" && (
        <>
          <ExerciseRunningFragment
            onTimeLimitReached={handleTimeLimitReached}
            onStepChange={handleExerciseStepChange}
            customSettings={customSettings}
            isPaused={isPaused}
            effectiveVibrationEnabled={effectiveVibrationEnabled}
            breathingAnimationColor={breathingAnimationColor}
          />
          <View className="flex-row items-center justify-center gap-4 pb-10 pt-6">
            <Pressable
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.7)",
                borderWidth: 1,
                borderColor: colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.1)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => {
                setIsPaused(true);
                setShowPauseDialog(true);
              }}
            >
              <Ionicons
                name="pause"
                size={26}
                color={colorScheme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.7)"}
              />
            </Pressable>
            <Pressable
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.7)",
                borderWidth: 1,
                borderColor: colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.1)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => setShowSettingsModal(true)}
            >
              <Ionicons
                name="settings-outline"
                size={26}
                color={colorScheme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.7)"}
              />
            </Pressable>
          </View>
        </>
      )}
      {status === "completed" && <ExerciseComplete />}

      <Modal
        visible={showPauseDialog}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPauseDialog(false);
          setIsPaused(false);
        }}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => {}}
          style={{ padding: 24 }}
        >
          <View
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              backgroundColor: colorScheme === "dark" ? "#2d2d2d" : "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text
              className="mb-4 text-center text-lg font-semibold"
              style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}
            >
              Exercise paused
            </Text>
            <Pressable
              className="mb-3 rounded-xl py-3"
              style={{ backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
              onPress={() => {
                setShowPauseDialog(false);
                setIsPaused(false);
              }}
            >
              <Text
                className="text-center text-base"
                style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}
              >
                Resume
              </Text>
            </Pressable>
            <Pressable
              className="mb-3 rounded-xl py-3"
              style={{ backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
              onPress={() => {
                setShowPauseDialog(false);
                setIsPaused(false);
                setStatus("interlude");
              }}
            >
              <Text
                className="text-center text-base"
                style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}
              >
                Restart
              </Text>
            </Pressable>
            <Pressable
              className="rounded-xl py-3"
              style={{ backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
              onPress={() => {
                setShowPauseDialog(false);
                setIsPaused(false);
                navigation.goBack();
              }}
            >
              <Text
                className="text-center text-base"
                style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}
              >
                Stop
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setShowSettingsModal(false)}
          style={{ padding: 24 }}
        >
          <Pressable
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              backgroundColor: colorScheme === "dark" ? "#2d2d2d" : "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="mb-4 text-center text-lg font-semibold"
              style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}
            >
              Settings
            </Text>
            <View className="mb-4">
              <Text className="mb-1" style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}>Voice volume</Text>
              <View className="flex-row items-center gap-3">
                <Slider
                  style={{ flex: 1, height: 24 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={voiceVolume}
                  onValueChange={(v) => {
                    setVoiceVolume(v);
                    setGuidedBreathingVolume(v);
                  }}
                  minimumTrackTintColor={colorScheme === "dark" ? "#81b0ff" : "#3b82f6"}
                  maximumTrackTintColor={colorScheme === "dark" ? "#444" : "#d1d5db"}
                  thumbTintColor={colorScheme === "dark" ? "#f5f5f5" : "#3b82f6"}
                />
                <Text style={{ minWidth: 36, color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}>
                  {Math.round(voiceVolume * 100)}%
                </Text>
              </View>
            </View>
            <View className="mb-4">
              <Text className="mb-1" style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}>Sound volume</Text>
              <View className="flex-row items-center gap-3">
                <Slider
                  style={{ flex: 1, height: 24 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={toneVolume}
                  onValueChange={(v) => {
                    setToneVolume(v);
                    setToneVolumeMultiplier(v);
                  }}
                  minimumTrackTintColor={colorScheme === "dark" ? "#81b0ff" : "#3b82f6"}
                  maximumTrackTintColor={colorScheme === "dark" ? "#444" : "#d1d5db"}
                  thumbTintColor={colorScheme === "dark" ? "#f5f5f5" : "#3b82f6"}
                />
                <Text style={{ minWidth: 36, color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}>
                  {Math.round(toneVolume * 100)}%
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <Text style={{ color: colorScheme === "dark" ? "#f5f5f5" : "#000" }}>Haptics</Text>
              <Switch
                value={effectiveVibrationEnabled}
                onValueChange={(v) => setHapticsOverride(v)}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={effectiveVibrationEnabled ? "#f5f5f5" : "#f4f3f4"}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

interface ExerciseRunningFragmentProps {
  onTimeLimitReached: () => unknown;
  onStepChange: (stepMetadata: StepMetadata) => unknown;
  customSettings?: import("@nowoo/screens/custom-session-setup-screen/custom-session-setup-screen").CustomSessionSettings;
  isPaused?: boolean;
  effectiveVibrationEnabled?: boolean;
  breathingAnimationColor: string;
}

const unmountAnimDuration = 300;

const ExerciseRunningFragment: FC<ExerciseRunningFragmentProps> = ({
  onTimeLimitReached,
  onStepChange,
  customSettings,
  isPaused = false,
  effectiveVibrationEnabled = true,
  breathingAnimationColor,
}) => {
  const {
    timeLimit: mainTimeLimit,
    customPatterns,
  } = useSettingsStore();
  const defaultSelectedPatternSteps = useSelectedPatternSteps();
  const [unmountContentAnimVal] = useState(new Animated.Value(1));
  
  // Get pattern steps - use custom if provided, otherwise use default
  const selectedPatternSteps = React.useMemo(() => {
    if (customSettings?.patternId) {
      const allPatterns = [...patternPresets, ...customPatterns];
      const pattern = allPatterns.find((p) => p.id === customSettings.patternId);
      return pattern?.steps ?? defaultSelectedPatternSteps;
    }
    return defaultSelectedPatternSteps;
  }, [customSettings?.patternId, customPatterns, defaultSelectedPatternSteps]);
  
  const stepsMetadata = buildStepsMetadata(selectedPatternSteps);

  const { currentStep, exerciseAnimVal, textAnimVal } = useExerciseLoop(stepsMetadata, isPaused);
  
  const effectiveTimeLimit = customSettings?.useDefaults
    ? mainTimeLimit
    : (customSettings?.timeLimit ?? mainTimeLimit);

  useOnUpdate(
    (prevStepMetadata) => {
      if (prevStepMetadata?.id !== currentStep.id) {
        onStepChange(currentStep);
      }
    },
    currentStep,
    true
  );

  useExerciseHaptics(currentStep, effectiveVibrationEnabled);

  const unmountContentAnimation = animate(unmountContentAnimVal, {
    toValue: 0,
    duration: unmountAnimDuration,
  });

  const handleTimeLimitReached = () => {
    unmountContentAnimation.start(({ finished }) => {
      if (finished) {
        onTimeLimitReached();
      }
    });
  };

  const contentAnimatedStyle = {
    opacity: unmountContentAnimVal,
  };

  return (
    <Animated.View style={contentAnimatedStyle} className="flex-1">
      <Timer
        limit={effectiveTimeLimit}
        onLimitReached={handleTimeLimitReached}
        paused={isPaused}
      />
      {currentStep && (
        <View className="flex-1 items-center justify-center">
          <PositiveWord />
          <BreathingAnimation 
            animationValue={exerciseAnimVal} 
            color={breathingAnimationColor}
          />
          <StepDescription label={currentStep.label} animationValue={textAnimVal} />
          <AnimatedDots
            numberOfDots={3}
            totalDuration={currentStep.duration}
            visible={currentStep.id === "afterInhale" || currentStep.id === "afterExhale"}
          />
        </View>
      )}
    </Animated.View>
  );
};
