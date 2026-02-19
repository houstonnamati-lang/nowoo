import React, { FC } from "react";
import { Animated } from "react-native";
import { interpolateTranslateY } from "@nowoo/utils/interpolate";
import { isDarkBackground } from "@nowoo/utils/is-dark-background";
import { useEffectiveExerciseBackground } from "./use-effective-exercise-background";

interface Props {
  label: string;
  animationValue: Animated.Value;
}

export const StepDescription: FC<Props> = ({ label, animationValue }) => {
  const { backgroundColor } = useEffectiveExerciseBackground();
  const useLightText = isDarkBackground(backgroundColor);

  const textAnimatedStyle = {
    opacity: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      interpolateTranslateY(animationValue, {
        inputRange: [0, 1],
        outputRange: [0, -8],
      }),
    ],
  };

  return (
    <Animated.Text
      className="mb-4 text-center font-nowoo-medium text-2xl"
      style={[
        textAnimatedStyle,
        { color: useLightText ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.9)" },
      ]}
    >
      {label}
    </Animated.Text>
  );
};
