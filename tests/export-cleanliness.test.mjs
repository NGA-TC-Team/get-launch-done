import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("export rendering", () => {
  test("내보낸 이미지는 페이지 번호 오버레이를 그리지 않는다", () => {
    const source = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("drawPageNumber(ctx");
    expect(source).not.toContain("function drawPageNumber");
  });
});
