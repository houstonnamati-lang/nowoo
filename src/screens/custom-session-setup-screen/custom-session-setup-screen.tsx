import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import React, { FC, useState, useMemo } from "react";
import { Platform, ScrollView, Text, View, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable as CustomPressable } from "@nowoo/common/pressable";
import { RootStackParamList } from "@nowoo/core/navigator";
import { colors } from "@nowoo/design/colors";
import { SettingsUI } from "@nowoo/screens/settings-screen/settings-ui";
import { useSettingsStore } from "@nowoo/stores/settings";
import { CalmingFrequencyMode, NoiseBedMode } from "@nowoo/types/frequency-tone-mode";
import { FrequencyNoiseOptionLabel, FREQUENCY_BEST_FOR, NOISE_BEST_FOR } from "@nowoo/utils/pattern-schedule-dots";
import { GuidedBreathingMode } from "@nowoo/types/guided-breathing-mode";
import { patternPresets } from "@nowoo/assets/pattern-presets";
import ms from "ms";

export type CustomSessionSettings = {
  useDefaults: boolean;
  patternId?: string;
  guidedBreathingVoice?: GuidedBreathingMode;
  calmingFrequency?: CalmingFrequencyMode;
  noiseBed?: NoiseBedMode;
  /** @deprecated use calmingFrequency + noiseBed */
  frequencyTone?: string;
  vibrationEnabled?: boolean;
  timeLimit?: number;
};

export const CustomSessionSetupScreen: FC<
  NativeStackScreenProps<RootStackParamList, "CustomSessionSetup">
