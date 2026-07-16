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
  | "poster-stack"
  | "isometric"
  | "fake-3d"
  | "floating-stack"
  | "gallery-wall"
  | "dashboard-grid";

export const IPHONE_17_PRO_DISPLAY = {
  width: 1206,
  height: 2622,
  aspectRatio: 1206 / 2622,
} as const;

export const IPHONE_17_PRO_DEVICE = {
  widthMm: 71.9,
  heightMm: 150,
  aspectRatio: 71.9 / 150,
} as const;

type ScreenshotTemplateBlueprint = {
  id: string;
  label: string;
  description: string;
  family: TemplateFamily;
  badge: string;
};

const SCREENSHOT_TEMPLATE_BLUEPRINTS = [
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
  {
    id: "isometric-01",
    label: "아이소메트릭 쇼케이스",
    description: "기기를 비스듬히 세워 입체적인 앱 공간을 연출",
    family: "isometric",
    badge: "아이소",
  },
  {
    id: "isometric-02",
    label: "입체 플로우",
    description: "사용 흐름을 사선 시점의 제품 컷처럼 보여줌",
    family: "isometric",
    badge: "공간",
  },
  {
    id: "isometric-03",
    label: "스테이지 뷰",
    description: "앱 화면을 무대 위 오브젝트처럼 강조",
    family: "isometric",
    badge: "무대",
  },
  {
    id: "fake-3d-01",
    label: "Fake 3D 카드",
    description: "기기 뒤 레이어와 그림자로 깊이감 제공",
    family: "fake-3d",
    badge: "3D",
  },
  {
    id: "fake-3d-02",
    label: "레이어드 임팩트",
    description: "기능 화면을 카드처럼 겹쳐 강한 인상 생성",
    family: "fake-3d",
    badge: "레이어",
  },
  {
    id: "fake-3d-03",
    label: "제품 패키지",
    description: "앱을 제품 박스처럼 단단하게 보이게 하는 구성",
    family: "fake-3d",
    badge: "패키지",
  },
  {
    id: "floating-stack-01",
    label: "플로팅 스택",
    description: "기기와 문구를 떠 있는 카드 묶음처럼 배치",
    family: "floating-stack",
    badge: "부유",
  },
  {
    id: "floating-stack-02",
    label: "기능 스택",
    description: "여러 기능 포인트를 가벼운 층으로 암시",
    family: "floating-stack",
    badge: "스택",
  },
  {
    id: "floating-stack-03",
    label: "모듈 쇼케이스",
    description: "앱의 여러 모듈을 한 화면에서 풍성하게 표현",
    family: "floating-stack",
    badge: "모듈",
  },
  {
    id: "gallery-wall-01",
    label: "갤러리 월",
    description: "스토어 첫 인상에 맞춘 전시형 목업 배치",
    family: "gallery-wall",
    badge: "전시",
  },
  {
    id: "gallery-wall-02",
    label: "컬렉션 보드",
    description: "화면과 카피를 큐레이션 보드처럼 정리",
    family: "gallery-wall",
    badge: "컬렉션",
  },
  {
    id: "gallery-wall-03",
    label: "매거진 컷",
    description: "콘텐츠형 앱에 맞춘 편집지 같은 시각 구성",
    family: "gallery-wall",
    badge: "매거진",
  },
  {
    id: "dashboard-grid-01",
    label: "대시보드 그리드",
    description: "정보와 지표가 많은 앱을 정돈된 그리드로 표현",
    family: "dashboard-grid",
    badge: "그리드",
  },
  {
    id: "dashboard-grid-02",
    label: "운영 패널",
    description: "업무/관리 흐름을 패널 중심으로 설득",
    family: "dashboard-grid",
    badge: "운영",
  },
  {
    id: "dashboard-grid-03",
    label: "인사이트 보드",
    description: "결과와 상태 변화를 데이터 보드처럼 보여줌",
    family: "dashboard-grid",
    badge: "인사이트",
  },
] as const satisfies readonly ScreenshotTemplateBlueprint[];

