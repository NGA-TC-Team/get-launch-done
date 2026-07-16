import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CATEGORY_PACK_ID,
  DEFAULT_TEMPLATE_SEQUENCE,
  IPHONE_17_PRO_DEVICE,
  IPHONE_17_PRO_DISPLAY,
  SCREENSHOT_CATEGORY_GROUPS,
  SCREENSHOT_CATEGORY_PACKS,
  SCREENSHOT_TEMPLATES,
  SCREENSHOT_THEMES,
  getCategoryPackById,
  getTemplateById,
} from "../src/app/templates";

describe("SCREENSHOT_TEMPLATES", () => {
  test("30개의 앱스토어 스크린샷 템플릿을 제공한다", () => {
    expect(SCREENSHOT_TEMPLATES.length).toBeGreaterThanOrEqual(45);
  });

  test("템플릿 ID는 고유하고 표시 문구는 한글이다", () => {
    const ids = new Set(SCREENSHOT_TEMPLATES.map((template) => template.id));

    expect(ids.size).toBe(SCREENSHOT_TEMPLATES.length);
    for (const template of SCREENSHOT_TEMPLATES) {
      expect(template.label).toMatch(/[가-힣]/);
      expect(template.description).toMatch(/[가-힣]/);
    }
  });

  test("다양한 배치를 위해 최소 8개 이상의 레이아웃 계열을 포함한다", () => {
    const families = new Set(SCREENSHOT_TEMPLATES.map((template) => template.family));

    expect(families.size).toBeGreaterThanOrEqual(8);
  });

  test("기본 10개 화면은 서로 다른 레이아웃 계열을 우선 사용한다", () => {
    const families = DEFAULT_TEMPLATE_SEQUENCE.map((templateId) => getTemplateById(templateId).family);

    expect(DEFAULT_TEMPLATE_SEQUENCE).toHaveLength(10);
    expect(new Set(families).size).toBe(10);
  });

  test("아이소메트릭과 fake-3D를 포함한 창의적 목업 배치를 제공한다", () => {
    const families = new Set(SCREENSHOT_TEMPLATES.map((template) => template.family));

    for (const family of ["isometric", "fake-3d", "floating-stack", "gallery-wall", "dashboard-grid"]) {
      expect(families.has(family), `${family} family`).toBe(true);
    }
  });

  test("애플과 구글 플레이 기준을 통합한 앱 카테고리 그룹을 제공한다", () => {
    const categoryIds = new Set(SCREENSHOT_CATEGORY_GROUPS.map((category) => category.id));
    const categoryLabels = SCREENSHOT_CATEGORY_GROUPS.map((category) => category.label);

    expect(SCREENSHOT_CATEGORY_GROUPS.length).toBeGreaterThanOrEqual(34);
    expect(categoryIds.size).toBe(SCREENSHOT_CATEGORY_GROUPS.length);
    expect(categoryLabels).toEqual(
      expect.arrayContaining([
        "비즈니스",
        "교육",
        "금융",
        "건강 및 피트니스",
        "사진 및 비디오",
        "생산성",
        "쇼핑",
        "소셜",
        "도구 및 유틸리티",
        "게임",
        "자동차",
        "뷰티",
        "부모",
      ]),
    );
  });

  test("각 앱 카테고리는 3~7개의 전체 페이지 템플릿 팩을 가진다", () => {
    const packsByCategory = new Map();

    for (const pack of SCREENSHOT_CATEGORY_PACKS) {
      packsByCategory.set(pack.categoryId, [...(packsByCategory.get(pack.categoryId) ?? []), pack]);
    }

    for (const category of SCREENSHOT_CATEGORY_GROUPS) {
      const packs = packsByCategory.get(category.id) ?? [];
      expect(packs.length, `${category.label} 카테고리 팩 수`).toBeGreaterThanOrEqual(3);
      expect(packs.length, `${category.label} 카테고리 팩 수`).toBeLessThanOrEqual(7);
    }
  });

  test("카테고리 팩은 10개 화면 전체의 유효한 템플릿 구성을 담는다", () => {
    const templateIds = new Set(SCREENSHOT_TEMPLATES.map((template) => template.id));
    const packIds = new Set(SCREENSHOT_CATEGORY_PACKS.map((pack) => pack.id));

    expect(SCREENSHOT_CATEGORY_PACKS.length).toBeGreaterThanOrEqual(SCREENSHOT_CATEGORY_GROUPS.length * 3);
    expect(packIds.size).toBe(SCREENSHOT_CATEGORY_PACKS.length);

    for (const pack of SCREENSHOT_CATEGORY_PACKS) {
      expect(pack.templateIds, `${pack.label} 화면 수`).toHaveLength(10);
      expect(new Set(pack.templateIds).size, `${pack.label} 중복 템플릿`).toBeGreaterThanOrEqual(8);
      for (const templateId of pack.templateIds) {
        expect(templateIds.has(templateId), `${pack.label} invalid ${templateId}`).toBe(true);
      }
    }
  });

  test("기본 카테고리 팩 조회는 항상 유효한 전체 구성을 반환한다", () => {
    const defaultPack = getCategoryPackById(DEFAULT_CATEGORY_PACK_ID);

    expect(defaultPack.id).toBe(DEFAULT_CATEGORY_PACK_ID);
    expect(defaultPack.templateIds).toHaveLength(10);
    expect(getCategoryPackById("missing-pack-id")).toBe(defaultPack);
  });

  test("스크린샷 배경 테마는 모노크롬 UI와 분리된 컬러 팔레트를 포함한다", () => {
    const colorfulThemes = SCREENSHOT_THEMES.filter((theme) => !isGrayscale(theme.a) || !isGrayscale(theme.b));

    expect(SCREENSHOT_THEMES.length).toBeGreaterThanOrEqual(8);
    expect(colorfulThemes.length).toBeGreaterThanOrEqual(6);
  });

  test("모든 템플릿은 AI 에이전트에게 전달할 수 있는 작성 프롬프트를 가진다", () => {
    for (const template of SCREENSHOT_TEMPLATES) {
      expect(template.prompt).toContain(template.label);
      expect(template.prompt).toContain("프로젝트");
      expect(template.prompt).toContain("제목");
      expect(template.prompt).toContain("설명");
      expect(template.prompt.length).toBeGreaterThan(180);
    }
  });

  test("iPhone 17 Pro 디스플레이 비율을 목업 기준값으로 제공한다", () => {
    expect(IPHONE_17_PRO_DISPLAY.width).toBe(1206);
    expect(IPHONE_17_PRO_DISPLAY.height).toBe(2622);
    expect(IPHONE_17_PRO_DISPLAY.aspectRatio).toBeCloseTo(1206 / 2622, 5);
  });

  test("iPhone 17 Pro 외곽 프레임은 실측 기기 비율을 기준으로 한다", () => {
    expect(IPHONE_17_PRO_DEVICE.widthMm).toBe(71.9);
    expect(IPHONE_17_PRO_DEVICE.heightMm).toBe(150);
    expect(IPHONE_17_PRO_DEVICE.aspectRatio).toBeCloseTo(71.9 / 150, 5);
  });
});

function isGrayscale(hex) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return r === g && g === b;
}
