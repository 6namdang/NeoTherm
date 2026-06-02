/**
 * Semicircular score gauge styled like Apple Fitness / Swift Charts arcs.
 * Animated sweep on mount and when value changes.
 */

import { AnimatedArcGauge, type AnimatedArcGaugeProps } from "./ui/AnimatedArcGauge";

export type IosSemiGaugeProps = Omit<AnimatedArcGaugeProps, "animateKey"> & {
  animateKey?: string;
};

export function IosSemiGauge({ animateKey, ...props }: IosSemiGaugeProps) {
  const key =
    animateKey ?? `${props.value ?? "na"}_${props.maxValue}`;
  return <AnimatedArcGauge {...props} animateKey={key} />;
}