const familyPromptGuidance: Record<TemplateFamily, string> = {
  "hero-center": "가장 강한 핵심 가치 하나를 상단에서 먼저 설득한다. 제목은 짧고 기억하기 쉬운 주장형 문장으로 쓴다.",
  "device-first": "앱 화면 자체가 먼저 보이는 구성이므로, 문구는 화면에서 사용자가 무엇을 할 수 있는지 보조적으로 설명한다.",
  "split-right": "왼쪽 문구가 기능 설명을 담당하고 오른쪽 기기가 근거가 된다. 기능명보다 사용 결과와 효율을 먼저 말한다.",
  "split-left": "왼쪽 기기에서 시작해 오른쪽 문구로 읽히는 흐름이다. 비교, 전환, 개선 전후 메시지에 맞춰 작성한다.",
  diagonal: "기울어진 기기가 런칭/캠페인 느낌을 만든다. 에너지 있는 동사와 짧은 프로모션형 표현을 사용한다.",
  "bottom-band": "상단 기기 아래에 하단 설명띠가 붙는다. 화면을 먼저 본 뒤 이해를 완성하는 요약형 문구로 작성한다.",
  "top-band": "상단 설명띠가 먼저 읽힌다. 사용 흐름이나 안내 메시지를 차분하게 제시하고 기기가 뒤에서 증명하게 한다.",
  "side-note": "작은 노트처럼 기능 맥락을 붙이는 구성이므로, 짧은 태그와 구체적인 사용 상황을 함께 떠올리게 작성한다.",
  "corner-focus": "기기가 크게 잘려 보이는 임팩트 컷이다. 한 장으로 강하게 각인될 첫 화면/핵심 화면 메시지를 작성한다.",
  "poster-stack": "문구와 기기가 포스터처럼 겹친다. 마지막 장표, 다운로드 유도, 브랜드 각인에 적합한 마감 문구로 작성한다.",
  isometric: "아이소메트릭 시점의 제품 쇼케이스다. 앱을 하나의 공간이나 시스템처럼 느끼게 하는 카피를 작성한다.",
  "fake-3d": "기기 뒤 레이어와 깊이감이 핵심이다. 안정감, 신뢰, 제품 완성도를 강조하는 문구가 잘 맞는다.",
  "floating-stack": "화면과 기능이 떠 있는 카드처럼 보인다. 여러 기능이 가볍게 연결되는 느낌의 카피를 사용한다.",
  "gallery-wall": "여러 장면을 전시하는 느낌이다. 콘텐츠, 컬렉션, 발견, 큐레이션 맥락을 잘 살린다.",
  "dashboard-grid": "정보 밀도가 높은 그리드형 구성이다. 현황, 지표, 관리, 비교, 분석 결과를 명확히 말한다.",
};

export type TemplateId = (typeof SCREENSHOT_TEMPLATE_BLUEPRINTS)[number]["id"];

export type ScreenshotTemplate = (typeof SCREENSHOT_TEMPLATE_BLUEPRINTS)[number] & {
  prompt: string;
};

export type TemplatePreviewOption = ScreenshotTemplate & {
  isSelected: boolean;
  miniClassName: string;
};

export const SCREENSHOT_TEMPLATES = SCREENSHOT_TEMPLATE_BLUEPRINTS.map((template) => ({
  ...template,
  prompt: createTemplatePrompt(template),
})) as readonly ScreenshotTemplate[];

export function getTemplatePreviewOptions(selectedTemplateId: string): TemplatePreviewOption[] {
  return SCREENSHOT_TEMPLATES.map((template) => ({
    ...template,
    isSelected: template.id === selectedTemplateId,
    miniClassName: `template-mini mini-${template.family}`,
  }));
}

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

type StoreCategorySource = "apple" | "google" | "both";

type CategoryArchetype = "utility" | "commerce" | "community" | "media" | "creative" | "education" | "game";

export type ScreenshotCategoryGroup = {
  id: string;
  label: string;
  source: StoreCategorySource;
  archetype: CategoryArchetype;
  examples: string;
};

