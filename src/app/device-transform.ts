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

export type Point = {
  x: number;
  y: number;
};

export function normalizeDeviceTransform(input: Partial<DeviceTransform> | undefined): DeviceTransform {
  return {
    x: clampNumber(input?.x, -50, 50, DEFAULT_DEVICE_TRANSFORM.x),
    y: clampNumber(input?.y, -50, 50, DEFAULT_DEVICE_TRANSFORM.y),
    scale: clampNumber(input?.scale, 0.55, 1.6, DEFAULT_DEVICE_TRANSFORM.scale),
    rotate: clampNumber(input?.rotate, -45, 45, DEFAULT_DEVICE_TRANSFORM.rotate),
  };
}

export function applyDeviceDragDelta(
  transform: DeviceTransform,
  {
    deltaX,
    deltaY,
    frameWidth,
    frameHeight,
    lockAxis,
  }: {
    deltaX: number;
    deltaY: number;
    frameWidth: number;
    frameHeight: number;
    lockAxis?: boolean;
  },
): DeviceTransform {
  const nextDeltaX = lockAxis && Math.abs(deltaY) > Math.abs(deltaX) ? 0 : deltaX;
  const nextDeltaY = lockAxis && Math.abs(deltaX) >= Math.abs(deltaY) ? 0 : deltaY;

  return normalizeDeviceTransform({
    ...transform,
    x: transform.x + (nextDeltaX / Math.max(1, frameWidth)) * 100,
    y: transform.y + (nextDeltaY / Math.max(1, frameHeight)) * 100,
  });
}

export function applyDeviceScaleGesture(
  transform: DeviceTransform,
  {
    startDistance,
    currentDistance,
  }: {
    startDistance: number;
    currentDistance: number;
  },
): DeviceTransform {
  const distanceRatio = currentDistance / Math.max(1, startDistance);
  return normalizeDeviceTransform({
    ...transform,
    scale: transform.scale * distanceRatio,
  });
}

export function applyDeviceRotateGesture(
  transform: DeviceTransform,
  {
    startAngle,
    currentAngle,
  }: {
    startAngle: number;
    currentAngle: number;
  },
): DeviceTransform {
  return normalizeDeviceTransform({
    ...transform,
    rotate: transform.rotate + normalizeAngleDelta(currentAngle - startAngle),
  });
}

export function getPointerDistance(center: Point, pointer: Point) {
  return Math.hypot(pointer.x - center.x, pointer.y - center.y);
}

export function getPointerAngleDegrees(center: Point, pointer: Point) {
  return (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI;
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

function normalizeAngleDelta(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
}
