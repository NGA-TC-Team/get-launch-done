export type EditorHistoryState = {
  current: string | null;
  undoStack: string[];
  redoStack: string[];
};

export function createHistoryState(current: string | null = null): EditorHistoryState {
  return {
    current,
    undoStack: [],
    redoStack: [],
  };
}

export function recordHistorySnapshot(history: EditorHistoryState, snapshot: string, limit = 80) {
  if (history.current === snapshot) {
    return;
  }

  if (history.current !== null) {
    history.undoStack.push(history.current);
    if (history.undoStack.length > limit) {
      history.undoStack.splice(0, history.undoStack.length - limit);
    }
  }

  history.current = snapshot;
  history.redoStack = [];
}

export function undoHistorySnapshot(history: EditorHistoryState) {
  const previous = history.undoStack.pop();
  if (previous === undefined || history.current === null) {
    return null;
  }

  history.redoStack.push(history.current);
  history.current = previous;
  return previous;
}

export function redoHistorySnapshot(history: EditorHistoryState) {
  const next = history.redoStack.pop();
  if (next === undefined || history.current === null) {
    return null;
  }

  history.undoStack.push(history.current);
  history.current = next;
  return next;
}