export const SCREENSHOT_CATEGORY_GROUPS = [
  { id: "business", label: "비즈니스", source: "both", archetype: "utility", examples: "문서, 이메일, 원격 업무, 채용" },
  { id: "developer-tools", label: "개발자 도구", source: "apple", archetype: "utility", examples: "코딩, API, 배포, 디버깅" },
  { id: "education", label: "교육", source: "both", archetype: "education", examples: "학습, 시험, 언어, 강의" },
  { id: "finance", label: "금융", source: "both", archetype: "utility", examples: "은행, 결제, 투자, 세금" },
  { id: "health-fitness", label: "건강 및 피트니스", source: "both", archetype: "community", examples: "운동, 식단, 건강 기록" },
  { id: "medical", label: "의료", source: "both", archetype: "utility", examples: "임상 참고, 의료 계산, 저널" },
  { id: "productivity", label: "생산성", source: "both", archetype: "utility", examples: "노트, 할 일, 캘린더, 백업" },
  { id: "tools-utilities", label: "도구 및 유틸리티", source: "both", archetype: "utility", examples: "기기 도구, 계산, 변환, 보조 기능" },
  { id: "weather", label: "날씨", source: "both", archetype: "utility", examples: "예보, 알림, 레이더, 생활 지수" },
  { id: "shopping", label: "쇼핑", source: "both", archetype: "commerce", examples: "커머스, 쿠폰, 가격 비교, 리뷰" },
  { id: "food-drink", label: "음식 및 음료", source: "both", archetype: "commerce", examples: "레시피, 맛집, 예약, 음료" },
  { id: "travel-local", label: "여행 및 지역", source: "both", archetype: "commerce", examples: "예약, 택시, 도시 가이드, 지역 정보" },
  { id: "events", label: "이벤트", source: "google", archetype: "commerce", examples: "공연, 스포츠, 영화 티켓" },
  { id: "auto-vehicles", label: "자동차", source: "google", archetype: "commerce", examples: "차량 구매, 보험, 가격 비교, 도로 안전" },
  { id: "beauty", label: "뷰티", source: "google", archetype: "commerce", examples: "메이크업, 헤어, 뷰티 쇼핑" },
  { id: "house-home", label: "주거 및 홈", source: "google", archetype: "commerce", examples: "부동산, 인테리어, 집 관리" },
  { id: "social", label: "소셜", source: "both", archetype: "community", examples: "소셜 네트워크, 체크인, 커뮤니티" },
  { id: "communication", label: "커뮤니케이션", source: "google", archetype: "community", examples: "메시지, 채팅, 브라우저, 연락처" },
  { id: "dating", label: "데이팅", source: "google", archetype: "community", examples: "매칭, 관계 형성, 만남" },
  { id: "lifestyle", label: "라이프스타일", source: "both", archetype: "community", examples: "스타일, 웨딩, 파티, 생활 가이드" },
  { id: "parenting", label: "부모", source: "google", archetype: "community", examples: "임신, 육아, 아이 돌봄" },
  { id: "sports", label: "스포츠", source: "both", archetype: "community", examples: "뉴스, 점수, 판타지 팀, 경기" },
  { id: "books-reference", label: "도서 및 참고", source: "both", archetype: "media", examples: "전자책, 사전, 교재, 위키" },
  { id: "comics", label: "만화", source: "google", archetype: "media", examples: "만화 리더, 웹툰, 코믹 타이틀" },
  { id: "entertainment", label: "엔터테인먼트", source: "both", archetype: "media", examples: "스트리밍, 영화, TV, 인터랙티브 콘텐츠" },
  { id: "music-audio", label: "음악 및 오디오", source: "both", archetype: "media", examples: "음악 서비스, 라디오, 플레이어" },
  { id: "news-magazines", label: "뉴스 및 매거진", source: "both", archetype: "media", examples: "신문, 뉴스 집계, 잡지" },
  { id: "photo-video", label: "사진 및 비디오", source: "both", archetype: "media", examples: "카메라, 사진 편집, 공유" },
  { id: "video-editors", label: "비디오 플레이어 및 편집", source: "google", archetype: "media", examples: "영상 재생, 영상 편집, 미디어 저장" },
  { id: "art-design", label: "아트 및 디자인", source: "google", archetype: "creative", examples: "스케치, 페인팅, 색칠, 디자인 도구" },
  { id: "graphics-design", label: "그래픽 및 디자인", source: "apple", archetype: "creative", examples: "그래픽 편집, 브랜드 디자인, 시각 제작" },
  { id: "personalization", label: "개인화", source: "google", archetype: "creative", examples: "배경화면, 런처, 잠금 화면, 벨소리" },
  { id: "maps-navigation", label: "지도 및 내비게이션", source: "both", archetype: "utility", examples: "GPS, 지도, 교통, 대중교통" },
  { id: "libraries-demo", label: "라이브러리 및 데모", source: "google", archetype: "utility", examples: "소프트웨어 라이브러리, 기술 데모" },
  { id: "kids", label: "키즈", source: "apple", archetype: "education", examples: "어린이 학습, 가족용 콘텐츠" },
  { id: "games", label: "게임", source: "both", archetype: "game", examples: "전체 게임 카테고리" },
  { id: "action-games", label: "액션 게임", source: "both", archetype: "game", examples: "빠른 조작, 전투, 반응형 플레이" },
  { id: "adventure-games", label: "어드벤처 게임", source: "both", archetype: "game", examples: "탐험, 스토리, 퀘스트" },
  { id: "arcade-games", label: "아케이드 게임", source: "google", archetype: "game", examples: "짧은 플레이, 점수 경쟁" },
  { id: "board-games", label: "보드 게임", source: "both", archetype: "game", examples: "테이블탑, 턴제, 보드 전략" },
  { id: "card-games", label: "카드 게임", source: "both", archetype: "game", examples: "카드 수집, 덱, 클래식 카드" },
  { id: "casino-games", label: "카지노 게임", source: "both", archetype: "game", examples: "슬롯, 포커, 카지노 시뮬레이션" },
  { id: "casual-games", label: "캐주얼 게임", source: "both", archetype: "game", examples: "가벼운 플레이, 짧은 세션" },
  { id: "educational-games", label: "교육 게임", source: "google", archetype: "education", examples: "학습형 게임, 어린이 문제 풀이" },
  { id: "family-games", label: "가족 게임", source: "apple", archetype: "game", examples: "가족용 플레이, 함께 즐기는 게임" },
  { id: "music-games", label: "음악 게임", source: "both", archetype: "game", examples: "리듬, 음악 퍼즐, 사운드 플레이" },
  { id: "puzzle-games", label: "퍼즐 게임", source: "both", archetype: "game", examples: "퍼즐, 두뇌, 매치, 로직" },
  { id: "racing-games", label: "레이싱 게임", source: "both", archetype: "game", examples: "자동차, 속도, 경쟁 주행" },
  { id: "role-playing-games", label: "롤플레잉 게임", source: "both", archetype: "game", examples: "캐릭터 성장, RPG, 수집" },
  { id: "simulation-games", label: "시뮬레이션 게임", source: "both", archetype: "game", examples: "경영, 생활, 현실 모사" },
  { id: "sports-games", label: "스포츠 게임", source: "both", archetype: "game", examples: "경기 플레이, 선수, 팀 운영" },
  { id: "strategy-games", label: "전략 게임", source: "both", archetype: "game", examples: "전술, 자원, 장기 계획" },
  { id: "trivia-games", label: "퀴즈 게임", source: "both", archetype: "game", examples: "상식, 퀴즈, 도전" },
  { id: "word-games", label: "단어 게임", source: "both", archetype: "game", examples: "단어 퍼즐, 철자, 어휘" },
] as const satisfies readonly ScreenshotCategoryGroup[];

