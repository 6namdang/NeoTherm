/**
 * Semicircular score gauge styled like Apple Fitness / Swift Charts arcs:
 * muted track + rounded foreground sweep, knob at value. See Apple's Swift Charts &
 * Human Interface Guidelines (Charts components) — soft materials, readable contrast,
 * minimal chart junk.
 */

import { useMemo } from "react";
import { PixelRatio, View } from "react-native";
import Svg, { Circle, Defs, Line, Path, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";

function polar(cx: number, cy: number, r: number, θ: number): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(θ),
    y: cy + r * Math.sin(θ),
  };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const sweep = a1 - a0;
  const large = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFl = sweep >= 0 ? 1 : 0;
  return `M ${p0.x.toFixed(3)} ${p0.y.toFixed(3)} A ${r} ${r} 0 ${large} ${sweepFl} ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`;
}

export type IosSemiGaugeProps = {
  /** Current value; `null` shows empty track only. */
  value: number | null;
  maxValue: number;
  /** Threshold lines drawn on track (shown as fractions of arc). Example GAD‑7 `[5/21, …]`. */
  tickTotals?: readonly number[];
  /** Primary arc + knob hue (Fitness-style ring tint). */
  accentColor: string;
  /** Optional gradient end for arc stroke polish. */
  accentSoft?: string;
  /** Muted groove behind value (system gray‑like). */
  trackStroke?: string;
};

export function IosSemiGauge({
  value,
  maxValue,
  tickTotals,
  accentColor,
  accentSoft,
  trackStroke = "rgba(15,23,42,0.10)",
}: IosSemiGaugeProps) {
  const strokeW = PixelRatio.roundToNearestPixel(11);
  const tickStroke = PixelRatio.roundToNearestPixel(1);
  const w = 280;
  const h = 138;
  const cx = w / 2;
  const cy = h - 6;
  const r = 100;
  const pad = 0.12;
  const θ0 = Math.PI + pad;
  const θ1 = 2 * Math.PI - pad;
  const span = θ1 - θ0;
  const frac =
    value !== null ? Math.min(1, Math.max(0, value / maxValue)) : 0;
  const θScore = θ0 + span * frac;

  const gradId = useMemo(
    () =>
      `iosGaugeGrad_${accentColor.replace(/[^a-zA-Z0-9]/g, "")}_${Math.random().toString(36).slice(2, 9)}`,
    [accentColor],
  );

  const softEnd = accentSoft ?? accentColor;

  return (
    <View style={{ width: w, height: h }}>
      <Svg height={h} width={w}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" x2="100%" y1="0%" y2="0%">
            <Stop offset="0%" stopColor={accentColor} />
            <Stop offset="100%" stopColor={softEnd} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={arcPath(cx, cy, r, θ0, θ1)}
          fill="none"
          stroke={trackStroke}
          strokeLinecap="round"
          strokeWidth={strokeW}
        />
        {value !== null ? (
          <Path
            d={arcPath(cx, cy, r, θ0, θScore)}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeLinecap="round"
            strokeWidth={strokeW}
          />
        ) : null}
        {tickTotals?.map((cut) => {
          const f = Math.min(1, Math.max(0, cut / maxValue));
          const θ = θ0 + span * f;
          const inner = polar(cx, cy, r - strokeW * 0.55, θ);
          const outer = polar(cx, cy, r + strokeW * 0.55, θ);
          return (
            <Line
              key={cut}
              stroke="rgba(15,23,42,0.16)"
              strokeWidth={tickStroke}
              x1={inner.x}
              x2={outer.x}
              y1={inner.y}
              y2={outer.y}
            />
          );
        })}
        {value !== null ? (
          <Circle
            cx={polar(cx, cy, r, θScore).x}
            cy={polar(cx, cy, r, θScore).y}
            fill={accentColor}
            r={8}
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />
        ) : null}
      </Svg>
    </View>
  );
}
