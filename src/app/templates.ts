export type TemplateFamily =
  | "hero-center"
  | "device-first"
  | "split-right"
  | "split-left"
  | "diagonal"
  | "bottom-band"
  | "top-band"
  | "side-note"
  | "corner-focus"
  | "poster-stack";

export type ScreenshotTemplate = {
  id: string;
  label: string;
  description: string;
  family: TemplateFamily;
  badge: string;
};

export const SCREENSHOT_TEMPLATES = [
  {
    id: "hero-center-01",
    label: "중앙 히어로",
    description: "상단 문구와 중앙 기기 배치",
    family: "hero-center",
    badge: "중앙",
  },
  {
    id: "hero-center-02",
    label: "큰 주장형",
    description: "짧은 가치 제안을 크게 노출",
    family: "hero-center",
    badge: "강조",
  },
  {
    id: "hero-center-03",
    label: "균형형 포스터",
    description: "문구와 기기를 안정적으로 정렬",
    family: "hero-center",
    badge: "기본",
  },
  {
    id: "device-first-01",
    label: "기기 우선",
    description: "앱 화면을 먼저 보여주는 배치",
    family: "device-first",
    badge: "화면",
  },
  {
    id: "device-first-02",
    label: "상단 집중",
    description: "기기를 상단에 두고 설명은 하단에 배치",
    family: "device-first",
    badge: "상단",
  },
  {
    id: "device-first-03",
    label: "시연 중심",
    description: "스크린샷 자체를 가장 크게 전달",
    family: "device-first",
    badge: "시연",
  },
  {
    id: "split-right-01",
    label: "오른쪽 기기",
    description: "왼쪽 설명과 오른쪽 기기 분할",
    family: "split-right",
    badge: "분할",
  },
  {
    id: "split-right-02",
    label: "기능 설명형",
    description: "기능 문구를 넓게 두고 화면을 보조",
    family: "split-right",
    badge: "기능",
  },
  {
    id: "split-right-03",
    label: "릴리즈 노트형",
    description: "업데이트 포인트를 문구 중심으로 정리",
    family: "split-right",
    badge: "문구",
  },
  {
    id: "split-left-01",
    label: "왼쪽 기기",
    description: "기기를 왼쪽에 두는 반전 분할",
    family: "split-left",
    badge: "반전",
  },
  {
    id: "split-left-02",
    label: "비교 강조형",
    description: "시선 흐름을 오른쪽 문구로 유도",
    family: "split-left",
    badge: "비교",
  },
  {
    id: "split-left-03",
    label: "스토리형",
    description: "앱 화면 뒤에 설명을 이어 붙이는 구성",
    family: "split-left",
    badge: "흐름",
  },
  {
    id: "diagonal-01",
    label: "사선 기기",
    description: "기기를 살짝 회전해 동적인 인상 제공",
    family: "diagonal",
    badge: "사선",
  },
  {
    id: "diagonal-02",
    label: "런칭 포스터",
    description: "짧은 카피와 기울어진 기기 조합",
    family: "diagonal",
    badge: "런칭",
  },
  {
    id: "diagonal-03",
    label: "캠페인형",
    description: "프로모션성 메시지를 강하게 전달",
    family: "diagonal",
    badge: "캠페인",
  },
  {
    id: "bottom-band-01",
    label: "하단 정보띠",
    description: "기기를 위에 두고 하단에 설명 영역 배치",
    family: "bottom-band",
    badge: "하단",
  },
  {
    id: "bottom-band-02",
    label: "요약 배너형",
    description: "짧은 요약 문구를 하단 띠로 강조",
    family: "bottom-band",
    badge: "요약",
  },
  {
    id: "bottom-band-03",
    label: "기능 카드형",
    description: "기능별 스크린샷 시리즈에 적합",
    family: "bottom-band",
    badge: "카드",
  },
  {
    id: "top-band-01",
    label: "상단 정보띠",
    description: "설명 영역을 먼저 읽히게 하는 배치",
    family: "top-band",
    badge: "상단",
  },
  {
    id: "top-band-02",
    label: "헤드라인 배너형",
    description: "헤드라인을 안정적인 띠 안에 배치",
    family: "top-band",
    badge: "배너",
  },
  {
    id: "top-band-03",
    label: "가이드형",
    description: "사용 흐름 안내에 맞춘 상단 설명 구성",
    family: "top-band",
    badge: "가이드",
  },
  {
    id: "side-note-01",
    label: "사이드 노트",
    description: "짧은 설명과 보조 태그를 함께 배치",
    family: "side-note",
    badge: "노트",
  },
  {
    id: "side-note-02",
    label: "태그 강조형",
    description: "스토어 메시지를 보조 태그로 정리",
    family: "side-note",
    badge: "태그",
  },
  {
    id: "side-note-03",
    label: "팀 소개형",
    description: "협업 또는 릴리즈 맥락을 보여주기 좋음",
    family: "side-note",
    badge: "팀",
  },
  {
    id: "corner-focus-01",
    label: "코너 포커스",
    description: "기기를 크게 두어 화면 일부를 과감하게 강조",
    family: "corner-focus",
    badge: "확대",
  },
  {
    id: "corner-focus-02",
    label: "확대 시연형",
    description: "중요 화면을 크게 잘라 보이는 구성",
    family: "corner-focus",
    badge: "확대",
  },
  {
    id: "corner-focus-03",
    label: "임팩트형",
    description: "첫 장 또는 마지막 장에 적합한 큰 배치",
    family: "corner-focus",
    badge: "강렬",
  },
  {
    id: "poster-stack-01",
    label: "포스터 스택",
    description: "기기와 문구를 겹쳐 한 장의 포스터처럼 구성",
    family: "poster-stack",
    badge: "포스터",
  },
  {
    id: "poster-stack-02",
    label: "마감 장표형",
    description: "다운로드 유도나 마지막 메시지에 적합",
    family: "poster-stack",
    badge: "마감",
  },
  {
    id: "poster-stack-03",
    label: "브랜드 컷",
    description: "서비스명과 핵심 화면을 함께 각인",
    family: "poster-stack",
    badge: "브랜드",
  },
] as const satisfies readonly ScreenshotTemplate[];

