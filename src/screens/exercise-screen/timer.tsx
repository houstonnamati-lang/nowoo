import React, { FC, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { animate } from "@nowoo/utils/animate";
import { formatTimer } from "@nowoo/utils/format-timer";
import { useInterval } from "@nowoo/utils/use-interval";
import { useOnMount } from "@nowoo/utils/use-on-mount";

type Props = {
  limit: number;
  onLimitReached: () => void;
  paused?: boolean;
};

export const Timer: FC<Props> = ({ limit, onLimitReached, paused = false }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const opacityAnimVal = useRef(new Animated.Value(0)).current;

  const increaseElapsedTime = () => {
    setElapsedTime((prevElapsedTime) => prevElapsedTime + 1);
  };

  useInterval(increaseElapsedTime, paused ? null : 1000);

  const showContainerAnimation = animate(opacityAnimVal, {
    toValue: 1,
  });

  useOnMount(() => {
    showContainerAnimation.start();
    return () => {
      showContainerAnimation.stop();
    };
  });

  useEffect(() => {
    if (limit && elapsedTime * 1000 >= limit) {
      onLimitReached();
    }
    // TODO: Check this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, elapsedTime]);

  const containerAnimatedStyle = {
    opacity: opacityAnimVal.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };

  const timerText = limit ? formatTimer(limit / 1000 - elapsedTime) : formatTimer(elapsedTime);

  return (
    <Animated.View
      style={[
        containerAnimatedStyle,
        { position: "absolute", top: 0, left: 0, zIndex: 10, paddingLeft: 28 },
      ]}
    >
      <Animated.Text
        className="text-2xl text-slate-800 dark:text-white"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {timerText}
      </Animated.Text>
    </Animated.View>
  );
};
