import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import ms from "ms";
import React, { FC, useEffect, useState } from "react";
import { View, ScrollView, LayoutAnimation, Button, Platform, Text, Alert, Pressable, Modal, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { patternPresets } from "@nowoo/assets/pattern-presets";
import { DEFAULT_SCHEDULE_PATTERNS } from "@nowoo/utils/pattern-schedule-dots";
import { colors } from "@nowoo/design/colors";
import { SettingsStackParamList } from "@nowoo/core/navigator";
import { SettingsUI } from "@nowoo/screens/settings-screen/settings-ui";
import {
  useSelectedPatternSteps,
  useSelectedPatternName,
  useSettingsStore,
} from "@nowoo/stores/settings";
import { useAuthStore } from "@nowoo/stores/auth";
import { CalmingFrequencyMode, NoiseBedMode } from "@nowoo/types/frequency-tone-mode";
import { GuidedBreathingMode } from "@nowoo/types/guided-breathing-mode";
import { PatternPreset } from "@nowoo/types/pattern-preset";
import { validateScheduleTimeRange } from "@nowoo/utils/schedule-utils";
import { playVoiceVolumePreview } from "@nowoo/services/audio";
import { playVibrationStrengthPreview } from "@nowoo/screens/exercise-screen/use-exercise-haptics";
import {
  setupFrequencyTone,
  startFrequencyTone,
  stopFrequencyTone,
  releaseFrequencyTone,
  setToneVolumeMultiplier,
} from "@nowoo/services/frequency-tone";
import {
  ScheduleDots,
  FrequencyNoiseOptionLabel,
  FREQUENCY_BEST_FOR,
  NOISE_BEST_FOR,
} from "@nowoo/utils/pattern-schedule-dots";
import { ColorPicker } from "./color-picker";
import { BackgroundPicker } from "./background-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const customDurationLimits = [
  [ms("1 sec"), ms("99 sec")],
  [0, ms("99 sec")],
  [ms("1 sec"), ms("99 sec")],
  [0, ms("99 sec")],
];

const maxTimeLimit = ms("60 min");

type VolumeSliderRowProps = {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  colorScheme: "dark" | "light" | undefined;
  onSlidingStart?: () => void;
  /** Called when slide ends. Receives final value so store can be updated without causing re-renders during drag. */
  onSlidingComplete?: (finalValue: number) => void | Promise<void>;
  /** Throttle onValueChange to avoid audio glitches from rapid volume updates (ms) */
  throttleMs?: number;
};

const VolumeSliderRow: FC<VolumeSliderRowProps> = ({
  label,
  value,
  onValueChange,
  colorScheme,
  onSlidingStart,
  onSlidingComplete,
  throttleMs,
}) => {
  const textColor = colorScheme === "dark" ? "#ffffff" : undefined;
  const trackMin = colorScheme === "dark" ? "#81b0ff" : colors["blue-500"];
  const trackMax = colorScheme === "dark" ? "#38383a" : "#e7e5e4";
  const thumb = colorScheme === "dark" ? "#f5f5f5" : colors["blue-500"];

  // Use local state during slide to avoid store updates triggering Slider value prop changes
  // (which can re-fire onSlidingStart and restart audio)
  const [localValue, setLocalValue] = React.useState(value);
  const [isSliding, setIsSliding] = React.useState(false);
  const latestValueRef = React.useRef(value);
  const lastVolumeUpdateRef = React.useRef(0);
  React.useEffect(() => {
    if (!isSliding) setLocalValue(value);
    latestValueRef.current = value;
  }, [value, isSliding]);

  const displayValue = isSliding ? localValue : value;

  const handleValueChange = React.useCallback(
    (v: number) => {
      setLocalValue(v);
      latestValueRef.current = v;
      if (throttleMs != null) {
        const now = Date.now();
        if (now - lastVolumeUpdateRef.current >= throttleMs) {
          lastVolumeUpdateRef.current = now;
          onValueChange(v);
        }
      } else {
        onValueChange(v);
      }
    },
    [onValueChange, throttleMs]
  );

  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
      <Text style={{ marginBottom: 6, color: textColor }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Slider
          style={{ flex: 1, height: 24 }}
          minimumValue={0}
          maximumValue={1}
          value={displayValue}
          onValueChange={handleValueChange}
          onSlidingStart={() => {
            setIsSliding(true);
            onSlidingStart?.();
          }}
          onSlidingComplete={() => {
            const finalValue = latestValueRef.current;
            setIsSliding(false);
            onSlidingComplete?.(finalValue);
          }}
          minimumTrackTintColor={trackMin}
          maximumTrackTintColor={trackMax}
          thumbTintColor={thumb}
        />
        <Text style={{ minWidth: 40, color: textColor }}>{Math.round(displayValue * 100)}%</Text>
      </View>
    </View>
  );
};

export const SettingsRootScreen: FC<
  NativeStackScreenProps<SettingsStackParamList, "SettingsRoot">