export type CategoryId = (typeof SCREENSHOT_CATEGORY_GROUPS)[number]["id"];

type CategoryPackBlueprint = {
  slug: string;
  label: string;
  description: string;
  templateIds: readonly TemplateId[];
};

const CATEGORY_PACK_BLUEPRINTS = {
  utility: [
    {
      slug: "clarity",
      label: "핵심 명료형",
      description: "첫 장에서 결과를 말하고, 중간 장표에서 기능과 상태를 차분히 증명합니다.",
      templateIds: [
        "hero-center-01",
        "device-first-01",
        "split-right-02",
        "dashboard-grid-01",
        "side-note-01",
        "fake-3d-01",
        "bottom-band-03",
        "gallery-wall-01",
        "corner-focus-02",
        "poster-stack-03",
      ],
    },
    {
      slug: "workflow",
      label: "워크플로우형",
      description: "사용 흐름, 반복 작업, 전후 개선을 순서대로 보여주는 구성입니다.",
      templateIds: [
        "top-band-03",
        "split-left-03",
        "dashboard-grid-02",
        "device-first-03",
        "isometric-02",
        "side-note-02",
        "bottom-band-01",
        "floating-stack-01",
        "corner-focus-01",
        "poster-stack-02",
      ],
    },
    {
      slug: "trust",
      label: "신뢰 증명형",
      description: "정돈된 화면, 지표, 안정적인 제품감을 강조하는 업무형 시퀀스입니다.",
      templateIds: [
        "hero-center-03",
        "split-right-01",
        "top-band-01",
        "fake-3d-02",
        "device-first-02",
        "dashboard-grid-03",
        "side-note-03",
        "bottom-band-02",
        "gallery-wall-02",
        "poster-stack-01",
      ],
    },
  ],
  commerce: [
    {
      slug: "conversion",
      label: "전환 집중형",
      description: "발견, 비교, 선택, 결제 또는 예약까지 이어지는 구매 흐름에 맞춥니다.",
      templateIds: [
        "hero-center-02",
        "floating-stack-02",
        "split-right-02",
        "gallery-wall-02",
        "device-first-01",
        "fake-3d-03",
        "bottom-band-02",
        "corner-focus-01",
        "isometric-01",
        "poster-stack-02",
      ],
    },
    {
      slug: "catalog",
      label: "카탈로그형",
      description: "상품, 장소, 메뉴, 목록처럼 선택지가 많은 앱을 큐레이션 중심으로 보여줍니다.",
      templateIds: [
        "gallery-wall-01",
        "top-band-02",
        "device-first-03",
        "split-left-02",
        "floating-stack-03",
        "bottom-band-03",
        "side-note-02",
        "isometric-03",
        "corner-focus-02",
        "poster-stack-03",
      ],
    },
    {
      slug: "local-action",
      label: "즉시 행동형",
      description: "근처 탐색, 예약, 쿠폰, 이동처럼 바로 행동하게 만드는 구성입니다.",
      templateIds: [
        "diagonal-02",
        "device-first-02",
        "split-right-01",
        "fake-3d-01",
        "side-note-01",
        "gallery-wall-03",
        "bottom-band-01",
        "floating-stack-01",
        "corner-focus-03",
        "poster-stack-01",
      ],
    },
  ],
  community: [
    {
      slug: "people-first",
      label: "사람 중심형",
      description: "사용자, 관계, 루틴, 커뮤니티 참여를 자연스럽게 강조합니다.",
      templateIds: [
        "hero-center-01",
        "split-left-03",
        "gallery-wall-03",
        "device-first-01",
        "floating-stack-01",
        "side-note-03",
        "bottom-band-02",
        "isometric-02",
        "corner-focus-01",
        "poster-stack-03",
      ],
    },
    {
      slug: "habit",
      label: "루틴 성장형",
      description: "반복 사용, 기록, 변화, 목표 달성을 단계적으로 보여줍니다.",
      templateIds: [
        "top-band-03",
        "dashboard-grid-03",
        "device-first-03",
        "split-right-02",
        "fake-3d-02",
        "side-note-01",
        "bottom-band-03",
        "floating-stack-02",
        "corner-focus-02",
        "poster-stack-02",
      ],
    },
    {
      slug: "live-moment",
      label: "라이브 모먼트형",
      description: "활동성, 실시간성, 공유 순간을 역동적인 장표 흐름으로 전달합니다.",
      templateIds: [
        "diagonal-01",
        "hero-center-02",
        "split-left-01",
        "gallery-wall-01",
        "device-first-02",
        "isometric-01",
        "side-note-02",
        "bottom-band-01",
        "corner-focus-03",
        "poster-stack-01",
      ],
    },
  ],
  media: [
    {
      slug: "editorial",
      label: "에디토리얼형",
      description: "콘텐츠 발견, 감상, 저장, 공유를 잡지처럼 풍성하게 보여줍니다.",
      templateIds: [
        "gallery-wall-03",
        "hero-center-03",
        "device-first-01",
        "split-right-03",
        "floating-stack-03",
        "side-note-02",
        "bottom-band-02",
        "isometric-03",
        "corner-focus-01",
        "poster-stack-03",
      ],
    },
    {
      slug: "immersive",
      label: "몰입 감상형",
      description: "영상, 음악, 사진처럼 감각적인 화면을 크게 보여주는 시퀀스입니다.",
      templateIds: [
        "corner-focus-03",
        "diagonal-02",
        "device-first-03",
        "fake-3d-01",
        "gallery-wall-01",
        "split-left-02",
        "bottom-band-01",
        "floating-stack-01",
        "isometric-01",
        "poster-stack-02",
      ],
    },
    {
      slug: "collection",
      label: "컬렉션형",
      description: "라이브러리, 플레이리스트, 북마크처럼 모아 보는 가치를 강조합니다.",
      templateIds: [
        "top-band-02",
        "gallery-wall-02",
        "split-right-02",
        "device-first-02",
        "floating-stack-02",
        "side-note-01",
        "dashboard-grid-01",
        "bottom-band-03",
        "corner-focus-02",
        "poster-stack-01",
      ],
    },
  ],
  creative: [
    {
      slug: "studio",
      label: "스튜디오형",
      description: "제작 도구, 캔버스, 편집 결과를 시각적으로 크게 보여줍니다.",
      templateIds: [
        "isometric-03",
        "device-first-03",
        "gallery-wall-01",
        "floating-stack-03",
        "split-right-02",
        "fake-3d-03",
        "bottom-band-03",
        "corner-focus-02",
        "side-note-02",
        "poster-stack-03",
      ],
    },
    {
      slug: "before-after",
      label: "전후 비교형",
      description: "편집 전후, 스타일 변화, 결과물을 비교 중심으로 보여줍니다.",
      templateIds: [
        "split-left-02",
        "hero-center-02",
        "fake-3d-02",
        "gallery-wall-03",
        "device-first-01",
        "floating-stack-02",
        "bottom-band-02",
        "isometric-02",
        "corner-focus-03",
        "poster-stack-02",
      ],
    },
    {
      slug: "gallery",
      label: "작품 갤러리형",
      description: "완성물, 컬렉션, 개인화 결과를 전시 공간처럼 구성합니다.",
      templateIds: [
        "gallery-wall-02",
        "isometric-01",
        "device-first-02",
        "split-right-01",
        "floating-stack-01",
        "side-note-03",
        "bottom-band-01",
        "fake-3d-01",
        "corner-focus-01",
        "poster-stack-01",
      ],
    },
  ],
  education: [
    {
      slug: "learning-path",
      label: "학습 여정형",
      description: "시작, 연습, 점검, 성취까지 학습 단계가 보이는 구성입니다.",
      templateIds: [
        "hero-center-01",
        "top-band-03",
        "device-first-01",
        "dashboard-grid-03",
        "split-left-03",
        "floating-stack-02",
        "side-note-01",
        "bottom-band-03",
        "isometric-02",
        "poster-stack-02",
      ],
    },
    {
      slug: "friendly-guide",
      label: "친절한 가이드형",
      description: "어린이, 초보자, 자기주도 학습에 맞춘 밝은 안내 흐름입니다.",
      templateIds: [
        "top-band-01",
        "device-first-02",
        "gallery-wall-02",
        "split-right-02",
        "floating-stack-01",
        "fake-3d-01",
        "bottom-band-02",
        "corner-focus-02",
        "isometric-03",
        "poster-stack-03",
      ],
    },
    {
      slug: "progress",
      label: "성장 기록형",
      description: "학습량, 점수, 복습, 추천을 데이터와 결과 중심으로 보여줍니다.",
      templateIds: [
        "dashboard-grid-01",
        "hero-center-03",
        "device-first-03",
        "split-left-01",
        "side-note-02",
        "fake-3d-02",
        "bottom-band-01",
        "floating-stack-03",
        "corner-focus-01",
        "poster-stack-01",
      ],
    },
  ],
  game: [
    {
      slug: "gameplay",
      label: "게임플레이형",
      description: "첫 장부터 플레이 감각을 크게 보여주고 핵심 재미를 빠르게 전달합니다.",
      templateIds: [
        "diagonal-03",
        "corner-focus-03",
        "device-first-03",
        "fake-3d-01",
        "gallery-wall-01",
        "split-right-02",
        "bottom-band-02",
        "isometric-01",
        "floating-stack-01",
        "poster-stack-02",
      ],
    },
    {
      slug: "world",
      label: "월드 쇼케이스형",
      description: "캐릭터, 맵, 콘텐츠 볼륨을 세계관 중심으로 보여주는 구성입니다.",
      templateIds: [
        "isometric-03",
        "hero-center-02",
        "gallery-wall-03",
        "device-first-01",
        "floating-stack-03",
        "split-left-03",
        "bottom-band-03",
        "fake-3d-03",
        "corner-focus-02",
        "poster-stack-03",
      ],
    },
    {
      slug: "challenge",
      label: "도전 경쟁형",
      description: "레벨, 보상, 랭킹, 승부욕을 에너지 있게 전달합니다.",
      templateIds: [
        "diagonal-01",
        "dashboard-grid-03",
        "device-first-02",
        "split-right-01",
        "fake-3d-02",
        "side-note-02",
        "bottom-band-01",
        "floating-stack-02",
        "corner-focus-01",
        "poster-stack-01",
      ],
    },
  ],
} as const satisfies Record<CategoryArchetype, readonly CategoryPackBlueprint[]>;

