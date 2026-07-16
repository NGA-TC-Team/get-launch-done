"use client";

import type {
  CSSProperties,
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { shouldRenderDeviceCutout } from "./device-mockup";
import {
  DEFAULT_DEVICE_TRANSFORM,
  applyDeviceDragDelta,
  applyDeviceRotateGesture,
  applyDeviceScaleGesture,
  createDeviceTransformStyle,
  getPointerAngleDegrees,
  getPointerDistance,
  normalizeDeviceTransform,
} from "./device-transform";
import type { DeviceTransform, Point } from "./device-transform";
import {
  createHistoryState,
  recordHistorySnapshot,
  redoHistorySnapshot,
  undoHistorySnapshot,
} from "./editor-history";
import {
  createCssGradient,
  getSolidGradientColor,
  normalizeHexColor,
  normalizeGradientStops,
} from "./gradients";
import type { GradientConfig, GradientStop, GradientType } from "./gradients";
import { getExportTargets } from "./export-targets";
import {
  getDefaultStoreTargetIds,
  getPreviewDeviceProfile,
  getPreviewTargetSpec,
  getStoreTargetSpecs,
  platformDefs,
  storeTargetOrder,
  storeTargetSpecs,
} from "./platforms";
import type { PlatformDef, PlatformKey, StoreTargetId, StoreTargetSpec } from "./platforms";
import { buildPromptForSlot, buildPromptForSlots, parsePromptJson } from "./prompt-copy";
import {
  DEFAULT_COPY,
  DEFAULT_CATEGORY_PACK_ID,
  DEFAULT_TEMPLATE_SEQUENCE,
  IPHONE_17_PRO_DEVICE,
  SCREENSHOT_CATEGORY_GROUPS,
  SCREENSHOT_CATEGORY_PACKS,
  SCREENSHOT_THEMES,
  SCREENSHOT_TEMPLATES,
  getCategoryPackById,
  getTemplateById,
  getTemplatePreviewOptions,
  getThemeById,
} from "./templates";
import type { CategoryId, ScreenshotCategoryPack, ScreenshotTemplate, ScreenshotTheme, TemplateFamily, TemplateId, ThemeId } from "./templates";
import { applyLoadedImagesToSlots } from "./slot-images";
import { getNextIssueIndex, getVisibleIssues } from "./workflow";
import type { InspectorMode, SlotReadiness, SlotIssue } from "./workflow";

const TOTAL_SLOTS = DEFAULT_COPY.length;
const MIN_GRADIENT_STOPS = 2;
const MAX_GRADIENT_STOPS = 5;
const BADGE_MAX_LENGTH = 18;
const TITLE_MAX_LENGTH = 64;
const SUBTITLE_MAX_LENGTH = 72;
const STORAGE_KEY = "storeshot-draft-v2";
const HISTORY_LIMIT = 80;
const INITIAL_STATUS = "이미지를 드롭하거나 추가하세요.";

type BackgroundMode = "tonal" | "solid";
type ExportFormat = "png" | "jpg";
type TextAlign = "left" | "center" | "right";
type TextVisibilityKey = "showBadge" | "showTitle" | "showSubtitle";
type DeviceGestureMode = "move" | "scale" | "rotate";

const INSPECTOR_MODES: Array<{ id: InspectorMode; label: string; description: string }> = [
  { id: "copy", label: "카피", description: "문구" },
  { id: "layout", label: "레이아웃", description: "템플릿" },
  { id: "export", label: "검수", description: "준비" },
  { id: "ai", label: "AI", description: "JSON" },
];

type Slot = {
  badge: string;
  title: string;
  subtitle: string;
  imageDataUrl: string;
  imageName: string;
  templateId: TemplateId;
  showBadge: boolean;
  showTitle: boolean;
  showSubtitle: boolean;
  deviceTransform: DeviceTransform;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CanvasLayout = {
  text: Rect & {
    align: TextAlign;
    maxTitleLines: number;
    maxSubtitleLines: number;
  };
  phone: Rect & {
    rotate?: number;
  };
  band?: "top" | "bottom";
};

type ZipFile = {
  name: string;
  data: Uint8Array;
};

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const ICON_PATHS = {
  ai: "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zm-6 9l.9 2.1L9 15l-2.1.9L6 18l-.9-2.1L3 15l2.1-.9L6 12zm12 2l.8 1.8L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.2L18 14z",
  arrowLeft: "M14 6l-6 6 6 6M9 12h11",
  arrowRight: "M10 6l6 6-6 6M4 12h11",
  badge: "M12 3l2.3 4.6 5.1.7-3.7 3.6.9 5.1-4.6-2.4L7.4 17l.9-5.1-3.7-3.6 5.1-.7L12 3z",
  board: "M4 5h16v14H4V5zm3 3h4v3H7V8zm6 0h4v3h-4V8zM7 13h4v3H7v-3zm6 0h4v3h-4v-3z",
  brush: "M15 4l5 5-8.5 8.5c-1.4 1.4-3.3 2-5.1 1.6 1.2-1.1 1.4-2.5.7-3.2-.7-.7-2.1-.5-3.2.7-.4-1.8.2-3.7 1.6-5.1L15 4z",
  camera: "M5 7h3l1.5-2h5L16 7h3v11H5V7zm7 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  check: "M4 12l5 5L20 6",
  code: "M9 18l-6-6 6-6M15 6l6 6-6 6",
  copy: "M8 8h11v11H8V8zm-3 8H4V4h12v1",
  download: "M12 4v9m0 0l4-4m-4 4L8 9M5 19h14",
  eye: "M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6zm9 2.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  file: "M6 3h8l4 4v14H6V3zm8 0v5h5",
  folder: "M3 6h7l2 2h9v10H3V6z",
  image: "M4 5h16v14H4V5zm3 11l4-5 3 4 2-3 3 4M8 9h.1",
  info: "M12 20a8 8 0 100-16 8 8 0 000 16zm0-11v7m0-10h.1",
  json: "M8 5H5v14h3M16 5h3v14h-3M10 15l1.5-6M14 9l-1.5 6",
  keyboard: "M3 6h18v12H3V6zm3 4h.1M9 10h.1M12 10h.1M15 10h.1M18 10h.1M7 14h10",
  layers: "M12 4l8 4-8 4-8-4 8-4zm-8 8l8 4 8-4M4 16l8 4 8-4",
  layout: "M4 5h16v14H4V5zm0 5h16M10 10v9",
  lock: "M7 10V8a5 5 0 0110 0v2M6 10h12v10H6V10z",
  move: "M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4",
  palette: "M12 4a8 8 0 00-2 15.7c1.1.2 1.5-.7 1.2-1.4-.4-.9.2-1.3 1-1.3h1.7A6.1 6.1 0 0020 11c0-3.9-3.6-7-8-7zM7.5 11h.1M9 8h.1M13 7.5h.1M16 10h.1",
  percent: "M7 7h.1M17 17h.1M18 6L6 18M8 7a1 1 0 11-2 0 1 1 0 012 0zm10 10a1 1 0 11-2 0 1 1 0 012 0z",
  phone: "M8 3h8v18H8V3zm3 15h2",
  queue: "M5 7h14M5 12h14M5 17h9",
  reset: "M4 12a8 8 0 111.8 5M4 17v-5h5",
  rotate: "M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.7L4 16m0 4v-4h4",
  scale: "M5 19h6M5 19v-6M19 5h-6M19 5v6M5 19L19 5",
  shield: "M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3z",
  sliders: "M4 7h5m4 0h7M4 12h9m4 0h3M4 17h3m4 0h9M9 5v4M13 10v4M7 15v4",
  sparkles: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zm-6 10l.8 2.2L9 16l-2.2.8L6 19l-.8-2.2L3 16l2.2-.8L6 13z",
  store: "M5 10h14v10H5V10zm1-6h12l2 6H4l2-6zM9 10v10",
  target: "M12 20a8 8 0 100-16 8 8 0 000 16zm0-4a4 4 0 100-8 4 4 0 000 8zm0-2a2 2 0 100-4 2 2 0 000 4z",
  text: "M4 6h16M8 6v12M16 6v12M7 18h4M13 18h4",
  title: "M4 6h16M12 6v12M8 18h8",
  undo: "M9 7l-5 5 5 5M4 12h10a5 5 0 010 10",
  upload: "M12 20V9m0 0l-4 4m4-4l4 4M5 5h14",
  zip: "M7 3h7l4 4v14H7V3zm7 0v5h5M10 7h2m-2 3h2m-2 3h2m-2 3h2",
} as const;

type IconName = keyof typeof ICON_PATHS;

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg className={`ui-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function IconText({
  icon,
  children,
  className = "",
}: {
  icon: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`icon-text ${className}`.trim()}>
      <Icon name={icon} />
      <span className="icon-text-label">{children}</span>
    </span>
  );
}

type DeviceGesture = {
  mode: DeviceGestureMode;
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  startTransform: DeviceTransform;
  frameWidth: number;
  frameHeight: number;
  center: Point;
  startDistance: number;
  startAngle: number;
};

type PersistedDraft = {
  version: 3;
  platformKey: PlatformKey;
  selectedTargetIds: StoreTargetId[];
  previewTargetId: StoreTargetId;
  bgMode: BackgroundMode;
  themeId: ThemeId;
  gradientType: GradientType;
  gradientAngle: number;
  gradientStops: GradientStop[];
  gradientHexDrafts: Record<string, string>;
  hideDeviceCutout: boolean;
  exportFormat: ExportFormat;
  jpgQuality: number;
  selectedCategoryPackId: string;
  selected: number;
  slots: Slot[];
};

function createGradientStops(a: string, b: string): GradientStop[] {
  return [
    { id: "stop-1", color: a, position: 0 },
    { id: "stop-2", color: b, position: 100 },
  ];
}

function createInitialSlots(): Slot[] {
  const defaultPack = getCategoryPackById(DEFAULT_CATEGORY_PACK_ID);

  return Array.from({ length: TOTAL_SLOTS }, (_, index) => {
    const templateId = defaultPack.templateIds[index % defaultPack.templateIds.length];
    const template = getTemplateById(templateId);

    return {
      badge: template.badge,
      title: DEFAULT_COPY[index][0],
      subtitle: DEFAULT_COPY[index][1],
      imageDataUrl: "",
      imageName: "",
      templateId,
      showBadge: true,
      showTitle: true,
      showSubtitle: true,
      deviceTransform: DEFAULT_DEVICE_TRANSFORM,
    };
  });
}

function getSlotReadiness(slot: Slot): SlotReadiness {
  const copyIssues = [
    slot.showBadge && !slot.badge.trim() ? "뱃지" : null,
    slot.showTitle && !slot.title.trim() ? "제목" : null,
    slot.showSubtitle && !slot.subtitle.trim() ? "설명" : null,
  ].filter((item): item is string => Boolean(item));
  const hiddenLayers = [slot.showBadge, slot.showTitle, slot.showSubtitle].filter((visible) => !visible).length;
  const hasImage = Boolean(slot.imageDataUrl);

  return {
    hasImage,
    copyIssues,
    hiddenLayers,
    isReady: hasImage && copyIssues.length === 0,
  };
}

function getReleaseStatusLabel(missingImageCount: number, copyIssueSlotCount: number) {
  if (!missingImageCount && !copyIssueSlotCount) {
    return "제출 준비됨";
  }
  if (missingImageCount && copyIssueSlotCount) {
    return `${missingImageCount}개 이미지 · ${copyIssueSlotCount}개 카피 점검`;
  }
  if (missingImageCount) {
    return `${missingImageCount}개 이미지 필요`;
  }
  return `${copyIssueSlotCount}개 카피 점검`;
}

function getSlotIssueSummary(readiness: SlotReadiness, imageName: string) {
  if (!readiness.hasImage) {
    return "이미지 필요";
  }
  if (readiness.copyIssues.length) {
    return `${readiness.copyIssues.join(", ")} 입력 필요`;
  }
  return imageName || "이미지 입력됨";
}

function formatPageRange(startIndex: number, count: number) {
  const start = String(startIndex + 1).padStart(2, "0");
  const end = String(startIndex + count).padStart(2, "0");
  return count === 1 ? `${start}번` : `${start}~${end}번`;
}

function getPackShortLabel(pack: ScreenshotCategoryPack) {
  return pack.label.includes(" · ") ? pack.label.split(" · ").at(-1) ?? pack.label : pack.label;
}

function getCategorySourceLabel(source: "apple" | "google" | "both") {
  if (source === "apple") {
    return "Apple";
  }
  if (source === "google") {
    return "Google";
  }
  return "공통";
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export default function Page() {
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [platformKey, setPlatformKey] = useState<PlatformKey>("ios");
  const [selectedTargetIds, setSelectedTargetIds] = useState<StoreTargetId[]>(() => getDefaultStoreTargetIds("ios"));
  const [previewTargetId, setPreviewTargetId] = useState<StoreTargetId>(() => getDefaultStoreTargetIds("ios")[0]);
  const [bgMode, setBgMode] = useState<BackgroundMode>("tonal");
  const [themeId, setThemeId] = useState<ThemeId>("launch-green");
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(() => createGradientStops("#22c55e", "#111827"));
  const [gradientHexDrafts, setGradientHexDrafts] = useState<Record<string, string>>({});
  const [hideDeviceCutout, setHideDeviceCutout] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [selectedCategoryPackId, setSelectedCategoryPackId] = useState(DEFAULT_CATEGORY_PACK_ID);
  const [selected, setSelected] = useState(0);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("copy");
  const [jpgQuality, setJpgQuality] = useState(0.92);
  const [slots, setSlots] = useState<Slot[]>(createInitialSlots);
  const [promptJsonInput, setPromptJsonInput] = useState("");
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [toast, setToast] = useState("");
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [isStageDragging, setIsStageDragging] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const activeDeviceGesture = useRef<DeviceGesture | null>(null);
  const history = useRef(createHistoryState());
  const slotCardRefs = useRef<Array<HTMLElement | null>>([]);

  const selectedTargetSpecs = useMemo<StoreTargetSpec[]>(
    () => getStoreTargetSpecs(platformKey, selectedTargetIds),
    [platformKey, selectedTargetIds],
  );
  const selectedTargetIdSet = useMemo(
    () => new Set(selectedTargetSpecs.map((targetSpec) => targetSpec.id)),
    [selectedTargetSpecs],
  );
  const previewTargetSpec = getPreviewTargetSpec(platformKey, selectedTargetIds, previewTargetId);
  const previewDeviceProfile = getPreviewDeviceProfile(previewTargetSpec.platform);
  const platform = previewTargetSpec.platform;
  const theme = getThemeById(themeId);
  const selectedCategoryPack = getCategoryPackById(selectedCategoryPackId);
  const selectedCategory =
    SCREENSHOT_CATEGORY_GROUPS.find((category) => category.id === selectedCategoryPack.categoryId) ??
    SCREENSHOT_CATEGORY_GROUPS[0];
  const categoryPacks = SCREENSHOT_CATEGORY_PACKS.filter((pack) => pack.categoryId === selectedCategory.id);
  const selectedSlot = slots[selected];
  const selectedTemplate = getTemplateById(selectedSlot.templateId);
  const templatePreviewOptions = useMemo(
    () => getTemplatePreviewOptions(selectedSlot.templateId),
    [selectedSlot.templateId],
  );
  const slotReadiness = slots.map(getSlotReadiness);
  const selectedReadiness = slotReadiness[selected];
  const selectedNeedsImage = !selectedReadiness.hasImage;
  const selectedNeedsCopy = selectedReadiness.copyIssues.length > 0;
  const readySlotCount = slotReadiness.filter((item) => item.isReady).length;
  const copyIssueSlotCount = slotReadiness.filter((item) => item.copyIssues.length > 0).length;
  const copyIssueCount = slotReadiness.reduce((sum, item) => sum + item.copyIssues.length, 0);
  const nextIssueIndex = getNextIssueIndex(slotReadiness, selected);
  const completionPercent = Math.round((readySlotCount / TOTAL_SLOTS) * 100);
  const uploadedCount = slotReadiness.filter((item) => item.hasImage).length;
  const missingImageCount = TOTAL_SLOTS - uploadedCount;
  const hiddenCopyCount = slots.filter((slot) => !slot.showBadge || !slot.showTitle || !slot.showSubtitle).length;
  const exportFileCount = selectedTargetSpecs.length * TOTAL_SLOTS;
  const selectedTargetSummary = selectedTargetSpecs.map((targetSpec) => targetSpec.shortLabel).join(" + ");
  const selectedStoreSummary = selectedTargetSpecs.map((targetSpec) => targetSpec.label).join(", ");
  const previewTargetSummary = `${previewTargetSpec.label} · ${platform.width} x ${platform.height}`;
  const releaseReady = slotReadiness.every((item) => item.isReady);
  const releaseStatusLabel = getReleaseStatusLabel(missingImageCount, copyIssueSlotCount);
  const orderedIssues = getVisibleIssues(slotReadiness, selected, TOTAL_SLOTS);
  const visibleIssues = orderedIssues.slice(0, 4);
  const firstBlockingIssue = orderedIssues[0] ?? null;
  const firstMissingImageIssue = orderedIssues.find((issue) => issue.mode === "export") ?? null;
  const firstCopyIssue = orderedIssues.find((issue) => issue.mode === "copy") ?? null;
  const firstHiddenLayerIndex = slots.findIndex((slot) => !slot.showBadge || !slot.showTitle || !slot.showSubtitle);
  const selectedBoardState = selectedReadiness.isReady ? "is-ready" : selectedReadiness.hasImage ? "needs-review" : "is-empty";
  const selectedStateLabel = selectedReadiness.isReady ? "준비" : selectedReadiness.hasImage ? "점검" : "대기";
  const selectedIssueText = getSlotIssueSummary(selectedReadiness, selectedSlot.imageName);
  const selectedIssue = visibleIssues.find((issue) => issue.index === selected) ?? null;
  const boardIssueTarget = selectedIssue ?? firstBlockingIssue;
  const gradientConfig = useMemo<GradientConfig>(
    () => ({
      type: gradientType,
      angle: gradientAngle,
      stops: normalizeGradientStops(gradientStops),
    }),
    [gradientAngle, gradientStops, gradientType],
  );
  const previewBackground = bgMode === "solid" ? getSolidGradientColor(gradientConfig) : createCssGradient(gradientConfig);
  const backgroundSummary =
    bgMode === "solid"
      ? getSolidGradientColor(gradientConfig).toUpperCase()
      : `${gradientType === "linear" ? `${gradientAngle}도` : "방사형"} · ${gradientConfig.stops.length}스탑`;
  const isIntakePhase = uploadedCount === 0;
  const topbarStatusItems: Array<{ icon: IconName; label: string }> = isIntakePhase
    ? [
        { icon: releaseReady ? "check" : "image", label: releaseStatusLabel },
        { icon: "target", label: selectedTargetSummary },
        { icon: "image", label: `${uploadedCount}/${TOTAL_SLOTS} 이미지` },
      ]
    : [
        { icon: releaseReady ? "check" : "shield", label: releaseStatusLabel },
        { icon: "target", label: selectedTargetSummary },
        { icon: "image", label: `${uploadedCount}/${TOTAL_SLOTS} 이미지` },
        { icon: "file", label: `${exportFileCount}개 파일` },
        { icon: "board", label: `${String(selected + 1).padStart(2, "0")}번 선택` },
        { icon: "zip", label: `${selectedStoreSummary} ZIP` },
        ...(hiddenCopyCount ? [{ icon: "eye" as IconName, label: `${hiddenCopyCount}개 숨김` }] : []),
      ];

  const stageStyle: CSSVars = {
    "--shot-ratio": platform.ratio,
    "--card-width":
      previewDeviceProfile.copyLayout === "wide"
        ? `clamp(320px, calc(100vh - 450px), ${platform.cardWidth}px)`
        : previewDeviceProfile.copyLayout === "compact"
        ? `clamp(170px, calc(100vh - 520px), ${platform.cardWidth}px)`
        : platformKey === "ios"
        ? `clamp(204px, calc(44vh - 141px), ${platform.cardWidth}px)`
        : `clamp(240px, calc(100vh - 470px), ${platform.cardWidth}px)`,
    "--preview-background": previewBackground,
    "--preview-a": theme.a,
    "--preview-b": bgMode === "solid" ? theme.a : theme.b,
    "--preview-ink": theme.foreground,
    "--preview-muted": theme.muted,
    "--preview-panel": theme.panel,
    "--device-ratio": previewDeviceProfile.deviceRatio,
  };

  async function assignFiles(startIndex: number, files: File[]) {
    const images = files.filter((file) => /^image\/(png|jpe?g)$/i.test(file.type));
    if (!images.length) {
      notify("PNG 또는 JPG 파일만 사용할 수 있습니다.");
      return;
    }

    const availableImages = images.slice(0, TOTAL_SLOTS - startIndex);
    const loaded = await Promise.all(
      availableImages.map(async (file) => ({
        imageDataUrl: await readFileAsDataUrl(file),
        imageName: file.name,
      })),
    );

    setSlots((current) => applyLoadedImagesToSlots(current, startIndex, loaded));
    setSelected(Math.min(startIndex + loaded.length - 1, TOTAL_SLOTS - 1));
    notify(`${formatPageRange(startIndex, loaded.length)} · ${loaded.length}개 추가`);
  }

  function notify(message: string) {
    setStatus(message);
    setToast(message);
  }

  function applyHistoryStep(direction: "undo" | "redo") {
    const snapshot =
      direction === "redo" ? redoHistorySnapshot(history.current) : undoHistorySnapshot(history.current);
    if (!snapshot) {
      notify(direction === "redo" ? "다시 실행 없음." : "되돌릴 작업 없음.");
      return false;
    }

    const draft = parseDraftSnapshot(snapshot);
    if (!draft) {
      notify("작업 이력 오류.");
      return false;
    }

    applyDraft(draft);
    notify(direction === "redo" ? "다시 실행했습니다." : "되돌렸습니다.");
    return true;
  }

  function applyDraft(draft: PersistedDraft) {
    setPlatformKey(draft.platformKey);
    setSelectedTargetIds(draft.selectedTargetIds);
    setBgMode(draft.bgMode);
    setThemeId(draft.themeId);
    setGradientType(draft.gradientType);
    setGradientAngle(draft.gradientAngle);
    setGradientStops(draft.gradientStops);
    setGradientHexDrafts(draft.gradientHexDrafts);
    setHideDeviceCutout(draft.hideDeviceCutout);
    setExportFormat(draft.exportFormat);
    setJpgQuality(draft.jpgQuality);
    setSelectedCategoryPackId(draft.selectedCategoryPackId);
    setPreviewTargetId(draft.previewTargetId);
    setSlots(draft.slots);
    setSelected(draft.selected);
  }

  function updateSlot(index: number, update: Partial<Slot>) {
    setSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...update } : slot)),
    );
  }

  function updateSelectedSlot(update: Partial<Slot>) {
    updateSlot(selected, update);
  }

  function changePlatform(key: PlatformKey) {
    const defaultTargetId = getDefaultStoreTargetIds(key)[0];
    setPlatformKey(key);
    setSelectedTargetIds([defaultTargetId]);
    setPreviewTargetId(defaultTargetId);
    setStatus(`${platformDefs[key].label} Phone 규격`);
  }

  function toggleStoreTarget(targetId: StoreTargetId) {
    const currentIds = selectedTargetSpecs.map((targetSpec) => targetSpec.id);
    const isSelected = currentIds.includes(targetId);
    const nextIds = isSelected ? currentIds.filter((id) => id !== targetId) : [...currentIds, targetId];
    const normalized = getStoreTargetSpecs(platformKey, nextIds).map((targetSpec) => targetSpec.id);
    setSelectedTargetIds(normalized);
    if (!isSelected) {
      setPreviewTargetId(targetId);
      setStatus(`${storeTargetSpecs[targetId].label} 미리보기`);
      return;
    }
    if (previewTargetSpec.id === targetId) {
      setPreviewTargetId(normalized[0]);
      setStatus(`${storeTargetSpecs[normalized[0]].label} 미리보기`);
    }
  }

  function selectPreviewTarget(targetId: StoreTargetId) {
    setPreviewTargetId(targetId);
    setStatus(`${storeTargetSpecs[targetId].label} 미리보기`);
  }

  function goToSlot(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), TOTAL_SLOTS - 1);
    selectSlot(nextIndex);
    setStatus(`${String(nextIndex + 1).padStart(2, "0")}번 선택`);
  }

  function moveSelectedSlot(direction: -1 | 1) {
    const nextIndex = (selected + direction + TOTAL_SLOTS) % TOTAL_SLOTS;
    goToSlot(nextIndex);
  }

  function jumpToIssue(issue: SlotIssue) {
    selectSlot(issue.index);
    setInspectorMode(issue.mode);
    setStatus(`${String(issue.index + 1).padStart(2, "0")}번 ${issue.label} 점검`);
  }

  function selectSlot(index: number) {
    setSelected(index);
    window.requestAnimationFrame(() => {
      const card = slotCardRefs.current[index];
      if (!card) {
        return;
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      card.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  }

  function updateSlotTemplate(index: number, templateId: TemplateId) {
    const template = getTemplateById(templateId);
    updateSlot(index, { templateId, badge: template.badge });
  }

  function chooseSelectedSlotTemplate(templateId: TemplateId) {
    const template = getTemplateById(templateId);
    updateSlotTemplate(selected, templateId);
    setIsTemplateModalOpen(false);
    setStatus(`${String(selected + 1).padStart(2, "0")}번 ${template.label} 적용`);
  }

  function applyCategoryPack(packId: string) {
    const pack = getCategoryPackById(packId);
    setSelectedCategoryPackId(pack.id);
    setSlots((current) =>
      current.map((slot, index) => {
        const template = getTemplateById(pack.templateIds[index % pack.templateIds.length]);
        return { ...slot, templateId: template.id, badge: template.badge };
      }),
    );
    setStatus(`${pack.label} 적용.`);
  }

  function changeCategory(categoryId: CategoryId) {
    const nextPack = SCREENSHOT_CATEGORY_PACKS.find((pack) => pack.categoryId === categoryId) ?? selectedCategoryPack;
    applyCategoryPack(nextPack.id);
  }

  function setAllTextVisibility(key: TextVisibilityKey, visible: boolean) {
    setSlots((current) => current.map((slot) => ({ ...slot, [key]: visible })));
    setStatus(`${getVisibilityLabel(key)} ${visible ? "켜짐" : "꺼짐"}.`);
  }

  function isEveryTextHidden(key: TextVisibilityKey) {
    return slots.every((slot) => !slot[key]);
  }

  function resetSelectedDeviceTransform() {
    updateSelectedSlot({ deviceTransform: DEFAULT_DEVICE_TRANSFORM });
    notify("목업 위치 초기화.");
  }

  function updateSelectedDeviceTransform(update: Partial<DeviceTransform>) {
    updateSelectedSlot({
      deviceTransform: normalizeDeviceTransform({
        ...selectedSlot.deviceTransform,
        ...update,
      }),
    });
  }

  function applyScreenshotTheme(nextThemeId: ThemeId) {
    const nextTheme = getThemeById(nextThemeId);
    setThemeId(nextThemeId);
    setGradientStops(createGradientStops(nextTheme.a, nextTheme.b));
  }

  function updateGradientStop(id: string, update: Partial<Pick<GradientStop, "color" | "position">>) {
    setGradientStops((current) =>
      current.map((stop) => (stop.id === id ? { ...stop, ...update } : stop)),
    );
  }

  function updateGradientStopColor(id: string, color: string) {
    updateGradientStop(id, { color });
    setGradientHexDrafts((current) => ({ ...current, [id]: color }));
  }

  function updateGradientStopHex(id: string, value: string) {
    setGradientHexDrafts((current) => ({ ...current, [id]: value }));
    const normalized = normalizeHexColor(value);
    if (normalized) {
      updateGradientStop(id, { color: normalized });
      setGradientHexDrafts((current) => ({ ...current, [id]: normalized }));
    }
  }

  function commitGradientStopHex(stop: GradientStop) {
    const draft = gradientHexDrafts[stop.id];
    const normalized = draft ? normalizeHexColor(draft) : null;
    setGradientHexDrafts((current) => ({
      ...current,
      [stop.id]: normalized ?? stop.color,
    }));
  }

  function addGradientStop() {
    setGradientStops((current) => {
      if (current.length >= MAX_GRADIENT_STOPS) {
        return current;
      }

      return [
        ...current,
        {
          id: `stop-${Date.now()}`,
          color: current[current.length - 1]?.color ?? theme.a,
          position: 50,
        },
      ];
    });
  }

  function removeGradientStop(id: string) {
    setGradientStops((current) =>
      current.length <= MIN_GRADIENT_STOPS ? current : current.filter((stop) => stop.id !== id),
    );
  }

  function resetCopy() {
    setSlots((current) =>
      current.map((slot, index) => ({
        ...slot,
        badge: getTemplateById(selectedCategoryPack.templateIds[index % selectedCategoryPack.templateIds.length]).badge,
        title: DEFAULT_COPY[index][0],
        subtitle: DEFAULT_COPY[index][1],
        templateId: selectedCategoryPack.templateIds[index % selectedCategoryPack.templateIds.length],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        deviceTransform: DEFAULT_DEVICE_TRANSFORM,
      })),
    );
    notify("기본값 복원.");
  }

  async function exportZip() {
    if (!releaseReady) {
      if (firstBlockingIssue) {
        jumpToIssue(firstBlockingIssue);
        notify(`${String(firstBlockingIssue.index + 1).padStart(2, "0")}번 먼저 점검. ${releaseStatusLabel}`);
      } else {
        setInspectorMode("export");
        notify(releaseStatusLabel);
      }
      return;
    }

    try {
      setStatus("렌더링 중...");
      const files: ZipFile[] = [];
      const targets = getExportTargets({
        targetSpecs: selectedTargetSpecs,
        count: slots.length,
        extension: exportFormat,
      });
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        setStatus(`${index + 1}/${targets.length} 렌더링`);
        const slot = slots[target.slotIndex];
        const blob = await renderSlotToBlob({
          slot,
          platform: target.platform,
          template: getTemplateById(slot.templateId),
          bgMode,
          theme,
          gradientConfig,
          hideDeviceCutout,
          exportFormat,
          jpgQuality,
        });
        files.push({
          name: target.name,
          data: new Uint8Array(await blob.arrayBuffer()),
        });
      }

      setStatus("ZIP 생성 중...");
      const zip = buildZip(files);
      const zipBlob = new Blob([zip], { type: "application/zip" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${platformKey}-${selectedTargetSpecs.length === 1 ? selectedTargetSpecs[0].folderName : "multi"}-store-screenshots.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify(`${files.length}개 ZIP 완료.`);
    } catch (error) {
      console.error(error);
      notify("내보내기 실패. 콘솔 확인.");
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setDraggingSlot(null);
    }
  }

  function handleStageDragEnter(event: DragEvent<HTMLElement>) {
    if (!hasFileDrag(event)) {
      return;
    }
    event.preventDefault();
    setIsStageDragging(true);
  }

  function handleStageDragOver(event: DragEvent<HTMLElement>) {
    if (!hasFileDrag(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsStageDragging(true);
  }

  function handleStageDragLeave(event: DragEvent<HTMLElement>) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setIsStageDragging(false);
    }
  }

  function handleStageDrop(event: DragEvent<HTMLElement>) {
    if (!hasFileDrag(event)) {
      return;
    }
    event.preventDefault();
    setIsStageDragging(false);
    setDraggingSlot(null);
    void assignFiles(0, Array.from(event.dataTransfer.files));
  }

  function handleSelectedImageInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      void assignFiles(selected, Array.from(event.target.files));
    }
    event.target.value = "";
  }

  async function copySelectedPrompt() {
    const prompt = buildPromptForSlot({
      slot: selectedSlot,
      template: selectedTemplate,
      platform,
      pageNumber: selected + 1,
      totalPages: TOTAL_SLOTS,
    });
    const copied = await copyText(prompt);
    notify(copied ? "선택 프롬프트 복사." : "프롬프트 복사 실패.");
  }

  async function copyAllPrompts() {
    const prompt = buildPromptForSlots({
      slots,
      templates: SCREENSHOT_TEMPLATES,
      platform,
    });
    const copied = await copyText(prompt);
    notify(copied ? "전체 프롬프트 복사." : "프롬프트 복사 실패.");
  }

  function applyPromptJsonText(text: string) {
    setPromptJsonInput(text);
    const result = parsePromptJson(text, TOTAL_SLOTS);

    if (!result.ok) {
      notify(`JSON 적용 실패: ${result.error}`);
      return;
    }

    if (result.type === "single") {
      updateSelectedSlot(createPromptTextUpdate(result));
      notify("JSON 적용.");
      return;
    }

    const screensByPage = new Map(result.screens.map((screen) => [screen.page, screen]));
    setSlots((current) =>
      current.map((slot, index) => {
        const screen = screensByPage.get(index + 1);
        return screen ? { ...slot, ...createPromptTextUpdate(screen) } : slot;
      }),
    );
    setSelected(result.screens[0].page - 1);
    notify(`${result.screens.length}개 화면에 프롬프트 JSON을 적용했습니다.`);
  }

  function handlePromptJsonPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const text = event.clipboardData.getData("text");
    if (!text.trim()) {
      return;
    }

    event.preventDefault();
    applyPromptJsonText(text);
  }

  function startDeviceGesture(event: ReactPointerEvent<HTMLElement>, index: number, mode: DeviceGestureMode) {
    const frame = event.currentTarget.closest(".device-frame");
    if (!(frame instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectSlot(index);

    const rect = frame.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const pointer = {
      x: event.clientX,
      y: event.clientY,
    };

    activeDeviceGesture.current = {
      mode,
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTransform: slots[index].deviceTransform,
      frameWidth: frame.offsetWidth || rect.width,
      frameHeight: frame.offsetHeight || rect.height,
      center,
      startDistance: getPointerDistance(center, pointer),
      startAngle: getPointerAngleDegrees(center, pointer),
    };

    try {
      frame.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail if the pointer is already released; movement still works while over the frame.
    }
  }

  function updateDeviceGesture(event: ReactPointerEvent<HTMLElement>) {
    const gesture = activeDeviceGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const pointer = { x: event.clientX, y: event.clientY };
    const deviceTransform =
      gesture.mode === "move"
        ? applyDeviceDragDelta(gesture.startTransform, {
            deltaX: event.clientX - gesture.startX,
            deltaY: event.clientY - gesture.startY,
            frameWidth: gesture.frameWidth,
            frameHeight: gesture.frameHeight,
            lockAxis: event.shiftKey,
          })
        : gesture.mode === "scale"
          ? applyDeviceScaleGesture(gesture.startTransform, {
              startDistance: gesture.startDistance,
              currentDistance: getPointerDistance(gesture.center, pointer),
            })
          : applyDeviceRotateGesture(gesture.startTransform, {
              startAngle: gesture.startAngle,
              currentAngle: getPointerAngleDegrees(gesture.center, pointer),
            });

    updateSlot(gesture.index, { deviceTransform });
  }

  function endDeviceGesture(event: ReactPointerEvent<HTMLElement>) {
    const gesture = activeDeviceGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    activeDeviceGesture.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may have released capture already after pointer cancellation.
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const draft = readStoredDraft();
      if (draft) {
        applyDraft(draft);
        setStatus("브라우저에 저장된 작업을 불러왔습니다.");
      }
      setHasHydratedDraft(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    const draft: PersistedDraft = {
      version: 3,
      platformKey,
      selectedTargetIds: selectedTargetSpecs.map((targetSpec) => targetSpec.id),
      previewTargetId: previewTargetSpec.id,
      bgMode,
      themeId,
      gradientType,
      gradientAngle,
      gradientStops,
      gradientHexDrafts,
      hideDeviceCutout,
      exportFormat,
      jpgQuality,
      selectedCategoryPackId,
      selected,
      slots,
    };

    recordHistorySnapshot(history.current, JSON.stringify(draft), HISTORY_LIMIT);
    writeStoredDraft(draft);
  }, [
    bgMode,
    exportFormat,
    gradientAngle,
    gradientHexDrafts,
    gradientStops,
    gradientType,
    hasHydratedDraft,
    hideDeviceCutout,
    jpgQuality,
    platformKey,
    previewTargetSpec.id,
    selectedTargetSpecs,
    selectedCategoryPackId,
    selected,
    slots,
    themeId,
  ]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function handleWorkspaceKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        if (applyHistoryStep(event.shiftKey ? "redo" : "undo")) {
          event.preventDefault();
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSelectedSlot(1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelectedSlot(-1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        goToSlot(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        goToSlot(TOTAL_SLOTS - 1);
      }
    }

    window.addEventListener("keydown", handleWorkspaceKeyDown);
    return () => window.removeEventListener("keydown", handleWorkspaceKeyDown);
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <h1>StoreShot</h1>
            <p>
              <IconText icon="store">스토어 미리보기 제작</IconText>
            </p>
          </div>
        </div>

        <section className="panel-section">
              <div className="section-label">
                <IconText icon="store">제출 플랫폼</IconText>
              </div>
              <div className="segmented" role="group" aria-label="제출 플랫폼">
                {(["ios", "android"] as PlatformKey[]).map((key) => (
                  <button
                    key={key}
                    className={`segment ${platformKey === key ? "is-active" : ""}`}
                    type="button"
                    onClick={() => changePlatform(key)}
                  >
                    <IconText icon={key === "ios" ? "phone" : "store"}>{platformDefs[key].label}</IconText>
                  </button>
                ))}
              </div>
              <div className="target-summary" aria-label="현재 내보내기 규격">
                <span>
                  <IconText icon="target">현재 미리보기</IconText>
                </span>
                <div>
                  <strong>{previewTargetSpec.label}</strong>
                  <small>
                    {platform.width} x {platform.height} · {selectedTargetSpecs.length}개 규격 선택
                  </small>
                </div>
                <em>{selectedTargetSummary}</em>
              </div>
              <div className="target-preview-switcher" aria-label="미리보기 규격 전환">
                {selectedTargetSpecs.map((targetSpec) => (
                  <button
                    key={targetSpec.id}
                    className={targetSpec.id === previewTargetSpec.id ? "is-active" : ""}
                    type="button"
                    onClick={() => selectPreviewTarget(targetSpec.id)}
                  >
                    <span>{targetSpec.shortLabel}</span>
                    <small>{targetSpec.platform.width}x{targetSpec.platform.height}</small>
                  </button>
                ))}
              </div>
              <details className="advanced-panel target-panel">
                <summary>
                  <span>
                    <Icon name="layers" />
                    추가 규격
                  </span>
                  <strong>{selectedTargetSpecs.length}개 선택</strong>
                </summary>
                <div className="target-option-list">
                  {storeTargetOrder[platformKey].map((targetId) => {
                    const targetSpec = storeTargetSpecs[targetId];
                    const checked = selectedTargetIdSet.has(targetId);
                    return (
                      <label className={`target-option ${checked ? "is-selected" : ""}`} key={targetId}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStoreTarget(targetId)}
                        />
                        <span>
                          <strong>
                            <IconText icon="target" className="pl-1">{targetSpec.label}</IconText>
                          </strong>
                          <small>{targetSpec.requirement}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </details>
              <p className="hint">
                <IconText icon="info">추가 규격을 선택하면 여기서 보기를 전환합니다.</IconText>
              </p>
        </section>

        <section className="panel-section">
              <details className="advanced-panel">
                <summary>
                  <span>
                    <Icon name="camera" />
                    목업 표시
                  </span>
                  <strong>{hideDeviceCutout ? "카메라 숨김" : "기본"}</strong>
                </summary>
                <label className="toggle-row">
                  <span>
                    <IconText icon="eye" className="pl-1">카메라/아일랜드</IconText>
                  </span>
                  <input
                    type="checkbox"
                    checked={hideDeviceCutout}
                    onChange={(event) => setHideDeviceCutout(event.target.checked)}
                  />
                </label>
              </details>
              <p className="hint">
                <IconText icon="info">Phone 목업 장식.</IconText>
              </p>
        </section>

        <section className="panel-section">
              <details className="advanced-panel template-panel">
                <summary>
                  <span>
                    <Icon name="layout" />
                    카테고리 템플릿
                  </span>
                  <strong>{selectedCategoryPack.label}</strong>
                </summary>
                <label className="field template-picker">
                  <span>
                    <IconText icon="store" className="pl-1">앱 카테고리</IconText>
                  </span>
                  <select
                    value={selectedCategory.id}
                    onChange={(event) => changeCategory(event.target.value as CategoryId)}
                  >
                    {SCREENSHOT_CATEGORY_GROUPS.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field template-picker">
                  <span>
                    <IconText icon="layers" className="pl-1">전체 페이지 팩</IconText>
                  </span>
                  <select
                    value={selectedCategoryPack.id}
                    onChange={(event) => applyCategoryPack(event.target.value)}
                  >
                    {categoryPacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {getPackShortLabel(pack)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="template-summary" aria-label="현재 카테고리 팩 요약">
                  <span className={`template-mini mini-${getTemplateById(selectedCategoryPack.templateIds[0]).family}`} aria-hidden="true">
                    <span />
                    <i />
                  </span>
                  <div>
                    <strong>{selectedCategoryPack.label}</strong>
                    <p>{selectedCategoryPack.description}</p>
                  </div>
                  <em>{getCategorySourceLabel(selectedCategory.source)}</em>
                </div>
                <div className="template-pack-strip" aria-label="팩 화면 구성">
                  {selectedCategoryPack.templateIds.map((templateId, index) => {
                    const template = getTemplateById(templateId);
                    return (
                      <span key={`${templateId}-${index}`} title={`${index + 1}. ${template.label}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    );
                  })}
                </div>
                <button className="secondary-action compact-full" type="button" onClick={() => applyCategoryPack(selectedCategoryPack.id)}>
                  <IconText icon="layers">팩 다시 적용</IconText>
                </button>
              </details>
              <p className="hint">
                <IconText icon="info">화면별 세부 편집은 오른쪽에서.</IconText>
              </p>
        </section>

        <section className="panel-section">
              <details className="advanced-panel background-panel">
                <summary>
                  <span>
                    <Icon name="palette" />
                    스크린샷 배경
                  </span>
                  <strong>{theme.label} · {bgMode === "tonal" ? "톤 분할" : "단색"}</strong>
                </summary>
                <div className="background-panel-body">
                  <div className="segmented" role="group" aria-label="스크린샷 배경 방식">
                    {(["tonal", "solid"] as BackgroundMode[]).map((mode) => (
                      <button
                        key={mode}
                        className={`segment ${bgMode === mode ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setBgMode(mode)}
                      >
                        <IconText icon={mode === "tonal" ? "palette" : "brush"}>
                          {mode === "tonal" ? "톤 분할" : "단색"}
                        </IconText>
                      </button>
                    ))}
                  </div>
                  <div className="swatches" aria-label="스크린샷 컬러 테마">
                    {SCREENSHOT_THEMES.map((screenshotTheme) => (
                      <button
                        key={screenshotTheme.id}
                        type="button"
                        className={`swatch ${screenshotTheme.id === themeId ? "is-active" : ""}`}
                        style={{ "--a": screenshotTheme.a, "--b": screenshotTheme.b } as CSSVars}
                        title={screenshotTheme.label}
                        aria-label={screenshotTheme.label}
                        onClick={() => applyScreenshotTheme(screenshotTheme.id)}
                      />
                    ))}
                  </div>
                  <details className="subtle-disclosure">
                    <summary>
                      <span>
                        <Icon name="sliders" />
                        고급 배경
                      </span>
                      <strong>{backgroundSummary}</strong>
                    </summary>
                    {bgMode === "tonal" ? (
                      <div className="gradient-editor">
                        <label className="field">
                          <span>
                            <IconText icon="palette" className="pl-1">그라데이션 종류</IconText>
                          </span>
                          <select value={gradientType} onChange={(event) => setGradientType(event.target.value as GradientType)}>
                            <option value="linear">선형</option>
                            <option value="radial">방사형</option>
                          </select>
                        </label>
                        {gradientType === "linear" ? (
                          <label className="field">
                            <span>
                              <IconText icon="rotate" className="pl-1">각도</IconText>
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={359}
                              value={gradientAngle}
                              onChange={(event) => setGradientAngle(Number(event.target.value))}
                            />
                          </label>
                        ) : null}
                        <div className="gradient-heading">
                          <span>
                            <IconText icon="palette" className="pl-1">컬러 스탑</IconText>
                          </span>
                          <button
                            className="text-action"
                            type="button"
                            onClick={addGradientStop}
                            disabled={gradientStops.length >= MAX_GRADIENT_STOPS}
                          >
                            <IconText icon="layers">스탑 추가</IconText>
                          </button>
                        </div>
                        <div className="gradient-stop-list">
                          {normalizeGradientStops(gradientStops).map((stop) => (
                            <div className="gradient-stop-row" key={stop.id}>
                              <input
                                aria-label={`${stop.position}% 컬러`}
                                type="color"
                                value={stop.color}
                                onChange={(event) => updateGradientStopColor(stop.id, event.target.value)}
                              />
                              <input
                                aria-label={`${stop.color} 위치`}
                                type="range"
                                min={0}
                                max={100}
                                value={stop.position}
                                onChange={(event) => updateGradientStop(stop.id, { position: Number(event.target.value) })}
                              />
                              <input
                                aria-label={`${stop.color} 위치 값`}
                                type="number"
                                min={0}
                                max={100}
                                value={stop.position}
                                onChange={(event) => updateGradientStop(stop.id, { position: Number(event.target.value) })}
                              />
                              <input
                                className="hex-input"
                                aria-label={`${stop.color} HEX 값`}
                                spellCheck={false}
                                value={gradientHexDrafts[stop.id] ?? stop.color}
                                onBlur={() => commitGradientStopHex(stop)}
                                onChange={(event) => updateGradientStopHex(stop.id, event.target.value)}
                              />
                              <button
                                className="text-action stop-remove"
                                type="button"
                                onClick={() => removeGradientStop(stop.id)}
                                disabled={gradientStops.length <= MIN_GRADIENT_STOPS}
                              >
                                <IconText icon="reset">삭제</IconText>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <label className="field color-field">
                        <span>
                          <IconText icon="brush" className="pl-1">단색 컬러</IconText>
                        </span>
                        <input
                          type="color"
                          value={getSolidGradientColor(gradientConfig)}
                          onChange={(event) => updateGradientStopColor(gradientConfig.stops[0].id, event.target.value)}
                        />
                        <input
                          className="hex-input"
                          aria-label="단색 HEX 값"
                          spellCheck={false}
                          value={gradientHexDrafts[gradientConfig.stops[0].id] ?? getSolidGradientColor(gradientConfig)}
                          onBlur={() => commitGradientStopHex(gradientConfig.stops[0])}
                          onChange={(event) => updateGradientStopHex(gradientConfig.stops[0].id, event.target.value)}
                        />
                      </label>
                    )}
                  </details>
                </div>
              </details>
              <p className="hint">
                <IconText icon="info">필요할 때만 조정.</IconText>
              </p>
        </section>
        <section className="skill-download" aria-label="앱 출시 준비 스킬 다운로드">
          <div>
            <span>
              <IconText icon="sparkles">Codex / Claude Skill</IconText>
            </span>
            <strong>app-prestore-checks</strong>
            <p>출시 전 점검 스킬.</p>
          </div>
          <a className="skill-download-link" href="/downloads/app-prestore-checks.skill" download>
            <IconText icon="download">스킬 다운로드</IconText>
          </a>
        </section>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">
              <IconText icon="board">릴리즈 보드</IconText>
            </p>
            <h2>
              {isIntakePhase
                ? "이미지를 추가하세요."
                : "10개 화면을 검수하고 내보냅니다."}
            </h2>
            <div className="status-strip" aria-label="작업 상태">
              {topbarStatusItems.map((item, index) => (
                <span
                  key={`${index}-${item.label}`}
                  className={index === 0 ? (releaseReady ? "is-ready" : "needs-work") : undefined}
                >
                  <IconText icon={item.icon}>{item.label}</IconText>
                </span>
              ))}
            </div>
            {!isIntakePhase ? (
              <div
                className="topbar-progress"
                role="progressbar"
                aria-label="릴리즈 준비율"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completionPercent}
              >
                <span>
                  <i style={{ "--progress": `${completionPercent}%` } as CSSVars} />
                </span>
                <strong>{completionPercent}% 준비</strong>
              </div>
            ) : null}
            <p className="activity-line">
              <span>
                <IconText icon="info">안내</IconText>
              </span>
              {status}
            </p>
          </div>
          <div className="topbar-actions">
            <div className="action-cluster">
              <label className="secondary-action bulk-upload-button topbar-upload" htmlFor="bulk-input">
                <IconText icon="upload">이미지 일괄 추가</IconText>
              </label>
              <input
                id="bulk-input"
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg"
                multiple
                onChange={(event) => handleBulkInput(event, assignFiles)}
              />
            </div>
            <details className="topbar-more">
              <summary>
                <IconText icon="sliders">작업</IconText>
              </summary>
              <div className="topbar-more-menu" aria-label="보조 작업">
                <button className="secondary-action" type="button" title="Command+Z" onClick={() => applyHistoryStep("undo")}>
                  <IconText icon="undo">되돌리기</IconText>
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  title="Command+Shift+Z"
                  onClick={() => applyHistoryStep("redo")}
                >
                  <IconText icon="reset">다시 실행</IconText>
                </button>
                <button className="secondary-action" type="button" onClick={resetCopy}>
                  <IconText icon="reset">기본값 복원</IconText>
                </button>
              </div>
            </details>
            {!isIntakePhase ? (
              <div className="export-controls">
                <label className="topbar-format">
                  <span>
                    <IconText icon="file" className="pl-1">이미지 형식</IconText>
                  </span>
                  <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </select>
                </label>
                {exportFormat === "jpg" ? (
                  <label className="topbar-quality">
                    <span>
                      <IconText icon="percent" className="pl-1">JPG {Math.round(jpgQuality * 100)}%</IconText>
                    </span>
                    <input
                      type="range"
                      min={72}
                      max={100}
                      value={Math.round(jpgQuality * 100)}
                      onChange={(event) => setJpgQuality(Number(event.target.value) / 100)}
                    />
                  </label>
                ) : null}
                <div className="export-action-group">
                  <button
                    className={`primary-action ${releaseReady ? "" : "is-blocked"}`}
                    type="button"
                    aria-label={
                      releaseReady
                        ? "ZIP 내보내기"
                        : `검수 후 내보내기: ${releaseStatusLabel}`
                    }
                    title={
                      releaseReady
                        ? "ZIP 생성"
                        : `${releaseStatusLabel} · 첫 항목 이동`
                    }
                    onClick={exportZip}
                  >
                    <IconText icon="zip">{releaseReady ? "ZIP 내보내기" : "검수 후 내보내기"}</IconText>
                  </button>
                  {!releaseReady ? <span>{releaseStatusLabel}</span> : null}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <section
          className={`stage-wrap ${isStageDragging ? "is-stage-dragging" : ""} ${isIntakePhase ? "is-intake" : ""}`}
          aria-label="스크린샷 미리보기"
          onDragEnter={handleStageDragEnter}
          onDragOver={handleStageDragOver}
          onDragLeave={handleStageDragLeave}
          onDrop={handleStageDrop}
        >
          {!isIntakePhase ? (
            <div className="stage-workbar" aria-label="릴리즈 보드 상태">
              <div className="stage-workbar-title">
                <span>
                  <IconText icon="board">릴리즈 보드</IconText>
                </span>
                <strong>
                  {String(selected + 1).padStart(2, "0")}번 · {selectedTemplate.label}
                </strong>
              </div>
              <div className="stage-workbar-status">
                <span className={`shot-state ${selectedBoardState}`}>{selectedStateLabel}</span>
                <strong>{selectedIssueText}</strong>
              </div>
              <div className="stage-target-preview" aria-label="현재 보드 미리보기 규격">
                <span>
                  <IconText icon="target">미리보기</IconText>
                </span>
                <strong>{previewTargetSummary}</strong>
              </div>
              <div className="stage-workbar-actions" aria-label="보드 이동">
                <button type="button" onClick={() => moveSelectedSlot(-1)}>
                  <IconText icon="arrowLeft">이전</IconText>
                </button>
                <button
                  type="button"
                  disabled={!boardIssueTarget}
                  onClick={() => {
                    if (boardIssueTarget) {
                      jumpToIssue(boardIssueTarget);
                    }
                  }}
                >
                  <IconText icon="target">{selectedIssue ? "현재 점검" : "다음 점검"}</IconText>
                </button>
                <button type="button" onClick={() => moveSelectedSlot(1)}>
                  <IconText icon="arrowRight">다음</IconText>
                </button>
              </div>
              <div className="stage-screen-map" aria-label="전체 화면 준비 상태">
                <span>
                  <IconText icon="queue">화면 상태</IconText>
                </span>
                <div>
                  {slotReadiness.map((readiness, index) => {
                    const pageState = readiness.isReady ? "준비" : readiness.hasImage ? "점검" : "대기";
                    const pageStateClass = readiness.isReady ? "is-ready" : readiness.hasImage ? "needs-review" : "is-empty";

                    return (
                      <button
                        key={index}
                        type="button"
                        className={`${pageStateClass} ${index === selected ? "is-current" : ""}`}
                        aria-current={index === selected ? "page" : undefined}
                        aria-label={`${String(index + 1).padStart(2, "0")}번 ${pageState}`}
                        onClick={() => selectSlot(index)}
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <small>{pageState}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          {!uploadedCount ? (
            <div className="stage-intake" aria-label="시작 안내">
              <strong>
                <IconText icon="image">이미지 10장 드롭</IconText>
              </strong>
              <span>PNG/JPG를 순서대로 채웁니다.</span>
            </div>
          ) : null}
          <div
            className={`stage platform-${platformKey} device-${previewDeviceProfile.frameClass} copy-${previewDeviceProfile.copyLayout}`}
            style={stageStyle}
          >
            {slots.map((slot, index) => {
              const template = getTemplateById(slot.templateId);
              const readiness = slotReadiness[index];
              const cardState = readiness.isReady ? "is-ready" : readiness.hasImage ? "needs-review" : "is-empty";
              const showBadge = slot.showBadge && Boolean(slot.badge.trim());
              const showTitle = slot.showTitle && Boolean(slot.title.trim());
              const showSubtitle = slot.showSubtitle && Boolean(slot.subtitle.trim());
              const hasCopy = showBadge || showTitle || showSubtitle;

              return (
                <article
                  className={`shot-card layout-${template.family} ${cardState} ${index === selected ? "is-selected" : ""}`}
                  key={index}
                  ref={(element) => {
                    slotCardRefs.current[index] = element;
                  }}
                >
                  <div className="shot-toolbar">
                    <button
                      className="slot-button"
                      type="button"
                      onClick={() => {
                        selectSlot(index);
                        setIsTemplateModalOpen(true);
                      }}
                    >
                      <IconText icon="image">{String(index + 1).padStart(2, "0")}번 · {template.label}</IconText>
                    </button>
                  </div>
                  <div
                    className={`shot-preview ${draggingSlot === index ? "is-dragging" : ""}`}
                    tabIndex={0}
                    onClick={() => selectSlot(index)}
                    onFocus={() => selectSlot(index)}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsStageDragging(false);
                      setDraggingSlot(index);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "copy";
                      setIsStageDragging(false);
                      setDraggingSlot(index);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraggingSlot(null);
                      setIsStageDragging(false);
                      void assignFiles(index, Array.from(event.dataTransfer.files));
                    }}
                  >
                    {platform.renderMode === "raw-interface" ? (
                      <div className="raw-interface-frame">
                        {slot.imageDataUrl ? (
                          // User-selected data URLs are local previews, so Next image optimization is not useful here.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={`${index + 1}번 업로드 이미지`} src={slot.imageDataUrl} />
                        ) : (
                          <div className="empty-screen">이미지를 놓으세요</div>
                        )}
                      </div>
                    ) : (
                      <>
                        {!isIntakePhase ? (
                          <div
                            className="preview-visibility-toggles"
                            aria-label={`${index + 1}번 텍스트 표시`}
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <label>
                              <span><IconText icon="badge" className="pl-1">뱃지</IconText></span>
                              <input
                                type="checkbox"
                                checked={slot.showBadge}
                                onChange={(event) => updateSlot(index, { showBadge: event.target.checked })}
                              />
                            </label>
                            <label>
                              <span><IconText icon="title" className="pl-1">제목</IconText></span>
                              <input
                                type="checkbox"
                                checked={slot.showTitle}
                                onChange={(event) => updateSlot(index, { showTitle: event.target.checked })}
                              />
                            </label>
                            <label>
                              <span><IconText icon="text" className="pl-1">설명</IconText></span>
                              <input
                                type="checkbox"
                                checked={slot.showSubtitle}
                                onChange={(event) => updateSlot(index, { showSubtitle: event.target.checked })}
                              />
                            </label>
                          </div>
                        ) : null}
                        {hasCopy ? (
                          <div className="copy-block">
                            {showBadge ? <span className="template-badge">{slot.badge}</span> : null}
                            {showTitle ? <h3>{slot.title}</h3> : null}
                            {showSubtitle ? <p className="copy-subtitle">{slot.subtitle}</p> : null}
                          </div>
                        ) : null}
                        <div
                          className={`device-frame ${previewDeviceProfile.frameClass} platform-${platformKey} ${index === selected ? "is-transform-selected" : ""}`}
                          style={createDeviceTransformStyle(slot.deviceTransform)}
                          onPointerDown={(event) => startDeviceGesture(event, index, "move")}
                          onPointerMove={updateDeviceGesture}
                          onPointerUp={endDeviceGesture}
                          onPointerCancel={endDeviceGesture}
                          >
                          <div className="device-screen">
                            {slot.imageDataUrl ? (
                              // User-selected data URLs are local previews, so Next image optimization is not useful here.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img alt={`${index + 1}번 업로드 이미지`} src={slot.imageDataUrl} />
                            ) : (
                              <div className="empty-screen">이미지를 놓으세요</div>
                            )}
                          </div>
                          {previewDeviceProfile.supportsCutout && shouldRenderDeviceCutout(hideDeviceCutout) ? <div className="device-camera" /> : null}
                          {index === selected ? (
                            <div className="device-transform-handles" aria-label="목업 직접 조정">
                              <button
                                className="device-transform-handle rotate"
                                type="button"
                                aria-label="목업 회전"
                                onPointerDown={(event) => startDeviceGesture(event, index, "rotate")}
                              />
                              <button
                                className="device-transform-handle scale"
                                type="button"
                                aria-label="목업 크기 조절"
                                onPointerDown={(event) => startDeviceGesture(event, index, "scale")}
                              />
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}
                    <div className="drop-indicator">여기에 이미지 놓기</div>
                  </div>
                  <div className="shot-footer">
                    <span className={`shot-state ${cardState}`}>
                      {index === selected ? "편집 중" : readiness.isReady ? "준비" : readiness.hasImage ? "점검" : "대기"}
                    </span>
                    <span className="file-name">{getSlotIssueSummary(readiness, slot.imageName)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <aside className="inspector" aria-label="선택 화면 인스펙터">
        {isIntakePhase ? (
          <>
            <div className="inspector-sticky intake-sticky">
              <div className="inspector-header">
                <div>
                  <p className="eyebrow">
                    <IconText icon="image">지금 작업</IconText>
                  </p>
                  <h2>이미지 추가</h2>
                </div>
                <span className="inspector-badge">{uploadedCount}/{TOTAL_SLOTS}</span>
              </div>
              <p className="intake-guidance">
                <IconText icon="info">업로드 전 기본 설정만 표시.</IconText>
              </p>
            </div>

            <section className="workflow-panel intake-workflow" aria-label="이미지 추가">
              <div className="workflow-head">
                <div>
                  <p className="eyebrow">
                    <IconText icon="upload">첫 단계</IconText>
                  </p>
                  <strong>
                    <IconText icon="image">PNG/JPG 추가</IconText>
                  </strong>
                </div>
                <span>{missingImageCount}개 필요</span>
              </div>
              <div className="intake-step-list" aria-label="진행 순서">
                <div className="intake-step is-current">
                  <span><Icon name="upload" /></span>
                  <strong>이미지 추가</strong>
                </div>
                <div className="intake-step">
                  <span><Icon name="text" /></span>
                  <strong>카피/레이아웃 검수</strong>
                </div>
                <div className="intake-step">
                  <span><Icon name="zip" /></span>
                  <strong>ZIP 내보내기</strong>
                </div>
              </div>
              <label className="workflow-next" htmlFor="selected-slot-input">
                <IconText icon="upload">선택 위치부터 추가</IconText>
              </label>
              <input
                id="selected-slot-input"
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg"
                multiple
                onChange={handleSelectedImageInput}
              />
            </section>

            <details className="inspector-disclosure">
              <summary>
                <IconText icon="queue">다음 작업</IconText>
              </summary>
              <div className="disclosure-list">
                <span><IconText icon="text">문구 편집</IconText></span>
                <span><IconText icon="layout">목업 조정</IconText></span>
                <span><IconText icon="zip">ZIP 생성</IconText></span>
                <span><IconText icon="json">JSON 반영</IconText></span>
              </div>
            </details>
          </>
        ) : (
          <>
        <div className="inspector-sticky">
          <div className="inspector-header">
            <div>
              <p className="eyebrow">
                <IconText icon="target">선택 화면</IconText>
              </p>
              <h2>{String(selected + 1).padStart(2, "0")}번 페이지</h2>
            </div>
            <span className="inspector-badge">{selectedTemplate.label}</span>
          </div>

          <nav className="page-navigator" aria-label="화면 빠른 이동">
            {slots.map((_, index) => {
              const readiness = slotReadiness[index];
              const pageState = readiness.isReady ? "준비" : readiness.hasImage ? "점검" : "대기";

              return (
                <button
                  key={index}
                  type="button"
                  className={`page-nav-item ${index === selected ? "is-active" : ""} ${readiness.isReady ? "is-ready" : readiness.hasImage ? "needs-review" : "is-empty"}`}
                  aria-current={index === selected ? "page" : undefined}
                  onClick={() => selectSlot(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <small>{pageState}</small>
                </button>
              );
            })}
          </nav>
          <div className="inspector-tabs" role="tablist" aria-label="인스펙터 작업 모드">
            {INSPECTOR_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={inspectorMode === mode.id}
                className={inspectorMode === mode.id ? "is-active" : ""}
                onClick={() => setInspectorMode(mode.id)}
              >
                <span>
                  <IconText icon={mode.id === "copy" ? "text" : mode.id === "layout" ? "layout" : mode.id === "export" ? "shield" : "ai"}>
                    {mode.label}
                  </IconText>
                </span>
                <small>{mode.description}</small>
              </button>
            ))}
          </div>
          <p className="shortcut-hint">
            <IconText icon="keyboard">←/→ 이동 · Home/End</IconText>
          </p>
        </div>

        <section className="workflow-panel" aria-label="작업 큐">
          <div className="workflow-head">
            <div>
              <p className="eyebrow">
                <IconText icon="queue">작업 큐</IconText>
              </p>
              <strong>{readySlotCount}/{TOTAL_SLOTS} 화면 준비</strong>
            </div>
            <span>{completionPercent}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="전체 준비율"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionPercent}
          >
            <span style={{ "--progress": `${completionPercent}%` } as CSSVars} />
          </div>
          <div className="workflow-checklist">
            <div className={selectedReadiness.hasImage ? "workflow-check is-ok" : "workflow-check needs-work"}>
              <span><IconText icon="image">현재 이미지</IconText></span>
              <strong>{selectedReadiness.hasImage ? selectedSlot.imageName || "입력됨" : "필요"}</strong>
            </div>
            <div className={selectedReadiness.copyIssues.length ? "workflow-check needs-work" : "workflow-check is-ok"}>
              <span><IconText icon="text">현재 카피</IconText></span>
              <strong>
                {selectedReadiness.copyIssues.length ? `${selectedReadiness.copyIssues.join(", ")} 입력 필요` : "정상"}
              </strong>
            </div>
            <div className="workflow-check">
              <span><IconText icon="layers">숨긴 레이어</IconText></span>
              <strong>{selectedReadiness.hiddenLayers ? `${selectedReadiness.hiddenLayers}개` : "없음"}</strong>
            </div>
          </div>
          {visibleIssues.length ? (
            <div className="issue-queue" aria-label="다음 점검 화면">
              <span><IconText icon="target">다음 점검</IconText></span>
              <div>
                {visibleIssues.map((issue) => (
                  <button
                    key={issue.index}
                    type="button"
                    className={issue.index === selected ? "is-current" : ""}
                    aria-current={issue.index === selected ? "true" : undefined}
                    onClick={() => jumpToIssue(issue)}
                  >
                    {String(issue.index + 1).padStart(2, "0")} · {issue.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="workflow-actions">
            {selectedNeedsImage ? (
              <>
                <label className="workflow-next" htmlFor="selected-slot-input">
                  <IconText icon="upload">선택 화면 추가</IconText>
                </label>
                <input
                  id="selected-slot-input"
                  className="visually-hidden"
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={handleSelectedImageInput}
                />
              </>
            ) : (
              <button
                className="workflow-next"
                type="button"
                disabled={!selectedNeedsCopy && nextIssueIndex < 0}
                onClick={() => {
                  if (selectedNeedsCopy) {
                    setInspectorMode("copy");
                    return;
                  }
                  if (nextIssueIndex >= 0) {
                    selectSlot(nextIssueIndex);
                  }
                }}
              >
                <IconText icon={selectedNeedsCopy ? "text" : nextIssueIndex < 0 ? "check" : "target"}>
                  {selectedNeedsCopy
                    ? "카피 입력"
                    : nextIssueIndex < 0
                      ? "준비 완료"
                      : `${String(nextIssueIndex + 1).padStart(2, "0")}번 점검`}
                </IconText>
              </button>
            )}
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "copy"}>
          <div className="section-row">
            <div>
              <div className="section-label">
                <IconText icon="text">카피 편집</IconText>
              </div>
              <p className="hint">
                <IconText icon="info">문구와 표시 상태.</IconText>
              </p>
            </div>
          </div>
          <label className="field">
            <span className="field-label-row">
              <span><IconText icon="badge" className="pl-1">뱃지</IconText></span>
              <small className={selectedSlot.badge.length >= BADGE_MAX_LENGTH ? "is-full" : ""}>
                {selectedSlot.badge.length}/{BADGE_MAX_LENGTH}
              </small>
            </span>
            <input
              maxLength={BADGE_MAX_LENGTH}
              value={selectedSlot.badge}
              onChange={(event) => updateSelectedSlot({ badge: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label-row">
              <span><IconText icon="title" className="pl-1">제목</IconText></span>
              <small className={selectedSlot.title.length >= TITLE_MAX_LENGTH ? "is-full" : ""}>
                {selectedSlot.title.length}/{TITLE_MAX_LENGTH}
              </small>
            </span>
            <textarea
              rows={3}
              maxLength={TITLE_MAX_LENGTH}
              value={selectedSlot.title}
              onChange={(event) => updateSelectedSlot({ title: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label-row">
              <span><IconText icon="text" className="pl-1">설명</IconText></span>
              <small className={selectedSlot.subtitle.length >= SUBTITLE_MAX_LENGTH ? "is-full" : ""}>
                {selectedSlot.subtitle.length}/{SUBTITLE_MAX_LENGTH}
              </small>
            </span>
            <textarea
              rows={2}
              maxLength={SUBTITLE_MAX_LENGTH}
              value={selectedSlot.subtitle}
              onChange={(event) => updateSelectedSlot({ subtitle: event.target.value })}
            />
          </label>
          <div className="visibility-toggle-panel" aria-label="선택한 화면 텍스트 표시">
            <label className="toggle-row compact">
              <span><IconText icon="badge" className="pl-1">뱃지</IconText></span>
              <input
                type="checkbox"
                checked={selectedSlot.showBadge}
                onChange={(event) => updateSelectedSlot({ showBadge: event.target.checked })}
              />
            </label>
            <label className="toggle-row compact">
              <span><IconText icon="title" className="pl-1">제목</IconText></span>
              <input
                type="checkbox"
                checked={selectedSlot.showTitle}
                onChange={(event) => updateSelectedSlot({ showTitle: event.target.checked })}
              />
            </label>
            <label className="toggle-row compact">
              <span><IconText icon="text" className="pl-1">설명</IconText></span>
              <input
                type="checkbox"
                checked={selectedSlot.showSubtitle}
                onChange={(event) => updateSelectedSlot({ showSubtitle: event.target.checked })}
              />
            </label>
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "copy"}>
          <div className="section-row">
            <div>
              <div className="section-label">
                <IconText icon="eye">전체 표시</IconText>
              </div>
              <p className="hint">
                <IconText icon="info">텍스트 레이어 일괄 제어.</IconText>
              </p>
            </div>
          </div>
          <div className="global-hide-controls" aria-label="전체 텍스트 숨김">
            <label>
              <span><IconText icon="badge" className="pl-1">뱃지 끄기</IconText></span>
              <input
                type="checkbox"
                checked={isEveryTextHidden("showBadge")}
                onChange={(event) => setAllTextVisibility("showBadge", !event.target.checked)}
              />
            </label>
            <label>
              <span><IconText icon="title" className="pl-1">제목 끄기</IconText></span>
              <input
                type="checkbox"
                checked={isEveryTextHidden("showTitle")}
                onChange={(event) => setAllTextVisibility("showTitle", !event.target.checked)}
              />
            </label>
            <label>
              <span><IconText icon="text" className="pl-1">설명 끄기</IconText></span>
              <input
                type="checkbox"
                checked={isEveryTextHidden("showSubtitle")}
                onChange={(event) => setAllTextVisibility("showSubtitle", !event.target.checked)}
              />
            </label>
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "export"}>
          <div className="section-row">
            <div>
              <div className="section-label">
                <IconText icon="shield">내보내기 검수</IconText>
              </div>
              <p className="hint">
                <IconText icon="info">누락과 산출물 확인.</IconText>
              </p>
            </div>
          </div>
          <div className="quality-gate" aria-label="출시 게이트">
            <div className={`quality-gate-card ${missingImageCount ? "is-blocked" : "is-ok"}`}>
              <div>
                <span><IconText icon="image">이미지</IconText></span>
                <strong>{missingImageCount ? `${missingImageCount}개 화면 필요` : "10개 모두 입력"}</strong>
              </div>
              {firstMissingImageIssue ? (
                <button type="button" onClick={() => jumpToIssue(firstMissingImageIssue)}>
                  <IconText icon="arrowRight">{String(firstMissingImageIssue.index + 1).padStart(2, "0")}번 이동</IconText>
                </button>
              ) : (
                <small><IconText icon="check">정상</IconText></small>
              )}
            </div>
            <div className={`quality-gate-card ${copyIssueCount ? "is-blocked" : "is-ok"}`}>
              <div>
                <span><IconText icon="text">카피</IconText></span>
                <strong>{copyIssueCount ? `${copyIssueSlotCount}개 화면 · ${copyIssueCount}개 항목` : "카피 정상"}</strong>
              </div>
              {firstCopyIssue ? (
                <button type="button" onClick={() => jumpToIssue(firstCopyIssue)}>
                  <IconText icon="arrowRight">{String(firstCopyIssue.index + 1).padStart(2, "0")}번 카피</IconText>
                </button>
              ) : (
                <small><IconText icon="check">정상</IconText></small>
              )}
            </div>
            <div className={`quality-gate-card ${hiddenCopyCount ? "is-warning" : "is-ok"}`}>
              <div>
                <span><IconText icon="eye">텍스트 숨김</IconText></span>
                <strong>{hiddenCopyCount ? `${hiddenCopyCount}개 화면 숨김` : "숨김 없음"}</strong>
              </div>
              {firstHiddenLayerIndex >= 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    selectSlot(firstHiddenLayerIndex);
                    setInspectorMode("copy");
                  }}
                >
                  <IconText icon="eye">표시 설정</IconText>
                </button>
              ) : (
                <small><IconText icon="check">정상</IconText></small>
              )}
            </div>
            <div className="quality-gate-card is-ok">
              <div>
                <span><IconText icon="zip">ZIP 산출물</IconText></span>
                <strong>
                  {exportFileCount}개 {exportFormat.toUpperCase()}
                </strong>
              </div>
              <small><IconText icon="target">{selectedTargetSummary}</IconText></small>
            </div>
          </div>
          <div className="readiness-panel" aria-label="내보내기 파일 구성">
            <div className="readiness-row">
              <span><IconText icon="store">대상 스토어</IconText></span>
              <strong>{selectedStoreSummary}</strong>
            </div>
            <div className="readiness-row">
              <span><IconText icon="image">현재 미리보기</IconText></span>
              <strong>
                {platform.width} x {platform.height}
              </strong>
            </div>
            <div className="readiness-row">
              <span><IconText icon="file">파일 구성</IconText></span>
              <strong>
                {exportFileCount}개 {exportFormat.toUpperCase()}
                {exportFormat === "jpg" ? ` · ${Math.round(jpgQuality * 100)}%` : ""}
              </strong>
            </div>
            <div className="readiness-row">
              <span><IconText icon="target">선택 규격</IconText></span>
              <strong>{selectedTargetSpecs.map((targetSpec) => targetSpec.label).join(" · ")}</strong>
            </div>
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "layout"}>
          <div className="section-row">
            <div>
              <div className="section-label">
                <IconText icon="layout">템플릿과 목업</IconText>
              </div>
              <p className="hint">
                <IconText icon="info">배치와 목업 위치.</IconText>
              </p>
            </div>
            <button className="text-action" type="button" onClick={resetSelectedDeviceTransform}>
              <IconText icon="reset">초기화</IconText>
            </button>
          </div>
          <div className="template-open-field">
            <span>
              <IconText icon="layout" className="pl-1">템플릿</IconText>
            </span>
            <button className="template-open-button" type="button" onClick={() => setIsTemplateModalOpen(true)}>
              <span className={`template-mini mini-${selectedTemplate.family}`} aria-hidden="true">
                <span />
                <i />
              </span>
              <span>
                <strong>{selectedTemplate.label}</strong>
                <small>{selectedTemplate.description}</small>
              </span>
              <em>선택</em>
            </button>
          </div>
          <p className="inspector-note">
            <IconText icon="keyboard">Shift 드래그: 축 고정.</IconText>
          </p>
          <label className="field">
            <span>
              <IconText icon="move" className="pl-1">가로 {selectedSlot.deviceTransform.x}%</IconText>
            </span>
            <input
              type="range"
              min={-50}
              max={50}
              value={selectedSlot.deviceTransform.x}
              onChange={(event) => updateSelectedDeviceTransform({ x: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>
              <IconText icon="move" className="pl-1">세로 {selectedSlot.deviceTransform.y}%</IconText>
            </span>
            <input
              type="range"
              min={-50}
              max={50}
              value={selectedSlot.deviceTransform.y}
              onChange={(event) => updateSelectedDeviceTransform({ y: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>
              <IconText icon="scale" className="pl-1">스케일 {selectedSlot.deviceTransform.scale.toFixed(2)}x</IconText>
            </span>
            <input
              type="range"
              min={0.55}
              max={1.6}
              step={0.01}
              value={selectedSlot.deviceTransform.scale}
              onChange={(event) => updateSelectedDeviceTransform({ scale: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>
              <IconText icon="rotate" className="pl-1">회전 {selectedSlot.deviceTransform.rotate}도</IconText>
            </span>
            <input
              type="range"
              min={-45}
              max={45}
              value={selectedSlot.deviceTransform.rotate}
              onChange={(event) => updateSelectedDeviceTransform({ rotate: Number(event.target.value) })}
            />
          </label>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "ai"}>
          <div className="section-row">
            <div>
              <div className="section-label">
                <IconText icon="ai">프롬프트와 JSON</IconText>
              </div>
              <p className="hint">
                <IconText icon="info">JSON 붙여넣기 후 적용.</IconText>
              </p>
            </div>
          </div>
          <div className="prompt-workflow" aria-label="AI 카피 작업 순서">
            <span><IconText icon="copy">복사</IconText></span>
            <span><IconText icon="ai">생성</IconText></span>
            <span><IconText icon="check">적용</IconText></span>
          </div>
          <div className="prompt-actions">
            <button className="secondary-action prompt-action" type="button" onClick={copySelectedPrompt}>
              <IconText icon="copy">선택 프롬프트</IconText>
            </button>
            <button className="secondary-action prompt-action" type="button" onClick={copyAllPrompts}>
              <IconText icon="copy">전체 프롬프트</IconText>
            </button>
          </div>
          <details className="json-schema-note">
            <summary>
              <IconText icon="json">JSON 예시</IconText>
            </summary>
            <pre>{`{
  "badge": "예약",
  "title": "가까운 매장을 바로 확인",
  "subtitle": "빈자리와 예약 가능 여부를 한눈에 보세요.",
  "showBadge": true,
  "showTitle": true,
  "showSubtitle": true
}`}</pre>
          </details>
          <label className="field">
            <span>
              <IconText icon="json" className="pl-1">프롬프트 JSON</IconText>
            </span>
            <textarea
              className="json-paste-area"
              rows={5}
              spellCheck={false}
              value={promptJsonInput}
              placeholder='{"title":"제목","subtitle":"설명"}'
              onPaste={handlePromptJsonPaste}
              onChange={(event) => setPromptJsonInput(event.target.value)}
            />
          </label>
          <div className="json-status">
            <span><IconText icon="info">입력 상태</IconText></span>
            <strong>{promptJsonInput.trim() ? "JSON 대기 중" : "붙여넣기 필요"}</strong>
          </div>
          <button className="secondary-action prompt-action" type="button" onClick={() => applyPromptJsonText(promptJsonInput)}>
            <IconText icon="check">JSON 적용</IconText>
          </button>
        </section>
          </>
        )}
      </aside>

      {isTemplateModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsTemplateModalOpen(false)}>
          <section
            className="template-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="template-modal-header">
              <div>
                <span>
                  <IconText icon="layout">템플릿 선택</IconText>
                </span>
                <h2 id="template-modal-title">
                  {String(selected + 1).padStart(2, "0")}번 화면 배치
                </h2>
                <p>{previewTargetSpec.label} 기준으로 카피와 목업 위치를 미리 확인합니다.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsTemplateModalOpen(false)}>
                닫기
              </button>
            </header>
            <div className="template-modal-grid">
              {templatePreviewOptions.map((option) => {
                const showBadge = selectedSlot.showBadge && Boolean(selectedSlot.badge.trim());
                const showTitle = selectedSlot.showTitle && Boolean(selectedSlot.title.trim());
                const showSubtitle = selectedSlot.showSubtitle && Boolean(selectedSlot.subtitle.trim());

                return (
                  <button
                    key={option.id}
                    className={`template-choice-card layout-${option.family} copy-${previewDeviceProfile.copyLayout} device-${previewDeviceProfile.frameClass} ${option.isSelected ? "is-selected" : ""}`}
                    type="button"
                    aria-pressed={option.isSelected}
                    onClick={() => chooseSelectedSlotTemplate(option.id)}
                  >
                    <span className="template-choice-heading">
                      <span className={option.miniClassName} aria-hidden="true">
                        <span />
                        <i />
                      </span>
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </span>
                    <span className="template-choice-preview" style={stageStyle} aria-hidden="true">
                      <span className="copy-block">
                        {showBadge ? <span className="template-badge">{selectedSlot.badge}</span> : null}
                        {showTitle ? <strong>{selectedSlot.title}</strong> : null}
                        {showSubtitle ? <span className="copy-subtitle">{selectedSlot.subtitle}</span> : null}
                      </span>
                      <span className={`device-frame ${previewDeviceProfile.frameClass} platform-${platformKey}`}>
                        <span className="device-screen">
                          {selectedSlot.imageDataUrl ? (
                            // User-selected data URLs are local previews, so Next image optimization is not useful here.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" src={selectedSlot.imageDataUrl} />
                          ) : (
                            <span className="empty-screen">선택 화면</span>
                          )}
                        </span>
                        {previewDeviceProfile.supportsCutout && shouldRenderDeviceCutout(hideDeviceCutout) ? <span className="device-camera" /> : null}
                      </span>
                    </span>
                    <span className="template-choice-footer">
                      <span>{option.badge}</span>
                      <strong>{option.isSelected ? "현재 사용 중" : "이 배치 선택"}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

function handleBulkInput(
  event: ChangeEvent<HTMLInputElement>,
  assignFiles: (startIndex: number, files: File[]) => Promise<void>,
) {
  if (event.target.files?.length) {
    void assignFiles(0, Array.from(event.target.files));
  }
  event.target.value = "";
}

function readStoredDraft(): PersistedDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeStoredDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function parseDraftSnapshot(snapshot: string): PersistedDraft | null {
  try {
    return normalizeStoredDraft(JSON.parse(snapshot));
  } catch {
    return null;
  }
}

function writeStoredDraft(draft: PersistedDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...draft,
          slots: draft.slots.map((slot) => ({ ...slot, imageDataUrl: "" })),
        }),
      );
    } catch {
      // localStorage can be unavailable or quota-limited; the editor remains fully usable.
    }
  }
}

function normalizeStoredDraft(value: unknown): PersistedDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const platformKey = value.platformKey === "android" ? "android" : "ios";
  const selectedTargetIds = normalizeStoredTargetIds(platformKey, value.selectedTargetIds);

  return {
    version: 3,
    platformKey,
    selectedTargetIds,
    previewTargetId: normalizeStoredPreviewTargetId(platformKey, selectedTargetIds, value.previewTargetId),
    bgMode: value.bgMode === "solid" ? "solid" : "tonal",
    themeId: normalizeThemeId(value.themeId),
    gradientType: value.gradientType === "radial" ? "radial" : "linear",
    gradientAngle: typeof value.gradientAngle === "number" ? value.gradientAngle : 135,
    gradientStops: normalizeStoredGradientStops(value.gradientStops),
    gradientHexDrafts: isStringRecord(value.gradientHexDrafts) ? value.gradientHexDrafts : {},
    hideDeviceCutout: value.hideDeviceCutout === true,
    exportFormat: value.exportFormat === "jpg" ? "jpg" : "png",
    jpgQuality: typeof value.jpgQuality === "number" ? Math.min(1, Math.max(0.72, value.jpgQuality)) : 0.92,
    selectedCategoryPackId: normalizeCategoryPackId(value.selectedCategoryPackId),
    selected: normalizeSelectedIndex(value.selected),
    slots: normalizeStoredSlots(value.slots),
  };
}

function normalizeStoredTargetIds(platformKey: PlatformKey, value: unknown): StoreTargetId[] {
  const selectedIds = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return getStoreTargetSpecs(platformKey, selectedIds).map((targetSpec) => targetSpec.id);
}

function normalizeStoredPreviewTargetId(
  platformKey: PlatformKey,
  selectedTargetIds: readonly StoreTargetId[],
  value: unknown,
): StoreTargetId {
  const targetSpecs = getStoreTargetSpecs(platformKey, selectedTargetIds);
  return typeof value === "string" && targetSpecs.some((targetSpec) => targetSpec.id === value)
    ? (value as StoreTargetId)
    : targetSpecs[0].id;
}

function normalizeStoredSlots(value: unknown) {
  const defaults = createInitialSlots();
  if (!Array.isArray(value)) {
    return defaults;
  }

  return defaults.map((base, index) => {
    const stored = value[index];
    if (!isRecord(stored)) {
      return base;
    }

    const templateId = normalizeTemplateId(stored.templateId);
    const template = getTemplateById(templateId);
    return {
      ...base,
      badge: typeof stored.badge === "string" ? stored.badge : template.badge,
      title: typeof stored.title === "string" ? stored.title : base.title,
      subtitle: typeof stored.subtitle === "string" ? stored.subtitle : base.subtitle,
      imageDataUrl: typeof stored.imageDataUrl === "string" ? stored.imageDataUrl : "",
      imageName: typeof stored.imageName === "string" ? stored.imageName : "",
      templateId,
      showBadge: stored.showBadge !== false,
      showTitle: stored.showTitle !== false,
      showSubtitle: stored.showSubtitle !== false,
      deviceTransform: normalizeDeviceTransform(isRecord(stored.deviceTransform) ? stored.deviceTransform : undefined),
    };
  });
}

function normalizeStoredGradientStops(value: unknown) {
  if (!Array.isArray(value)) {
    return createGradientStops("#22c55e", "#111827");
  }

  const stops = value
    .map((stop, index): GradientStop | null => {
      if (!isRecord(stop) || typeof stop.color !== "string") {
        return null;
      }
      const color = normalizeHexColor(stop.color);
      if (!color) {
        return null;
      }
      return {
        id: typeof stop.id === "string" ? stop.id : `stop-${index + 1}`,
        color,
        position: typeof stop.position === "number" ? stop.position : index === 0 ? 0 : 100,
      };
    })
    .filter((stop): stop is GradientStop => Boolean(stop));

  return stops.length >= MIN_GRADIENT_STOPS ? normalizeGradientStops(stops).slice(0, MAX_GRADIENT_STOPS) : createGradientStops("#22c55e", "#111827");
}

function normalizeThemeId(value: unknown): ThemeId {
  return typeof value === "string" && SCREENSHOT_THEMES.some((theme) => theme.id === value)
    ? (value as ThemeId)
    : "launch-green";
}

function normalizeTemplateId(value: unknown): TemplateId {
  return typeof value === "string" && SCREENSHOT_TEMPLATES.some((template) => template.id === value)
    ? (value as TemplateId)
    : DEFAULT_TEMPLATE_SEQUENCE[0];
}

function normalizeCategoryPackId(value: unknown) {
  return typeof value === "string" && SCREENSHOT_CATEGORY_PACKS.some((pack) => pack.id === value)
    ? value
    : DEFAULT_CATEGORY_PACK_ID;
}

function normalizeSelectedIndex(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(TOTAL_SLOTS - 1, Math.max(0, value)) : 0;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createPromptTextUpdate(input: {
  badge?: string;
  title: string;
  subtitle: string;
  showBadge?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
}): Partial<Slot> {
  return {
    ...(input.badge !== undefined ? { badge: input.badge } : {}),
    title: input.title,
    subtitle: input.subtitle,
    ...(input.showBadge !== undefined ? { showBadge: input.showBadge } : {}),
    ...(input.showTitle !== undefined ? { showTitle: input.showTitle } : {}),
    ...(input.showSubtitle !== undefined ? { showSubtitle: input.showSubtitle } : {}),
  };
}

function getVisibilityLabel(key: TextVisibilityKey) {
  if (key === "showBadge") {
    return "뱃지";
  }
  if (key === "showTitle") {
    return "제목";
  }
  return "설명";
}

function hasFileDrag(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

async function renderSlotToBlob({
  slot,
  platform,
  template,
  bgMode,
  theme,
  gradientConfig,
  hideDeviceCutout,
  exportFormat,
  jpgQuality,
}: {
  slot: Slot;
  platform: PlatformDef;
  template: ScreenshotTemplate;
  bgMode: BackgroundMode;
  theme: ScreenshotTheme;
  gradientConfig: GradientConfig;
  hideDeviceCutout: boolean;
  exportFormat: ExportFormat;
  jpgQuality: number;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = platform.width;
  canvas.height = platform.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is unavailable");
  }
  if (platform.renderMode === "raw-interface") {
    await drawRawInterface(ctx, canvas, slot.imageDataUrl);
  } else {
    drawBackground(ctx, canvas.width, canvas.height, bgMode, gradientConfig);
    await drawTemplate(ctx, canvas, slot, platform, template, theme, hideDeviceCutout);
  }
  const mime = exportFormat === "jpg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas export failed"));
        }
      },
      mime,
      jpgQuality,
    );
  });
}

async function drawRawInterface(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataUrl: string) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (dataUrl) {
    const image = await loadImage(dataUrl);
    drawImageCover(ctx, image, 0, 0, canvas.width, canvas.height);
  } else {
    drawEmptyScreen(ctx, { x: 0, y: 0, width: canvas.width, height: canvas.height });
  }
  ctx.restore();
}

async function drawTemplate(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  slot: Slot,
  platform: PlatformDef,
  template: ScreenshotTemplate,
  theme: ScreenshotTheme,
  hideDeviceCutout: boolean,
) {
  const w = canvas.width;
  const h = canvas.height;
  const layout = getCanvasLayout(template.family, w, h, platform);

  drawBand(ctx, layout, w, h, theme);
  drawFrameLines(ctx, w, h, theme);
  drawLayoutDepth(ctx, template.family, layout, w, h, theme);

  const phone = layout.phone;
  await drawTransformedPhone(ctx, phone, platform, slot.imageDataUrl, hideDeviceCutout, slot.deviceTransform, phone.rotate ?? 0);

  drawTextGroup(ctx, slot, layout.text, platform, theme);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: BackgroundMode,
  gradientConfig: GradientConfig,
) {
  if (mode === "solid") {
    ctx.fillStyle = getSolidGradientColor(gradientConfig);
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const gradient = createCanvasGradient(ctx, w, h, gradientConfig);
  normalizeGradientStops(gradientConfig.stops).forEach((stop) => {
    gradient.addColorStop(stop.position / 100, stop.color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  gradientConfig: GradientConfig,
) {
  if (gradientConfig.type === "radial") {
    const radius = Math.max(w, h) * 0.72;
    return ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius);
  }

  const radians = ((gradientConfig.angle - 90) * Math.PI) / 180;
  const half = Math.sqrt(w * w + h * h) / 2;
  const dx = Math.cos(radians) * half;
  const dy = Math.sin(radians) * half;
  return ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
}

function drawFrameLines(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ScreenshotTheme) {
  ctx.save();
  ctx.globalAlpha = theme.foreground === "#ffffff" ? 0.14 : 0.18;
  ctx.strokeStyle = theme.foreground;
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.strokeRect(w * 0.045, h * 0.035, w * 0.91, h * 0.93);
  ctx.restore();
}

function drawBand(ctx: CanvasRenderingContext2D, layout: CanvasLayout, w: number, h: number, theme: ScreenshotTheme) {
  if (!layout.band) {
    return;
  }
  ctx.save();
  ctx.fillStyle = theme.panel;
  const y = layout.band === "top" ? 0 : h * 0.71;
  const height = layout.band === "top" ? h * 0.29 : h * 0.29;
  ctx.fillRect(0, y, w, height);
  ctx.restore();
}

function getCanvasLayout(family: TemplateFamily, w: number, h: number, platform: PlatformDef): CanvasLayout {
  const profile = getPreviewDeviceProfile(platform);
  if (profile.copyLayout === "wide") {
    return getWideCanvasLayout(family, w, h, platform);
  }
  if (profile.copyLayout === "compact") {
    return getCompactCanvasLayout(family, w, h, platform);
  }

  const compact = profile.copyLayout === "tablet";
  const centered = phoneRect(w, h, platform, compact ? 0.54 : 0.56, compact ? 0.68 : 0.72);
  const small = phoneRect(w, h, platform, compact ? 0.49 : 0.5, compact ? 0.62 : 0.66);
  const large = phoneRect(w, h, platform, compact ? 0.59 : 0.62, compact ? 0.74 : 0.78);

  switch (family) {
    case "device-first":
      return {
        text: { x: w * 0.08, y: h * 0.71, width: w * 0.84, height: h * 0.18, align: "center", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...small, x: (w - small.width) / 2, y: h * 0.08 },
      };
    case "split-right":
      return {
        text: { x: w * 0.08, y: h * 0.13, width: w * 0.39, height: h * 0.36, align: "left", maxTitleLines: 4, maxSubtitleLines: 3 },
        phone: { ...small, x: w * 0.54, y: h * 0.31 },
      };
    case "split-left":
      return {
        text: { x: w * 0.53, y: h * 0.14, width: w * 0.39, height: h * 0.38, align: "left", maxTitleLines: 4, maxSubtitleLines: 3 },
        phone: { ...small, x: w * 0.08, y: h * 0.31 },
      };
    case "diagonal":
      return {
        text: { x: w * 0.08, y: h * 0.08, width: w * 0.84, height: h * 0.22, align: "left", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...centered, x: (w - centered.width) / 2 + w * 0.04, y: h * 0.35, rotate: -7 },
      };
    case "bottom-band":
      return {
        text: { x: w * 0.08, y: h * 0.76, width: w * 0.84, height: h * 0.18, align: "center", maxTitleLines: 2, maxSubtitleLines: 2 },
        phone: { ...small, x: (w - small.width) / 2, y: h * 0.09 },
        band: "bottom",
      };
    case "top-band":
      return {
        text: { x: w * 0.08, y: h * 0.07, width: w * 0.84, height: h * 0.18, align: "center", maxTitleLines: 2, maxSubtitleLines: 2 },
        phone: { ...centered, x: (w - centered.width) / 2, y: h * 0.33 },
        band: "top",
      };
    case "side-note":
      return {
        text: { x: w * 0.08, y: h * 0.18, width: w * 0.38, height: h * 0.45, align: "left", maxTitleLines: 4, maxSubtitleLines: 3 },
        phone: { ...small, x: w * 0.54, y: h * 0.2 },
      };
    case "corner-focus":
      return {
        text: { x: w * 0.08, y: h * 0.08, width: w * 0.72, height: h * 0.25, align: "left", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...large, x: w * 0.36, y: h * 0.36 },
      };
    case "poster-stack":
      return {
        text: { x: w * 0.08, y: h * 0.68, width: w * 0.84, height: h * 0.22, align: "center", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...centered, x: (w - centered.width) / 2, y: h * 0.16 },
        band: "bottom",
      };
    case "isometric":
      return {
        text: { x: w * 0.08, y: h * 0.08, width: w * 0.72, height: h * 0.24, align: "left", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...centered, x: (w - centered.width) / 2 + w * 0.09, y: h * 0.34, rotate: -16 },
      };
    case "fake-3d":
      return {
        text: { x: w * 0.08, y: h * 0.74, width: w * 0.84, height: h * 0.18, align: "center", maxTitleLines: 2, maxSubtitleLines: 2 },
        phone: { ...small, x: (w - small.width) / 2 + w * 0.04, y: h * 0.12, rotate: 3 },
      };
    case "floating-stack":
      return {
        text: { x: w * 0.08, y: h * 0.1, width: w * 0.56, height: h * 0.32, align: "left", maxTitleLines: 3, maxSubtitleLines: 3 },
        phone: { ...small, x: w * 0.45, y: h * 0.31, rotate: 5 },
      };
    case "gallery-wall":
      return {
        text: { x: w * 0.08, y: h * 0.09, width: w * 0.84, height: h * 0.22, align: "center", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...small, x: (w - small.width) / 2, y: h * 0.36 },
      };
    case "dashboard-grid":
      return {
        text: { x: w * 0.08, y: h * 0.08, width: w * 0.84, height: h * 0.22, align: "left", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...small, x: (w - small.width) / 2 + w * 0.13, y: h * 0.33 },
      };
    case "hero-center":
    default:
      return {
        text: { x: w * 0.08, y: h * 0.08, width: w * 0.84, height: h * 0.25, align: "center", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...centered, x: (w - centered.width) / 2, y: h * 0.36 },
      };
  }
}

function getWideCanvasLayout(family: TemplateFamily, w: number, h: number, platform: PlatformDef): CanvasLayout {
  const wideSmall = phoneRect(w, h, platform, 0.44, 0.46);
  const wideCentered = phoneRect(w, h, platform, 0.5, 0.6);
  const wideLarge = phoneRect(w, h, platform, 0.58, 0.66);

  switch (family) {
    case "device-first":
      return {
        text: { x: w * 0.12, y: h * 0.73, width: w * 0.76, height: h * 0.18, align: "center", maxTitleLines: 2, maxSubtitleLines: 2 },
        phone: { ...wideCentered, x: (w - wideCentered.width) / 2, y: h * 0.12 },
      };
    case "split-left":
      return {
        text: { x: w * 0.57, y: h * 0.18, width: w * 0.34, height: h * 0.42, align: "left", maxTitleLines: 3, maxSubtitleLines: 3 },
        phone: { ...wideSmall, x: w * 0.07, y: h * 0.24 },
      };
    case "bottom-band":
    case "poster-stack":
      return {
        text: { x: w * 0.12, y: h * 0.76, width: w * 0.76, height: h * 0.17, align: "center", maxTitleLines: 2, maxSubtitleLines: 2 },
        phone: { ...wideCentered, x: (w - wideCentered.width) / 2, y: h * 0.12 },
        band: "bottom",
      };
    case "top-band":
    case "gallery-wall":
      return {
        text: { x: w * 0.12, y: h * 0.06, width: w * 0.76, height: h * 0.17, align: "center", maxTitleLines: 2, maxSubtitleLines: 2 },
        phone: { ...wideCentered, x: (w - wideCentered.width) / 2, y: h * 0.34 },
        band: family === "top-band" ? "top" : undefined,
      };
    case "diagonal":
    case "isometric":
      return {
        text: { x: w * 0.07, y: h * 0.14, width: w * 0.36, height: h * 0.44, align: "left", maxTitleLines: 3, maxSubtitleLines: 3 },
        phone: { ...wideSmall, x: w * 0.48, y: h * 0.25, rotate: family === "isometric" ? -10 : -5 },
      };
    case "fake-3d":
    case "floating-stack":
    case "dashboard-grid":
      return {
        text: { x: w * 0.07, y: h * 0.14, width: w * 0.37, height: h * 0.42, align: "left", maxTitleLines: 3, maxSubtitleLines: 3 },
        phone: { ...wideSmall, x: w * 0.49, y: h * 0.31, rotate: family === "fake-3d" ? 2 : family === "floating-stack" ? 4 : 0 },
      };
    case "corner-focus":
      return {
        text: { x: w * 0.07, y: h * 0.12, width: w * 0.42, height: h * 0.4, align: "left", maxTitleLines: 3, maxSubtitleLines: 3 },
        phone: { ...wideLarge, x: w * 0.42, y: h * 0.29 },
      };
    case "split-right":
    case "side-note":
    case "hero-center":
    default:
      return {
        text: { x: w * 0.07, y: h * 0.16, width: w * 0.36, height: h * 0.44, align: "left", maxTitleLines: 3, maxSubtitleLines: 3 },
        phone: { ...wideSmall, x: w * 0.49, y: h * 0.24 },
      };
  }
}

function getCompactCanvasLayout(family: TemplateFamily, w: number, h: number, platform: PlatformDef): CanvasLayout {
  const centered = phoneRect(w, h, platform, 0.43, 0.54);
  const small = phoneRect(w, h, platform, 0.38, 0.48);

  switch (family) {
    case "device-first":
    case "top-band":
      return {
        text: { x: w * 0.09, y: h * 0.08, width: w * 0.82, height: h * 0.28, align: "center", maxTitleLines: 2, maxSubtitleLines: 1 },
        phone: { ...small, x: (w - small.width) / 2, y: h * 0.48 },
      };
    case "bottom-band":
    case "poster-stack":
      return {
        text: { x: w * 0.09, y: h * 0.72, width: w * 0.82, height: h * 0.2, align: "center", maxTitleLines: 2, maxSubtitleLines: 1 },
        phone: { ...small, x: (w - small.width) / 2, y: h * 0.22 },
        band: "bottom",
      };
    default:
      return {
        text: { x: w * 0.09, y: h * 0.08, width: w * 0.82, height: h * 0.27, align: "center", maxTitleLines: 2, maxSubtitleLines: 1 },
        phone: { ...centered, x: (w - centered.width) / 2, y: h * 0.42, rotate: family === "diagonal" ? -6 : family === "fake-3d" ? 3 : 0 },
      };
  }
}

function drawLayoutDepth(
  ctx: CanvasRenderingContext2D,
  family: TemplateFamily,
  layout: CanvasLayout,
  w: number,
  h: number,
  theme: ScreenshotTheme,
) {
  switch (family) {
    case "isometric":
      drawIsometricDepth(ctx, layout.phone, theme);
      break;
    case "fake-3d":
      drawFake3dDepth(ctx, layout.phone, theme);
      break;
    case "floating-stack":
      drawFloatingStackDepth(ctx, w, h, theme);
      break;
    case "gallery-wall":
      drawGalleryWallDepth(ctx, w, h, theme);
      break;
    case "dashboard-grid":
      drawDashboardGridDepth(ctx, w, h, theme);
      break;
    default:
      break;
  }
}

function drawIsometricDepth(ctx: CanvasRenderingContext2D, phone: Rect, theme: ScreenshotTheme) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.foreground;
  ctx.beginPath();
  ctx.ellipse(
    phone.x + phone.width * 0.5,
    phone.y + phone.height * 0.96,
    phone.width * 0.78,
    phone.height * 0.12,
    -0.18,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function drawFake3dDepth(ctx: CanvasRenderingContext2D, phone: Rect, theme: ScreenshotTheme) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = theme.foreground;
  ctx.fillStyle = theme.panel;
  const radius = phone.width * 0.12;
  for (const offset of [0.2, 0.1]) {
    const x = phone.x - phone.width * offset;
    const y = phone.y + phone.height * offset * 0.55;
    drawDepthCard(ctx, x, y, phone.width, phone.height, radius);
  }
  ctx.restore();
}

function drawFloatingStackDepth(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ScreenshotTheme) {
  ctx.save();
  ctx.fillStyle = theme.panel;
  ctx.strokeStyle = theme.foreground;
  ctx.globalAlpha = 0.2;
  drawDepthCard(ctx, w * 0.09, h * 0.67, w * 0.34, h * 0.2, 18);
  ctx.globalAlpha = 0.16;
  drawDepthCard(ctx, w * 0.18, h * 0.55, w * 0.28, h * 0.14, 16);
  ctx.globalAlpha = 0.12;
  drawDepthCard(ctx, w * 0.58, h * 0.18, w * 0.24, h * 0.12, 16);
  ctx.restore();
}

function drawGalleryWallDepth(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ScreenshotTheme) {
  ctx.save();
  ctx.fillStyle = theme.panel;
  ctx.strokeStyle = theme.foreground;
  ctx.globalAlpha = 0.18;
  drawDepthCard(ctx, w * 0.09, h * 0.39, w * 0.22, h * 0.16, 18);
  drawDepthCard(ctx, w * 0.68, h * 0.59, w * 0.23, h * 0.17, 18);
  ctx.globalAlpha = 0.12;
  drawDepthCard(ctx, w * 0.13, h * 0.75, w * 0.2, h * 0.12, 16);
  ctx.restore();
}

function drawDashboardGridDepth(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ScreenshotTheme) {
  ctx.save();
  ctx.fillStyle = theme.panel;
  ctx.strokeStyle = theme.foreground;
  ctx.globalAlpha = 0.22;
  const x = w * 0.08;
  const y = h * 0.6;
  const width = w * 0.42;
  const height = h * 0.31;
  drawDepthCard(ctx, x, y, width, height, 18);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.foreground;
  ctx.fillRect(x + width * 0.12, y + height * 0.18, width * 0.4, height * 0.08);
  ctx.fillRect(x + width * 0.12, y + height * 0.4, width * 0.68, height * 0.06);
  ctx.fillRect(x + width * 0.12, y + height * 0.62, width * 0.52, height * 0.06);
  ctx.restore();
}

function drawDepthCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();
}

function phoneRect(w: number, h: number, platform: PlatformDef, heightRatio: number, maxWidthRatio = 0.72): Rect {
  const profile = getPreviewDeviceProfile(platform);
  const aspectRatio = getRatioValue(profile.deviceRatio);
  let phoneH = h * heightRatio;
  let phoneW = phoneH * aspectRatio;
  const maxWidth = w * maxWidthRatio;
  if (phoneW > maxWidth) {
    phoneW = maxWidth;
    phoneH = phoneW / aspectRatio;
  }
  return {
    x: (w - phoneW) / 2,
    y: (h - phoneH) / 2,
    width: phoneW,
    height: phoneH,
  };
}

function getRatioValue(ratio: string) {
  const [width, height] = ratio.split("/").map((part) => Number(part.trim()));
  return width > 0 && height > 0 ? width / height : IPHONE_17_PRO_DEVICE.aspectRatio;
}

async function drawPhone(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  platform: PlatformDef,
  dataUrl: string,
  hideDeviceCutout: boolean,
) {
  const profile = getPreviewDeviceProfile(platform);
  const r =
    profile.frameClass === "watch"
      ? rect.width * 0.24
      : profile.frameClass === "tv"
      ? rect.width * 0.035
      : profile.frameClass === "tablet"
      ? rect.width * 0.055
      : rect.width * (platform.storeSlug === "app-store" ? 0.12 : 0.09);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = rect.width * 0.075;
  ctx.shadowOffsetY = rect.height * 0.03;
  const frameGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  frameGradient.addColorStop(0, "#6f6f6f");
  frameGradient.addColorStop(0.24, "#171717");
  frameGradient.addColorStop(0.76, "#050505");
  frameGradient.addColorStop(1, "#9a9a9a");
  ctx.fillStyle = frameGradient;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, r);
  ctx.fill();
  ctx.restore();

  if (profile.frameClass === "tv") {
    ctx.save();
    ctx.fillStyle = "#111111";
    roundRect(ctx, rect.x + rect.width * 0.35, rect.y + rect.height * 0.99, rect.width * 0.3, rect.height * 0.05, rect.height * 0.03);
    ctx.fill();
    ctx.restore();
  }

  const pad =
    profile.frameClass === "watch"
      ? rect.width * 0.058
      : profile.frameClass === "tv"
      ? rect.width * 0.014
      : profile.frameClass === "tablet"
      ? rect.width * 0.018
      : rect.width * (platform.storeSlug === "app-store" ? 0.027 : 0.04);
  const screen = {
    x: rect.x + pad,
    y: rect.y + pad,
    width: rect.width - pad * 2,
    height: rect.height - pad * 2,
  };
  ctx.save();
  roundRect(ctx, screen.x, screen.y, screen.width, screen.height, r * 0.75);
  ctx.clip();
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);

  if (dataUrl) {
    const image = await loadImage(dataUrl);
    drawImageCover(ctx, image, screen.x, screen.y, screen.width, screen.height);
  } else {
    drawEmptyScreen(ctx, screen);
  }
  ctx.restore();

  if (profile.supportsCutout && shouldRenderDeviceCutout(hideDeviceCutout)) {
    ctx.save();
    ctx.fillStyle = "#050505";
    if (platform.storeSlug === "app-store") {
      const islandW = rect.width * 0.28;
      const islandH = rect.height * 0.033;
      roundRect(ctx, rect.x + rect.width / 2 - islandW / 2, rect.y + rect.height * 0.045, islandW, islandH, islandH / 2);
      ctx.fill();
    } else {
      const cameraR = rect.width * 0.026;
      ctx.beginPath();
      ctx.arc(rect.x + rect.width / 2, rect.y + rect.height * 0.052, cameraR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

async function drawTransformedPhone(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  platform: PlatformDef,
  dataUrl: string,
  hideDeviceCutout: boolean,
  transform: DeviceTransform,
  baseRotate: number,
) {
  const normalized = normalizeDeviceTransform(transform);
  ctx.save();
  ctx.translate(
    rect.x + rect.width / 2 + rect.width * (normalized.x / 100),
    rect.y + rect.height / 2 + rect.height * (normalized.y / 100),
  );
  ctx.rotate(((baseRotate + normalized.rotate) * Math.PI) / 180);
  ctx.scale(normalized.scale, normalized.scale);
  await drawPhone(
    ctx,
    { x: -rect.width / 2, y: -rect.height / 2, width: rect.width, height: rect.height },
    platform,
    dataUrl,
    hideDeviceCutout,
  );
  ctx.restore();
}

function drawEmptyScreen(ctx: CanvasRenderingContext2D, screen: Rect) {
  ctx.fillStyle = "#f3f3f3";
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  ctx.strokeStyle = "#c9c9c9";
  ctx.lineWidth = Math.max(2, screen.width * 0.008);
  ctx.strokeRect(screen.x + screen.width * 0.09, screen.y + screen.height * 0.09, screen.width * 0.82, screen.height * 0.82);
  ctx.fillStyle = "#333333";
  ctx.font = `800 ${Math.round(screen.width * 0.07)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("이미지 추가", screen.x + screen.width / 2, screen.y + screen.height / 2);
}

function drawTextGroup(
  ctx: CanvasRenderingContext2D,
  slot: Slot,
  rect: CanvasLayout["text"],
  platform: PlatformDef,
  theme: ScreenshotTheme,
) {
  const badgeText = slot.badge.trim();
  const visibleBadge = slot.showBadge && badgeText;
  const visibleTitle = slot.showTitle && slot.title.trim();
  const visibleSubtitle = slot.showSubtitle && slot.subtitle.trim();
  if (!visibleBadge && !visibleTitle && !visibleSubtitle) {
    return;
  }

  const profile = getPreviewDeviceProfile(platform);
  const titleScale =
    profile.copyLayout === "wide" ? 0.052 : profile.copyLayout === "compact" ? 0.08 : profile.copyLayout === "tablet" ? 0.074 : 0.086;
  const subtitleScale =
    profile.copyLayout === "wide" ? 0.024 : profile.copyLayout === "compact" ? 0.04 : profile.copyLayout === "tablet" ? 0.034 : 0.038;
  const badgeScale =
    profile.copyLayout === "wide" ? 0.022 : profile.copyLayout === "compact" ? 0.034 : profile.copyLayout === "tablet" ? 0.03 : 0.034;
  const titleSize = Math.round(platform.width * titleScale);
  const subtitleSize = Math.round(platform.width * subtitleScale);
  const badgeSize = Math.round(platform.width * badgeScale);
  const lineHeight = Math.round(titleSize * 1.08);
  const textX = rect.align === "center" ? rect.x + rect.width / 2 : rect.align === "right" ? rect.x + rect.width : rect.x;
  let textY = rect.y;

  ctx.save();
  ctx.fillStyle = theme.foreground;
  ctx.textAlign = rect.align;
  ctx.textBaseline = "top";
  if (visibleBadge) {
    textY += drawBadge(ctx, badgeText, textX, textY, rect.width, rect.align, badgeSize, theme);
    textY += Math.round(badgeSize * 0.7);
  }
  if (visibleTitle) {
    ctx.fillStyle = theme.foreground;
    ctx.font = `900 ${titleSize}px Arial, sans-serif`;
    const used = drawWrappedText(ctx, slot.title, textX, textY, rect.width, lineHeight, rect.maxTitleLines);
    textY += used + Math.round(subtitleSize * 0.68);
  }
  if (visibleSubtitle) {
    ctx.font = `800 ${subtitleSize}px Arial, sans-serif`;
    ctx.fillStyle = theme.muted;
    drawWrappedText(ctx, slot.subtitle, textX, textY, rect.width, Math.round(subtitleSize * 1.24), rect.maxSubtitleLines);
  }
  ctx.restore();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  textX: number,
  y: number,
  maxWidth: number,
  align: TextAlign,
  fontSize: number,
  theme: ScreenshotTheme,
) {
  const paddingX = fontSize * 0.82;
  const badgeH = fontSize * 1.92;
  ctx.save();
  ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  const measured = ctx.measureText(label).width;
  const badgeW = Math.min(measured + paddingX * 2, maxWidth);
  const badgeX = align === "center" ? textX - badgeW / 2 : align === "right" ? textX - badgeW : textX;
  ctx.strokeStyle = theme.foreground;
  ctx.lineWidth = Math.max(2, fontSize * 0.12);
  roundRect(ctx, badgeX, y, badgeW, badgeH, badgeH / 2);
  ctx.stroke();
  ctx.fillStyle = theme.foreground;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, badgeX + badgeW / 2, y + badgeH / 2, badgeW - paddingX);
  ctx.restore();
  return badgeH;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) {
    lines.push(current);
  }

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    visible[visible.length - 1] = `${visible[visible.length - 1].replace(/\.+$/, "")}...`;
  }

  visible.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight, maxWidth);
  });
  return visible.length * lineHeight;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imageRatio = image.width / image.height;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;
  if (imageRatio > targetRatio) {
    sw = image.height * targetRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / targetRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildZip(files: ZipFile[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | (Math.floor(now.getSeconds() / 2) & 0x1f);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  files.forEach((file) => {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      file.data,
    ]);

    const central = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);

    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  });

  const centralStart = offset;
  const central = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(centralStart),
    u16(0),
  ]);
  return concatBytes([...localParts, central, end]);
}

function u16(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
