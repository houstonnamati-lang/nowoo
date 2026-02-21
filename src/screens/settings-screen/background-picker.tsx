import React, { FC } from "react";
import { View, Text, Pressable, Image, ScrollView, ImageSourcePropType } from "react-native";
import { useColorScheme } from "nativewind";
import Ionicons from "@expo/vector-icons/Ionicons";
import { images } from "@nowoo/assets/images";

// Limited to 5 options that keep timer and positive word readable (good contrast).
export const BACKGROUND_COLORS = [
  { value: "#FFA550", label: "Sunrise", color: "#FFA550" },
  { value: "#FF5052", label: "Red Light", color: "#FF5052" },
  { value: "#25004c", label: "Deep Violet", color: "#25004c" },
  { value: "#22170c", label: "Earth", color: "#22170c" },
  { value: "#f2fbf4", label: "Seawater", color: "#f2fbf4" },
];

export type BackgroundImageOption = {
  value: string | null;
  label: string;
  image: ImageSourcePropType | null;
  thumbnail?: ImageSourcePropType | null;
};

export const BACKGROUND_IMAGES: BackgroundImageOption[] = [
  { value: null, label: "None", image: null },
  {
    value: "mountainSunrise",
    label: "Mountain Sunrise",
    image: images.screenBgs.mountainSunrise,
    thumbnail: images.screenBgThumbnails.mountainSunrise,
  },
  {
    value: "oceanSunrise",
    label: "Ocean Sunrise",
    image: images.screenBgs.oceanSunrise,
    thumbnail: images.screenBgThumbnails.oceanSunrise,
  },
  {
    value: "desertSunrise",
    label: "Desert Sunrise",
    image: images.screenBgs.desertSunrise,
    thumbnail: images.screenBgThumbnails.desertSunrise,
  },
  {
    value: "mountainNight",
    label: "Mountain Night",
    image: images.screenBgs.mountainNight,
    thumbnail: images.screenBgThumbnails.mountainNight,
  },
  {
    value: "oceanNight",
    label: "Ocean Night",
    image: images.screenBgs.oceanNight,
    thumbnail: images.screenBgThumbnails.oceanNight,
  },
  {
    value: "desertNight",
    label: "Desert Night",
    image: images.screenBgs.desertNight,
    thumbnail: images.screenBgThumbnails.desertNight,
  },
];

interface BackgroundPickerProps {
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  backgroundImage: string | null;
  onBackgroundImageChange: (image: string | null) => void;
}

export const BackgroundPicker: FC<BackgroundPickerProps> = ({
  backgroundColor,
  onBackgroundColorChange,
  backgroundImage,
  onBackgroundImageChange,
}) => {
  const { colorScheme } = useColorScheme();
  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const secondaryTextColor = colorScheme === "dark" ? "#999999" : "#666666";
  const bgColor = colorScheme === "dark" ? "#1c1c1e" : "#ffffff";
  const borderColor = colorScheme === "dark" ? "#38383a" : "#e7e5e4";

  return (
    <View>
      {/* Background Color Picker */}
      <View
        style={{
          backgroundColor: bgColor,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#a78bfa",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="color-palette" size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: textColor }}>
              Background Color
            </Text>
            <Text style={{ fontSize: 14, color: secondaryTextColor, marginTop: 2 }}>
              Choose a solid color for the exercise screen
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
          {BACKGROUND_COLORS.map((colorOption) => {
            const isSelected = backgroundColor === colorOption.value;
            return (
              <Pressable
                key={colorOption.value}
                onPress={() => onBackgroundColorChange(colorOption.value)}
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

      {/* Background Image Picker */}
      <View
        style={{
          backgroundColor: bgColor,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#60a5fa",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="image" size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: textColor }}>
              Background Image
            </Text>
            <Text style={{ fontSize: 14, color: secondaryTextColor, marginTop: 2 }}>
              Optional image overlay on the background color
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            {BACKGROUND_IMAGES.map((imageOption) => {
              const isSelected = backgroundImage === imageOption.value;
              return (
                <Pressable
                  key={imageOption.value ?? "none"}
                  onPress={() => onBackgroundImageChange(imageOption.value)}
                  style={{ alignItems: "center", maxWidth: 88 }}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      borderWidth: isSelected ? 3 : 2,
                      borderColor: isSelected ? textColor : borderColor,
                      overflow: "hidden",
                      backgroundColor: borderColor,
                    }}
                  >
                    {imageOption.image ? (
                      <Image
                        source={imageOption.thumbnail ?? imageOption.image}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: borderColor,
                        }}
                      >
                        <Ionicons name="close-circle" size={32} color={secondaryTextColor} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: textColor,
                      fontWeight: isSelected ? "600" : "400",
                      textAlign: "center",
                    }}
                    numberOfLines={2}
                  >
                    {imageOption.label.split(" ").join("\n")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};
