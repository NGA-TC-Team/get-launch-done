export type PromptSlot = {
  badge?: string;
  title: string;
  subtitle: string;
  templateId: string;
  showBadge?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
};

export type PromptTemplate = {
  id: string;
  label: string;
  badge?: string;
  prompt: string;
};

export type PromptPlatform = {
  store: string;
  label: string;
};

export type ParsedPromptJson =
  | {
      ok: true;
      type: "single";
      badge?: string;
      title: string;
      subtitle: string;
      showBadge?: boolean;
      showTitle?: boolean;
      showSubtitle?: boolean;
    }
  | {
      ok: true;
      type: "multiple";
      screens: ParsedPromptScreen[];
    }
  | {
      ok: false;
      error: string;
    };

export type ParsedPromptScreen = {
  page: number;
  badge?: string;
  title: string;
  subtitle: string;
  showBadge?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
};

type ParsedPromptScreenResult =
  | {
      ok: true;
      screen: ParsedPromptScreen;
    }
  | {
      ok: false;
      error: string;
    };

export function buildPromptForSlot({
  slot,
  template,
  platform,
  pageNumber,
  totalPages,
}: {
  slot: PromptSlot;
  template: PromptTemplate;
  platform: PromptPlatform;
  pageNumber: number;
  totalPages: number;
}) {
  return [
    "# StoreShot 스크린샷 문구 작성 요청",
    "",
    `대상 화면: ${formatPageNumber(pageNumber)}/${formatPageNumber(totalPages)}`,
    `제출 플랫폼: ${platform.store} (${platform.label})`,
    `현재 템플릿: ${template.label}`,
    `템플릿 ID: ${template.id}`,
    "",
    "현재 임시 문구:",
    `뱃지: ${slot.badge ?? template.badge ?? ""}`,
    `제목: ${slot.title}`,
    `설명: ${slot.subtitle}`,
    `표시 상태: 뱃지 ${formatVisible(slot.showBadge)}, 제목 ${formatVisible(slot.showTitle)}, 설명 ${formatVisible(slot.showSubtitle)}`,
    "",
    "아래 템플릿 프롬프트를 기준으로 이 프로젝트에 맞는 스토어 스크린샷 문구를 작성해줘.",
    "응답은 반드시 아래 JSON 스키마를 만족하는 JSON 객체만 출력한다. Markdown, 코드블록, 설명 문장을 붙이지 마라.",
    "",
    ...buildSingleScreenSchemaLines(),
    "",
    "응답 예시:",
    '{ "badge": "뱃지", "title": "선택 화면 제목", "subtitle": "선택 화면 설명", "showBadge": true, "showTitle": true, "showSubtitle": true }',
    "",
    template.prompt,
  ].join("\n");
}

export function buildPromptForSlots({
  slots,
  templates,
  platform,
}: {
  slots: readonly PromptSlot[];
  templates: readonly PromptTemplate[];
  platform: PromptPlatform;
}) {
  const totalPages = slots.length;

  return [
    "# StoreShot 전체 스크린샷 문구 작성 요청",
    "",
    `제출 플랫폼: ${platform.store} (${platform.label})`,
    `작성 범위: 01부터 ${formatPageNumber(totalPages)}까지 모든 스토어 미리보기 화면`,
    "",
    "프로젝트 폴더에서 README, 앱 설명, 주요 기능, 화면 캡처 파일명, 패키지 메타데이터를 먼저 확인한 뒤 각 페이지별 제목과 설명을 작성해줘.",
    "각 페이지는 아래 템플릿 지침과 현재 임시 문구를 기준으로 작성하고, 실제 기능이 확인되지 않은 과장 표현은 피한다.",
    "",
    "응답은 반드시 아래 JSON 스키마를 만족하는 JSON 객체만 출력한다. Markdown, 코드블록, 설명 문장을 붙이지 마라.",
    `screens 배열은 page 1부터 ${totalPages}까지 모든 화면을 순서대로 포함해야 한다.`,
    "",
    ...buildAllScreensSchemaLines(),
    "",
    "응답 예시:",
    "{",
    '  "screens": [',
    '    { "page": 1, "badge": "예약", "title": "01 제목", "subtitle": "01 설명", "showBadge": true, "showTitle": true, "showSubtitle": true },',
    '    { "page": 2, "badge": "화면", "title": "02 제목", "subtitle": "02 설명", "showBadge": true, "showTitle": true, "showSubtitle": true }',
    "  ]",
    "}",
    "",
    slots
      .map((slot, index) => {
        const pageNumber = index + 1;
        const template = getPromptTemplate(templates, slot.templateId);
        return [
          `# ${formatPageNumber(pageNumber)}/${formatPageNumber(totalPages)}`,
          `현재 템플릿: ${template.label}`,
          `템플릿 ID: ${template.id}`,
          `현재 뱃지: ${slot.badge ?? template.badge}`,
          `현재 제목: ${slot.title}`,
          `현재 설명: ${slot.subtitle}`,
          `표시 상태: 뱃지 ${formatVisible(slot.showBadge)}, 제목 ${formatVisible(slot.showTitle)}, 설명 ${formatVisible(slot.showSubtitle)}`,
          "",
          template.prompt,
        ].join("\n");
      })
      .join("\n\n---\n\n"),
  ].join("\n");
}

