import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import ms from "ms";
import React, { FC, useEffect, useRef } from "react";
import { Animated, Easing, Image } from "react-native";
import { images } from "@nowoo/assets/images";
import { deviceHeight, deviceWidth, widestDeviceDimension } from "@nowoo/design/metrics";
import { animate } from "@nowoo/utils/animate";

const BACKGROUND_ANIM_DURATION = ms("2 min");

const StyledMaskedView = MaskedView;

interface Props {
  fadeIn?: boolean;
  onImageLoaded?: () => unknown;
  size?: number;
  rotate90?: boolean;
}

export const StarsBackground: FC<Props> = ({
  fadeIn,
  onImageLoaded,
  size = widestDeviceDimension * 0.6,
  rotate90 = false,
}) => {
  const backgroundAnimValue = useRef(new Animated.Value(0)).current;
  const fadeInAnimValue = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;

  useEffect(() => {
    if (rotate90) {
      // For rotated version, use continuous linear animation
      Animated.loop(
        Animated.timing(backgroundAnimValue, {
          toValue: 1,
          duration: BACKGROUND_ANIM_DURATION,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundAnimValue, {
            toValue: 1,
            duration: BACKGROUND_ANIM_DURATION,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(backgroundAnimValue, {
            toValue: 0,
            duration: BACKGROUND_ANIM_DURATION,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ])
      ).start();
    }
  });

  const backgroundTransform = rotate90
    ? [
        {
          rotate: "90deg",
        },
        {
          translateY: backgroundAnimValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-deviceWidth / 2, -deviceWidth],
            extrapolate: "clamp",
          }),
        },
      ]
    : [
        {
          translateX: backgroundAnimValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -size],
            extrapolate: "clamp",
          }),
        },
        {
          translateY: backgroundAnimValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -size],
            extrapolate: "clamp",
          }),
        },
      ];

  const handleLoad = () => {
    onImageLoaded?.();
    if (fadeIn) {
      animate(fadeInAnimValue, { toValue: 1, duration: 600 }).start();
    }
  };

  return (
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        opacity: fadeInAnimValue,
      }}
    >
      {rotate90 ? (
        <>
          {/* Create multiple instances for seamless looping - cover full screen height */}
          {[0, 1, 2, 3].map((index) => {
            // After 90deg rotation, the image width becomes the height
            // We need deviceHeight tall, so original width should be deviceHeight
            // Each segment covers deviceHeight vertically after rotation
            const segmentHeight = deviceHeight;
            // Starting positions to cover from top to bottom
            const baseY = -segmentHeight * 2 + index * segmentHeight;
            return (
              <Animated.View
                key={index}
                style={[
                  {
                    height: deviceHeight,
                    width: deviceWidth,
                    position: "absolute",
                  },
                  {
                    transform: [
                      {
                        rotate: "90deg",
                      },
                      {
                        translateX: (deviceWidth - deviceHeight) / 2,
                      },
                      {
                        translateY: backgroundAnimValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [baseY, baseY - segmentHeight],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  style={{ width: "100%", height: "100%" }}
                  source={images.starsBackgroundHorizontal}
                  resizeMode="cover"
                  onLoad={index === 0 ? handleLoad : undefined}
                />
              </Animated.View>
            );
          })}
        </>
      ) : (
        <StyledMaskedView
          style={{ flex: 1 }}
          maskElement={
            <LinearGradient
              colors={["black", "transparent"]}
              style={{ flex: 1 }}
              start={{ x: 0, y: 0.7 }}
              end={{ x: 0, y: 0.9 }}
            />
          }
        >
          <Animated.View
            style={[
              {
                height: size * 2,
                width: size * 2,
              },
              { transform: backgroundTransform },
            ]}
          >
            <Image
              style={{ position: "absolute", top: 0, zIndex: 10, height: "100%", width: "100%" }}
              source={images.starsBackgroundHorizontal}
              resizeMode="cover"
              onLoad={handleLoad}
            />
          </Animated.View>
        </StyledMaskedView>
      )}
    </Animated.View>
  );
};
