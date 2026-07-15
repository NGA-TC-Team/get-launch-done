import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DEVICE_TRANSFORM,
  createDeviceTransformStyle,
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
});
