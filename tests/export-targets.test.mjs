import { describe, expect, test } from "bun:test";
import { getExportTargets } from "../src/app/export-targets";
import { getDefaultStoreTargetIds, getStoreTargetSpecs, storeTargetSpecs } from "../src/app/platforms";

describe("export targets", () => {
  test("iOS 기본 내보내기는 iPad를 자동으로 포함하지 않는다", () => {
    const targetSpecs = getStoreTargetSpecs("ios", getDefaultStoreTargetIds("ios"));
    const targets = getExportTargets({
      targetSpecs,
      count: 2,
      extension: "png",
    });

    expect(targets.map((target) => target.name)).toEqual(["app-store-01.png", "app-store-02.png"]);
    expect(targets.every((target) => !target.name.startsWith("ipad"))).toBe(true);
    expect(targets.every((target) => target.platform === storeTargetSpecs["ios-phone-69"].platform)).toBe(true);
  });

  test("iOS 선택 규격은 iPhone, iPad, Apple TV, Apple Watch 폴더를 만든다", () => {
    const targetSpecs = getStoreTargetSpecs("ios", ["ios-phone-69", "ios-tablet-13", "ios-tv", "ios-watch"]);
    const targets = getExportTargets({
      targetSpecs,
      count: 1,
      extension: "png",
    });

    expect(targets.map((target) => target.name)).toEqual([
      "iphone-69/iphone-69-01.png",
      "ipad-13/ipad-13-01.png",
      "apple-tv/apple-tv-01.png",
      "apple-watch/apple-watch-01.png",
    ]);
    expect(targets.map((target) => [target.platform.width, target.platform.height])).toEqual([
      [1320, 2868],
      [2064, 2752],
      [1920, 1080],
      [422, 514],
    ]);
  });

  test("Android 선택 규격은 phone, tablet, TV, Wear OS 산출물을 만든다", () => {
    const targetSpecs = getStoreTargetSpecs("android", [
      "android-phone",
      "android-tablet",
      "android-tv",
      "android-wear",
    ]);
    const targets = getExportTargets({
      targetSpecs,
      count: 1,
      extension: "jpg",
    });

    expect(targets.map((target) => target.name)).toEqual([
      "android-phone/android-phone-01.jpg",
      "android-tablet/android-tablet-01.jpg",
      "android-tv/android-tv-01.jpg",
      "wear-os/wear-os-01.jpg",
    ]);
    expect(targets.map((target) => [target.platform.width, target.platform.height])).toEqual([
      [1080, 1920],
      [1920, 1080],
      [1920, 1080],
      [384, 384],
    ]);
    expect(storeTargetSpecs["android-wear"].platform.renderMode).toBe("composed");
  });
});
