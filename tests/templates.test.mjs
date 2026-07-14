import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TEMPLATE_SEQUENCE,
  SCREENSHOT_TEMPLATES,
  SCREENSHOT_THEMES,
  getTemplateById,
} from "../src/app/templates";

describe("SCREENSHOT_TEMPLATES", () => {
  test("30개의 앱스토어 스크린샷 템플릿을 제공한다", () => {
    expect(SCREENSHOT_TEMPLATES).toHaveLength(30);
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

  test("스크린샷 배경 테마는 모노크롬 UI와 분리된 컬러 팔레트를 포함한다", () => {
    const colorfulThemes = SCREENSHOT_THEMES.filter((theme) => !isGrayscale(theme.a) || !isGrayscale(theme.b));

    expect(SCREENSHOT_THEMES.length).toBeGreaterThanOrEqual(8);
    expect(colorfulThemes.length).toBeGreaterThanOrEqual(6);
  });
});

function isGrayscale(hex) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return r === g && g === b;
}
