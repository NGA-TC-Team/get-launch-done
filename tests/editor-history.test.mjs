import { describe, expect, test } from "bun:test";
import {
  createHistoryState,
  recordHistorySnapshot,
  redoHistorySnapshot,
  undoHistorySnapshot,
} from "../src/app/editor-history";

describe("editor history helpers", () => {
  test("새 스냅샷은 이전 현재값을 undo 스택에 기록하고 redo 스택을 비운다", () => {
    const history = createHistoryState("a");
    history.redoStack.push("z");

    recordHistorySnapshot(history, "b");

    expect(history).toEqual({
      current: "b",
      undoStack: ["a"],
      redoStack: [],
    });
  });

  test("동일한 스냅샷은 히스토리에 중복 기록하지 않는다", () => {
    const history = createHistoryState("a");

    recordHistorySnapshot(history, "a");

    expect(history.undoStack).toEqual([]);
    expect(history.current).toBe("a");
  });

  test("undo와 redo는 현재 스냅샷을 반대 스택으로 이동한다", () => {
    const history = createHistoryState("a");
    recordHistorySnapshot(history, "b");
    recordHistorySnapshot(history, "c");

    expect(undoHistorySnapshot(history)).toBe("b");
    expect(history.current).toBe("b");
    expect(history.redoStack).toEqual(["c"]);

    expect(redoHistorySnapshot(history)).toBe("c");
    expect(history.current).toBe("c");
    expect(history.undoStack).toEqual(["a", "b"]);
  });

  test("undo 스택은 지정된 개수로 제한한다", () => {
    const history = createHistoryState("a");
    recordHistorySnapshot(history, "b", 2);
    recordHistorySnapshot(history, "c", 2);
    recordHistorySnapshot(history, "d", 2);

    expect(history.undoStack).toEqual(["b", "c"]);
  });
});
