"use client";

import type {
  CSSProperties,
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  PointerEvent as ReactPointerEvent,
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
import { platformDefs } from "./platforms";
import type { PlatformDef, PlatformKey } from "./platforms";
import { buildPromptForSlot, buildPromptForSlots, parsePromptJson } from "./prompt-copy";
import {
  DEFAULT_COPY,
  DEFAULT_TEMPLATE_SEQUENCE,
  IPHONE_17_PRO_DEVICE,
  SCREENSHOT_THEMES,
  SCREENSHOT_TEMPLATES,
  getTemplateById,
  getThemeById,
} from "./templates";
import type { ScreenshotTemplate, ScreenshotTheme, TemplateFamily, TemplateId, ThemeId } from "./templates";
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
const INITIAL_STATUS = "PNG/JPG 이미지를 드롭하거나 일괄 추가해 01번부터 채우세요.";

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
  version: 2;
  platformKey: PlatformKey;
  bgMode: BackgroundMode;
  themeId: ThemeId;
  gradientType: GradientType;
  gradientAngle: number;
  gradientStops: GradientStop[];
  gradientHexDrafts: Record<string, string>;
  hideDeviceCutout: boolean;
  exportFormat: ExportFormat;
  jpgQuality: number;
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
  return Array.from({ length: TOTAL_SLOTS }, (_, index) => {
    const templateId = DEFAULT_TEMPLATE_SEQUENCE[index % DEFAULT_TEMPLATE_SEQUENCE.length];
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

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export default function Page() {
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [platformKey, setPlatformKey] = useState<PlatformKey>("ios");
  const [bgMode, setBgMode] = useState<BackgroundMode>("tonal");
  const [themeId, setThemeId] = useState<ThemeId>("launch-green");
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(() => createGradientStops("#22c55e", "#111827"));
  const [gradientHexDrafts, setGradientHexDrafts] = useState<Record<string, string>>({});
  const [hideDeviceCutout, setHideDeviceCutout] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [selected, setSelected] = useState(0);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("copy");
  const [jpgQuality, setJpgQuality] = useState(0.92);
  const [slots, setSlots] = useState<Slot[]>(createInitialSlots);
  const [promptJsonInput, setPromptJsonInput] = useState("");
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [toast, setToast] = useState("");
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [isStageDragging, setIsStageDragging] = useState(false);
  const activeDeviceGesture = useRef<DeviceGesture | null>(null);
  const history = useRef(createHistoryState());
  const slotCardRefs = useRef<Array<HTMLElement | null>>([]);

  const platform = platformDefs[platformKey];
  const theme = getThemeById(themeId);
  const selectedSlot = slots[selected];
  const selectedTemplate = getTemplateById(selectedSlot.templateId);
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
  const exportFileCount = platformKey === "ios" ? TOTAL_SLOTS * 2 : TOTAL_SLOTS;
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

  const stageStyle = useMemo<CSSVars>(
    () => ({
      "--shot-ratio": platform.ratio,
      "--card-width":
        platformKey === "ios"
          ? `clamp(204px, calc(44vh - 141px), ${platform.cardWidth}px)`
          : `clamp(240px, calc(100vh - 470px), ${platform.cardWidth}px)`,
      "--preview-background": previewBackground,
      "--preview-a": theme.a,
      "--preview-b": bgMode === "solid" ? theme.a : theme.b,
      "--preview-ink": theme.foreground,
      "--preview-muted": theme.muted,
      "--preview-panel": theme.panel,
      "--device-ratio": `${IPHONE_17_PRO_DEVICE.widthMm} / ${IPHONE_17_PRO_DEVICE.heightMm}`,
    }),
    [bgMode, platform.cardWidth, platform.ratio, platformKey, previewBackground, theme],
  );

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
    notify(`${formatPageRange(startIndex, loaded.length)} 화면에 이미지 ${loaded.length}개를 추가했습니다.`);
  }

  function notify(message: string) {
    setStatus(message);
    setToast(message);
  }

  function applyHistoryStep(direction: "undo" | "redo") {
    const snapshot =
      direction === "redo" ? redoHistorySnapshot(history.current) : undoHistorySnapshot(history.current);
    if (!snapshot) {
      notify(direction === "redo" ? "다시 실행할 작업이 없습니다." : "되돌릴 작업이 없습니다.");
      return false;
    }

    const draft = parseDraftSnapshot(snapshot);
    if (!draft) {
      notify("작업 이력을 불러오지 못했습니다.");
      return false;
    }

    applyDraft(draft);
    notify(direction === "redo" ? "다시 실행했습니다." : "되돌렸습니다.");
    return true;
  }

  function applyDraft(draft: PersistedDraft) {
    setPlatformKey(draft.platformKey);
    setBgMode(draft.bgMode);
    setThemeId(draft.themeId);
    setGradientType(draft.gradientType);
    setGradientAngle(draft.gradientAngle);
    setGradientStops(draft.gradientStops);
    setGradientHexDrafts(draft.gradientHexDrafts);
    setHideDeviceCutout(draft.hideDeviceCutout);
    setExportFormat(draft.exportFormat);
    setJpgQuality(draft.jpgQuality);
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

  function goToSlot(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), TOTAL_SLOTS - 1);
    selectSlot(nextIndex);
    setStatus(`${String(nextIndex + 1).padStart(2, "0")}번 화면을 선택했습니다.`);
  }

  function moveSelectedSlot(direction: -1 | 1) {
    const nextIndex = (selected + direction + TOTAL_SLOTS) % TOTAL_SLOTS;
    goToSlot(nextIndex);
  }

  function jumpToIssue(issue: SlotIssue) {
    selectSlot(issue.index);
    setInspectorMode(issue.mode);
    setStatus(`${String(issue.index + 1).padStart(2, "0")}번 ${issue.label} 항목을 점검합니다.`);
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

  function applyTemplateToAll(templateId: TemplateId) {
    const template = getTemplateById(templateId);
    setSlots((current) => current.map((slot) => ({ ...slot, templateId, badge: template.badge })));
    setStatus("선택한 템플릿을 모든 화면에 적용했습니다.");
  }

  function setAllTextVisibility(key: TextVisibilityKey, visible: boolean) {
    setSlots((current) => current.map((slot) => ({ ...slot, [key]: visible })));
    setStatus(`${getVisibilityLabel(key)} 표시를 모든 화면에서 ${visible ? "켰습니다" : "껐습니다"}.`);
  }

  function isEveryTextHidden(key: TextVisibilityKey) {
    return slots.every((slot) => !slot[key]);
  }

  function resetSelectedDeviceTransform() {
    updateSelectedSlot({ deviceTransform: DEFAULT_DEVICE_TRANSFORM });
    notify("선택한 화면의 목업 위치를 초기화했습니다.");
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
        badge: getTemplateById(DEFAULT_TEMPLATE_SEQUENCE[index % DEFAULT_TEMPLATE_SEQUENCE.length]).badge,
        title: DEFAULT_COPY[index][0],
        subtitle: DEFAULT_COPY[index][1],
        templateId: DEFAULT_TEMPLATE_SEQUENCE[index % DEFAULT_TEMPLATE_SEQUENCE.length],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        deviceTransform: DEFAULT_DEVICE_TRANSFORM,
      })),
    );
    notify("기본 한글 문구와 템플릿 배치를 다시 적용했습니다.");
  }

  async function exportZip() {
    if (!releaseReady) {
      if (firstBlockingIssue) {
        jumpToIssue(firstBlockingIssue);
        notify(`${String(firstBlockingIssue.index + 1).padStart(2, "0")}번 화면을 먼저 점검하세요. ${releaseStatusLabel}`);
      } else {
        setInspectorMode("export");
        notify(releaseStatusLabel);
      }
      return;
    }

    try {
      setStatus("미리보기 이미지를 렌더링하는 중입니다...");
      const files: ZipFile[] = [];
      const targets = getExportTargets({
        platformKey,
        platform,
        count: slots.length,
        extension: exportFormat,
      });
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        setStatus(`${index + 1}/${targets.length}번째 이미지를 렌더링하는 중입니다...`);
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

      setStatus("ZIP 파일을 만드는 중입니다...");
      const zip = buildZip(files);
      const zipBlob = new Blob([zip], { type: "application/zip" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${platformKey}-store-screenshots.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify(`${files.length}개 파일을 ZIP으로 내보냈습니다.`);
    } catch (error) {
      console.error(error);
      notify("내보내기에 실패했습니다. 콘솔 로그를 확인하세요.");
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
    notify(copied ? "선택한 화면의 AI 프롬프트를 복사했습니다." : "프롬프트 복사에 실패했습니다.");
  }

  async function copyAllPrompts() {
    const prompt = buildPromptForSlots({
      slots,
      templates: SCREENSHOT_TEMPLATES,
      platform,
    });
    const copied = await copyText(prompt);
    notify(copied ? "01~10 전체 화면의 AI 프롬프트를 복사했습니다." : "프롬프트 복사에 실패했습니다.");
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
      notify("붙여넣은 JSON을 선택한 화면에 적용했습니다.");
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
      version: 2,
      platformKey,
      bgMode,
      themeId,
      gradientType,
      gradientAngle,
      gradientStops,
      gradientHexDrafts,
      hideDeviceCutout,
      exportFormat,
      jpgQuality,
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
          <div className="brand-mark">S</div>
          <div>
            <h1>StoreShot</h1>
            <p>스토어 미리보기 제작 도구</p>
          </div>
        </div>

          <>
            <section className="panel-section">
              <div className="section-label">제출 플랫폼</div>
              <div className="segmented" role="group" aria-label="제출 플랫폼">
                {(["ios", "android"] as PlatformKey[]).map((key) => (
                  <button
                    key={key}
                    className={`segment ${platformKey === key ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setPlatformKey(key)}
                  >
                    {platformDefs[key].label}
                  </button>
                ))}
              </div>
              <p className="hint">{platform.sizeLabel}</p>
            </section>

            <section className="panel-section">
              <div className="section-label">목업 표시</div>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={hideDeviceCutout}
                  onChange={(event) => setHideDeviceCutout(event.target.checked)}
                />
                <span>카메라/아일랜드 숨김</span>
              </label>
              <p className="hint">iOS는 다이내믹 아일랜드, Android는 중앙 카메라를 숨깁니다.</p>
            </section>

            <section className="panel-section">
              <div className="section-row">
                <div>
                  <div className="section-label">템플릿</div>
                  <p className="hint">선택한 화면에 적용됩니다.</p>
                </div>
                <button className="text-action" type="button" onClick={() => applyTemplateToAll(selectedTemplate.id)}>
                  전체 적용
                </button>
              </div>
              <label className="field template-picker">
                <span>선택 화면 템플릿</span>
                <select
                  value={selectedSlot.templateId}
                  onChange={(event) => updateSlotTemplate(selected, event.target.value as TemplateId)}
                >
                  {SCREENSHOT_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="template-summary" aria-label="현재 템플릿 요약">
                <span className={`template-mini mini-${selectedTemplate.family}`} aria-hidden="true">
                  <span />
                  <i />
                </span>
                <div>
                  <strong>{selectedTemplate.label}</strong>
                  <p>{selectedTemplate.description}</p>
                </div>
                <em>{selectedTemplate.badge}</em>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-label">스크린샷 배경</div>
              <div className="segmented" role="group" aria-label="스크린샷 배경 방식">
                {(["tonal", "solid"] as BackgroundMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`segment ${bgMode === mode ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setBgMode(mode)}
                  >
                    {mode === "tonal" ? "톤 분할" : "단색"}
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
              <details className="advanced-panel">
                <summary>
                  <span>고급 배경 설정</span>
                  <strong>{backgroundSummary}</strong>
                </summary>
                {bgMode === "tonal" ? (
                  <div className="gradient-editor">
                    <label className="field">
                      <span>그라데이션 종류</span>
                      <select value={gradientType} onChange={(event) => setGradientType(event.target.value as GradientType)}>
                        <option value="linear">선형</option>
                        <option value="radial">방사형</option>
                      </select>
                    </label>
                    {gradientType === "linear" ? (
                      <label className="field">
                        <span>각도</span>
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
                      <span>컬러 스탑</span>
                      <button
                        className="text-action"
                        type="button"
                        onClick={addGradientStop}
                        disabled={gradientStops.length >= MAX_GRADIENT_STOPS}
                      >
                        스탑 추가
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
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <label className="field color-field">
                    <span>단색 컬러</span>
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
              <p className="hint">앱 작업 UI는 모노크롬으로 유지하고, 제출용 미리보기 이미지는 컬러 배경을 사용할 수 있습니다.</p>
            </section>
          </>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">릴리즈 보드</p>
            <h2>10개 스토어 미리보기 화면을 한 번에 검수하고 내보냅니다.</h2>
            <div className="status-strip" aria-label="작업 상태">
              <span className={releaseReady ? "is-ready" : "needs-work"}>{releaseStatusLabel}</span>
              <span>{platform.label}</span>
              <span>{uploadedCount}/{TOTAL_SLOTS} 이미지</span>
              <span>{exportFileCount}개 파일 생성</span>
              <span>{String(selected + 1).padStart(2, "0")}번 선택</span>
              {platformKey === "ios" ? <span>iPhone + iPad ZIP</span> : <span>Google Play ZIP</span>}
              {hiddenCopyCount ? <span>{hiddenCopyCount}개 화면 숨김 설정</span> : null}
            </div>
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
            <p className="activity-line">
              <span>작업 안내</span>
              {status}
            </p>
          </div>
          <div className="topbar-actions">
            <div className="action-cluster history-actions" aria-label="작업 이력">
              <button
                className="secondary-action"
                type="button"
                title="Command+Z"
                onClick={() => applyHistoryStep("undo")}
              >
                되돌리기
              </button>
              <button
                className="secondary-action"
                type="button"
                title="Command+Shift+Z"
                onClick={() => applyHistoryStep("redo")}
              >
                다시 실행
              </button>
            </div>
            <div className="action-cluster">
              <label className="secondary-action bulk-upload-button topbar-upload" htmlFor="bulk-input">
                이미지 일괄 추가
              </label>
              <input
                id="bulk-input"
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg"
                multiple
                onChange={(event) => handleBulkInput(event, assignFiles)}
              />
              <button className="secondary-action" type="button" onClick={resetCopy}>
                기본값 복원
              </button>
            </div>
            <div className="export-controls">
              <label className="topbar-format">
                <span>이미지 형식</span>
                <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                </select>
              </label>
              {exportFormat === "jpg" ? (
                <label className="topbar-quality">
                  <span>JPG 품질 {Math.round(jpgQuality * 100)}%</span>
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
                      : `검수 후 내보내기. ${releaseStatusLabel}. 첫 점검 항목으로 이동합니다.`
                  }
                  title={
                    releaseReady
                      ? "스토어 제출용 ZIP 파일을 생성합니다."
                      : `${releaseStatusLabel} · 클릭하면 첫 점검 항목으로 이동합니다.`
                  }
                  onClick={exportZip}
                >
                  {releaseReady ? "ZIP 내보내기" : "검수 후 내보내기"}
                </button>
                {!releaseReady ? <span>{releaseStatusLabel}</span> : null}
              </div>
            </div>
          </div>
        </header>

        <section
          className={`stage-wrap ${isStageDragging ? "is-stage-dragging" : ""} ${uploadedCount ? "" : "has-intake"}`}
          aria-label="스크린샷 미리보기"
          onDragEnter={handleStageDragEnter}
          onDragOver={handleStageDragOver}
          onDragLeave={handleStageDragLeave}
          onDrop={handleStageDrop}
        >
          <div className="stage-workbar" aria-label="릴리즈 보드 상태">
            <div className="stage-workbar-title">
              <span>릴리즈 보드</span>
              <strong>
                {String(selected + 1).padStart(2, "0")}번 · {selectedTemplate.label}
              </strong>
            </div>
            <div className="stage-workbar-status">
              <span className={`shot-state ${selectedBoardState}`}>{selectedStateLabel}</span>
              <strong>{selectedIssueText}</strong>
            </div>
            <div className="stage-workbar-actions" aria-label="보드 이동">
              <button type="button" onClick={() => moveSelectedSlot(-1)}>
                이전
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
                {selectedIssue ? "현재 점검" : "다음 점검"}
              </button>
              <button type="button" onClick={() => moveSelectedSlot(1)}>
                다음
              </button>
            </div>
            <div className="stage-screen-map" aria-label="전체 화면 준비 상태">
              <span>화면 상태</span>
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
          {!uploadedCount ? (
            <div className="stage-intake" aria-label="시작 안내">
              <strong>이미지 10장을 보드에 드롭하세요</strong>
              <span>PNG/JPG 여러 장을 놓으면 01번부터 순서대로 채워집니다. 개별 카드는 해당 위치부터 이어서 배치됩니다.</span>
            </div>
          ) : null}
          <div className={`stage platform-${platformKey}`} style={stageStyle}>
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
                    <button className="slot-button" type="button" onClick={() => selectSlot(index)}>
                      {String(index + 1).padStart(2, "0")}번 · {template.label}
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
                    <div
                      className="preview-visibility-toggles"
                      aria-label={`${index + 1}번 텍스트 표시`}
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={slot.showBadge}
                          onChange={(event) => updateSlot(index, { showBadge: event.target.checked })}
                        />
                        <span>뱃지</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={slot.showTitle}
                          onChange={(event) => updateSlot(index, { showTitle: event.target.checked })}
                        />
                        <span>제목</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={slot.showSubtitle}
                          onChange={(event) => updateSlot(index, { showSubtitle: event.target.checked })}
                        />
                        <span>설명</span>
                      </label>
                    </div>
                    {hasCopy ? (
                      <div className="copy-block">
                        {showBadge ? <span className="template-badge">{slot.badge}</span> : null}
                        {showTitle ? <h3>{slot.title}</h3> : null}
                        {showSubtitle ? <p className="copy-subtitle">{slot.subtitle}</p> : null}
                      </div>
                    ) : null}
                    <div
                      className={`device-frame ${platform.deviceClass} ${index === selected ? "is-transform-selected" : ""}`}
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
                      {shouldRenderDeviceCutout(hideDeviceCutout) ? <div className="device-camera" /> : null}
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
        <div className="inspector-sticky">
          <div className="inspector-header">
            <div>
              <p className="eyebrow">선택 화면</p>
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
                <span>{mode.label}</span>
                <small>{mode.description}</small>
              </button>
            ))}
          </div>
          <p className="shortcut-hint">←/→ 화면 이동 · Home/End 처음/마지막</p>
        </div>

        <section className="workflow-panel" aria-label="작업 큐">
          <div className="workflow-head">
            <div>
              <p className="eyebrow">작업 큐</p>
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
              <span>현재 이미지</span>
              <strong>{selectedReadiness.hasImage ? selectedSlot.imageName || "입력됨" : "필요"}</strong>
            </div>
            <div className={selectedReadiness.copyIssues.length ? "workflow-check needs-work" : "workflow-check is-ok"}>
              <span>현재 카피</span>
              <strong>
                {selectedReadiness.copyIssues.length ? `${selectedReadiness.copyIssues.join(", ")} 입력 필요` : "정상"}
              </strong>
            </div>
            <div className="workflow-check">
              <span>숨긴 레이어</span>
              <strong>{selectedReadiness.hiddenLayers ? `${selectedReadiness.hiddenLayers}개` : "없음"}</strong>
            </div>
          </div>
          {visibleIssues.length ? (
            <div className="issue-queue" aria-label="다음 점검 화면">
              <span>선택 기준 다음 점검</span>
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
                  선택 화면 이미지 추가
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
                {selectedNeedsCopy
                  ? "카피 입력하기"
                  : nextIssueIndex < 0
                    ? "모든 화면 준비됨"
                    : `${String(nextIssueIndex + 1).padStart(2, "0")}번 점검하기`}
              </button>
            )}
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "copy"}>
          <div className="section-row">
            <div>
              <div className="section-label">카피 편집</div>
              <p className="hint">선택한 페이지의 뱃지, 제목, 설명과 표시 여부를 조정합니다.</p>
            </div>
          </div>
          <label className="field">
            <span className="field-label-row">
              <span>뱃지</span>
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
              <span>제목</span>
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
              <span>설명</span>
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
              <input
                type="checkbox"
                checked={selectedSlot.showBadge}
                onChange={(event) => updateSelectedSlot({ showBadge: event.target.checked })}
              />
              <span>뱃지</span>
            </label>
            <label className="toggle-row compact">
              <input
                type="checkbox"
                checked={selectedSlot.showTitle}
                onChange={(event) => updateSelectedSlot({ showTitle: event.target.checked })}
              />
              <span>제목</span>
            </label>
            <label className="toggle-row compact">
              <input
                type="checkbox"
                checked={selectedSlot.showSubtitle}
                onChange={(event) => updateSelectedSlot({ showSubtitle: event.target.checked })}
              />
              <span>설명</span>
            </label>
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "copy"}>
          <div className="section-row">
            <div>
              <div className="section-label">전체 표시 제어</div>
              <p className="hint">10개 화면의 텍스트 레이어를 한 번에 켜거나 끕니다.</p>
            </div>
          </div>
          <div className="global-hide-controls" aria-label="전체 텍스트 숨김">
            <label>
              <input
                type="checkbox"
                checked={isEveryTextHidden("showBadge")}
                onChange={(event) => setAllTextVisibility("showBadge", !event.target.checked)}
              />
              <span>뱃지 모두 끄기</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={isEveryTextHidden("showTitle")}
                onChange={(event) => setAllTextVisibility("showTitle", !event.target.checked)}
              />
              <span>제목 모두 끄기</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={isEveryTextHidden("showSubtitle")}
                onChange={(event) => setAllTextVisibility("showSubtitle", !event.target.checked)}
              />
              <span>설명 모두 끄기</span>
            </label>
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "export"}>
          <div className="section-row">
            <div>
              <div className="section-label">내보내기 검수</div>
              <p className="hint">ZIP 생성 전에 누락된 화면과 산출물 구성을 확인합니다.</p>
            </div>
          </div>
          <div className="quality-gate" aria-label="출시 게이트">
            <div className={`quality-gate-card ${missingImageCount ? "is-blocked" : "is-ok"}`}>
              <div>
                <span>이미지</span>
                <strong>{missingImageCount ? `${missingImageCount}개 화면 필요` : "10개 모두 입력"}</strong>
              </div>
              {firstMissingImageIssue ? (
                <button type="button" onClick={() => jumpToIssue(firstMissingImageIssue)}>
                  {String(firstMissingImageIssue.index + 1).padStart(2, "0")}번으로 이동
                </button>
              ) : (
                <small>정상</small>
              )}
            </div>
            <div className={`quality-gate-card ${copyIssueCount ? "is-blocked" : "is-ok"}`}>
              <div>
                <span>카피</span>
                <strong>{copyIssueCount ? `${copyIssueSlotCount}개 화면 · ${copyIssueCount}개 항목` : "보이는 문구 정상"}</strong>
              </div>
              {firstCopyIssue ? (
                <button type="button" onClick={() => jumpToIssue(firstCopyIssue)}>
                  {String(firstCopyIssue.index + 1).padStart(2, "0")}번 카피
                </button>
              ) : (
                <small>정상</small>
              )}
            </div>
            <div className={`quality-gate-card ${hiddenCopyCount ? "is-warning" : "is-ok"}`}>
              <div>
                <span>텍스트 숨김</span>
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
                  표시 설정
                </button>
              ) : (
                <small>정상</small>
              )}
            </div>
            <div className="quality-gate-card is-ok">
              <div>
                <span>ZIP 산출물</span>
                <strong>
                  {exportFileCount}개 {exportFormat.toUpperCase()}
                </strong>
              </div>
              <small>{platformKey === "ios" ? "iPad 포함" : "단일 폴더"}</small>
            </div>
          </div>
          <div className="readiness-panel" aria-label="내보내기 파일 구성">
            <div className="readiness-row">
              <span>대상 스토어</span>
              <strong>{platform.store}</strong>
            </div>
            <div className="readiness-row">
              <span>기본 해상도</span>
              <strong>
                {platform.width} x {platform.height}
              </strong>
            </div>
            <div className="readiness-row">
              <span>파일 구성</span>
              <strong>
                {exportFileCount}개 {exportFormat.toUpperCase()}
                {exportFormat === "jpg" ? ` · ${Math.round(jpgQuality * 100)}%` : ""}
              </strong>
            </div>
            <div className="readiness-row">
              <span>추가 폴더</span>
              <strong>{platformKey === "ios" ? "ipad 포함" : "없음"}</strong>
            </div>
          </div>
        </section>

        <section className="inspector-section" hidden={inspectorMode !== "layout"}>
          <div className="section-row">
            <div>
              <div className="section-label">템플릿과 목업</div>
              <p className="hint">선택한 페이지의 배치와 기기 목업 위치를 조정합니다.</p>
            </div>
            <button className="text-action" type="button" onClick={resetSelectedDeviceTransform}>
              초기화
            </button>
          </div>
          <label className="field">
            <span>템플릿</span>
            <select
              value={selectedSlot.templateId}
              onChange={(event) => updateSlotTemplate(selected, event.target.value as TemplateId)}
            >
              {SCREENSHOT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <p className="inspector-note">Shift 드래그는 수평 또는 수직으로만 이동합니다.</p>
          <label className="field">
            <span>가로 위치 {selectedSlot.deviceTransform.x}%</span>
            <input
              type="range"
              min={-50}
              max={50}
              value={selectedSlot.deviceTransform.x}
              onChange={(event) => updateSelectedDeviceTransform({ x: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>세로 위치 {selectedSlot.deviceTransform.y}%</span>
            <input
              type="range"
              min={-50}
              max={50}
              value={selectedSlot.deviceTransform.y}
              onChange={(event) => updateSelectedDeviceTransform({ y: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>스케일 {selectedSlot.deviceTransform.scale.toFixed(2)}x</span>
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
            <span>회전 {selectedSlot.deviceTransform.rotate}도</span>
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
              <div className="section-label">프롬프트와 JSON</div>
              <p className="hint">AI가 반환한 JSON을 붙여넣으면 선택 화면 또는 전체 화면 카피에 바로 반영합니다.</p>
            </div>
          </div>
          <div className="prompt-workflow" aria-label="AI 카피 작업 순서">
            <span>1. 복사</span>
            <span>2. 생성</span>
            <span>3. 적용</span>
          </div>
          <div className="prompt-actions">
            <button className="secondary-action prompt-action" type="button" onClick={copySelectedPrompt}>
              선택 화면 프롬프트 복사
            </button>
            <button className="secondary-action prompt-action" type="button" onClick={copyAllPrompts}>
              01~10 전체 프롬프트 복사
            </button>
          </div>
          <details className="json-schema-note">
            <summary>JSON 예시 보기</summary>
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
            <span>프롬프트 결과 JSON</span>
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
            <span>입력 상태</span>
            <strong>{promptJsonInput.trim() ? "JSON 대기 중" : "붙여넣기 필요"}</strong>
          </div>
          <button className="secondary-action prompt-action" type="button" onClick={() => applyPromptJsonText(promptJsonInput)}>
            JSON 적용
          </button>
        </section>
      </aside>

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

  return {
    version: 2,
    platformKey: value.platformKey === "android" ? "android" : "ios",
    bgMode: value.bgMode === "solid" ? "solid" : "tonal",
    themeId: normalizeThemeId(value.themeId),
    gradientType: value.gradientType === "radial" ? "radial" : "linear",
    gradientAngle: typeof value.gradientAngle === "number" ? value.gradientAngle : 135,
    gradientStops: normalizeStoredGradientStops(value.gradientStops),
    gradientHexDrafts: isStringRecord(value.gradientHexDrafts) ? value.gradientHexDrafts : {},
    hideDeviceCutout: value.hideDeviceCutout === true,
    exportFormat: value.exportFormat === "jpg" ? "jpg" : "png",
    jpgQuality: typeof value.jpgQuality === "number" ? Math.min(1, Math.max(0.72, value.jpgQuality)) : 0.92,
    selected: normalizeSelectedIndex(value.selected),
    slots: normalizeStoredSlots(value.slots),
  };
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
  drawBackground(ctx, canvas.width, canvas.height, bgMode, gradientConfig);
  await drawTemplate(ctx, canvas, slot, platform, template, theme, hideDeviceCutout);
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
  const compact = platform.deviceClass === "android";
  const centered = phoneRect(w, h, platform, compact ? 0.58 : 0.56);
  const small = phoneRect(w, h, platform, compact ? 0.52 : 0.5);
  const large = phoneRect(w, h, platform, compact ? 0.64 : 0.62);

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
    case "hero-center":
    default:
      return {
        text: { x: w * 0.08, y: h * 0.08, width: w * 0.84, height: h * 0.25, align: "center", maxTitleLines: 3, maxSubtitleLines: 2 },
        phone: { ...centered, x: (w - centered.width) / 2, y: h * 0.36 },
      };
  }
}

function phoneRect(w: number, h: number, platform: PlatformDef, heightRatio: number): Rect {
  const phoneH = h * heightRatio;
  const phoneW = phoneH * (platform.deviceClass === "ios" ? IPHONE_17_PRO_DEVICE.aspectRatio : 0.51);
  return {
    x: (w - phoneW) / 2,
    y: (h - phoneH) / 2,
    width: phoneW,
    height: phoneH,
  };
}

async function drawPhone(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  platform: PlatformDef,
  dataUrl: string,
  hideDeviceCutout: boolean,
) {
  const r = rect.width * (platform.deviceClass === "ios" ? 0.12 : 0.09);
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

  const pad = rect.width * (platform.deviceClass === "ios" ? 0.027 : 0.04);
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

  if (shouldRenderDeviceCutout(hideDeviceCutout)) {
    ctx.save();
    ctx.fillStyle = "#050505";
    if (platform.deviceClass === "ios") {
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

  const ios = platform.deviceClass === "ios";
  const titleSize = Math.round(platform.width * (ios ? 0.086 : 0.072));
  const subtitleSize = Math.round(platform.width * (ios ? 0.038 : 0.032));
  const badgeSize = Math.round(platform.width * (ios ? 0.034 : 0.03));
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
