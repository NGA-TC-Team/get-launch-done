export type InspectorMode = "copy" | "layout" | "export" | "ai";

export type SlotReadiness = {
  hasImage: boolean;
  copyIssues: string[];
  hiddenLayers: number;
  isReady: boolean;
};

export type SlotIssue = {
  index: number;
  label: string;
  mode: InspectorMode;
};

export function getNextIssueIndex(readiness: SlotReadiness[], selected: number) {
  for (let offset = 0; offset < readiness.length; offset += 1) {
    const index = (selected + offset) % readiness.length;
    if (!readiness[index].isReady) {
      return index;
    }
  }

  return -1;
}

export function createSlotIssue(index: number, readiness: SlotReadiness): SlotIssue | null {
  if (!readiness.hasImage) {
    return {
      index,
      label: "이미지",
      mode: "export",
    };
  }

  if (readiness.copyIssues.length) {
    return {
      index,
      label: readiness.copyIssues.join(", "),
      mode: "copy",
    };
  }

  return null;
}

export function getVisibleIssues(readiness: SlotReadiness[], selected: number, limit = 4): SlotIssue[] {
  const issues: SlotIssue[] = [];

  if (!readiness.length || limit <= 0) {
    return issues;
  }

  const safeSelected = Math.min(Math.max(selected, 0), readiness.length - 1);

  for (let offset = 0; offset < readiness.length && issues.length < limit; offset += 1) {
    const index = (safeSelected + offset) % readiness.length;
    const issue = createSlotIssue(index, readiness[index]);

    if (issue) {
      issues.push(issue);
    }
  }

  return issues;
}
