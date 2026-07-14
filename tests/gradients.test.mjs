import { describe, expect, test } from "bun:test";
import { createCssGradient, normalizeGradientStops, normalizeHexColor } from "../src/app/gradients";

describe("gradient helpers", () => {
  test("컬러 스탑을 위치 순서대로 정렬하고 0~100 범위로 제한한다", () => {
    const stops = normalizeGradientStops([
      { id: "b", color: "#222222", position: 120 },
      { id: "a", color: "#111111", position: -10 },
      { id: "c", color: "#333333", position: 55 },
    ]);

    expect(stops).toEqual([
      { id: "a", color: "#111111", position: 0 },
      { id: "c", color: "#333333", position: 55 },
      { id: "b", color: "#222222", position: 100 },
    ]);
  });

  test("선형 그라데이션 CSS 문자열을 만든다", () => {
    const gradient = createCssGradient({
      type: "linear",
      angle: 45,
      stops: [
        { id: "a", color: "#111111", position: 0 },
        { id: "b", color: "#ffffff", position: 100 },
      ],
    });

    expect(gradient).toBe("linear-gradient(45deg, #111111 0%, #ffffff 100%)");
  });

  test("방사형 그라데이션 CSS 문자열을 만든다", () => {
    const gradient = createCssGradient({
      type: "radial",
      angle: 90,
      stops: [
        { id: "a", color: "#111111", position: 0 },
        { id: "b", color: "#ffffff", position: 100 },
      ],
    });

    expect(gradient).toBe("radial-gradient(circle at center, #111111 0%, #ffffff 100%)");
  });

  test("HEX 컬러 입력을 6자리 소문자 HEX 값으로 정규화한다", () => {
    expect(normalizeHexColor("#ABC")).toBe("#aabbcc");
    expect(normalizeHexColor("22C55E")).toBe("#22c55e");
    expect(normalizeHexColor("#not-hex")).toBeNull();
  });
});
