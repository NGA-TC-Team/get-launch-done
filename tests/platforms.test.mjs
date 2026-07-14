import { describe, expect, test } from "bun:test";
import { platformDefs } from "../src/app/platforms";

describe("platform definitions", () => {
  test("iOS 제출용 페이지 해상도는 App Store 6.5 디스플레이 세로 규격을 사용한다", () => {
    expect(platformDefs.ios.width).toBe(1284);
    expect(platformDefs.ios.height).toBe(2778);
    expect(platformDefs.ios.ratio).toBe("1284 / 2778");
    expect(platformDefs.ios.sizeLabel).toContain("1284 x 2778");
  });
});
