import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DEVICE_TRANSFORM,
  applyDeviceDragDelta,
  applyDeviceRotateGesture,
  applyDeviceScaleGesture,
  createDeviceTransformStyle,
  getPointerAngleDegrees,
  getPointerDistance,
  normalizeDeviceTransform,
} from "../src/app/device-transform";

describe("device transform helpers", () => {
  test("목업 위치, 스케일, 회전 값을 안전한 범위로 정규화한다", () => {
    expect(
      normalizeDeviceTransform({
        x: 120,
        y: -120,
        scale: 3,
        rotate: -90,
      }),
    ).toEqual({
      x: 50,
      y: -50,
      scale: 1.6,
      rotate: -45,
    });
  });

  test("미리보기 CSS 변수로 변환한다", () => {
    expect(createDeviceTransformStyle(DEFAULT_DEVICE_TRANSFORM)).toEqual({
      "--device-shift-x": "0%",
      "--device-shift-y": "0%",
      "--device-scale": 1,
      "--device-rotate": "0deg",
    });
  });

  test("페이지 안 드래그 픽셀 이동을 목업 위치 퍼센트로 변환한다", () => {
    expect(
      applyDeviceDragDelta(
        { x: 4, y: -3, scale: 1, rotate: 0 },
        { deltaX: 24, deltaY: -30, frameWidth: 240, frameHeight: 600 },
      ),
    ).toEqual({
      x: 14,
      y: -8,
      scale: 1,
      rotate: 0,
    });
  });

  test("Shift 드래그는 더 많이 움직인 축으로만 목업 위치를 변경한다", () => {
    expect(
      applyDeviceDragDelta(
        { x: 4, y: -3, scale: 1, rotate: 0 },
        { deltaX: 24, deltaY: -60, frameWidth: 240, frameHeight: 600, lockAxis: true },
      ),
    ).toEqual({
      x: 4,
      y: -13,
      scale: 1,
      rotate: 0,
    });
  });

  test("스케일 핸들 이동 거리를 기준으로 목업 스케일을 변경한다", () => {
    expect(
      applyDeviceScaleGesture(
        { x: 0, y: 0, scale: 1.1, rotate: 0 },
        { startDistance: 120, currentDistance: 180 },
      ),
    ).toEqual({
      x: 0,
      y: 0,
      scale: 1.6,
      rotate: 0,
    });
  });

  test("회전 핸들 각도 차이를 기준으로 목업 회전을 변경한다", () => {
    expect(
      applyDeviceRotateGesture(
        { x: 0, y: 0, scale: 1, rotate: 10 },
        { startAngle: -90, currentAngle: -45 },
      ),
    ).toEqual({
      x: 0,
      y: 0,
      scale: 1,
      rotate: 45,
    });
  });

  test("포인터와 중심점 사이의 거리와 각도를 계산한다", () => {
    expect(getPointerDistance({ x: 10, y: 10 }, { x: 10, y: -20 })).toBe(30);
    expect(getPointerAngleDegrees({ x: 10, y: 10 }, { x: 10, y: -20 })).toBe(-90);
  });
});
