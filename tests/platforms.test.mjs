import { describe, expect, test } from "bun:test";
import { getDefaultStoreTargetIds, getStoreTargetSpecs, platformDefs, storeTargetSpecs } from "../src/app/platforms";

describe("platform definitions", () => {
  test("iOS 기본 제출용 페이지 해상도는 App Store 6.9 디스플레이 세로 규격을 사용한다", () => {
    expect(platformDefs.ios.width).toBe(1320);
    expect(platformDefs.ios.height).toBe(2868);
    expect(platformDefs.ios.ratio).toBe("1320 / 2868");
    expect(platformDefs.ios.sizeLabel).toContain("1320 x 2868");
  });

  test("iOS 편집 화면은 하단 컨트롤이 잘리지 않도록 압축된 프리뷰 폭을 사용한다", () => {
    expect(platformDefs.ios.cardWidth).toBeLessThanOrEqual(292);
    expect(platformDefs.ios.cardWidth / (platformDefs.ios.cardWidth * (platformDefs.ios.height / platformDefs.ios.width))).toBeCloseTo(
      platformDefs.ios.width / platformDefs.ios.height,
      5,
    );
  });

  test("기본 규격은 각 OS의 phone 산출물 하나만 선택한다", () => {
    expect(getDefaultStoreTargetIds("ios")).toEqual(["ios-phone-69"]);
    expect(getDefaultStoreTargetIds("android")).toEqual(["android-phone"]);
  });

  test("선택 규격은 OS에 맞지 않는 항목을 제외하고 비어 있으면 기본값으로 되돌린다", () => {
    expect(getStoreTargetSpecs("ios", ["android-tv", "ios-tablet-13"]).map((target) => target.id)).toEqual([
      "ios-tablet-13",
    ]);
    expect(getStoreTargetSpecs("android", []).map((target) => target.id)).toEqual(["android-phone"]);
  });

  test("스토어 규격은 tablet, TV, wearable 산출물 정보를 포함한다", () => {
    expect(storeTargetSpecs["ios-tablet-13"].platform.sizeLabel).toContain("2064 x 2752");
    expect(storeTargetSpecs["ios-tv"].platform.sizeLabel).toContain("1920 x 1080");
    expect(storeTargetSpecs["ios-watch"].platform.sizeLabel).toContain("422 x 514");
    expect(storeTargetSpecs["android-tablet"].platform.sizeLabel).toContain("1920 x 1080");
    expect(storeTargetSpecs["android-tv"].platform.sizeLabel).toContain("1920 x 1080");
    expect(storeTargetSpecs["android-wear"].platform.sizeLabel).toContain("384 x 384");
  });
});
