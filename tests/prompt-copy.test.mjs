import { describe, expect, test } from "bun:test";
import { buildPromptForSlot, buildPromptForSlots, parsePromptJson } from "../src/app/prompt-copy";

describe("prompt copy helpers", () => {
  test("선택 화면 프롬프트는 JSON 스키마로만 응답하도록 요청한다", () => {
    const prompt = buildPromptForSlot({
      slot: { title: "현재 제목", subtitle: "현재 설명", templateId: "template-a" },
      template: { id: "template-a", label: "A 템플릿", prompt: "A 작성 규칙" },
      platform: { store: "앱스토어", label: "iOS" },
      pageNumber: 1,
      totalPages: 10,
    });

    expect(prompt).toContain("JSON 스키마");
    expect(prompt).toContain('"required"');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"subtitle"');
    expect(prompt).toContain("Markdown");
  });

  test("01부터 10까지 모든 페이지 작성 요청을 하나의 프롬프트로 만든다", () => {
    const slots = Array.from({ length: 10 }, (_, index) => ({
      title: `${index + 1}번 제목`,
      subtitle: `${index + 1}번 설명`,
      templateId: index % 2 === 0 ? "template-a" : "template-b",
    }));
    const templates = [
      { id: "template-a", label: "A 템플릿", prompt: "A 작성 규칙" },
      { id: "template-b", label: "B 템플릿", prompt: "B 작성 규칙" },
    ];

    const prompt = buildPromptForSlots({
      slots,
      templates,
      platform: { store: "앱스토어", label: "iOS" },
    });

    expect(prompt).toContain("01/10");
    expect(prompt).toContain("10/10");
    expect(prompt).toContain("1번 제목");
    expect(prompt).toContain("10번 설명");
    expect(prompt.match(/# 0[1-9]\/10|# 10\/10/g)).toHaveLength(10);
    expect(prompt).toContain('"screens"');
    expect(prompt).toContain('"page"');
    expect(prompt).toContain('"required"');
  });

  test("선택 화면 JSON 결과를 파싱한다", () => {
    const result = parsePromptJson('{"title":"출시 준비 완료","subtitle":"스토어 제출 이미지를 빠르게 정리하세요."}', 10);

    expect(result).toEqual({
      ok: true,
      type: "single",
      title: "출시 준비 완료",
      subtitle: "스토어 제출 이미지를 빠르게 정리하세요.",
    });
  });

  test("전체 화면 JSON 결과를 페이지 번호와 함께 파싱한다", () => {
    const result = parsePromptJson(
      JSON.stringify({
        screens: [
          { page: 1, title: "첫 화면", subtitle: "첫 번째 설명" },
          { page: "02", title: "두 번째 화면", subtitle: "두 번째 설명" },
        ],
      }),
      10,
    );

    expect(result).toEqual({
      ok: true,
      type: "multiple",
      screens: [
        { page: 1, title: "첫 화면", subtitle: "첫 번째 설명" },
        { page: 2, title: "두 번째 화면", subtitle: "두 번째 설명" },
      ],
    });
  });

  test("잘못된 JSON 결과는 오류를 반환한다", () => {
    const result = parsePromptJson('{"title":""}', 10);

    expect(result.ok).toBe(false);
  });
});
