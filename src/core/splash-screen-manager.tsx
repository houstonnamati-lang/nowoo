import { Asset } from "expo-asset";
import { Video, AVPlaybackStatus } from "expo-av";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import ms from "ms";
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { playSplashChime } from "@nowoo/services/audio";
import { useHomeScreenStatusStore } from "@nowoo/screens/home-screen/home-screen";
import { delay } from "@nowoo/utils/delay";

// Instruct SplashScreen not to hide yet, we want to do this manually
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
// Support both image and video files - try video first, fallback to image
let splashImageAsset: any;
let splashVideoAsset: any;
try {
  splashVideoAsset = require("../../assets/splash.mov");
} catch {
  try {
    splashVideoAsset = require("../../assets/splash.mp4");
  } catch {
    // No video file found, fallback to image
  }
}
try {
  splashImageAsset = require("../../assets/splash.png");
} catch {
  // No image file found
}

const isVideoAsset = !!splashVideoAsset;

// Chime plays this long after splash video starts
const splashChimeDelay = ms("300 ms");

// Splash ends (goes away) after this duration
const splashVideoDuration = ms("2.5 sec");

// Force the splash-screen to stay visible for a bit to avoid jarring visuals (image fallback)
const waitBeforeHide = ms("1.5 sec");

export const SplashScreenManager: React.FC<PropsWithChildren> = ({ children }) => {
  const [isSplashReady, setSplashReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      // Load the appropriate asset (video or image)
      if (isVideoAsset && splashVideoAsset) {
        await Asset.fromModule(splashVideoAsset).downloadAsync();
      } else if (splashImageAsset) {
      await Asset.fromModule(splashImageAsset).downloadAsync();
      }
      setSplashReady(true);
    }

    prepare();
  }, []);

  if (!isSplashReady) {
    return null;
  }

  return <AnimatedSplashScreen>{children}</AnimatedSplashScreen>;
};

const AnimatedSplashScreen: React.FC<PropsWithChildren> = ({ children }) => {
  const mountTime = useRef(Date.now()).current;
  const animation = useMemo(() => new Animated.Value(1), []);
  const [isAppReady, setAppReady] = useState(false);
  const { isHomeScreenReady } = useHomeScreenStatusStore();
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);
  const [hasWaitedMinimum, setHasWaitedMinimum] = useState(false);

  // Wait minimum time before allowing splash to hide
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaitedMinimum(true);
    }, waitBeforeHide);
    return () => clearTimeout(timer);
  }, []);

  const showApp = async () => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - mountTime;
    const remainingTime = elapsedTime > waitBeforeHide ? 0 : waitBeforeHide - elapsedTime;
    if (remainingTime > 0) {
      await delay(remainingTime);
    }
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad),
    }).start(() => setAnimationComplete(true));
  };

  useEffect(() => {
    // Hide splash screen once app is ready and minimum wait time has passed
    // If HomeScreen is ready, use it; otherwise hide anyway (for onboarding screen)
    if (isAppReady && hasWaitedMinimum) {
      if (isHomeScreenReady) {
        showApp();
      } else {
        // HomeScreen not ready (user is on onboarding), hide splash after short delay
        const timer = setTimeout(() => {
          showApp();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [isAppReady, isHomeScreenReady, hasWaitedMinimum]);

  const videoRef = useRef<Video>(null);
  const hasHiddenNativeSplash = useRef(false);
  const hasStartedSplashSetup = useRef(false);
  const chimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endSplashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (chimeTimerRef.current) clearTimeout(chimeTimerRef.current);
      if (endSplashTimerRef.current) clearTimeout(endSplashTimerRef.current);
    };
  }, []);

  const hideNativeSplash = useCallback(async () => {
    if (hasHiddenNativeSplash.current) return;
    hasHiddenNativeSplash.current = true;
    try {
      await SplashScreen.hideAsync();
    } catch {
      /* ignore */
    }
  }, []);

  const onMediaLoaded = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
      await Promise.all([]);
    } catch (e) {
      /* ignore */
    } finally {
      setAppReady(true);
    }
  }, []);

  const onVideoStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded && !hasStartedSplashSetup.current) {
        hasStartedSplashSetup.current = true;
        hideNativeSplash();
        chimeTimerRef.current = setTimeout(() => {
          chimeTimerRef.current = null;
          playSplashChime();
        }, splashChimeDelay);
        endSplashTimerRef.current = setTimeout(() => {
          endSplashTimerRef.current = null;
          videoRef.current?.pauseAsync();
          onMediaLoaded();
        }, splashVideoDuration);
      }
    },
    [hideNativeSplash, onMediaLoaded]
  );

  return (
    <View style={{ flex: 1 }}>
      {isAppReady && children}
      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: Constants.expoConfig?.splash?.backgroundColor || "#2d3748",
              opacity: animation,
            },
          ]}
        >
          {isVideoAsset && splashVideoAsset ? (
            <Video
              ref={videoRef}
              style={{
                width: "100%",
                height: "100%",
              }}
              source={splashVideoAsset}
              resizeMode={Constants.expoConfig?.splash?.resizeMode || "cover"}
              shouldPlay
              isLooping={false}
              isMuted
              onPlaybackStatusUpdate={onVideoStatusUpdate}
            />
          ) : splashImageAsset ? (
          <Animated.Image
            style={{
              width: "100%",
              height: "100%",
              resizeMode: Constants.expoConfig?.splash?.resizeMode || "cover",
            }}
            source={splashImageAsset}
              onLoadEnd={onMediaLoaded}
            fadeDuration={0}
          />
          ) : null}
        </Animated.View>
      )}
    </View>
  );
};
