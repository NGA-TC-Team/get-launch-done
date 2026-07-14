"use client";

import type { CSSProperties, ChangeEvent, DragEvent } from "react";
import { useMemo, useState } from "react";
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

const TOTAL_SLOTS = DEFAULT_COPY.length;

type PlatformKey = "ios" | "android";
type BackgroundMode = "tonal" | "solid";
type ExportFormat = "png" | "jpg";
type TextAlign = "left" | "center" | "right";

type PlatformDef = {
  label: string;
  store: string;
  storeSlug: string;
  sizeLabel: string;
  width: number;
  height: number;
  ratio: string;
  cardWidth: number;
  deviceClass: string;
};

type Slot = {
  title: string;
  subtitle: string;
  imageDataUrl: string;
  imageName: string;
  templateId: TemplateId;
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
  chips?: boolean;
  pageAlign?: "left" | "right";
};

type ZipFile = {
  name: string;
  data: Uint8Array;
};

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const platformDefs: Record<PlatformKey, PlatformDef> = {
  ios: {
    label: "iOS",
    store: "앱스토어",
    storeSlug: "app-store",
    sizeLabel: "앱스토어 내보내기: 1290 x 2796",
    width: 1290,
    height: 2796,
    ratio: "1290 / 2796",
    cardWidth: 286,
    deviceClass: "ios",
  },
  android: {
    label: "Android",
    store: "구글 플레이",
    storeSlug: "google-play",
    sizeLabel: "구글 플레이 내보내기: 1080 x 1920",
    width: 1080,
    height: 1920,
    ratio: "1080 / 1920",
    cardWidth: 312,
    deviceClass: "android",
  },
};

function createInitialSlots(): Slot[] {
  return Array.from({ length: TOTAL_SLOTS }, (_, index) => ({
    title: DEFAULT_COPY[index][0],
    subtitle: DEFAULT_COPY[index][1],
    imageDataUrl: "",
    imageName: "",
    templateId: DEFAULT_TEMPLATE_SEQUENCE[index % DEFAULT_TEMPLATE_SEQUENCE.length],
  }));
}

