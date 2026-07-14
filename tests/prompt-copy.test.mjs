import { describe, expect, test } from "bun:test";
import { buildPromptForSlots } from "../src/app/prompt-copy";

describe("prompt copy helpers", () => {
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
  });
});
