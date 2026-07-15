import { describe, expect, test } from "bun:test";
import { getNextIssueIndex, getVisibleIssues } from "../src/app/workflow";

describe("workflow helpers", () => {
  test("다음 점검 위치는 선택 화면부터 순환 탐색한다", () => {
    const readiness = [
      ready(),
      ready(),
      issue("제목"),
      ready(),
      missingImage(),
    ];

    expect(getNextIssueIndex(readiness, 3)).toBe(4);
    expect(getNextIssueIndex(readiness, 4)).toBe(4);
    expect(getNextIssueIndex(readiness, 0)).toBe(2);
  });

  test("점검 큐는 선택 화면부터 01번으로 돌아가며 준비된 화면을 건너뛴다", () => {
    const readiness = [
      issue("제목"),
      ready(),
      issue("설명"),
      ready(),
      ready(),
      ready(),
      ready(),
      missingImage(),
      ready(),
      issue("뱃지"),
    ];

    const issues = getVisibleIssues(readiness, 7, 4);

    expect(issues).toEqual([
      { index: 7, label: "이미지", mode: "export" },
      { index: 9, label: "뱃지", mode: "copy" },
      { index: 0, label: "제목", mode: "copy" },
      { index: 2, label: "설명", mode: "copy" },
    ]);
  });

  test("점검 큐는 한도와 비정상 선택값을 안전하게 처리한다", () => {
    const readiness = [missingImage(), issue("제목"), ready()];

    expect(getVisibleIssues(readiness, -10, 1)).toEqual([{ index: 0, label: "이미지", mode: "export" }]);
    expect(getVisibleIssues(readiness, 99, 2)).toEqual([
      { index: 0, label: "이미지", mode: "export" },
      { index: 1, label: "제목", mode: "copy" },
    ]);
    expect(getVisibleIssues(readiness, 0, 0)).toEqual([]);
  });
});

function ready() {
  return {
    hasImage: true,
    copyIssues: [],
    hiddenLayers: 0,
    isReady: true,
  };
}

function missingImage() {
  return {
    hasImage: false,
    copyIssues: [],
    hiddenLayers: 0,
    isReady: false,
  };
}

function issue(label) {
  return {
    hasImage: true,
    copyIssues: [label],
    hiddenLayers: 0,
    isReady: false,
  };
}