> = ({ navigation, route }) => {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  
  // Get main settings for defaults
  const mainPatternId = useSettingsStore((state) => state.selectedPatternPresetId);
  const mainGuidedBreathingVoice = useSettingsStore((state) => state.guidedBreathingVoice);
  const mainCalmingFrequency = useSettingsStore((state) => state.calmingFrequency);
  const mainNoiseBed = useSettingsStore((state) => state.noiseBed);
  const mainVibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const mainTimeLimit = useSettingsStore((state) => state.timeLimit);
  const customPatterns = useSettingsStore((state) => state.customPatterns);
  
  const allPatterns = [...patternPresets, ...customPatterns];
  
  const [useDefaults, setUseDefaults] = useState(true);
  const [selectedPatternId, setSelectedPatternId] = useState(mainPatternId);
  const [selectedGuidedBreathingVoice, setSelectedGuidedBreathingVoice] = useState(mainGuidedBreathingVoice);
  const [selectedCalmingFrequency, setSelectedCalmingFrequency] = useState(mainCalmingFrequency);
  const [selectedNoiseBed, setSelectedNoiseBed] = useState(mainNoiseBed);
  const [selectedVibrationEnabled, setSelectedVibrationEnabled] = useState(mainVibrationEnabled);
  const [selectedTimeLimit, setSelectedTimeLimit] = useState(ms("5 min"));
  
  const maxTimeLimit = ms("60 min");
  
  const handleStartSession = () => {
    const settings: CustomSessionSettings = {
      useDefaults,
      ...(useDefaults ? {} : {
        patternId: selectedPatternId,
        guidedBreathingVoice: selectedGuidedBreathingVoice,
        calmingFrequency: selectedCalmingFrequency,
        noiseBed: selectedNoiseBed,
        vibrationEnabled: selectedVibrationEnabled,
        timeLimit: selectedTimeLimit,
      }),
    };
    
    navigation.navigate("Exercise", { customSettings: settings });
  };
  
  const bgColor = colorScheme === "dark" ? "#000000" : colors["stone-100"];
  const screenHeight = Dimensions.get("window").height;
  const sheetHeight = screenHeight * 0.6;
  
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "transparent",
      }}
    >
      <Pressable
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onPress={() => navigation.goBack()}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: bgColor,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: sheetHeight,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
          <View
            style={{
              paddingTop: 12,
              paddingBottom: 8,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colorScheme === "dark" ? "#333" : "#ccc",
                borderRadius: 2,
              }}
            />
          </View>
          
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: Platform.OS === "android" ? undefined : 18,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <SettingsUI.Section label="Session Settings">
              <SettingsUI.SwitchItem
                label="Use default settings"
                secondaryLabel="Use settings from main customizations"
                iconName="checkmark-circle"
                iconBackgroundColor={colorScheme === "dark" ? "#007AFF" : colors["blue-500"]}
                value={useDefaults}
                onValueChange={setUseDefaults}
              />
            </SettingsUI.Section>
            
            {!useDefaults && (
              <>
                <SettingsUI.Section label="Breathing Pattern">
                  <SettingsUI.PickerItem
                    label="Pattern"
                    iconName="body"
                    iconBackgroundColor="#bfdbfe"
                    value={selectedPatternId}
                    options={allPatterns.map((pattern) => {
                      const hasIntervalsInName = pattern.name.includes("(") && pattern.name.includes(")");
                      const displayLabel = hasIntervalsInName
                        ? pattern.name
                        : `${pattern.name} (${pattern.steps
                            .map((duration) => duration / ms("1 sec"))
                            .join("-")})`;
                      return {
                        value: pattern.id,
                        label: displayLabel,
                      };
                    })}
                    onValueChange={setSelectedPatternId}
                  />
                </SettingsUI.Section>
                
                <SettingsUI.Section label="Sounds">
                  <SettingsUI.PickerItem
                    label="Guided breathing"
                    iconName="volume-medium"
                    iconBackgroundColor="#fdba74"
                    value={selectedGuidedBreathingVoice}
                    options={
                      [
                        { value: "female", label: "Female" },
                        { value: "bell", label: "Bell" },
                        { value: "disabled", label: "Disabled" },
                      ] as { value: GuidedBreathingMode; label: string }[]
                    }
                    onValueChange={setSelectedGuidedBreathingVoice}
                  />
                  <SettingsUI.PickerItem
                    label="Calming frequency"
                    iconName="musical-notes"
                    iconBackgroundColor="#60a5fa"
                    value={selectedCalmingFrequency}
                    options={[
                      { value: "200hz", label: <FrequencyNoiseOptionLabel text="200 Hz" categories={FREQUENCY_BEST_FOR["200hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "136hz", label: <FrequencyNoiseOptionLabel text="136 Hz" categories={FREQUENCY_BEST_FOR["136hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "100hz", label: <FrequencyNoiseOptionLabel text="100 Hz" categories={FREQUENCY_BEST_FOR["100hz"]} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "disabled", label: "Disabled" },
                    ]}
                    onValueChange={setSelectedCalmingFrequency}
                  />
                  <SettingsUI.PickerItem
                    label="Noise bed"
                    iconName="musical-notes"
                    iconBackgroundColor="#60a5fa"
                    value={selectedNoiseBed}
                    options={[
                      { value: "brown", label: <FrequencyNoiseOptionLabel text="Brown noise" categories={NOISE_BEST_FOR.brown} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "green", label: <FrequencyNoiseOptionLabel text="Green noise" categories={NOISE_BEST_FOR.green} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "pink", label: <FrequencyNoiseOptionLabel text="Pink noise" categories={NOISE_BEST_FOR.pink} textColor={colorScheme === "dark" ? "#ffffff" : undefined} /> },
                      { value: "disabled", label: "Disabled" },
                    ]}
                    onValueChange={setSelectedNoiseBed}
                  />
                </SettingsUI.Section>
                
                <SettingsUI.Section label="Haptics">
                  <SettingsUI.SwitchItem
                    label="Vibration"
                    secondaryLabel="Vibrate for step indication"
                    iconName="ellipse"
                    iconBackgroundColor="aquamarine"
                    value={selectedVibrationEnabled}
                    onValueChange={setSelectedVibrationEnabled}
                  />
                </SettingsUI.Section>
                
                <SettingsUI.Section label="Timer" hideBottomBorderAndroid>
                  <SettingsUI.StepperItem
                    label="Exercise timer"
                    secondaryLabel="Time limit in minutes"
                    iconName="timer"
                    iconBackgroundColor="#fb7185"
                    value={selectedTimeLimit > 0 ? selectedTimeLimit / ms("1 min") : "∞"}
                    fractionDigits={1}
                    decreaseDisabled={selectedTimeLimit <= 0}
                    increaseDisabled={selectedTimeLimit >= maxTimeLimit}
                    onDecrease={() => setSelectedTimeLimit(Math.max(0, selectedTimeLimit - ms("0.5 min")))}
                    onIncrease={() => setSelectedTimeLimit(Math.min(maxTimeLimit, selectedTimeLimit + ms("0.5 min")))}
                  />
                </SettingsUI.Section>
              </>
            )}
            
            <View style={{ marginTop: 24, marginHorizontal: 16 }}>
              <CustomPressable
                onPress={handleStartSession}
                style={{
                  backgroundColor: colorScheme === "dark" ? "#007AFF" : colors["blue-500"],
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 18,
                    fontWeight: "600",
                  }}
                >
                  Start Session
                </Text>
              </CustomPressable>
            </View>
          </ScrollView>
        </View>
      </View>
  );
};

