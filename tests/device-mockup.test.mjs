import { describe, expect, test } from "bun:test";
import { shouldRenderDeviceCutout } from "../src/app/device-mockup";

describe("device mockup helpers", () => {
  test("목업 장식 숨김 옵션이 꺼져 있으면 카메라/아일랜드를 렌더링한다", () => {
    expect(shouldRenderDeviceCutout(false)).toBe(true);
  });

  test("목업 장식 숨김 옵션이 켜져 있으면 카메라/아일랜드를 렌더링하지 않는다", () => {
    expect(shouldRenderDeviceCutout(true)).toBe(false);
  });
});
