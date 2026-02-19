import React, { FC } from "react";
import { View, Text, Modal, Pressable, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useStreakStore, Mood } from "@nowoo/stores/streak";

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
}

const moodConfig: Record<Mood, { icon: string; label: string; color: string; iconSet: "ionicons" | "material" }> = {
  sad: { icon: "sad-outline", label: "Sad", color: "#ef4444", iconSet: "ionicons" },
  neutral: { icon: "emoticon-neutral-outline", label: "Neutral", color: "#eab308", iconSet: "material" },
  happy: { icon: "happy-outline", label: "Happy", color: "#22c55e", iconSet: "ionicons" },
};

export const StreakModal: FC<StreakModalProps> = ({ visible, onClose }) => {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const currentStreak = useStreakStore((state) => state.currentStreak);
  const moodHistory = useStreakStore((state) => state.moodHistory);
  const getMoodPercentages = useStreakStore((state) => state.getMoodPercentages);
  const moodPercentages = getMoodPercentages();

  const bgColor = colorScheme === "dark" ? "#1a1a1a" : "#ffffff";
  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const secondaryTextColor = colorScheme === "dark" ? "#999999" : "#666666";
  const borderColor = colorScheme === "dark" ? "#38383a" : "#e7e5e4";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: bgColor,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom,
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 24,
              paddingBottom: 8,
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: borderColor,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            
            {/* Streak display */}
            <View className="items-center mb-8">
              <View className="flex-row items-center gap-3 mb-2">
                <Ionicons name="flame" size={40} color="#ff6b35" />
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: "bold",
                    color: textColor,
                  }}
                >
                  {currentStreak}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  color: secondaryTextColor,
                }}
              >
                {currentStreak === 1 ? "day streak" : "days streak"}
              </Text>
            </View>

            {/* Mood history percentages */}
            {Object.values(moodPercentages).some((p) => p > 0) && (
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: textColor,
                    marginBottom: 16,
                  }}
                >
                  Your mood history
                </Text>
                <View className="flex-row justify-around">
                  {(Object.keys(moodConfig) as Mood[]).map((mood) => {
                    const percentage = moodPercentages[mood];
                    const config = moodConfig[mood];
                    return (
                      <View key={mood} className="items-center">
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
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: textColor,
                            marginTop: 8,
                          }}
                        >
                          {percentage}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