export default function Page() {
  const [platformKey, setPlatformKey] = useState<PlatformKey>("ios");
  const [bgMode, setBgMode] = useState<BackgroundMode>("tonal");
  const [themeId, setThemeId] = useState<ThemeId>("launch-green");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [selected, setSelected] = useState(0);
  const [jpgQuality, setJpgQuality] = useState(0.92);
  const [slots, setSlots] = useState<Slot[]>(createInitialSlots);
  const [status, setStatus] = useState("10개의 미리보기 화면이 준비되었습니다.");
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);

  const platform = platformDefs[platformKey];
  const theme = getThemeById(themeId);
  const selectedSlot = slots[selected];
  const selectedTemplate = getTemplateById(selectedSlot.templateId);

  const stageStyle = useMemo<CSSVars>(
    () => ({
      "--shot-ratio": platform.ratio,
      "--card-width": `${platform.cardWidth}px`,
      "--preview-a": theme.a,
      "--preview-b": bgMode === "solid" ? theme.a : theme.b,
      "--preview-ink": theme.foreground,
      "--preview-muted": theme.muted,
      "--preview-panel": theme.panel,
      "--device-ratio": `${IPHONE_17_PRO_DEVICE.widthMm} / ${IPHONE_17_PRO_DEVICE.heightMm}`,
    }),
    [bgMode, platform.cardWidth, platform.ratio, theme],
  );

  async function assignFiles(startIndex: number, files: File[]) {
    const images = files.filter((file) => /^image\/(png|jpe?g)$/i.test(file.type));
    if (!images.length) {
      setStatus("PNG 또는 JPG 파일만 사용할 수 있습니다.");
      return;
    }

    const availableImages = images.slice(0, TOTAL_SLOTS - startIndex);
    const loaded = await Promise.all(
      availableImages.map(async (file) => ({
        imageDataUrl: await readFileAsDataUrl(file),
        imageName: file.name,
      })),
    );

    setSlots((current) =>
      current.map((slot, index) => {
        const loadedIndex = index - startIndex;
        if (loadedIndex < 0 || loadedIndex >= loaded.length) {
          return slot;
        }
        return {
          ...slot,
          ...loaded[loadedIndex],
        };
      }),
    );
    setSelected(Math.min(startIndex + loaded.length - 1, TOTAL_SLOTS - 1));
    setStatus(`${loaded.length}개의 이미지를 추가했습니다.`);
  }

  function updateSelectedSlot(update: Partial<Slot>) {
    setSlots((current) =>
      current.map((slot, index) => (index === selected ? { ...slot, ...update } : slot)),
    );
  }

  function updateSlotTemplate(index: number, templateId: TemplateId) {
    setSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, templateId } : slot)),
    );
  }

  function applyTemplateToAll(templateId: TemplateId) {
    setSlots((current) => current.map((slot) => ({ ...slot, templateId })));
    setStatus("선택한 템플릿을 모든 화면에 적용했습니다.");
  }

  function resetCopy() {
    setSlots((current) =>
      current.map((slot, index) => ({
        ...slot,
        title: DEFAULT_COPY[index][0],
        subtitle: DEFAULT_COPY[index][1],
        templateId: DEFAULT_TEMPLATE_SEQUENCE[index % DEFAULT_TEMPLATE_SEQUENCE.length],
      })),
    );
    setStatus("기본 한글 문구와 템플릿 배치를 다시 적용했습니다.");
  }

  async function exportZip() {
    try {
      setStatus("미리보기 이미지를 렌더링하는 중입니다...");
      const files: ZipFile[] = [];
      for (let index = 0; index < slots.length; index += 1) {
        setStatus(`${index + 1}/${slots.length}번째 이미지를 렌더링하는 중입니다...`);
        const slot = slots[index];
        const blob = await renderSlotToBlob({
          slot,
          index,
          platform,
          template: getTemplateById(slot.templateId),
          bgMode,
          theme,
          exportFormat,
          jpgQuality,
        });
        const extension = exportFormat;
        files.push({
          name: `${platform.storeSlug}-${String(index + 1).padStart(2, "0")}.${extension}`,
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
      setStatus(`${files.length}개 파일을 ZIP으로 내보냈습니다.`);
    } catch (error) {
      console.error(error);
      setStatus("내보내기에 실패했습니다. 콘솔 로그를 확인하세요.");
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setDraggingSlot(null);
    }
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
    setStatus(copied ? "선택한 화면의 AI 프롬프트를 복사했습니다." : "프롬프트 복사에 실패했습니다.");
  }

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
          <div className="section-row">
            <div>
              <div className="section-label">템플릿</div>
              <p className="hint">선택한 화면에 적용됩니다.</p>
            </div>
            <button className="text-action" type="button" onClick={() => applyTemplateToAll(selectedTemplate.id)}>
              전체 적용
            </button>
          </div>
          <div className="template-list" aria-label="스크린샷 템플릿">
            {SCREENSHOT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-option ${template.id === selectedSlot.templateId ? "is-active" : ""}`}
                onClick={() => updateSelectedSlot({ templateId: template.id })}
              >
                <span className={`template-mini mini-${template.family}`} aria-hidden="true">
                  <span />
                  <i />
                </span>
                <span>
                  <strong>{template.label}</strong>
                  <span>{template.description}</span>
                </span>
                <em>{template.badge}</em>
              </button>
            ))}
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
                onClick={() => setThemeId(screenshotTheme.id)}
              />
            ))}
          </div>
          <p className="hint">앱 작업 UI는 모노크롬으로 유지하고, 제출용 미리보기 이미지는 컬러 배경을 사용할 수 있습니다.</p>
        </section>

        <section className="panel-section">
          <div className="section-label">선택한 화면</div>
          <label className="field">
            <span>템플릿</span>
            <select
              value={selectedSlot.templateId}
              onChange={(event) => updateSelectedSlot({ templateId: event.target.value as TemplateId })}
            >
              {SCREENSHOT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>제목</span>
            <textarea
              rows={3}
              maxLength={64}
              value={selectedSlot.title}
              onChange={(event) => updateSelectedSlot({ title: event.target.value })}
            />
          </label>
          <label className="field">
            <span>설명</span>
            <textarea
              rows={2}
              maxLength={72}
              value={selectedSlot.subtitle}
              onChange={(event) => updateSelectedSlot({ subtitle: event.target.value })}
            />
          </label>
          <button className="secondary-action prompt-action" type="button" onClick={copySelectedPrompt}>
            프롬프트 복사하기
          </button>
          <p className="hint">프로젝트 폴더에서 AI 에이전트에게 전달할 선택 화면용 프롬프트를 복사합니다.</p>
        </section>

        <section className="panel-section export-panel">
          <div className="section-label">내보내기</div>
          <label className="field">
            <span>JPG 품질</span>
            <input
              type="range"
              min={72}
              max={100}
              value={Math.round(jpgQuality * 100)}
              onChange={(event) => setJpgQuality(Number(event.target.value) / 100)}
            />
          </label>
          <label className="field">
            <span>이미지 형식</span>
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
            </select>
          </label>
          <button className="primary-action" type="button" onClick={exportZip}>
            ZIP 내보내기
          </button>
          <label className="secondary-action upload-button" htmlFor="bulk-input">
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
          <p className="hint">{status}</p>
        </section>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">컬러 스토어 미리보기</p>
            <h2>이미지를 기기에 올리고, 각 화면마다 다른 레이아웃을 선택하세요.</h2>
          </div>
          <div className="topbar-actions">
            <button className="secondary-action" type="button" onClick={resetCopy}>
              기본값 복원
            </button>
            <label className="topbar-format">
              <span>이미지 형식</span>
              <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </label>
            <button className="primary-action" type="button" onClick={exportZip}>
              ZIP 내보내기
            </button>
          </div>
        </header>

        <section className="stage-wrap" aria-label="스크린샷 미리보기">
          <div className="stage" style={stageStyle}>
            {slots.map((slot, index) => {
              const template = getTemplateById(slot.templateId);

              return (
                <article
                  className={`shot-card layout-${template.family} ${index === selected ? "is-selected" : ""}`}
                  key={index}
                >
                  <div className="shot-toolbar">
                    <button className="slot-button" type="button" onClick={() => setSelected(index)}>
                      {String(index + 1).padStart(2, "0")}번 · {template.label}
                    </button>
                  </div>
                  <div
                    className={`shot-preview ${draggingSlot === index ? "is-dragging" : ""}`}
                    tabIndex={0}
                    onClick={() => setSelected(index)}
                    onFocus={() => setSelected(index)}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDraggingSlot(index);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDraggingSlot(index);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDraggingSlot(null);
                      assignFiles(index, Array.from(event.dataTransfer.files));
                    }}
                  >
                    <div className="copy-block">
                      <span className="template-badge">{template.badge}</span>
                      <h3>{slot.title}</h3>
                      <p>{slot.subtitle}</p>
                    </div>
                    <div className={`device-frame ${platform.deviceClass}`}>
                      <div className="device-screen">
                        {slot.imageDataUrl ? (
                          // User-selected data URLs are local previews, so Next image optimization is not useful here.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={`${index + 1}번 업로드 이미지`} src={slot.imageDataUrl} />
                        ) : (
                          <div className="empty-screen">이미지를 놓으세요</div>
                        )}
                      </div>
                      <div className="device-camera" />
                    </div>
                    <div className="drop-indicator">여기에 이미지 놓기</div>
                  </div>
                  <div className="shot-footer">
                    <label className="upload-button" htmlFor={`slot-file-${index}`}>
                      업로드
                    </label>
                    <select
                      className="template-select"
                      aria-label={`${index + 1}번 템플릿 선택`}
                      value={slot.templateId}
                      onChange={(event) => updateSlotTemplate(index, event.target.value as TemplateId)}
                    >
                      {SCREENSHOT_TEMPLATES.map((templateOption) => (
                        <option key={templateOption.id} value={templateOption.id}>
                          {templateOption.label}
                        </option>
                      ))}
                    </select>
                    <span className="file-name">{slot.imageName || "이미지 없음"}</span>
                    <input
                      id={`slot-file-${index}`}
                      className="visually-hidden"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(event) => handleSlotInput(event, index, assignFiles)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function handleSlotInput(
  event: ChangeEvent<HTMLInputElement>,
  index: number,
  assignFiles: (startIndex: number, files: File[]) => Promise<void>,
) {
  if (event.target.files?.length) {
    void assignFiles(index, Array.from(event.target.files));
  }
  event.target.value = "";
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildPromptForSlot({
  slot,
  template,
  platform,
  pageNumber,
  totalPages,
}: {
  slot: Slot;
  template: ScreenshotTemplate;
  platform: PlatformDef;
  pageNumber: number;
  totalPages: number;
}) {
  return [
    "# StoreShot 스크린샷 문구 작성 요청",
    "",
    `대상 화면: ${pageNumber}/${totalPages}`,
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
  index,
  platform,
  template,
  bgMode,
  theme,
  exportFormat,
  jpgQuality,
}: {
  slot: Slot;
  index: number;
  platform: PlatformDef;
  template: ScreenshotTemplate;
  bgMode: BackgroundMode;
  theme: ScreenshotTheme;
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
  drawBackground(ctx, canvas.width, canvas.height, theme, bgMode);
  await drawTemplate(ctx, canvas, slot, index, platform, template, theme);
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
  index: number,
  platform: PlatformDef,
  template: ScreenshotTemplate,
  theme: ScreenshotTheme,
) {
  const w = canvas.width;
  const h = canvas.height;
  const layout = getCanvasLayout(template.family, w, h, platform);

  drawBand(ctx, layout, w, h, theme);
  drawFrameLines(ctx, w, h, theme);

  ctx.save();
  const phone = layout.phone;
  if (phone.rotate) {
    ctx.translate(phone.x + phone.width / 2, phone.y + phone.height / 2);
    ctx.rotate((phone.rotate * Math.PI) / 180);
    await drawPhone(
      ctx,
      { x: -phone.width / 2, y: -phone.height / 2, width: phone.width, height: phone.height },
      platform,
      slot.imageDataUrl,
    );
  } else {
    await drawPhone(ctx, phone, platform, slot.imageDataUrl);
  }
  ctx.restore();

  drawTextGroup(ctx, slot, layout.text, platform, theme);
  if (layout.chips) {
    drawChips(ctx, w, h, theme);
  }
  drawPageNumber(ctx, index, w, h, theme, layout.pageAlign ?? "right");
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: ScreenshotTheme,
  mode: BackgroundMode,
) {
  if (mode === "solid") {
    ctx.fillStyle = theme.a;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, theme.a);
  gradient.addColorStop(1, theme.b);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
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
        pageAlign: "left",
      };
    case "split-right":
      return {
        text: { x: w * 0.08, y: h * 0.13, width: w * 0.39, height: h * 0.36, align: "left", maxTitleLines: 4, maxSubtitleLines: 3 },
        phone: { ...small, x: w * 0.54, y: h * 0.31 },
        chips: true,
      };
    case "split-left":
      return {
        text: { x: w * 0.53, y: h * 0.14, width: w * 0.39, height: h * 0.38, align: "left", maxTitleLines: 4, maxSubtitleLines: 3 },
        phone: { ...small, x: w * 0.08, y: h * 0.31 },
        pageAlign: "left",
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
        chips: true,
        pageAlign: "left",
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
  const ios = platform.deviceClass === "ios";
  const titleSize = Math.round(platform.width * (ios ? 0.086 : 0.072));
  const subtitleSize = Math.round(platform.width * (ios ? 0.038 : 0.032));
  const lineHeight = Math.round(titleSize * 1.08);
  const textX = rect.align === "center" ? rect.x + rect.width / 2 : rect.align === "right" ? rect.x + rect.width : rect.x;

  ctx.save();
  ctx.fillStyle = theme.foreground;
  ctx.textAlign = rect.align;
  ctx.textBaseline = "top";
  ctx.font = `900 ${titleSize}px Arial, sans-serif`;
  const used = drawWrappedText(ctx, slot.title, textX, rect.y, rect.width, lineHeight, rect.maxTitleLines);
  ctx.font = `800 ${subtitleSize}px Arial, sans-serif`;
  ctx.fillStyle = theme.muted;
  const subtitleY = rect.y + used + subtitleSize * 0.68;
  drawWrappedText(ctx, slot.subtitle, textX, subtitleY, rect.width, Math.round(subtitleSize * 1.24), rect.maxSubtitleLines);
  ctx.restore();
}

function drawChips(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ScreenshotTheme) {
  const labels = ["미리보기", "릴리즈", "제출"];
  const chipY = h * 0.88;
  let chipX = w * 0.08;
  ctx.save();
  ctx.font = `900 ${Math.round(w * 0.028)}px Arial, sans-serif`;
  labels.forEach((label) => {
    const paddingX = w * 0.023;
    const chipW = ctx.measureText(label).width + paddingX * 2;
    const chipH = h * 0.028;
    ctx.fillStyle = theme.foreground;
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.fillStyle = theme.panel;
    ctx.fillText(label, chipX + paddingX, chipY + chipH * 0.28);
    chipX += chipW + w * 0.016;
  });
  ctx.restore();
}

function drawPageNumber(
  ctx: CanvasRenderingContext2D,
  index: number,
  w: number,
  h: number,
  theme: ScreenshotTheme,
  align: "left" | "right",
) {
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = theme.foreground;
  ctx.font = `800 ${Math.round(w * 0.026)}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(
    `${String(index + 1).padStart(2, "0")} / ${String(TOTAL_SLOTS).padStart(2, "0")}`,
    align === "left" ? w * 0.055 : w - w * 0.055,
    h - h * 0.04,
  );
  ctx.restore();
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