> = ({ navigation }) => {
  console.log("SettingsRootScreen RENDERED");
  const [showQuickBreathSheet, setShowQuickBreathSheet] = useState(false);
  const [quickBreathSubmenu, setQuickBreathSubmenu] = useState<"main" | "sounds" | "appearance">("main");
  const insets = useSafeAreaInsets();
  
  const selectedPatternName = useSelectedPatternName();
  const selectedPatternDurations = useSelectedPatternSteps();
  const guidedBreathingVoice = useSettingsStore((state) => state.guidedBreathingVoice);
  const setGuidedBreathingVoice = useSettingsStore((state) => state.setGuidedBreathingVoice);
  const defaultVoiceVolume = useSettingsStore((state) => state.defaultVoiceVolume);
  const setDefaultVoiceVolume = useSettingsStore((state) => state.setDefaultVoiceVolume);
  const defaultToneVolume = useSettingsStore((state) => state.defaultToneVolume);
  const setDefaultToneVolume = useSettingsStore((state) => state.setDefaultToneVolume);
  const calmingFrequency = useSettingsStore((state) => state.calmingFrequency);
  const noiseBed = useSettingsStore((state) => state.noiseBed);
  const setCalmingFrequency = useSettingsStore((state) => state.setCalmingFrequency);
  const setNoiseBed = useSettingsStore((state) => state.setNoiseBed);
  const exerciseBackgroundColor = useSettingsStore((state) => state.exerciseBackgroundColor);
  const setExerciseBackgroundColor = useSettingsStore((state) => state.setExerciseBackgroundColor);
  const exerciseBackgroundImage = useSettingsStore((state) => state.exerciseBackgroundImage);
  const setExerciseBackgroundImage = useSettingsStore((state) => state.setExerciseBackgroundImage);
  const exerciseAnimationColor = useSettingsStore((state) => state.exerciseAnimationColor);
  const setExerciseAnimationColor = useSettingsStore((state) => state.setExerciseAnimationColor);
  const timeLimit = useSettingsStore((state) => state.timeLimit);
  const setTimeLimit = useSettingsStore((state) => state.setTimeLimit);
  const shouldFollowSystemDarkMode = useSettingsStore((state) => state.shouldFollowSystemDarkMode);
  const setShouldFollowSystemDarkMode = useSettingsStore(
    (state) => state.setShouldFollowSystemDarkMode
  );
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const setVibrationEnabled = useSettingsStore((state) => state.setVibrationEnabled);
  const vibrationStrength = useSettingsStore((state) => state.vibrationStrength);
  const setVibrationStrength = useSettingsStore((state) => state.setVibrationStrength);
  const scheduleRise = useSettingsStore((state) => state.scheduleRise);
  const setScheduleRise = useSettingsStore((state) => state.setScheduleRise);
  const scheduleReset = useSettingsStore((state) => state.scheduleReset);
  const setScheduleReset = useSettingsStore((state) => state.setScheduleReset);
  const scheduleRestore = useSettingsStore((state) => state.scheduleRestore);
  const setScheduleRestore = useSettingsStore((state) => state.setScheduleRestore);
  const scheduleRiseStartTime = useSettingsStore((state) => state.scheduleRiseStartTime);
  const scheduleRiseEndTime = useSettingsStore((state) => state.scheduleRiseEndTime);
  const scheduleResetStartTime = useSettingsStore((state) => state.scheduleResetStartTime);
  const scheduleResetEndTime = useSettingsStore((state) => state.scheduleResetEndTime);
  const scheduleRestoreStartTime = useSettingsStore((state) => state.scheduleRestoreStartTime);
  const scheduleRestoreEndTime = useSettingsStore((state) => state.scheduleRestoreEndTime);
  const customPatterns = useSettingsStore((state) => state.customPatterns);

  const { colorScheme } = useColorScheme();

  const allPatterns = [...patternPresets, ...customPatterns];

  const soundSliderStartRef = React.useRef(0);
  const handleSoundSliderStart = async () => {
    soundSliderStartRef.current = Date.now();
    const cf = calmingFrequency === "disabled" ? "200hz" : calmingFrequency;
    await setupFrequencyTone(cf, noiseBed);
    setToneVolumeMultiplier(defaultToneVolume);
    await startFrequencyTone({ quickFade: true });
  };

  const handleSoundSliderComplete = async () => {
    const elapsed = Date.now() - soundSliderStartRef.current;
    const minPreviewMs = 1200;
    if (elapsed < minPreviewMs) {
      await new Promise((r) => setTimeout(r, minPreviewMs - elapsed));
    }
    await stopFrequencyTone();
    await releaseFrequencyTone();
  };

  useEffect(() => {
    return () => {
      releaseFrequencyTone();
    };
  }, []);

  // Helper function to format time for display
  const formatTimeForDisplay = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? "AM" : "PM";
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  React.useEffect(() => {
    console.log("SettingsRootScreen useEffect - setting header");
    if (Platform.OS === "ios") {
      navigation.setOptions({
        headerRight: () => <Button onPress={navigation.goBack} title="Done" />,
      });
    }
  }, [navigation]);

  console.log("SettingsRootScreen returning JSX, colorScheme:", colorScheme);

  const bgColor = colorScheme === "dark" ? "#000000" : colors["stone-100"];
  return (
    <View
      style={{ 
        flex: 1,
        backgroundColor: bgColor,
      }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: bgColor }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
          paddingBottom: 20,
          backgroundColor: bgColor,
        }}
      >
        <SettingsUI.Section label="Schedule" hideBottomBorderAndroid>
            <SettingsUI.LinkItem
              label="Rise"
              iconName="sunny"
              iconBackgroundColor="#fbbf24"
              value={(() => {
                const hasTime = scheduleRiseStartTime && scheduleRiseEndTime;
                if (!hasTime) return "Not configured";
                return `${formatTimeForDisplay(scheduleRiseStartTime)} - ${formatTimeForDisplay(scheduleRiseEndTime)}`;
              })()}
              onPress={() => navigation.navigate("SettingsScheduleRise")}
            />
            <SettingsUI.LinkItem
              label="Reset"
              iconName="refresh"
              iconBackgroundColor="#60a5fa"
              value={(() => {
                const hasTime = scheduleResetStartTime && scheduleResetEndTime;
                if (!hasTime) return "Not configured";
                return `${formatTimeForDisplay(scheduleResetStartTime)} - ${formatTimeForDisplay(scheduleResetEndTime)}`;
              })()}
              onPress={() => navigation.navigate("SettingsScheduleReset")}
            />
            <SettingsUI.LinkItem
              label="Restore"
              iconName="moon"
              iconBackgroundColor="#a78bfa"
              value={(() => {
                const hasTime = scheduleRestoreStartTime && scheduleRestoreEndTime;
                if (!hasTime) return "Not configured";
                return `${formatTimeForDisplay(scheduleRestoreStartTime)} - ${formatTimeForDisplay(scheduleRestoreEndTime)}`;
              })()}
              onPress={() => navigation.navigate("SettingsScheduleRestore")}
            />
          </SettingsUI.Section>
          <SettingsUI.Section label="Quick Breath">
            <SettingsUI.LinkItem
              label="Quick Breath"
              iconName="heart"
              iconBackgroundColor="#94a3b8"
              value="Patterns, Sounds, Appearance, Timer"
              onPress={() => {
                setQuickBreathSubmenu("main");
                setShowQuickBreathSheet(true);
              }}
            />
          </SettingsUI.Section>
          <SettingsUI.Section label="Appearance">
            <SettingsUI.SwitchItem
              label="Use system theme"
              secondaryLabel="Follow system light/dark mode"
              iconName="sunny"
              iconBackgroundColor="#a5b4fc"
              value={shouldFollowSystemDarkMode}
              onValueChange={setShouldFollowSystemDarkMode}
            />
            {!shouldFollowSystemDarkMode && (
              <SettingsUI.PickerItem
                label="Theme"
                iconName="color-palette"
                iconBackgroundColor="#d8b4fe"
                options={[
                  { value: "light", label: "Light theme" },
                  { value: "dark", label: "Dark theme" },
                ]}
                value={theme}
                onValueChange={setTheme}
              />
            )}
          </SettingsUI.Section>
          <SettingsUI.Section label="Development">
            <SettingsUI.LinkItem
              label="Reset Authentication"
              iconName="refresh"
              iconBackgroundColor="#ef4444"
              value=""
              onPress={async () => {
                const { resetAuth } = useAuthStore.getState();
                const { signOut } = await import("firebase/auth");
                const { getFirebaseAuth } = await import("@nowoo/config/firebase");
                try {
                  const auth = getFirebaseAuth();
                  await signOut(auth);
                } catch (e) {
                  // Ignore sign out errors
                }
                resetAuth();
                Alert.alert("Auth Reset", "Authentication state has been reset. Please restart the app.");
              }}
            />
          </SettingsUI.Section>
        </ScrollView>

        <Modal
          visible={showQuickBreathSheet}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQuickBreathSheet(false)}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              onPress={() => {
                setShowQuickBreathSheet(false);
                setQuickBreathSubmenu("main");
              }}
            />
            <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: bgColor,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: Dimensions.get("window").height * 0.75,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: colorScheme === "dark" ? "#333" : "#ccc",
                  borderRadius: 2,
                }}
              />
            </View>
            {quickBreathSubmenu !== "main" && (
              <Pressable
                onPress={() => setQuickBreathSubmenu("main")}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 8 }}
              >
                <Ionicons name="chevron-back" size={24} color={colorScheme === "dark" ? "#007AFF" : colors["blue-500"]} />
                <Text style={{ color: colorScheme === "dark" ? "#007AFF" : colors["blue-500"], fontSize: 17, marginLeft: 4 }}>
                  Back
                </Text>
              </Pressable>
            )}
            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ paddingHorizontal: Platform.OS === "android" ? undefined : 18 }}
            >
              {quickBreathSubmenu === "main" && (
                <>
                  <SettingsUI.Section label="Quick Breath">
                    <SettingsUI.LinkItem
                      label="Patterns"
                      iconName="body"
                      iconBackgroundColor="#bfdbfe"
                      value={(() => {
                        const hasIntervalsInName = selectedPatternName.includes("(") && selectedPatternName.includes(")");
                        return hasIntervalsInName
                          ? selectedPatternName
                          : `${selectedPatternName} (${selectedPatternDurations.map((d) => d / ms("1 sec")).join("-")})`;
                      })()}
                      onPress={() => {
                        setShowQuickBreathSheet(false);
                        navigation.navigate("SettingsPatternPicker");
                      }}
                    />
                    <SettingsUI.LinkItem
                      label="Sounds & Haptics"
                      iconName="volume-medium"
                      iconBackgroundColor="#fdba74"
                      value=""
                      onPress={() => setQuickBreathSubmenu("sounds")}
                    />
                    <SettingsUI.LinkItem
                      label="Appearance"
                      iconName="color-palette"
                      iconBackgroundColor="#a5b4fc"
                      value=""
                      onPress={() => setQuickBreathSubmenu("appearance")}
                    />
                  </SettingsUI.Section>
                  <SettingsUI.Section label="Timer" hideBottomBorderAndroid>
                    <SettingsUI.StepperItem
                      label="Exercise timer"
                      secondaryLabel="Time limit in minutes"
                      iconName="timer"
                      iconBackgroundColor="#fb7185"
                      value={timeLimit > 0 ? timeLimit / ms("1 min") : "∞"}
                      fractionDigits={1}
                      decreaseDisabled={timeLimit <= 0}
                      increaseDisabled={timeLimit >= maxTimeLimit}
                      onIncrease={() => setTimeLimit(Math.min(maxTimeLimit, timeLimit + ms("0.5 min")))}
                      onDecrease={() => setTimeLimit(Math.max(0, timeLimit - ms("0.5 min")))}
                    />
                  </SettingsUI.Section>
                </>
              )}
              {quickBreathSubmenu === "sounds" && (
                <SettingsUI.Section label="Sounds & Haptics">
                  <SettingsUI.PickerItem
                    label="Guided breathing"
                    iconName="volume-medium"
                    iconBackgroundColor="#fdba74"
                    value={guidedBreathingVoice}
                    options={[
                      { value: "female", label: "Female" },
                      { value: "bell", label: "Bell" },
                      { value: "disabled", label: "Disabled" },
                    ] as { value: GuidedBreathingMode; label: string }[]}
                    onValueChange={setGuidedBreathingVoice}
                  />
                  <SettingsUI.PickerItem
                    label="Calming frequency"
                    iconName="musical-notes"
                    iconBackgroundColor="#60a5fa"
                    value={calmingFrequency}
                    options={[
                      { value: "200hz", label: <FrequencyNoiseOptionLabel text="200 Hz" categories={FREQUENCY_BEST_FOR["200hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "136hz", label: <FrequencyNoiseOptionLabel text="136 Hz" categories={FREQUENCY_BEST_FOR["136hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "100hz", label: <FrequencyNoiseOptionLabel text="100 Hz" categories={FREQUENCY_BEST_FOR["100hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "disabled", label: "Disabled" },
                    ]}
                    onValueChange={setCalmingFrequency}
                  />
                  <SettingsUI.PickerItem
                    label="Noise bed"
                    iconName="musical-notes"
                    iconBackgroundColor="#60a5fa"
                    value={noiseBed}
                    options={[
                      { value: "brown", label: <FrequencyNoiseOptionLabel text="Brown noise" categories={NOISE_BEST_FOR.brown} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "green", label: <FrequencyNoiseOptionLabel text="Green noise" categories={NOISE_BEST_FOR.green} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "pink", label: <FrequencyNoiseOptionLabel text="Pink noise" categories={NOISE_BEST_FOR.pink} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "disabled", label: "Disabled" },
                    ]}
                    onValueChange={setNoiseBed}
                  />
                  <VolumeSliderRow
                    label="Voice volume"
                    value={defaultVoiceVolume}
                    onValueChange={(v) => {
                      setDefaultVoiceVolume(v);
                      playVoiceVolumePreview(v);
                    }}
                    colorScheme={colorScheme}
                  />
                  <VolumeSliderRow
                    label="Sound volume"
                    value={defaultToneVolume}
                    onValueChange={(v) => setToneVolumeMultiplier(v)}
                    onSlidingStart={handleSoundSliderStart}
                    onSlidingComplete={async (finalValue) => {
                      setToneVolumeMultiplier(finalValue);
                      setDefaultToneVolume(finalValue);
                      await handleSoundSliderComplete();
                    }}
                    colorScheme={colorScheme}
                    throttleMs={80}
                  />
                  <SettingsUI.SwitchItem
                    label="Vibration"
                    secondaryLabel="Vibrate for step indication"
                    iconName="ellipse"
                    iconBackgroundColor="aquamarine"
                    value={vibrationEnabled}
                    onValueChange={setVibrationEnabled}
                  />
                  <VolumeSliderRow
                    label="Vibration strength"
                    value={vibrationStrength}
                    onValueChange={(v) => {
                      setVibrationStrength(v);
                      playVibrationStrengthPreview(v);
                    }}
                    onSlidingComplete={(finalValue) => { setVibrationStrength(finalValue); }}
                    colorScheme={colorScheme}
                    throttleMs={120}
                  />
                </SettingsUI.Section>
              )}
              {quickBreathSubmenu === "appearance" && (
                <SettingsUI.Section label="Appearance">
                  <ColorPicker
                    selectedColor={exerciseAnimationColor}
                    onColorChange={setExerciseAnimationColor}
                    label="Breathing animation color"
                    iconName="color-palette"
                    iconBackgroundColor="#a5b4fc"
                  />
                  <BackgroundPicker
                    backgroundColor={exerciseBackgroundColor}
                    onBackgroundColorChange={setExerciseBackgroundColor}
                    backgroundImage={exerciseBackgroundImage}
                    onBackgroundImageChange={setExerciseBackgroundImage}
                  />
                </SettingsUI.Section>
              )}
            </ScrollView>
          </View>
          </View>
        </Modal>
    </View>
  );
};

type DefaultSettingsScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  "SettingsDefaultSettings"
>;

export const SettingsDefaultSettingsScreen: FC<DefaultSettingsScreenProps> = () => {
  const { colorScheme } = useColorScheme();
  const guidedBreathingVoice = useSettingsStore((state) => state.guidedBreathingVoice);
  const setGuidedBreathingVoice = useSettingsStore((state) => state.setGuidedBreathingVoice);
  const defaultVoiceVolume = useSettingsStore((state) => state.defaultVoiceVolume);
  const setDefaultVoiceVolume = useSettingsStore((state) => state.setDefaultVoiceVolume);
  const defaultToneVolume = useSettingsStore((state) => state.defaultToneVolume);
  const setDefaultToneVolume = useSettingsStore((state) => state.setDefaultToneVolume);
  const calmingFrequency = useSettingsStore((state) => state.calmingFrequency);
  const setCalmingFrequency = useSettingsStore((state) => state.setCalmingFrequency);
  const noiseBed = useSettingsStore((state) => state.noiseBed);
  const setNoiseBed = useSettingsStore((state) => state.setNoiseBed);
  const exerciseBackgroundColor = useSettingsStore((state) => state.exerciseBackgroundColor);
  const setExerciseBackgroundColor = useSettingsStore((state) => state.setExerciseBackgroundColor);
  const exerciseBackgroundImage = useSettingsStore((state) => state.exerciseBackgroundImage);
  const setExerciseBackgroundImage = useSettingsStore((state) => state.setExerciseBackgroundImage);
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const setVibrationEnabled = useSettingsStore((state) => state.setVibrationEnabled);
  const vibrationStrength = useSettingsStore((state) => state.vibrationStrength);
  const setVibrationStrength = useSettingsStore((state) => state.setVibrationStrength);
  const timeLimit = useSettingsStore((state) => state.timeLimit);
  const setTimeLimit = useSettingsStore((state) => state.setTimeLimit);

  const soundSliderStartRef = React.useRef(0);
  const handleSoundSliderStart = async () => {
    soundSliderStartRef.current = Date.now();
    const cf = calmingFrequency === "disabled" ? "200hz" : calmingFrequency;
    await setupFrequencyTone(cf, noiseBed);
    setToneVolumeMultiplier(defaultToneVolume);
    await startFrequencyTone({ quickFade: true });
  };

  const handleSoundSliderComplete = async () => {
    const elapsed = Date.now() - soundSliderStartRef.current;
    const minPreviewMs = 1200;
    if (elapsed < minPreviewMs) {
      await new Promise((r) => setTimeout(r, minPreviewMs - elapsed));
    }
    await stopFrequencyTone();
    await releaseFrequencyTone();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colorScheme === "dark" ? "#000000" : colors["stone-100"],
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
          paddingBottom: 20,
        }}
      >
        <SettingsUI.Section label="Sounds">
          <SettingsUI.PickerItem
            label="Guided breathing"
            iconName="volume-medium"
            iconBackgroundColor="#fdba74"
            value={guidedBreathingVoice}
            options={
              [
                { value: "female", label: "Female" },
                { value: "bell", label: "Bell" },
                { value: "disabled", label: "Disabled" },
              ] as { value: GuidedBreathingMode; label: string }[]
            }
            onValueChange={setGuidedBreathingVoice}
          />
          <SettingsUI.PickerItem
            label="Calming frequency"
            iconName="musical-notes"
            iconBackgroundColor="#60a5fa"
            value={calmingFrequency}
            options={[
              { value: "200hz", label: <FrequencyNoiseOptionLabel text="200 Hz" categories={FREQUENCY_BEST_FOR["200hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
              { value: "136hz", label: <FrequencyNoiseOptionLabel text="136 Hz" categories={FREQUENCY_BEST_FOR["136hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
              { value: "100hz", label: <FrequencyNoiseOptionLabel text="100 Hz" categories={FREQUENCY_BEST_FOR["100hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
              { value: "disabled", label: "Disabled" },
            ]}
            onValueChange={setCalmingFrequency}
          />
          <SettingsUI.PickerItem
            label="Noise bed"
            iconName="musical-notes"
            iconBackgroundColor="#60a5fa"
            value={noiseBed}
            options={[
              { value: "brown", label: <FrequencyNoiseOptionLabel text="Brown noise" categories={NOISE_BEST_FOR.brown} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
              { value: "green", label: <FrequencyNoiseOptionLabel text="Green noise" categories={NOISE_BEST_FOR.green} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
              { value: "pink", label: <FrequencyNoiseOptionLabel text="Pink noise" categories={NOISE_BEST_FOR.pink} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
              { value: "disabled", label: "Disabled" },
            ]}
            onValueChange={setNoiseBed}
          />
          <VolumeSliderRow
            label="Voice volume"
            value={defaultVoiceVolume}
            onValueChange={(v) => {
              setDefaultVoiceVolume(v);
              playVoiceVolumePreview(v);
            }}
            colorScheme={colorScheme}
          />
          <VolumeSliderRow
            label="Sound volume"
            value={defaultToneVolume}
            onValueChange={(v) => setToneVolumeMultiplier(v)}
            onSlidingStart={handleSoundSliderStart}
            onSlidingComplete={async (finalValue) => {
              setToneVolumeMultiplier(finalValue);
              setDefaultToneVolume(finalValue);
              await handleSoundSliderComplete();
            }}
            colorScheme={colorScheme}
            throttleMs={80}
          />
        </SettingsUI.Section>
        <SettingsUI.Section label="Exercise Background">
          <BackgroundPicker
            backgroundColor={exerciseBackgroundColor}
            onBackgroundColorChange={setExerciseBackgroundColor}
            backgroundImage={exerciseBackgroundImage}
            onBackgroundImageChange={setExerciseBackgroundImage}
          />
        </SettingsUI.Section>
        <SettingsUI.Section label="Haptics">
          <SettingsUI.SwitchItem
            label="Vibration"
            secondaryLabel="Vibrate for step indication"
            iconName="ellipse"
            iconBackgroundColor="aquamarine"
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
          />
          <VolumeSliderRow
            label="Vibration strength"
            value={vibrationStrength}
            onValueChange={(v) => {
              setVibrationStrength(v);
              playVibrationStrengthPreview(v);
            }}
            onSlidingComplete={(finalValue) => { setVibrationStrength(finalValue); }}
            colorScheme={colorScheme}
            throttleMs={120}
          />
        </SettingsUI.Section>
        <SettingsUI.Section label="Timer" hideBottomBorderAndroid>
          <SettingsUI.StepperItem
            label="Exercise timer"
            secondaryLabel="Time limit in minutes"
            value={timeLimit > 0 ? timeLimit / ms("1 min") : "∞"}
            fractionDigits={1}
            iconName="timer"
            iconBackgroundColor="#fb7185"
            onIncrease={() => {
              const newLimit = Math.min(maxTimeLimit, timeLimit + ms("0.5 min"));
              setTimeLimit(newLimit);
            }}
            onDecrease={() => {
              const newLimit = Math.max(0, timeLimit - ms("0.5 min"));
              setTimeLimit(newLimit);
            }}
            decreaseDisabled={timeLimit <= 0}
            increaseDisabled={timeLimit >= maxTimeLimit}
          />
        </SettingsUI.Section>
      </ScrollView>
    </View>
  );
};

export const SettingsPatternPickerScreen: FC<
  NativeStackScreenProps<SettingsStackParamList, "SettingsPatternPicker">
> = () => {
  const {
    customPatternEnabled,
    setCustomPatternEnabled,
    customPatternSteps: customPatternDurations,
    setCustomPatternStep: setCustomPatternDurationsStep,
    selectedPatternPresetId,
    setSelectedPatternPresetId,
    customPatterns,
    addCustomPattern,
    removeCustomPattern,
    customPatternTitle,
    setCustomPatternTitle,
    customPatternDescription,
    setCustomPatternDescription,
  } = useSettingsStore();
  const { colorScheme } = useColorScheme();

  const handleSaveCustomPattern = () => {
    const stepValues = customPatternDurations.map((duration) => duration / ms("1 sec"));
    const defaultName = `Custom (${stepValues.join("-")})`;
    const patternName = customPatternTitle.trim() || defaultName;
    const patternDescription = customPatternDescription.trim() || "";

    const newPattern: PatternPreset = {
      id: `custom-${Date.now()}`,
      name: patternName,
      steps: customPatternDurations,
      description: patternDescription,
    };

    addCustomPattern(newPattern);
    setCustomPatternTitle("");
    setCustomPatternDescription("");
    setCustomPatternEnabled(false);
    setSelectedPatternPresetId(newPattern.id);

    Alert.alert("Pattern Saved", `"${patternName}" has been saved successfully.`);
  };
  return (
    <View
      style={{ 
        flex: 1, 
        backgroundColor: colorScheme === "dark" ? "#000000" : colors["stone-100"] 
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
          paddingBottom: 20,
        }}
      >
        <SettingsUI.Section label="Custom pattern">
            <SettingsUI.SwitchItem
              label="Custom breathing pattern"
              iconName="person"
              iconBackgroundColor="#60a5fa"
              value={customPatternEnabled}
              onValueChange={(newValue) => {
                LayoutAnimation.easeInEaseOut();
                setCustomPatternEnabled(newValue);
              }}
            />
            {customPatternEnabled &&
              customPatternDurations.map((stepValue, stepIndex) => {
                const [lowerLimit, upperLimit] = customDurationLimits[stepIndex];
                const stepLabel = ["Inhale", "Hold", "Exhale", "Hold"][stepIndex];
                return (
                  <SettingsUI.StepperItem
                    key={stepIndex}
                    label={stepLabel}
                    value={stepValue / ms("1 sec")}
                    fractionDigits={1}
                    secondaryLabel={"Time in seconds"}
                    decreaseDisabled={stepValue <= lowerLimit}
                    increaseDisabled={stepValue >= upperLimit}
                    onIncrease={() =>
                      setCustomPatternDurationsStep(stepIndex, stepValue + ms("0.5 sec"))
                    }
                    onDecrease={() =>
                      setCustomPatternDurationsStep(stepIndex, stepValue + -ms("0.5 sec"))
                    }
                  />
                );
              })}
            {customPatternEnabled && (
              <>
                <SettingsUI.TextInputItem
                  label="Title"
                  placeholder="Optional"
                  value={customPatternTitle}
                  onValueChange={setCustomPatternTitle}
                />
                <SettingsUI.TextInputItem
                  label="Description"
                  placeholder="Optional"
                  value={customPatternDescription}
                  onValueChange={setCustomPatternDescription}
                  multiline
                />
                <Pressable
                  onPress={handleSaveCustomPattern}
                  style={{
                    marginTop: 16,
                    marginBottom: 16,
                    marginHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: colorScheme === "dark" ? "#007AFF" : colors["blue-500"],
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Save Pattern
                  </Text>
                </Pressable>
              </>
            )}
          </SettingsUI.Section>
          <SettingsUI.Section label="Pattern presets" hideBottomBorderAndroid>
            {patternPresets.map((patternPreset) => {
              return (
                <SettingsUI.RadioButtonItem
                  key={patternPreset.id}
                  disabled={customPatternEnabled}
                  selected={!customPatternEnabled && selectedPatternPresetId === patternPreset.id}
                  onPress={() => setSelectedPatternPresetId(patternPreset.id)}
                  label={`${patternPreset.name} (${patternPreset.steps
                    .map((duration) => duration / ms("1 sec"))
                    .join("-")})`}
                  secondaryLabel={patternPreset.description}
                  labelRight={<ScheduleDots patternId={patternPreset.id} />}
                />
              );
            })}
          </SettingsUI.Section>
          {customPatterns.length > 0 && (
            <SettingsUI.Section label="Custom patterns" hideBottomBorderAndroid>
              {customPatterns.map((patternPreset) => {
                // Check if the name already contains intervals (like "Custom (4-2-4-2)")
                const hasIntervalsInName = patternPreset.name.includes("(") && patternPreset.name.includes(")");
                const displayLabel = hasIntervalsInName
                  ? patternPreset.name
                  : `${patternPreset.name} (${patternPreset.steps
                      .map((duration) => duration / ms("1 sec"))
                      .join("-")})`;
                return (
                  <View key={patternPreset.id} style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <SettingsUI.RadioButtonItem
                        disabled={customPatternEnabled}
                        selected={!customPatternEnabled && selectedPatternPresetId === patternPreset.id}
                        onPress={() => setSelectedPatternPresetId(patternPreset.id)}
                        label={displayLabel}
                        secondaryLabel={patternPreset.description}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Delete Pattern",
                          `Are you sure you want to delete "${patternPreset.name}"?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => {
                                removeCustomPattern(patternPreset.id);
                                // If this was the selected pattern, switch to default
                                if (selectedPatternPresetId === patternPreset.id) {
                                  setSelectedPatternPresetId("square");
                                }
                              },
                            },
                          ]
                        );
                      }}
                      style={{
                        padding: 8,
                        marginRight: Platform.OS === "ios" ? 16 : 8,
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color={colorScheme === "dark" ? "#ff3b30" : "#ff3b30"}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </SettingsUI.Section>
          )}
        </ScrollView>
      </View>
  );
};

// Helper function to generate time options
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? "AM" : "PM";
      const displayLabel = `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
      options.push({ value: timeString, label: displayLabel });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

type ScheduleScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  "SettingsScheduleRise" | "SettingsScheduleReset" | "SettingsScheduleRestore"
>;

type ScheduleSubmenu = "main" | "patterns" | "sounds" | "appearance";

export const SettingsScheduleRiseScreen: FC<ScheduleScreenProps> = ({ navigation }) => {
  const { colorScheme } = useColorScheme();
  const [submenu, setSubmenu] = useState<ScheduleSubmenu>("main");
  const customPatterns = useSettingsStore((state) => state.customPatterns);
  const scheduleRise = useSettingsStore((state) => state.scheduleRise);
  const setScheduleRise = useSettingsStore((state) => state.setScheduleRise);
  const scheduleRiseStartTime = useSettingsStore((state) => state.scheduleRiseStartTime);
  const setScheduleRiseStartTime = useSettingsStore((state) => state.setScheduleRiseStartTime);
  const scheduleRiseEndTime = useSettingsStore((state) => state.scheduleRiseEndTime);
  const setScheduleRiseEndTime = useSettingsStore((state) => state.setScheduleRiseEndTime);
  const scheduleResetStartTime = useSettingsStore((state) => state.scheduleResetStartTime);
  const scheduleResetEndTime = useSettingsStore((state) => state.scheduleResetEndTime);
  const scheduleRestoreStartTime = useSettingsStore((state) => state.scheduleRestoreStartTime);
  const scheduleRestoreEndTime = useSettingsStore((state) => state.scheduleRestoreEndTime);
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const vibrationStrength = useSettingsStore((state) => state.vibrationStrength);
  const scheduleRiseVibrationEnabled = useSettingsStore((state) => state.scheduleRiseVibrationEnabled);
  const setScheduleRiseVibrationEnabled = useSettingsStore((state) => state.setScheduleRiseVibrationEnabled);
  const scheduleRiseVibrationStrength = useSettingsStore((state) => state.scheduleRiseVibrationStrength);
  const setScheduleRiseVibrationStrength = useSettingsStore((state) => state.setScheduleRiseVibrationStrength);
  const guidedBreathingVoice = useSettingsStore((state) => state.guidedBreathingVoice);
  const scheduleRiseGuidedBreathingVoice = useSettingsStore((state) => state.scheduleRiseGuidedBreathingVoice);
  const setScheduleRiseGuidedBreathingVoice = useSettingsStore((state) => state.setScheduleRiseGuidedBreathingVoice);
  const timeLimit = useSettingsStore((state) => state.timeLimit);
  const scheduleRiseTimeLimit = useSettingsStore((state) => state.scheduleRiseTimeLimit);
  const setScheduleRiseTimeLimit = useSettingsStore((state) => state.setScheduleRiseTimeLimit);
  const scheduleRiseColor = useSettingsStore((state) => state.scheduleRiseColor);
  const setScheduleRiseColor = useSettingsStore((state) => state.setScheduleRiseColor);
  const exerciseBackgroundColor = useSettingsStore((state) => state.exerciseBackgroundColor);
  const exerciseBackgroundImage = useSettingsStore((state) => state.exerciseBackgroundImage);
  const scheduleRiseBackgroundColor = useSettingsStore((state) => state.scheduleRiseBackgroundColor);
  const setScheduleRiseBackgroundColor = useSettingsStore((state) => state.setScheduleRiseBackgroundColor);
  const scheduleRiseBackgroundImage = useSettingsStore((state) => state.scheduleRiseBackgroundImage);
  const setScheduleRiseBackgroundImage = useSettingsStore((state) => state.setScheduleRiseBackgroundImage);
  const calmingFrequency = useSettingsStore((state) => state.calmingFrequency);
  const noiseBed = useSettingsStore((state) => state.noiseBed);
  const defaultVoiceVolume = useSettingsStore((state) => state.defaultVoiceVolume);
  const defaultToneVolume = useSettingsStore((state) => state.defaultToneVolume);
  const scheduleRiseCalmingFrequency = useSettingsStore((state) => state.scheduleRiseCalmingFrequency);
  const setScheduleRiseCalmingFrequency = useSettingsStore((state) => state.setScheduleRiseCalmingFrequency);
  const scheduleRiseNoiseBed = useSettingsStore((state) => state.scheduleRiseNoiseBed);
  const setScheduleRiseNoiseBed = useSettingsStore((state) => state.setScheduleRiseNoiseBed);
  const scheduleRiseVoiceVolume = useSettingsStore((state) => state.scheduleRiseVoiceVolume);
  const setScheduleRiseVoiceVolume = useSettingsStore((state) => state.setScheduleRiseVoiceVolume);
  const scheduleRiseToneVolume = useSettingsStore((state) => state.scheduleRiseToneVolume);
  const setScheduleRiseToneVolume = useSettingsStore((state) => state.setScheduleRiseToneVolume);

  const allPatterns = [...patternPresets, ...customPatterns];

  const riseSoundSliderStartRef = React.useRef(0);
  const handleRiseSoundSliderStart = async () => {
    riseSoundSliderStartRef.current = Date.now();
    const cf = (scheduleRiseCalmingFrequency ?? calmingFrequency) === "disabled" ? "200hz" : (scheduleRiseCalmingFrequency ?? calmingFrequency);
    await setupFrequencyTone(cf, scheduleRiseNoiseBed ?? noiseBed);
    setToneVolumeMultiplier(scheduleRiseToneVolume ?? defaultToneVolume);
    await startFrequencyTone({ quickFade: true });
  };
  const handleRiseSoundSliderComplete = async () => {
    const elapsed = Date.now() - riseSoundSliderStartRef.current;
    if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed));
    await stopFrequencyTone();
    await releaseFrequencyTone();
  };

  const handleStartTimeChange = (newTime: string) => {
    const validation = validateScheduleTimeRange(
      "rise",
      newTime,
      scheduleRiseEndTime,
      scheduleRiseStartTime, // Current rise times (will be ignored in validation)
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    if (!validation.valid) {
      Alert.alert(
        "Time Conflict",
        `This time overlaps with ${validation.conflictingCategory}. Please choose a different time.`
      );
      return;
    }
    setScheduleRiseStartTime(newTime);
  };

  const handleEndTimeChange = (newTime: string) => {
    const validation = validateScheduleTimeRange(
      "rise",
      scheduleRiseStartTime,
      newTime,
      scheduleRiseStartTime, // Current rise times (will be ignored in validation)
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    if (!validation.valid) {
      Alert.alert(
        "Time Conflict",
        `This time overlaps with ${validation.conflictingCategory}. Please choose a different time.`
      );
      return;
    }
    setScheduleRiseEndTime(newTime);
  };


  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colorScheme === "dark" ? "#000000" : colors["stone-100"],
      }}
    >
      {submenu !== "main" && (
        <Pressable
          onPress={() => setSubmenu("main")}
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colorScheme === "dark" ? "#007AFF" : colors["blue-500"]} />
          <Text style={{ color: colorScheme === "dark" ? "#007AFF" : colors["blue-500"], fontSize: 17, marginLeft: 4 }}>
            Back
          </Text>
        </Pressable>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
          paddingBottom: 20,
        }}
      >
        {submenu === "main" && (
          <>
            <SettingsUI.Section label="Time Range">
              <SettingsUI.PickerItem
                label="Start Time"
                iconName="time-outline"
                iconBackgroundColor="#fbbf24"
                value={scheduleRiseStartTime || ""}
                options={[{ value: "", label: "Not set" }, ...timeOptions]}
                onValueChange={handleStartTimeChange}
              />
              <SettingsUI.PickerItem
                label="End Time"
                iconName="time-outline"
                iconBackgroundColor="#fbbf24"
                value={scheduleRiseEndTime || ""}
                options={[{ value: "", label: "Not set" }, ...timeOptions]}
                onValueChange={handleEndTimeChange}
              />
            </SettingsUI.Section>
            <SettingsUI.Section label="Rise">
              <SettingsUI.LinkItem
                label="Patterns"
                iconName="body"
                iconBackgroundColor="#fbbf24"
                value={
                  scheduleRise.length > 0
                    ? `${scheduleRise.length} selected`
                    : `Default: ${patternPresets.find((p) => p.id === DEFAULT_SCHEDULE_PATTERNS.rise[0])?.name ?? "Awake"}`
                }
                onPress={() => setSubmenu("patterns")}
              />
              <SettingsUI.LinkItem
                label="Sounds & Haptics"
                iconName="volume-medium"
                iconBackgroundColor="#fbbf24"
                value=""
                onPress={() => setSubmenu("sounds")}
              />
              <SettingsUI.LinkItem
                label="Appearance"
                iconName="color-palette"
                iconBackgroundColor="#fbbf24"
                value=""
                onPress={() => setSubmenu("appearance")}
              />
            </SettingsUI.Section>
            <SettingsUI.Section label="Timer" hideBottomBorderAndroid>
              <SettingsUI.StepperItem
                label="Exercise timer"
                secondaryLabel="Time limit in minutes"
                iconName="timer"
                iconBackgroundColor="#fbbf24"
                value={scheduleRiseTimeLimit / ms("1 min")}
                fractionDigits={1}
                decreaseDisabled={scheduleRiseTimeLimit <= 0}
                increaseDisabled={scheduleRiseTimeLimit >= maxTimeLimit}
                onDecrease={() => {
                  const newLimit = Math.max(0, scheduleRiseTimeLimit - ms("0.5 min"));
                  setScheduleRiseTimeLimit(newLimit);
                }}
                onIncrease={() => {
                  const newLimit = Math.min(maxTimeLimit, scheduleRiseTimeLimit + ms("0.5 min"));
                  setScheduleRiseTimeLimit(newLimit);
                }}
              />
            </SettingsUI.Section>
          </>
        )}
        {submenu === "patterns" && (
          <SettingsUI.Section label="Patterns">
            <SettingsUI.MultiSelectItem
              label="Select Patterns"
              iconName="body"
              iconBackgroundColor="#fbbf24"
              selectedValues={scheduleRise}
              emptyLabel={`Default: ${patternPresets.find((p) => p.id === DEFAULT_SCHEDULE_PATTERNS.rise[0])?.name ?? "Awake"}`}
              options={allPatterns.map((preset) => {
                const hasIntervalsInName = preset.name.includes("(") && preset.name.includes(")");
                const displayLabel = hasIntervalsInName
                  ? preset.name
                  : `${preset.name} (${preset.steps
                      .map((duration) => duration / ms("1 sec"))
                      .join("-")})`;
                const isBuiltIn = patternPresets.some((p) => p.id === preset.id);
                return {
                  value: preset.id,
                  label: isBuiltIn ? (
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: colorScheme === "dark" ? "#ffffff" : undefined,
                          flexShrink: 0,
                          marginRight: 6,
                        }}
                        numberOfLines={1}
                      >
                        {displayLabel}
                      </Text>
                      <ScheduleDots patternId={preset.id} />
                    </View>
                  ) : (
                    displayLabel
                  ),
                };
              })}
              onValueChange={setScheduleRise}
            />
          </SettingsUI.Section>
        )}
        {submenu === "sounds" && (
          <SettingsUI.Section label="Sounds & Haptics">
            <SettingsUI.PickerItem
              label="Guided breathing"
              secondaryLabel="Override main guided breathing setting"
              iconName="volume-medium"
              iconBackgroundColor="#fbbf24"
              value={scheduleRiseGuidedBreathingVoice ?? guidedBreathingVoice}
              options={
                [
                  { value: "female", label: "Female" },
                  { value: "bell", label: "Bell" },
                  { value: "disabled", label: "Disabled" },
                ] as { value: GuidedBreathingMode; label: string }[]
              }
              onValueChange={(value) => {
                const mainGuidedBreathingVoice = useSettingsStore.getState().guidedBreathingVoice;
                setScheduleRiseGuidedBreathingVoice(value === mainGuidedBreathingVoice ? null : value);
              }}
            />
            <SettingsUI.PickerItem
              label="Calming frequency"
              secondaryLabel="Override main calming frequency setting"
              iconName="musical-notes"
              iconBackgroundColor="#fbbf24"
              value={scheduleRiseCalmingFrequency ?? calmingFrequency}
              options={[
                { value: "200hz", label: <FrequencyNoiseOptionLabel text="200 Hz" categories={FREQUENCY_BEST_FOR["200hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "136hz", label: <FrequencyNoiseOptionLabel text="136 Hz" categories={FREQUENCY_BEST_FOR["136hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "100hz", label: <FrequencyNoiseOptionLabel text="100 Hz" categories={FREQUENCY_BEST_FOR["100hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "disabled", label: "Disabled" },
              ]}
              onValueChange={(value) => {
                const main = useSettingsStore.getState().calmingFrequency;
                setScheduleRiseCalmingFrequency(value === main ? null : value);
              }}
            />
            <SettingsUI.PickerItem
              label="Noise bed"
              secondaryLabel="Override main noise bed setting"
              iconName="musical-notes"
              iconBackgroundColor="#fbbf24"
              value={scheduleRiseNoiseBed ?? noiseBed}
              options={[
                { value: "brown", label: <FrequencyNoiseOptionLabel text="Brown noise" categories={NOISE_BEST_FOR.brown} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "green", label: <FrequencyNoiseOptionLabel text="Green noise" categories={NOISE_BEST_FOR.green} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "pink", label: <FrequencyNoiseOptionLabel text="Pink noise" categories={NOISE_BEST_FOR.pink} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "disabled", label: "Disabled" },
              ]}
              onValueChange={(value) => {
                const main = useSettingsStore.getState().noiseBed;
                setScheduleRiseNoiseBed(value === main ? null : value);
              }}
            />
            <VolumeSliderRow
              label="Voice volume"
              value={scheduleRiseVoiceVolume ?? defaultVoiceVolume}
              onValueChange={(v) => {
                setScheduleRiseVoiceVolume(v);
                playVoiceVolumePreview(v);
              }}
              colorScheme={colorScheme}
            />
            <VolumeSliderRow
              label="Sound volume"
              value={scheduleRiseToneVolume ?? defaultToneVolume}
              onValueChange={(v) => setToneVolumeMultiplier(v)}
              onSlidingStart={handleRiseSoundSliderStart}
              onSlidingComplete={async (finalValue) => {
                setToneVolumeMultiplier(finalValue);
                setScheduleRiseToneVolume(finalValue);
                await handleRiseSoundSliderComplete();
              }}
              colorScheme={colorScheme}
              throttleMs={80}
            />
            <SettingsUI.SwitchItem
              label="Vibration"
              secondaryLabel="Override main vibration setting"
              iconName="ellipse"
              iconBackgroundColor="#fbbf24"
              value={scheduleRiseVibrationEnabled ?? vibrationEnabled}
              onValueChange={(value) => {
                const mainVibrationEnabled = useSettingsStore.getState().vibrationEnabled;
                setScheduleRiseVibrationEnabled(value === mainVibrationEnabled ? null : value);
              }}
            />
            <VolumeSliderRow
              label="Vibration strength"
              value={scheduleRiseVibrationStrength ?? vibrationStrength}
              onValueChange={(v) => {
                const main = useSettingsStore.getState().vibrationStrength;
                setScheduleRiseVibrationStrength(v === main ? null : v);
                playVibrationStrengthPreview(v);
              }}
              onSlidingComplete={(finalValue) => {
                const main = useSettingsStore.getState().vibrationStrength;
                setScheduleRiseVibrationStrength(finalValue === main ? null : finalValue);
              }}
              colorScheme={colorScheme}
              throttleMs={120}
            />
          </SettingsUI.Section>
        )}
        {submenu === "appearance" && (
          <SettingsUI.Section label="Appearance">
            <ColorPicker
              selectedColor={scheduleRiseColor}
              onColorChange={setScheduleRiseColor}
              label="Breathing animation color"
              iconName="color-palette"
              iconBackgroundColor="#fbbf24"
            />
            <SettingsUI.SwitchItem
              label="Override main background"
              secondaryLabel="Use a different background during Rise time window"
              iconName="color-palette"
              iconBackgroundColor="#fbbf24"
              value={scheduleRiseBackgroundColor !== null}
              onValueChange={(value) => {
                if (value) {
                  setScheduleRiseBackgroundColor(exerciseBackgroundColor);
                  setScheduleRiseBackgroundImage(exerciseBackgroundImage);
                } else {
                  setScheduleRiseBackgroundColor(null);
                  setScheduleRiseBackgroundImage(null);
                }
              }}
            />
            {scheduleRiseBackgroundColor !== null && (
              <BackgroundPicker
                backgroundColor={scheduleRiseBackgroundColor}
                onBackgroundColorChange={setScheduleRiseBackgroundColor}
                backgroundImage={scheduleRiseBackgroundImage}
                onBackgroundImageChange={setScheduleRiseBackgroundImage}
              />
            )}
          </SettingsUI.Section>
        )}
      </ScrollView>
    </View>
  );
};

export const SettingsScheduleResetScreen: FC<ScheduleScreenProps> = ({ navigation }) => {
  const { colorScheme } = useColorScheme();
  const [submenu, setSubmenu] = useState<ScheduleSubmenu>("main");
  const customPatterns = useSettingsStore((state) => state.customPatterns);
  const scheduleReset = useSettingsStore((state) => state.scheduleReset);
  const setScheduleReset = useSettingsStore((state) => state.setScheduleReset);
  const scheduleResetStartTime = useSettingsStore((state) => state.scheduleResetStartTime);
  const setScheduleResetStartTime = useSettingsStore((state) => state.setScheduleResetStartTime);
  const scheduleResetEndTime = useSettingsStore((state) => state.scheduleResetEndTime);
  const setScheduleResetEndTime = useSettingsStore((state) => state.setScheduleResetEndTime);
  const scheduleRiseStartTime = useSettingsStore((state) => state.scheduleRiseStartTime);
  const scheduleRiseEndTime = useSettingsStore((state) => state.scheduleRiseEndTime);
  const scheduleRestoreStartTime = useSettingsStore((state) => state.scheduleRestoreStartTime);
  const scheduleRestoreEndTime = useSettingsStore((state) => state.scheduleRestoreEndTime);
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const vibrationStrength = useSettingsStore((state) => state.vibrationStrength);
  const scheduleResetVibrationEnabled = useSettingsStore((state) => state.scheduleResetVibrationEnabled);
  const setScheduleResetVibrationEnabled = useSettingsStore((state) => state.setScheduleResetVibrationEnabled);
  const scheduleResetVibrationStrength = useSettingsStore((state) => state.scheduleResetVibrationStrength);
  const setScheduleResetVibrationStrength = useSettingsStore((state) => state.setScheduleResetVibrationStrength);
  const guidedBreathingVoice = useSettingsStore((state) => state.guidedBreathingVoice);
  const scheduleResetGuidedBreathingVoice = useSettingsStore((state) => state.scheduleResetGuidedBreathingVoice);
  const setScheduleResetGuidedBreathingVoice = useSettingsStore((state) => state.setScheduleResetGuidedBreathingVoice);
  const timeLimit = useSettingsStore((state) => state.timeLimit);
  const scheduleResetTimeLimit = useSettingsStore((state) => state.scheduleResetTimeLimit);
  const setScheduleResetTimeLimit = useSettingsStore((state) => state.setScheduleResetTimeLimit);
  const scheduleResetColor = useSettingsStore((state) => state.scheduleResetColor);
  const setScheduleResetColor = useSettingsStore((state) => state.setScheduleResetColor);
  const exerciseBackgroundColor = useSettingsStore((state) => state.exerciseBackgroundColor);
  const exerciseBackgroundImage = useSettingsStore((state) => state.exerciseBackgroundImage);
  const scheduleResetBackgroundColor = useSettingsStore((state) => state.scheduleResetBackgroundColor);
  const setScheduleResetBackgroundColor = useSettingsStore((state) => state.setScheduleResetBackgroundColor);
  const scheduleResetBackgroundImage = useSettingsStore((state) => state.scheduleResetBackgroundImage);
  const setScheduleResetBackgroundImage = useSettingsStore((state) => state.setScheduleResetBackgroundImage);
  const calmingFrequency = useSettingsStore((state) => state.calmingFrequency);
  const noiseBed = useSettingsStore((state) => state.noiseBed);
  const defaultVoiceVolume = useSettingsStore((state) => state.defaultVoiceVolume);
  const defaultToneVolume = useSettingsStore((state) => state.defaultToneVolume);
  const scheduleResetCalmingFrequency = useSettingsStore((state) => state.scheduleResetCalmingFrequency);
  const setScheduleResetCalmingFrequency = useSettingsStore((state) => state.setScheduleResetCalmingFrequency);
  const scheduleResetNoiseBed = useSettingsStore((state) => state.scheduleResetNoiseBed);
  const setScheduleResetNoiseBed = useSettingsStore((state) => state.setScheduleResetNoiseBed);
  const scheduleResetVoiceVolume = useSettingsStore((state) => state.scheduleResetVoiceVolume);
  const setScheduleResetVoiceVolume = useSettingsStore((state) => state.setScheduleResetVoiceVolume);
  const scheduleResetToneVolume = useSettingsStore((state) => state.scheduleResetToneVolume);
  const setScheduleResetToneVolume = useSettingsStore((state) => state.setScheduleResetToneVolume);

  const allPatterns = [...patternPresets, ...customPatterns];

  const resetSoundSliderStartRef = React.useRef(0);
  const handleResetSoundSliderStart = async () => {
    resetSoundSliderStartRef.current = Date.now();
    const cf = (scheduleResetCalmingFrequency ?? calmingFrequency) === "disabled" ? "200hz" : (scheduleResetCalmingFrequency ?? calmingFrequency);
    await setupFrequencyTone(cf, scheduleResetNoiseBed ?? noiseBed);
    setToneVolumeMultiplier(scheduleResetToneVolume ?? defaultToneVolume);
    await startFrequencyTone({ quickFade: true });
  };
  const handleResetSoundSliderComplete = async () => {
    const elapsed = Date.now() - resetSoundSliderStartRef.current;
    if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed));
    await stopFrequencyTone();
    await releaseFrequencyTone();
  };

  const handleStartTimeChange = (newTime: string) => {
    const validation = validateScheduleTimeRange(
      "reset",
      newTime,
      scheduleResetEndTime,
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime, // Current reset times (will be ignored in validation)
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    if (!validation.valid) {
      Alert.alert(
        "Time Conflict",
        `This time overlaps with ${validation.conflictingCategory}. Please choose a different time.`
      );
      return;
    }
    setScheduleResetStartTime(newTime);
  };

  const handleEndTimeChange = (newTime: string) => {
    const validation = validateScheduleTimeRange(
      "reset",
      scheduleResetStartTime,
      newTime,
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime, // Current reset times (will be ignored in validation)
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    if (!validation.valid) {
      Alert.alert(
        "Time Conflict",
        `This time overlaps with ${validation.conflictingCategory}. Please choose a different time.`
      );
      return;
    }
    setScheduleResetEndTime(newTime);
  };


  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colorScheme === "dark" ? "#000000" : colors["stone-100"],
      }}
    >
      {submenu !== "main" && (
        <Pressable
          onPress={() => setSubmenu("main")}
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colorScheme === "dark" ? "#007AFF" : colors["blue-500"]} />
          <Text style={{ color: colorScheme === "dark" ? "#007AFF" : colors["blue-500"], fontSize: 17, marginLeft: 4 }}>
            Back
          </Text>
        </Pressable>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
          paddingBottom: 20,
        }}
      >
        {submenu === "main" && (
          <>
            <SettingsUI.Section label="Time Range">
              <SettingsUI.PickerItem
                label="Start Time"
                iconName="time-outline"
                iconBackgroundColor="#60a5fa"
                value={scheduleResetStartTime || ""}
                options={[{ value: "", label: "Not set" }, ...timeOptions]}
                onValueChange={handleStartTimeChange}
              />
              <SettingsUI.PickerItem
                label="End Time"
                iconName="time-outline"
                iconBackgroundColor="#60a5fa"
                value={scheduleResetEndTime || ""}
                options={[{ value: "", label: "Not set" }, ...timeOptions]}
                onValueChange={handleEndTimeChange}
              />
            </SettingsUI.Section>
            <SettingsUI.Section label="Reset">
              <SettingsUI.LinkItem
                label="Patterns"
                iconName="body"
                iconBackgroundColor="#60a5fa"
                value={
                  scheduleReset.length > 0
                    ? `${scheduleReset.length} selected`
                    : `Default: ${patternPresets.find((p) => p.id === DEFAULT_SCHEDULE_PATTERNS.reset[0])?.name ?? "Performance"}`
                }
                onPress={() => setSubmenu("patterns")}
              />
              <SettingsUI.LinkItem
                label="Sounds & Haptics"
                iconName="volume-medium"
                iconBackgroundColor="#60a5fa"
                value=""
                onPress={() => setSubmenu("sounds")}
              />
              <SettingsUI.LinkItem
                label="Appearance"
                iconName="color-palette"
                iconBackgroundColor="#60a5fa"
                value=""
                onPress={() => setSubmenu("appearance")}
              />
            </SettingsUI.Section>
            <SettingsUI.Section label="Timer" hideBottomBorderAndroid>
              <SettingsUI.StepperItem
                label="Exercise timer"
                secondaryLabel="Time limit in minutes"
                iconName="timer"
                iconBackgroundColor="#60a5fa"
                value={scheduleResetTimeLimit / ms("1 min")}
                fractionDigits={1}
                decreaseDisabled={scheduleResetTimeLimit <= 0}
                increaseDisabled={scheduleResetTimeLimit >= maxTimeLimit}
                onDecrease={() => {
                  const newLimit = Math.max(0, scheduleResetTimeLimit - ms("0.5 min"));
                  setScheduleResetTimeLimit(newLimit);
                }}
                onIncrease={() => {
                  const newLimit = Math.min(maxTimeLimit, scheduleResetTimeLimit + ms("0.5 min"));
                  setScheduleResetTimeLimit(newLimit);
                }}
              />
            </SettingsUI.Section>
          </>
        )}
        {submenu === "patterns" && (
          <SettingsUI.Section label="Patterns">
            <SettingsUI.MultiSelectItem
              label="Select Patterns"
              iconName="body"
              iconBackgroundColor="#60a5fa"
              selectedValues={scheduleReset}
              emptyLabel={`Default: ${patternPresets.find((p) => p.id === DEFAULT_SCHEDULE_PATTERNS.reset[0])?.name ?? "Performance"}`}
              options={allPatterns.map((preset) => {
                const hasIntervalsInName = preset.name.includes("(") && preset.name.includes(")");
                const displayLabel = hasIntervalsInName
                  ? preset.name
                  : `${preset.name} (${preset.steps
                      .map((duration) => duration / ms("1 sec"))
                      .join("-")})`;
                const isBuiltIn = patternPresets.some((p) => p.id === preset.id);
                return {
                  value: preset.id,
                  label: isBuiltIn ? (
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: colorScheme === "dark" ? "#ffffff" : undefined,
                          flexShrink: 0,
                          marginRight: 6,
                        }}
                        numberOfLines={1}
                      >
                        {displayLabel}
                      </Text>
                      <ScheduleDots patternId={preset.id} />
                    </View>
                  ) : (
                    displayLabel
                  ),
                };
              })}
              onValueChange={setScheduleReset}
            />
          </SettingsUI.Section>
        )}
        {submenu === "sounds" && (
          <SettingsUI.Section label="Sounds & Haptics">
            <SettingsUI.PickerItem
              label="Guided breathing"
              secondaryLabel="Override main guided breathing setting"
              iconName="volume-medium"
              iconBackgroundColor="#60a5fa"
              value={scheduleResetGuidedBreathingVoice ?? guidedBreathingVoice}
              options={
                [
                  { value: "female", label: "Female" },
                  { value: "bell", label: "Bell" },
                  { value: "disabled", label: "Disabled" },
                ] as { value: GuidedBreathingMode; label: string }[]
              }
              onValueChange={(value) => {
                const mainGuidedBreathingVoice = useSettingsStore.getState().guidedBreathingVoice;
                setScheduleResetGuidedBreathingVoice(value === mainGuidedBreathingVoice ? null : value);
              }}
            />
            <SettingsUI.PickerItem
              label="Calming frequency"
              secondaryLabel="Override main calming frequency setting"
              iconName="musical-notes"
              iconBackgroundColor="#60a5fa"
              value={scheduleResetCalmingFrequency ?? calmingFrequency}
              options={[
                { value: "200hz", label: <FrequencyNoiseOptionLabel text="200 Hz" categories={FREQUENCY_BEST_FOR["200hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "136hz", label: <FrequencyNoiseOptionLabel text="136 Hz" categories={FREQUENCY_BEST_FOR["136hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "100hz", label: <FrequencyNoiseOptionLabel text="100 Hz" categories={FREQUENCY_BEST_FOR["100hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "disabled", label: "Disabled" },
              ]}
              onValueChange={(value) => {
                const main = useSettingsStore.getState().calmingFrequency;
                setScheduleResetCalmingFrequency(value === main ? null : value);
              }}
            />
            <SettingsUI.PickerItem
              label="Noise bed"
              secondaryLabel="Override main noise bed setting"
              iconName="musical-notes"
              iconBackgroundColor="#60a5fa"
              value={scheduleResetNoiseBed ?? noiseBed}
              options={[
                { value: "brown", label: <FrequencyNoiseOptionLabel text="Brown noise" categories={NOISE_BEST_FOR.brown} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "green", label: <FrequencyNoiseOptionLabel text="Green noise" categories={NOISE_BEST_FOR.green} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "pink", label: <FrequencyNoiseOptionLabel text="Pink noise" categories={NOISE_BEST_FOR.pink} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "disabled", label: "Disabled" },
              ]}
              onValueChange={(value) => {
                const main = useSettingsStore.getState().noiseBed;
                setScheduleResetNoiseBed(value === main ? null : value);
              }}
            />
            <VolumeSliderRow
              label="Voice volume"
              value={scheduleResetVoiceVolume ?? defaultVoiceVolume}
              onValueChange={(v) => {
                setScheduleResetVoiceVolume(v);
                playVoiceVolumePreview(v);
              }}
              colorScheme={colorScheme}
            />
            <VolumeSliderRow
              label="Sound volume"
              value={scheduleResetToneVolume ?? defaultToneVolume}
              onValueChange={(v) => setToneVolumeMultiplier(v)}
              onSlidingStart={handleResetSoundSliderStart}
              onSlidingComplete={async (finalValue) => {
                setToneVolumeMultiplier(finalValue);
                setScheduleResetToneVolume(finalValue);
                await handleResetSoundSliderComplete();
              }}
              colorScheme={colorScheme}
              throttleMs={80}
            />
            <SettingsUI.SwitchItem
              label="Vibration"
              secondaryLabel="Override main vibration setting"
              iconName="ellipse"
              iconBackgroundColor="#60a5fa"
              value={scheduleResetVibrationEnabled ?? vibrationEnabled}
              onValueChange={(value) => {
                const mainVibrationEnabled = useSettingsStore.getState().vibrationEnabled;
                setScheduleResetVibrationEnabled(value === mainVibrationEnabled ? null : value);
              }}
            />
            <VolumeSliderRow
              label="Vibration strength"
              value={scheduleResetVibrationStrength ?? vibrationStrength}
              onValueChange={(v) => {
                const main = useSettingsStore.getState().vibrationStrength;
                setScheduleResetVibrationStrength(v === main ? null : v);
                playVibrationStrengthPreview(v);
              }}
              onSlidingComplete={(finalValue) => {
                const main = useSettingsStore.getState().vibrationStrength;
                setScheduleResetVibrationStrength(finalValue === main ? null : finalValue);
              }}
              colorScheme={colorScheme}
              throttleMs={120}
            />
          </SettingsUI.Section>
        )}
        {submenu === "appearance" && (
          <SettingsUI.Section label="Appearance">
            <ColorPicker
              selectedColor={scheduleResetColor}
              onColorChange={setScheduleResetColor}
              label="Breathing animation color"
              iconName="color-palette"
              iconBackgroundColor="#60a5fa"
            />
            <SettingsUI.SwitchItem
              label="Override main background"
              secondaryLabel="Use a different background during Reset time window"
              iconName="color-palette"
              iconBackgroundColor="#60a5fa"
              value={scheduleResetBackgroundColor !== null}
              onValueChange={(value) => {
                if (value) {
                  setScheduleResetBackgroundColor(exerciseBackgroundColor);
                  setScheduleResetBackgroundImage(exerciseBackgroundImage);
                } else {
                  setScheduleResetBackgroundColor(null);
                  setScheduleResetBackgroundImage(null);
                }
              }}
            />
            {scheduleResetBackgroundColor !== null && (
              <BackgroundPicker
                backgroundColor={scheduleResetBackgroundColor}
                onBackgroundColorChange={setScheduleResetBackgroundColor}
                backgroundImage={scheduleResetBackgroundImage}
                onBackgroundImageChange={setScheduleResetBackgroundImage}
              />
            )}
          </SettingsUI.Section>
        )}
      </ScrollView>
    </View>
  );
};

export const SettingsScheduleRestoreScreen: FC<ScheduleScreenProps> = ({ navigation }) => {
  const { colorScheme } = useColorScheme();
  const [submenu, setSubmenu] = useState<ScheduleSubmenu>("main");
  const customPatterns = useSettingsStore((state) => state.customPatterns);
  const scheduleRestore = useSettingsStore((state) => state.scheduleRestore);
  const setScheduleRestore = useSettingsStore((state) => state.setScheduleRestore);
  const scheduleRestoreStartTime = useSettingsStore((state) => state.scheduleRestoreStartTime);
  const setScheduleRestoreStartTime = useSettingsStore((state) => state.setScheduleRestoreStartTime);
  const scheduleRestoreEndTime = useSettingsStore((state) => state.scheduleRestoreEndTime);
  const setScheduleRestoreEndTime = useSettingsStore((state) => state.setScheduleRestoreEndTime);
  const scheduleRiseStartTime = useSettingsStore((state) => state.scheduleRiseStartTime);
  const scheduleRiseEndTime = useSettingsStore((state) => state.scheduleRiseEndTime);
  const scheduleResetStartTime = useSettingsStore((state) => state.scheduleResetStartTime);
  const scheduleResetEndTime = useSettingsStore((state) => state.scheduleResetEndTime);
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const vibrationStrength = useSettingsStore((state) => state.vibrationStrength);
  const scheduleRestoreVibrationEnabled = useSettingsStore((state) => state.scheduleRestoreVibrationEnabled);
  const setScheduleRestoreVibrationEnabled = useSettingsStore((state) => state.setScheduleRestoreVibrationEnabled);
  const scheduleRestoreVibrationStrength = useSettingsStore((state) => state.scheduleRestoreVibrationStrength);
  const setScheduleRestoreVibrationStrength = useSettingsStore((state) => state.setScheduleRestoreVibrationStrength);
  const guidedBreathingVoice = useSettingsStore((state) => state.guidedBreathingVoice);
  const scheduleRestoreGuidedBreathingVoice = useSettingsStore((state) => state.scheduleRestoreGuidedBreathingVoice);
  const setScheduleRestoreGuidedBreathingVoice = useSettingsStore((state) => state.setScheduleRestoreGuidedBreathingVoice);
  const timeLimit = useSettingsStore((state) => state.timeLimit);
  const scheduleRestoreTimeLimit = useSettingsStore((state) => state.scheduleRestoreTimeLimit);
  const setScheduleRestoreTimeLimit = useSettingsStore((state) => state.setScheduleRestoreTimeLimit);
  const scheduleRestoreColor = useSettingsStore((state) => state.scheduleRestoreColor);
  const setScheduleRestoreColor = useSettingsStore((state) => state.setScheduleRestoreColor);
  const exerciseBackgroundColor = useSettingsStore((state) => state.exerciseBackgroundColor);
  const exerciseBackgroundImage = useSettingsStore((state) => state.exerciseBackgroundImage);
  const scheduleRestoreBackgroundColor = useSettingsStore((state) => state.scheduleRestoreBackgroundColor);
  const setScheduleRestoreBackgroundColor = useSettingsStore((state) => state.setScheduleRestoreBackgroundColor);
  const scheduleRestoreBackgroundImage = useSettingsStore((state) => state.scheduleRestoreBackgroundImage);
  const setScheduleRestoreBackgroundImage = useSettingsStore((state) => state.setScheduleRestoreBackgroundImage);
  const calmingFrequency = useSettingsStore((state) => state.calmingFrequency);
  const noiseBed = useSettingsStore((state) => state.noiseBed);
  const defaultVoiceVolume = useSettingsStore((state) => state.defaultVoiceVolume);
  const defaultToneVolume = useSettingsStore((state) => state.defaultToneVolume);
  const scheduleRestoreCalmingFrequency = useSettingsStore((state) => state.scheduleRestoreCalmingFrequency);
  const setScheduleRestoreCalmingFrequency = useSettingsStore((state) => state.setScheduleRestoreCalmingFrequency);
  const scheduleRestoreNoiseBed = useSettingsStore((state) => state.scheduleRestoreNoiseBed);
  const setScheduleRestoreNoiseBed = useSettingsStore((state) => state.setScheduleRestoreNoiseBed);
  const scheduleRestoreVoiceVolume = useSettingsStore((state) => state.scheduleRestoreVoiceVolume);
  const setScheduleRestoreVoiceVolume = useSettingsStore((state) => state.setScheduleRestoreVoiceVolume);
  const scheduleRestoreToneVolume = useSettingsStore((state) => state.scheduleRestoreToneVolume);
  const setScheduleRestoreToneVolume = useSettingsStore((state) => state.setScheduleRestoreToneVolume);

  const allPatterns = [...patternPresets, ...customPatterns];

  const restoreSoundSliderStartRef = React.useRef(0);
  const handleRestoreSoundSliderStart = async () => {
    restoreSoundSliderStartRef.current = Date.now();
    const cf = (scheduleRestoreCalmingFrequency ?? calmingFrequency) === "disabled" ? "200hz" : (scheduleRestoreCalmingFrequency ?? calmingFrequency);
    await setupFrequencyTone(cf, scheduleRestoreNoiseBed ?? noiseBed);
    setToneVolumeMultiplier(scheduleRestoreToneVolume ?? defaultToneVolume);
    await startFrequencyTone({ quickFade: true });
  };
  const handleRestoreSoundSliderComplete = async () => {
    const elapsed = Date.now() - restoreSoundSliderStartRef.current;
    if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed));
    await stopFrequencyTone();
    await releaseFrequencyTone();
  };

  const handleStartTimeChange = (newTime: string) => {
    const validation = validateScheduleTimeRange(
      "restore",
      newTime,
      scheduleRestoreEndTime,
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime, // Current restore times (will be ignored in validation)
      scheduleRestoreEndTime
    );
    if (!validation.valid) {
      Alert.alert(
        "Time Conflict",
        `This time overlaps with ${validation.conflictingCategory}. Please choose a different time.`
      );
      return;
    }
    setScheduleRestoreStartTime(newTime);
  };

  const handleEndTimeChange = (newTime: string) => {
    const validation = validateScheduleTimeRange(
      "restore",
      scheduleRestoreStartTime,
      newTime,
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime, // Current restore times (will be ignored in validation)
      scheduleRestoreEndTime
    );
    if (!validation.valid) {
      Alert.alert(
        "Time Conflict",
        `This time overlaps with ${validation.conflictingCategory}. Please choose a different time.`
      );
      return;
    }
    setScheduleRestoreEndTime(newTime);
  };


  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colorScheme === "dark" ? "#000000" : colors["stone-100"],
      }}
    >
      {submenu !== "main" && (
        <Pressable
          onPress={() => setSubmenu("main")}
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colorScheme === "dark" ? "#007AFF" : colors["blue-500"]} />
          <Text style={{ color: colorScheme === "dark" ? "#007AFF" : colors["blue-500"], fontSize: 17, marginLeft: 4 }}>
            Back
          </Text>
        </Pressable>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
          paddingBottom: 20,
        }}
      >
        {submenu === "main" && (
          <>
            <SettingsUI.Section label="Time Range">
              <SettingsUI.PickerItem
                label="Start Time"
                iconName="time-outline"
                iconBackgroundColor="#a78bfa"
                value={scheduleRestoreStartTime || ""}
                options={[{ value: "", label: "Not set" }, ...timeOptions]}
                onValueChange={handleStartTimeChange}
              />
              <SettingsUI.PickerItem
                label="End Time"
                iconName="time-outline"
                iconBackgroundColor="#a78bfa"
                value={scheduleRestoreEndTime || ""}
                options={[{ value: "", label: "Not set" }, ...timeOptions]}
                onValueChange={handleEndTimeChange}
              />
            </SettingsUI.Section>
            <SettingsUI.Section label="Restore">
              <SettingsUI.LinkItem
                label="Patterns"
                iconName="body"
                iconBackgroundColor="#a78bfa"
                value={
                  scheduleRestore.length > 0
                    ? `${scheduleRestore.length} selected`
                    : `Default: ${patternPresets.find((p) => p.id === DEFAULT_SCHEDULE_PATTERNS.restore[0])?.name ?? "Deep Calm"}`
                }
                onPress={() => setSubmenu("patterns")}
              />
              <SettingsUI.LinkItem
                label="Sounds & Haptics"
                iconName="volume-medium"
                iconBackgroundColor="#a78bfa"
                value=""
                onPress={() => setSubmenu("sounds")}
              />
              <SettingsUI.LinkItem
                label="Appearance"
                iconName="color-palette"
                iconBackgroundColor="#a78bfa"
                value=""
                onPress={() => setSubmenu("appearance")}
              />
            </SettingsUI.Section>
            <SettingsUI.Section label="Timer" hideBottomBorderAndroid>
              <SettingsUI.StepperItem
                label="Exercise timer"
                secondaryLabel="Time limit in minutes"
                iconName="timer"
                iconBackgroundColor="#a78bfa"
                value={scheduleRestoreTimeLimit / ms("1 min")}
                fractionDigits={1}
                decreaseDisabled={scheduleRestoreTimeLimit <= 0}
                increaseDisabled={scheduleRestoreTimeLimit >= maxTimeLimit}
                onDecrease={() => {
                  const newLimit = Math.max(0, scheduleRestoreTimeLimit - ms("0.5 min"));
                  setScheduleRestoreTimeLimit(newLimit);
                }}
                onIncrease={() => {
                  const newLimit = Math.min(maxTimeLimit, scheduleRestoreTimeLimit + ms("0.5 min"));
                  setScheduleRestoreTimeLimit(newLimit);
                }}
              />
            </SettingsUI.Section>
          </>
        )}
        {submenu === "patterns" && (
          <SettingsUI.Section label="Patterns">
            <SettingsUI.MultiSelectItem
              label="Select Patterns"
              iconName="body"
              iconBackgroundColor="#a78bfa"
              selectedValues={scheduleRestore}
              emptyLabel={`Default: ${patternPresets.find((p) => p.id === DEFAULT_SCHEDULE_PATTERNS.restore[0])?.name ?? "Deep Calm"}`}
              options={allPatterns.map((preset) => {
                const hasIntervalsInName = preset.name.includes("(") && preset.name.includes(")");
                const displayLabel = hasIntervalsInName
                  ? preset.name
                  : `${preset.name} (${preset.steps
                      .map((duration) => duration / ms("1 sec"))
                      .join("-")})`;
                const isBuiltIn = patternPresets.some((p) => p.id === preset.id);
                return {
                  value: preset.id,
                  label: isBuiltIn ? (
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: colorScheme === "dark" ? "#ffffff" : undefined,
                          flexShrink: 0,
                          marginRight: 6,
                        }}
                        numberOfLines={1}
                      >
                        {displayLabel}
                      </Text>
                      <ScheduleDots patternId={preset.id} />
                    </View>
                  ) : (
                    displayLabel
                  ),
                };
              })}
              onValueChange={setScheduleRestore}
            />
          </SettingsUI.Section>
        )}
        {submenu === "sounds" && (
          <SettingsUI.Section label="Sounds & Haptics">
            <SettingsUI.PickerItem
              label="Guided breathing"
              secondaryLabel="Override main guided breathing setting"
              iconName="volume-medium"
              iconBackgroundColor="#a78bfa"
              value={scheduleRestoreGuidedBreathingVoice ?? guidedBreathingVoice}
              options={
                [
                  { value: "female", label: "Female" },
                  { value: "bell", label: "Bell" },
                  { value: "disabled", label: "Disabled" },
                ] as { value: GuidedBreathingMode; label: string }[]
              }
              onValueChange={(value) => {
                const mainGuidedBreathingVoice = useSettingsStore.getState().guidedBreathingVoice;
                setScheduleRestoreGuidedBreathingVoice(value === mainGuidedBreathingVoice ? null : value);
              }}
            />
            <SettingsUI.PickerItem
              label="Calming frequency"
              secondaryLabel="Override main calming frequency setting"
              iconName="musical-notes"
              iconBackgroundColor="#a78bfa"
              value={scheduleRestoreCalmingFrequency ?? calmingFrequency}
              options={[
                { value: "200hz", label: <FrequencyNoiseOptionLabel text="200 Hz" categories={FREQUENCY_BEST_FOR["200hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "136hz", label: <FrequencyNoiseOptionLabel text="136 Hz" categories={FREQUENCY_BEST_FOR["136hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "100hz", label: <FrequencyNoiseOptionLabel text="100 Hz" categories={FREQUENCY_BEST_FOR["100hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "disabled", label: "Disabled" },
              ]}
              onValueChange={(value) => {
                const main = useSettingsStore.getState().calmingFrequency;
                setScheduleRestoreCalmingFrequency(value === main ? null : value);
              }}
            />
            <SettingsUI.PickerItem
              label="Noise bed"
              secondaryLabel="Override main noise bed setting"
              iconName="musical-notes"
              iconBackgroundColor="#a78bfa"
              value={scheduleRestoreNoiseBed ?? noiseBed}
              options={[
                { value: "brown", label: <FrequencyNoiseOptionLabel text="Brown noise" categories={NOISE_BEST_FOR.brown} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "green", label: <FrequencyNoiseOptionLabel text="Green noise" categories={NOISE_BEST_FOR.green} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "pink", label: <FrequencyNoiseOptionLabel text="Pink noise" categories={NOISE_BEST_FOR.pink} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                { value: "disabled", label: "Disabled" },
              ]}
              onValueChange={(value) => {
                const main = useSettingsStore.getState().noiseBed;
                setScheduleRestoreNoiseBed(value === main ? null : value);
              }}
            />
            <VolumeSliderRow
              label="Voice volume"
              value={scheduleRestoreVoiceVolume ?? defaultVoiceVolume}
              onValueChange={(v) => {
                setScheduleRestoreVoiceVolume(v);
                playVoiceVolumePreview(v);
              }}
              colorScheme={colorScheme}
            />
            <VolumeSliderRow
              label="Sound volume"
              value={scheduleRestoreToneVolume ?? defaultToneVolume}
              onValueChange={(v) => setToneVolumeMultiplier(v)}
              onSlidingStart={handleRestoreSoundSliderStart}
              onSlidingComplete={async (finalValue) => {
                setToneVolumeMultiplier(finalValue);
                setScheduleRestoreToneVolume(finalValue);
                await handleRestoreSoundSliderComplete();
              }}
              colorScheme={colorScheme}
              throttleMs={80}
            />
            <SettingsUI.SwitchItem
              label="Vibration"
              secondaryLabel="Override main vibration setting"
              iconName="ellipse"
              iconBackgroundColor="#a78bfa"
              value={scheduleRestoreVibrationEnabled ?? vibrationEnabled}
              onValueChange={(value) => {
                const mainVibrationEnabled = useSettingsStore.getState().vibrationEnabled;
                setScheduleRestoreVibrationEnabled(value === mainVibrationEnabled ? null : value);
              }}
            />
            <VolumeSliderRow
              label="Vibration strength"
              value={scheduleRestoreVibrationStrength ?? vibrationStrength}
              onValueChange={(v) => {
                const main = useSettingsStore.getState().vibrationStrength;
                setScheduleRestoreVibrationStrength(v === main ? null : v);
                playVibrationStrengthPreview(v);
              }}
              onSlidingComplete={(finalValue) => {
                const main = useSettingsStore.getState().vibrationStrength;
                setScheduleRestoreVibrationStrength(finalValue === main ? null : finalValue);
              }}
              colorScheme={colorScheme}
              throttleMs={120}
            />
          </SettingsUI.Section>
        )}
        {submenu === "appearance" && (
          <SettingsUI.Section label="Appearance">
            <ColorPicker
              selectedColor={scheduleRestoreColor}
              onColorChange={setScheduleRestoreColor}
              label="Breathing animation color"
              iconName="color-palette"
              iconBackgroundColor="#a78bfa"
            />
            <SettingsUI.SwitchItem
              label="Override main background"
              secondaryLabel="Use a different background during Restore time window"
              iconName="color-palette"
              iconBackgroundColor="#a78bfa"
              value={scheduleRestoreBackgroundColor !== null}
              onValueChange={(value) => {
                if (value) {
                  setScheduleRestoreBackgroundColor(exerciseBackgroundColor);
                  setScheduleRestoreBackgroundImage(exerciseBackgroundImage);
                } else {
                  setScheduleRestoreBackgroundColor(null);
                  setScheduleRestoreBackgroundImage(null);
                }
              }}
            />
            {scheduleRestoreBackgroundColor !== null && (
              <BackgroundPicker
                backgroundColor={scheduleRestoreBackgroundColor}
                onBackgroundColorChange={setScheduleRestoreBackgroundColor}
                backgroundImage={scheduleRestoreBackgroundImage}
                onBackgroundImageChange={setScheduleRestoreBackgroundImage}
              />
            )}
          </SettingsUI.Section>
        )}
      </ScrollView>
    </View>
  );
};
