import { describe, expect, test } from "bun:test";
import {
  getDefaultStoreTargetIds,
  getPreviewTargetGroups,
  getPreviewDeviceProfile,
  getPreviewTargetSpec,
  getStoreTargetSpecs,
  toggleStoreTargetSelection,
  platformDefs,
  storeTargetSpecs,
} from "../src/app/platforms";

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
    expect(storeTargetSpecs["ios-tablet-13"].shortLabel).toBe("iPad");
    expect(storeTargetSpecs["ios-tv"].platform.sizeLabel).toContain("1920 x 1080");
    expect(storeTargetSpecs["ios-watch"].platform.sizeLabel).toContain("422 x 514");
    expect(storeTargetSpecs["android-tablet"].platform.sizeLabel).toContain("1920 x 1080");
    expect(storeTargetSpecs["android-tv"].platform.sizeLabel).toContain("1920 x 1080");
    expect(storeTargetSpecs["android-wear"].platform.sizeLabel).toContain("384 x 384");
  });

  test("선택된 추가 규격 중 하나를 현재 미리보기 규격으로 유지한다", () => {
    const preview = getPreviewTargetSpec("ios", ["ios-phone-69", "ios-tablet-13", "ios-tv"], "ios-tv");

    expect(preview.id).toBe("ios-tv");
    expect(preview.platform.width).toBe(1920);
    expect(preview.platform.height).toBe(1080);
  });

  test("현재 미리보기 규격이 선택 목록에서 빠지면 첫 선택 규격으로 되돌린다", () => {
    const preview = getPreviewTargetSpec("android", ["android-phone", "android-tablet"], "android-tv");

    expect(preview.id).toBe("android-phone");
  });

  test("추가 규격을 선택해도 현재 phone 미리보기는 자동으로 iPad로 바뀌지 않는다", () => {
    const next = toggleStoreTargetSelection({
      platformKey: "ios",
      selectedTargetIds: ["ios-phone-69"],
      previewTargetId: "ios-phone-69",
      targetId: "ios-tablet-13",
    });

    expect(next.selectedTargetIds).toEqual(["ios-phone-69", "ios-tablet-13"]);
    expect(next.previewTargetId).toBe("ios-phone-69");
  });

  test("현재 미리보기 규격을 해제하면 남아 있는 첫 규격으로 미리보기를 되돌린다", () => {
    const next = toggleStoreTargetSelection({
      platformKey: "ios",
      selectedTargetIds: ["ios-phone-69", "ios-tablet-13"],
      previewTargetId: "ios-tablet-13",
      targetId: "ios-tablet-13",
    });

    expect(next.selectedTargetIds).toEqual(["ios-phone-69"]);
    expect(next.previewTargetId).toBe("ios-phone-69");
  });

  test("미리보기 전환 탭은 phone과 pad/tablet 그룹을 분리한다", () => {
    const groups = getPreviewTargetGroups(
      getStoreTargetSpecs("ios", ["ios-phone-69", "ios-tablet-13", "ios-tv"]),
    );

    expect(groups.map((group) => [group.id, group.label, group.specs.map((targetSpec) => targetSpec.id)])).toEqual([
      ["phone", "Phone", ["ios-phone-69"]],
      ["tablet", "iPad", ["ios-tablet-13"]],
      ["other", "기타", ["ios-tv"]],
    ]);
  });

  test("phone, tablet, TV, watch는 서로 다른 목업/카피 배치 프로파일을 가진다", () => {
    expect(getPreviewDeviceProfile(storeTargetSpecs["ios-phone-69"].platform)).toMatchObject({
      frameClass: "phone",
      copyLayout: "phone",
      supportsCutout: true,
      isWide: false,
    });
    expect(getPreviewDeviceProfile(storeTargetSpecs["android-tablet"].platform)).toMatchObject({
      frameClass: "tablet",
      copyLayout: "wide",
      supportsCutout: false,
      isWide: true,
    });
    expect(getPreviewDeviceProfile(storeTargetSpecs["ios-tv"].platform)).toMatchObject({
      frameClass: "tv",
      copyLayout: "wide",
      supportsCutout: false,
      isWide: true,
    });
    expect(getPreviewDeviceProfile(storeTargetSpecs["android-wear"].platform)).toMatchObject({
      frameClass: "watch",
      copyLayout: "compact",
      supportsCutout: false,
      isWide: false,
    });
  });
});