export function parsePromptJson(text: string, totalPages: number): ParsedPromptJson {
  const jsonText = extractJsonText(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "유효한 JSON 형식이 아닙니다." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "JSON 객체를 붙여넣어 주세요." };
  }

  const screensValue = Array.isArray(parsed.screens)
    ? parsed.screens
    : Array.isArray(parsed.pages)
      ? parsed.pages
      : null;

  if (screensValue) {
    const screens: ParsedPromptScreen[] = [];
    for (const item of screensValue) {
      const screen = parsePromptScreen(item, totalPages);
      if (!screen.ok) {
        return screen;
      }
      screens.push(screen.screen);
    }

    if (!screens.length) {
      return { ok: false, error: "적용할 화면 문구가 없습니다." };
    }

    return { ok: true, type: "multiple", screens };
  }

  const title = readRequiredString(parsed, "title");
  const subtitle = readRequiredString(parsed, "subtitle") ?? readRequiredString(parsed, "description");

  if (!title || !subtitle) {
    return { ok: false, error: "title과 subtitle 값을 모두 입력해 주세요." };
  }

  return {
    ok: true,
    type: "single",
    ...readPromptTextOptions(parsed),
    title,
    subtitle,
  };
}

function getPromptTemplate(templates: readonly PromptTemplate[], templateId: string) {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}

function formatPageNumber(pageNumber: number) {
  return String(pageNumber).padStart(2, "0");
}

function buildSingleScreenSchemaLines() {
  return [
    "JSON 스키마:",
    "{",
    '  "type": "object",',
    '  "required": ["badge", "title", "subtitle", "showBadge", "showTitle", "showSubtitle"],',
    '  "additionalProperties": false,',
    '  "properties": {',
    '    "badge": { "type": "string" },',
    '    "title": { "type": "string", "minLength": 1 },',
    '    "subtitle": { "type": "string", "minLength": 1 },',
    '    "showBadge": { "type": "boolean" },',
    '    "showTitle": { "type": "boolean" },',
    '    "showSubtitle": { "type": "boolean" }',
    "  }",
    "}",
  ];
}

function buildAllScreensSchemaLines() {
  return [
    "JSON 스키마:",
    "{",
    '  "type": "object",',
    '  "required": ["screens"],',
    '  "additionalProperties": false,',
    '  "properties": {',
    '    "screens": {',
    '      "type": "array",',
    '      "items": {',
    '        "type": "object",',
    '        "required": ["page", "badge", "title", "subtitle", "showBadge", "showTitle", "showSubtitle"],',
    '        "additionalProperties": false,',
    '        "properties": {',
    '          "page": { "type": "integer", "minimum": 1 },',
    '          "badge": { "type": "string" },',
    '          "title": { "type": "string", "minLength": 1 },',
    '          "subtitle": { "type": "string", "minLength": 1 },',
    '          "showBadge": { "type": "boolean" },',
    '          "showTitle": { "type": "boolean" },',
    '          "showSubtitle": { "type": "boolean" }',
    "        }",
    "      }",
    "    }",
    "  }",
    "}",
  ];
}

function extractJsonText(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  return trimmed;
}

function parsePromptScreen(
  value: unknown,
  totalPages: number,
): ParsedPromptScreenResult {
  if (!isRecord(value)) {
    return { ok: false, error: "screens 배열에는 객체만 사용할 수 있습니다." };
  }

  const page = parsePageNumber(value.page);
  if (page === null || page < 1 || page > totalPages) {
    return { ok: false, error: `page는 1부터 ${totalPages} 사이여야 합니다.` };
  }

  const title = readRequiredString(value, "title");
  const subtitle = readRequiredString(value, "subtitle") ?? readRequiredString(value, "description");
  if (!title || !subtitle) {
    return { ok: false, error: "각 화면에는 title과 subtitle 값이 필요합니다." };
  }

  return {
    ok: true,
    screen: {
      page,
      ...readPromptTextOptions(value),
      title,
      subtitle,
    },
  };
}

function readPromptTextOptions(record: Record<string, unknown>) {
  return {
    ...(readOptionalString(record, "badge") !== null ? { badge: readOptionalString(record, "badge") ?? "" } : {}),
    ...(typeof record.showBadge === "boolean" ? { showBadge: record.showBadge } : {}),
    ...(typeof record.showTitle === "boolean" ? { showTitle: record.showTitle } : {}),
    ...(typeof record.showSubtitle === "boolean" ? { showSubtitle: record.showSubtitle } : {}),
  };
}

function formatVisible(value: boolean | undefined) {
  return value === false ? "끔" : "켬";
}

function parsePageNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

function readRequiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
