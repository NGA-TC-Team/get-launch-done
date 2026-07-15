import { describe, expect, test } from "bun:test";
import { getExportTargets, ipadExportDef } from "../src/app/export-targets";
import { platformDefs } from "../src/app/platforms";

describe("export targets", () => {
  test("iOS 내보내기는 기존 페이지와 iPad 폴더용 페이지를 함께 만든다", () => {
    const targets = getExportTargets({
      platformKey: "ios",
      platform: platformDefs.ios,
      count: 2,
      extension: "png",
    });

    expect(targets.map((target) => target.name)).toEqual([
      "app-store-01.png",
      "ipad/ipad-01.png",
      "app-store-02.png",
      "ipad/ipad-02.png",
    ]);
    expect(targets[1].platform.width).toBe(2048);
    expect(targets[1].platform.height).toBe(2732);
    expect(targets[1].platform.ratio).toBe("2048 / 2732");
    expect(targets[1].platform).toEqual(ipadExportDef);
  });

  test("Android 내보내기는 iPad 폴더를 추가하지 않는다", () => {
    const targets = getExportTargets({
      platformKey: "android",
      platform: platformDefs.android,
      count: 2,
      extension: "jpg",
    });

    expect(targets.map((target) => target.name)).toEqual(["google-play-01.jpg", "google-play-02.jpg"]);
    expect(targets.every((target) => !target.name.startsWith("ipad/"))).toBe(true);
  });
});
