export type PromptSlot = {
  title: string;
  subtitle: string;
  templateId: string;
};

export type PromptTemplate = {
  id: string;
  label: string;
  prompt: string;
};

export type PromptPlatform = {
  store: string;
  label: string;
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
    `제목: ${slot.title}`,
    `설명: ${slot.subtitle}`,
    "",
    "아래 템플릿 프롬프트를 기준으로 이 프로젝트에 맞는 스토어 스크린샷 문구를 작성해줘.",
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
    "출력 형식:",
    "01. 제목: <제목> / 설명: <설명>",
    "02. 제목: <제목> / 설명: <설명>",
    "...",
    `${formatPageNumber(totalPages)}. 제목: <제목> / 설명: <설명>`,
    "",
    slots
      .map((slot, index) => {
        const pageNumber = index + 1;
        const template = getPromptTemplate(templates, slot.templateId);
        return [
          `# ${formatPageNumber(pageNumber)}/${formatPageNumber(totalPages)}`,
          `현재 템플릿: ${template.label}`,
          `템플릿 ID: ${template.id}`,
          `현재 제목: ${slot.title}`,
          `현재 설명: ${slot.subtitle}`,
          "",
          template.prompt,
        ].join("\n");
      })
      .join("\n\n---\n\n"),
  ].join("\n");
}

function getPromptTemplate(templates: readonly PromptTemplate[], templateId: string) {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}

function formatPageNumber(pageNumber: number) {
  return String(pageNumber).padStart(2, "0");
}
