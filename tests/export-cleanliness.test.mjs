import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("export rendering", () => {
  test("내보낸 이미지는 페이지 번호 오버레이를 그리지 않는다", () => {
    const source = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("drawPageNumber(ctx");
    expect(source).not.toContain("function drawPageNumber");
  });

  test("내보낸 이미지는 템플릿 장식용 릴리즈 칩을 그리지 않는다", () => {
    const source = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("drawChips(ctx");
    expect(source).not.toContain('["미리보기", "릴리즈", "제출"]');
  });
});
