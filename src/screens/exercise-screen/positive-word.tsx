import React, { FC, useRef, useState } from "react";
import { Animated } from "react-native";
import { animate } from "@nowoo/utils/animate";
import { isDarkBackground } from "@nowoo/utils/is-dark-background";
import { useEffectiveExerciseBackground } from "./use-effective-exercise-background";
import { useInterval } from "@nowoo/utils/use-interval";
import { getShuffledWords } from "./positive-words";

// Position from top of the flex-1 container (which starts after the timer)
// This positions the word closer to the breathing circle
const WORD_POSITION_TOP = 70;

export const PositiveWord: FC = () => {
  const [words] = useState(() => getShuffledWords());
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacityAnimVal = useRef(new Animated.Value(1)).current;
  const { backgroundColor } = useEffectiveExerciseBackground();
  const useLightText = isDarkBackground(backgroundColor);

  const currentWord = words[currentIndex];

  const cycleToNextWord = () => {
    // Fade out
    animate(opacityAnimVal, {
      toValue: 0,
      duration: 2000, // Longer fade out
    }).start(() => {
      // Update word
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
      // Fade in
      animate(opacityAnimVal, {
        toValue: 1,
        duration: 2000, // Longer fade in
      }).start();
    });
  };

  useInterval(cycleToNextWord, 5000);

  const textAnimatedStyle = {
    opacity: opacityAnimVal,
  };

  // Contrast with exercise background (40% opacity)
  const textColor = useLightText ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)";

  return (
    <Animated.View
      className="absolute left-0 right-0 items-center"
      style={{
        top: WORD_POSITION_TOP,
      }}
    >
      <Animated.Text
        className="text-center font-nowoo-medium text-4xl"
        style={{
          ...textAnimatedStyle,
          color: textColor,
        }}
      >
        {currentWord}
      </Animated.Text>
    </Animated.View>
  );
};
