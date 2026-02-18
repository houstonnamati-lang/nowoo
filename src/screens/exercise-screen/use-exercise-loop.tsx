import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { animate } from "utils/animate";
import { StepMetadata } from "@nowoo/types/step-metadata";

// Since loops using the native driver cannot contain Animated.sequence
// we create a custom function that goes trough them
export const loopAnimations = (
  createAnimations: () => Animated.CompositeAnimation[],
  onStepStart: (stepIndex: number) => void,
  initialStepIndex: number = 0
) => {
  let animations = createAnimations();
  let currentAnimationIndex = initialStepIndex;
  const animateStep = () => {
    animations[currentAnimationIndex].start(({ finished }) => {
      if (!finished) return;
      currentAnimationIndex++;
      if (currentAnimationIndex >= animations.length) {
        currentAnimationIndex = 0;
        animations = createAnimations();
      }
      onStepStart(currentAnimationIndex);
      animateStep();
    });
  };
  onStepStart(currentAnimationIndex);
  animateStep();
  const stopLoop = () => {
    animations.forEach((animation) => animation.stop());
  };
  return stopLoop;
};

const textAnimDuration = 400;

export const useExerciseLoop = (
  stepsMetadata: [StepMetadata, StepMetadata, StepMetadata, StepMetadata],
  isPaused: boolean = false
) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const stepIndexRef = useRef(0);
  const textAnimVal = useRef(new Animated.Value(0)).current;
  const exerciseAnimVal = useRef(new Animated.Value(0)).current;
  const activeSteps = stepsMetadata.filter((step) => !step.skipped);
  const currentStep: StepMetadata | undefined = activeSteps[currentStepIndex];

  stepIndexRef.current = currentStepIndex;

  const animateStep = (toValue: number, duration: number) => {
    return Animated.stagger(duration - textAnimDuration, [
      Animated.parallel([
        animate(exerciseAnimVal, {
          toValue: toValue,
          duration: duration,
        }),
        animate(textAnimVal, {
          toValue: 1,
          duration: textAnimDuration,
        }),
      ]),
      animate(textAnimVal, {
        toValue: 0,
        duration: textAnimDuration,
      }),
    ]);
  };

  useEffect(() => {
    if (isPaused) return;
    const createStepAnimations = () =>
      activeSteps.map((x) =>
        animateStep(x.id === "inhale" || x.id === "afterInhale" ? 1 : 0, x.duration)
      );
    const startIndex = stepIndexRef.current;
    const cleanupExerciseLoop = loopAnimations(
      createStepAnimations,
      (stepIndex: number) => {
        setCurrentStepIndex(stepIndex);
        stepIndexRef.current = stepIndex;
      },
      startIndex
    );
    return () => {
      cleanupExerciseLoop();
    };
  }, [isPaused]);

  return { currentStep, exerciseAnimVal, textAnimVal };
};
