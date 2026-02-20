import React, { FC, useEffect, useState } from "react";
import { Animated, Text, View, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { animate } from "@nowoo/utils/animate";
import { interpolateTranslateY } from "@nowoo/utils/interpolate";
import { useStreakStore, Mood } from "@nowoo/stores/streak";

const mountAnimDuration = 400;
const unmountAnimDuration = 400;

const moodConfig: Record<Mood, { icon: string; color: string; iconSet: "ionicons" | "material" }> = {
  sad: { icon: "sad-outline", color: "#ef4444", iconSet: "ionicons" },
  neutral: { icon: "emoticon-neutral-outline", color: "#eab308", iconSet: "material" },
  happy: { icon: "happy-outline", color: "#22c55e", iconSet: "ionicons" },
};

export const ExerciseComplete: FC = () => {
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation();
  const recordMood = useStreakStore((state) => state.recordMood);
  const [mountAnimVal] = useState(new Animated.Value(0));
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const mountAnimation = animate(mountAnimVal, {
    toValue: 1,
    duration: mountAnimDuration,
  });

  const unmountAnimation = animate(mountAnimVal, {
    toValue: 0,
    duration: unmountAnimDuration,
  });

  useEffect(() => {
    mountAnimation.start();
    return () => {
      mountAnimation.stop();
      unmountAnimation.stop();
    };
  }, []);

  const containerAnimatedStyle = {
    opacity: mountAnimVal.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      interpolateTranslateY(mountAnimVal, {
        inputRange: [0, 1],
        outputRange: [0, 8],
      }),
    ],
  };

  const handleMoodPress = (mood: Mood) => {
    console.log("Recording mood:", mood, "at timestamp:", Date.now());
    recordMood(mood);
    setSelectedMood(mood);
    // Navigate back to home after a brief delay to show selection
    setTimeout(() => {
      navigation.goBack();
    }, 500);
  };

  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const buttonBgColor = colorScheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)";
  const buttonBorderColor = colorScheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";
  const circleBgColor = colorScheme === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.35)";

  return (
    <Animated.View className="flex-1 items-center justify-center" style={containerAnimatedStyle}>
      <Text className="text-center font-nowoo-serif-medium text-5xl text-slate-800 dark:text-white mb-8">
        Complete
      </Text>
      <Text
        style={{
          fontSize: 18,
          color: textColor,
          fontWeight: "500",
          marginBottom: 24,
        }}
      >
        How do you feel now?
      </Text>
      <View className="flex-row justify-center px-4" style={{ gap: 20 }}>
        {(Object.keys(moodConfig) as Mood[]).map((mood) => {
          const config = moodConfig[mood];
          return (
            <View
              key={mood}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: circleBgColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pressable
                onPress={() => {
                  console.log("Button pressed for mood:", mood);
                  handleMoodPress(mood);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => ({
                  backgroundColor: selectedMood === mood 
                    ? (colorScheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)")
                    : pressed
                    ? (colorScheme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)")
                    : buttonBgColor,
                  borderWidth: selectedMood === mood ? 2 : 1,
                  borderColor: selectedMood === mood ? config.color : buttonBorderColor,
                  borderRadius: 16,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  minWidth: 56,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
              {config.iconSet === "ionicons" ? (
                <Ionicons
                  name={config.icon as any}
                  size={40}
                  color={config.color}
                />
              ) : (
                <MaterialCommunityIcons
                  name={config.icon as any}
                  size={40}
                  color={config.color}
                />
              )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};
