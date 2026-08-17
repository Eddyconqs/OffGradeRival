import { useEffect, useState } from "react";
import { useTransform } from "framer-motion";

// Manual clamped piecewise-linear interpolation, used with useTransform's
// function-based overload instead of its array-keyframes overload — the
// keyframes overload produced visibly wrong (stuck) output for one phase
// during testing on this project, so every scroll-linked transform here
// goes through this instead.
export function lerpKeyframes(v, inputRange, outputRange) {
  if (v <= inputRange[0]) return outputRange[0];
  if (v >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
  for (let i = 0; i < inputRange.length - 1; i++) {
    const a = inputRange[i];
    const b = inputRange[i + 1];
    if (v >= a && v <= b) {
      const t = b === a ? 0 : (v - a) / (b - a);
      return outputRange[i] + (outputRange[i + 1] - outputRange[i]) * t;
    }
  }
  return outputRange[outputRange.length - 1];
}

// Shows a "beat" (one shot of a multi-beat scroll story) only while a 0-1
// progress track is within [start, end], fading/sliding it in and out at
// the edges — the same shape PHASES already use to hand off to each other,
// applied one level down so each scene reads as a short sequence of shots
// rather than one static frame. The first beat in a sequence should pass
// fadeIn:false (it needs to already be visible the instant its scene takes
// over) and the last should pass fadeOut:false (it's the resting frame).
export function useSegmentMotion(progress, start, end, opts = {}) {
  const { fadeIn = true, fadeOut = true, distance = 16 } = opts;
  const fadeW = Math.min(0.09, (end - start) / 2.4);

  const points = [start];
  const opacityOut = [fadeIn ? 0 : 1];
  const yOut = [fadeIn ? distance : 0];

  if (fadeIn) {
    points.push(start + fadeW);
    opacityOut.push(1);
    yOut.push(0);
  }
  if (fadeOut) {
    const fadeOutStart = Math.max(end - fadeW, points[points.length - 1]);
    points.push(fadeOutStart);
    opacityOut.push(1);
    yOut.push(0);
    points.push(end);
    opacityOut.push(0);
    yOut.push(-distance);
  } else {
    points.push(end);
    opacityOut.push(1);
    yOut.push(0);
  }

  const opacity = useTransform(progress, (v) => lerpKeyframes(v, points, opacityOut));
  const y = useTransform(progress, (v) => lerpKeyframes(v, points, yOut));
  return { opacity, y };
}

// Subscribes to a Framer Motion value and mirrors it into React state, so
// it can be rendered as text (e.g. a reaction count ticking up) — motion
// values update outside React's render cycle, so they can't be read
// directly in JSX.
export function useMotionValueState(motionValue) {
  const [value, setValue] = useState(motionValue.get());
  useEffect(() => {
    setValue(motionValue.get());
    return motionValue.on("change", setValue);
  }, [motionValue]);
  return value;
}