export type TemplateId = (typeof SCREENSHOT_TEMPLATES)[number]["id"];

export const DEFAULT_TEMPLATE_SEQUENCE = [
  "hero-center-01",
  "device-first-01",
  "split-right-01",
  "split-left-01",
  "diagonal-01",
  "bottom-band-01",
  "top-band-01",
  "side-note-01",
  "corner-focus-01",
  "poster-stack-01",
] as const satisfies readonly TemplateId[];

export type ScreenshotTheme = {
  id: string;
  label: string;
  a: string;
  b: string;
  foreground: string;
  muted: string;
  panel: string;
};

export const SCREENSHOT_THEMES = [
  {
    id: "launch-green",
    label: "런칭 그린",
    a: "#22c55e",
    b: "#111827",
    foreground: "#ffffff",
    muted: "#dcfce7",
    panel: "rgba(17, 24, 39, 0.82)",
  },
  {
    id: "store-blue",
    label: "스토어 블루",
    a: "#2563eb",
    b: "#0f172a",
    foreground: "#ffffff",
    muted: "#dbeafe",
    panel: "rgba(15, 23, 42, 0.84)",
  },
  {
    id: "signal-orange",
    label: "시그널 오렌지",
    a: "#f97316",
    b: "#7f1d1d",
    foreground: "#ffffff",
    muted: "#ffedd5",
    panel: "rgba(69, 26, 3, 0.78)",
  },
  {
    id: "teal-depth",
    label: "딥 틸",
    a: "#14b8a6",
    b: "#164e63",
    foreground: "#ffffff",
    muted: "#ccfbf1",
    panel: "rgba(19, 78, 74, 0.78)",
  },
  {
    id: "rose-indigo",
    label: "로즈 인디고",
    a: "#e11d48",
    b: "#312e81",
    foreground: "#ffffff",
    muted: "#ffe4e6",
    panel: "rgba(49, 46, 129, 0.78)",
  },
  {
    id: "sunset-gold",
    label: "선셋 골드",
    a: "#f59e0b",
    b: "#7c2d12",
    foreground: "#ffffff",
    muted: "#fef3c7",
    panel: "rgba(69, 26, 3, 0.76)",
  },
  {
    id: "slate-lime",
    label: "슬레이트 라임",
    a: "#84cc16",
    b: "#14532d",
    foreground: "#ffffff",
    muted: "#ecfccb",
    panel: "rgba(20, 83, 45, 0.78)",
  },
  {
    id: "graphite",
    label: "흑연",
    a: "#202020",
    b: "#050505",
    foreground: "#ffffff",
    muted: "#d8d8d8",
    panel: "rgba(17, 17, 17, 0.82)",
  },
] as const satisfies readonly ScreenshotTheme[];

export type ThemeId = (typeof SCREENSHOT_THEMES)[number]["id"];

export const DEFAULT_COPY = [
  ["출시 준비를 빠르게", "디자인 툴 없이 스토어 미리보기 이미지를 완성하세요."],
  ["핵심 화면을 선명하게", "실제 앱 화면을 iOS와 Android 기기 안에 배치합니다."],
  ["가치를 한 문장으로", "기능보다 사용자가 얻게 될 결과를 먼저 보여주세요."],
  ["두 스토어를 한 번에", "앱스토어와 구글 플레이 규격을 바로 전환합니다."],
  ["업데이트도 간단하게", "새 화면을 올리면 10장의 미리보기가 즉시 바뀝니다."],
  ["일관된 시리즈 구성", "각 장표의 톤과 구조를 맞춰 브랜드 신뢰감을 높입니다."],
  ["PNG와 JPG 지원", "제출처와 팀 기준에 맞게 파일 형식을 선택하세요."],
  ["ZIP으로 한 번에", "완성된 모든 이미지를 하나의 압축 파일로 내려받습니다."],
  ["팀 작업에 맞게", "반복 가능한 템플릿으로 릴리즈 작업 시간을 줄입니다."],
  ["제출 직전까지 정리", "10개의 미리보기 화면을 빠르게 점검하고 내보내세요."],
] as const;

export function getTemplateById(id: string) {
  return SCREENSHOT_TEMPLATES.find((template) => template.id === id) ?? SCREENSHOT_TEMPLATES[0];
}

export function getThemeById(id: string) {
  return SCREENSHOT_THEMES.find((theme) => theme.id === id) ?? SCREENSHOT_THEMES[0];
}
