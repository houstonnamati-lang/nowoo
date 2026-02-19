import React, { FC } from "react";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import Ionicons from "@expo/vector-icons/Ionicons";

export const BREATHING_COLORS = [
  { value: "#ffffff", label: "White", color: "#ffffff" },
  { value: "#000000", label: "Black", color: "#000000" },
  { value: "#166534", label: "Dark Green", color: "#166534" },
  { value: "#fb923c", label: "Light Orange", color: "#fb923c" },
  { value: "#581c87", label: "Deep Purple", color: "#581c87" },
];

interface ColorPickerProps {
  selectedColor: string | null;
  onColorChange: (color: string | null) => void;
  label: string;
  iconName?: string;
  iconBackgroundColor?: string;
}

export const ColorPicker: FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  label,
  iconName,
  iconBackgroundColor,
}) => {
  const { colorScheme } = useColorScheme();
  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const secondaryTextColor = colorScheme === "dark" ? "#999999" : "#666666";
  const bgColor = colorScheme === "dark" ? "#1c1c1e" : "#ffffff";
  const borderColor = colorScheme === "dark" ? "#38383a" : "#e7e5e4";

  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        {iconName && iconBackgroundColor && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: iconBackgroundColor,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={iconName as any} size={18} color="#ffffff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: textColor }}>
            {label}
          </Text>
          <Text style={{ fontSize: 14, color: secondaryTextColor, marginTop: 2 }}>
            Choose a color for the breathing animation
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {BREATHING_COLORS.map((colorOption) => {
          const isSelected = selectedColor === colorOption.value;
          return (
            <Pressable
              key={colorOption.value ?? "default"}
              onPress={() => onColorChange(colorOption.value)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colorOption.color,
                borderWidth: isSelected ? 3 : 2,
                borderColor: isSelected ? textColor : borderColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSelected && (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: textColor,
                    opacity: 0.3,
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
