import type { CSSProperties } from "react";

export type DeviceTransform = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export type DeviceTransformVars = CSSProperties & {
  "--device-shift-x": string;
  "--device-shift-y": string;
  "--device-scale": number;
  "--device-rotate": string;
};

export const DEFAULT_DEVICE_TRANSFORM: DeviceTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
};

export function normalizeDeviceTransform(input: Partial<DeviceTransform> | undefined): DeviceTransform {
  return {
    x: clampNumber(input?.x, -50, 50, DEFAULT_DEVICE_TRANSFORM.x),
    y: clampNumber(input?.y, -50, 50, DEFAULT_DEVICE_TRANSFORM.y),
    scale: clampNumber(input?.scale, 0.55, 1.6, DEFAULT_DEVICE_TRANSFORM.scale),
    rotate: clampNumber(input?.rotate, -45, 45, DEFAULT_DEVICE_TRANSFORM.rotate),
  };
}

export function createDeviceTransformStyle(transform: DeviceTransform): DeviceTransformVars {
  const normalized = normalizeDeviceTransform(transform);
  return {
    "--device-shift-x": `${normalized.x}%`,
    "--device-shift-y": `${normalized.y}%`,
    "--device-scale": normalized.scale,
    "--device-rotate": `${normalized.rotate}deg`,
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
}