export type ScreenshotCategoryPack = {
  id: string;
  categoryId: CategoryId;
  label: string;
  description: string;
  source: StoreCategorySource;
  templateIds: readonly TemplateId[];
};

export const SCREENSHOT_CATEGORY_PACKS = SCREENSHOT_CATEGORY_GROUPS.flatMap((category) =>
  CATEGORY_PACK_BLUEPRINTS[category.archetype].map((pack) => ({
    id: `${category.id}-${pack.slug}`,
    categoryId: category.id,
    label: `${category.label} · ${pack.label}`,
    description: pack.description,
    source: category.source,
    templateIds: pack.templateIds,
  })),
) satisfies readonly ScreenshotCategoryPack[];

export const DEFAULT_CATEGORY_PACK_ID = "productivity-clarity";

export function getCategoryPackById(id: string) {
  const defaultPack =
    SCREENSHOT_CATEGORY_PACKS.find((pack) => pack.id === DEFAULT_CATEGORY_PACK_ID) ?? SCREENSHOT_CATEGORY_PACKS[0];
  return SCREENSHOT_CATEGORY_PACKS.find((pack) => pack.id === id) ?? defaultPack;
}

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

function createTemplatePrompt(template: ScreenshotTemplateBlueprint) {
  return [
    "너는 모바일 앱의 앱스토어/구글 플레이 미리보기 스크린샷 카피를 작성하는 AI 에이전트다.",
    "프로젝트 폴더에서 README, 앱 설명, 주요 기능, 화면 캡처 파일명, 패키지 메타데이터를 먼저 확인한 뒤 아래 템플릿에 들어갈 문구를 작성해라.",
    "",
    `템플릿명: ${template.label}`,
    `템플릿 배치: ${template.description}`,
    `레이아웃 작성 방향: ${familyPromptGuidance[template.family]}`,
    "",
    "작성 규칙:",
    "- 모든 결과는 한국어로 작성한다.",
    "- 제목은 14~22자 안팎으로 짧고 강하게 쓴다.",
    "- 설명은 28~48자 안팎으로, 스크린샷 안에서 줄바꿈되어도 자연스럽게 읽히게 쓴다.",
    "- 기능 나열보다 사용자가 얻게 되는 결과, 시간 절약, 신뢰, 편의성, 제출 준비 상태를 먼저 표현한다.",
    "- 과장 광고, 근거 없는 1위/최고/완벽 같은 표현은 피한다.",
    "- 현재 프로젝트에서 확인한 실제 기능만 반영한다.",
    "",
    "출력 형식:",
    "제목: <스크린샷 제목 1개>",
    "설명: <보조 설명 1개>",
    "대체안:",
    "1. <다른 제목> / <다른 설명>",
    "2. <다른 제목> / <다른 설명>",
  ].join("\n");
}
