import { useColorScheme } from "nativewind";
import React, { FC, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { animate } from "@breathly/utils/animate";
import { useInterval } from "@breathly/utils/use-interval";
import { getShuffledWords } from "./positive-words";

// Position from top of the flex-1 container (which starts after the timer)
// This positions the word roughly halfway between the timer and the breathing circle
const WORD_POSITION_TOP = 50;

export const PositiveWord: FC = () => {
  const { colorScheme } = useColorScheme();
  const [words] = useState(() => getShuffledWords());
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacityAnimVal = useRef(new Animated.Value(1)).current;

  const currentWord = words[currentIndex];
  const isDark = colorScheme === "dark";

  const cycleToNextWord = () => {
    // Fade out
    animate(opacityAnimVal, {
      toValue: 0,
      duration: 1000,
    }).start(() => {
      // Update word
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
      // Fade in
      animate(opacityAnimVal, {
        toValue: 1,
        duration: 1000,
      }).start();
    });
  };

  useInterval(cycleToNextWord, 5000);

  const textAnimatedStyle = {
    opacity: opacityAnimVal,
  };

  return (
    <Animated.View
      className="absolute left-0 right-0 items-center"
      style={{
        top: WORD_POSITION_TOP,
        opacity: opacityAnimVal,
      }}
    >
      <View
        className="px-4 py-2 rounded"
        style={{
          backgroundColor: isDark ? "#ffffff" : "#000000",
        }}
      >
        <Animated.Text
          className="text-center font-breathly-medium text-xl"
          style={{
            ...textAnimatedStyle,
            color: isDark ? "#000000" : "#ffffff",
          }}
        >
          {currentWord}
        </Animated.Text>
      </View>
    </Animated.View>
  );
};
