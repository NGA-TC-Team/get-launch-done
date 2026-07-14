"use client";

import type { CSSProperties, DragEvent, ChangeEvent } from "react";
import { useMemo, useState } from "react";

const TOTAL_SLOTS = 10;

type PlatformKey = "ios" | "android";
type TemplateKey = "bold" | "split" | "minimal";
type BackgroundMode = "gradient" | "solid";
type ExportFormat = "png" | "jpg";

type PlatformDef = {
  label: string;
  store: string;
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
  format: ExportFormat;
  imageDataUrl: string;
  imageName: string;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ZipFile = {
  name: string;
  data: Uint8Array;
};

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const platformDefs: Record<PlatformKey, PlatformDef> = {
  ios: {
    label: "iOS",
    store: "App Store",
    sizeLabel: "iOS export: 1290 x 2796",
    width: 1290,
    height: 2796,
    ratio: "1290 / 2796",
    cardWidth: 286,
    deviceClass: "ios",
  },
  android: {
    label: "Android",
    store: "Google Play",
    sizeLabel: "Android export: 1080 x 1920",
    width: 1080,
    height: 1920,
    ratio: "1080 / 1920",
    cardWidth: 312,
    deviceClass: "android",
  },
};

const templates: Array<{
  id: TemplateKey;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "bold",
    label: "Bold pitch",
    description: "Large claim above a centered device.",
    icon: "BIG",
  },
  {
    id: "split",
    label: "Angled device",
    description: "Editorial text with a tilted phone.",
    icon: "3D",
  },
  {
    id: "minimal",
    label: "Clean focus",
    description: "Device first, compact copy below.",
    icon: "MIN",
  },
];

const palettes = [
  ["#22c55e", "#111827"],
  ["#2563eb", "#0f172a"],
  ["#f97316", "#7f1d1d"],
  ["#14b8a6", "#164e63"],
  ["#e11d48", "#312e81"],
  ["#0f172a", "#475569"],
  ["#f59e0b", "#7c2d12"],
  ["#84cc16", "#14532d"],
  ["#64748b", "#f8fafc"],
  ["#a855f7", "#1e1b4b"],
] as const;

const defaultCopy = [
  ["Launch faster", "Create store screenshots without opening a design tool."],
  ["Show your best flow", "Put real app screens inside iOS and Android frames."],
  ["Sell the value", "Use bold copy and clean layouts for every feature."],
  ["Match both stores", "Switch between App Store and Google Play presets."],
  ["Update in minutes", "Replace screenshots whenever your product changes."],
  ["Keep visuals consistent", "Use one palette across every preview image."],
  ["Export PNG or JPG", "Choose the file type each store or team prefers."],
  ["Package all assets", "Download every page together as one ZIP file."],
  ["Built for teams", "Use repeatable templates for faster release cycles."],
  ["Ready to submit", "Generate ten polished preview screenshots at once."],
] as const;

function createInitialSlots(): Slot[] {
  return Array.from({ length: TOTAL_SLOTS }, (_, index) => ({
    title: defaultCopy[index][0],
    subtitle: defaultCopy[index][1],
    format: "png",
    imageDataUrl: "",
    imageName: "",
  }));
}

export default function Page() {
  const [platformKey, setPlatformKey] = useState<PlatformKey>("ios");
  const [templateKey, setTemplateKey] = useState<TemplateKey>("bold");
  const [bgMode, setBgMode] = useState<BackgroundMode>("gradient");
  const [colorA, setColorA] = useState("#23d18b");
  const [colorB, setColorB] = useState("#111827");
  const [selected, setSelected] = useState(0);
  const [jpgQuality, setJpgQuality] = useState(0.92);
  const [slots, setSlots] = useState<Slot[]>(createInitialSlots);
  const [status, setStatus] = useState("10 screenshot pages ready.");
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);

  const platform = platformDefs[platformKey];
  const selectedSlot = slots[selected];
  const previewB = bgMode === "solid" ? colorA : colorB;

  const stageStyle = useMemo<CSSVars>(
    () => ({
      "--shot-ratio": platform.ratio,
      "--card-width": `${platform.cardWidth}px`,
      "--preview-a": colorA,
      "--preview-b": previewB,
    }),
    [colorA, platform.cardWidth, platform.ratio, previewB],
  );

  async function assignFiles(startIndex: number, files: File[]) {
    const images = files.filter((file) => /^image\/(png|jpe?g)$/i.test(file.type));
    if (!images.length) {
      setStatus("Use PNG or JPG files only.");
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
    setStatus(`${loaded.length} image${loaded.length === 1 ? "" : "s"} uploaded.`);
  }

  function updateSelectedSlot(update: Partial<Slot>) {
    setSlots((current) =>
      current.map((slot, index) => (index === selected ? { ...slot, ...update } : slot)),
    );
  }

  function updateSlotFormat(index: number, format: ExportFormat) {
    setSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, format } : slot)),
    );
  }

  function resetCopy() {
    setSlots((current) =>
      current.map((slot, index) => ({
        ...slot,
        title: defaultCopy[index][0],
        subtitle: defaultCopy[index][1],
      })),
    );
  }

  async function exportZip() {
    try {
      setStatus("Rendering screenshots...");
      const files: ZipFile[] = [];
      for (let index = 0; index < slots.length; index += 1) {
        setStatus(`Rendering ${index + 1} of ${slots.length}...`);
        const slot = slots[index];
        const blob = await renderSlotToBlob({
          slot,
          index,
          platform,
          templateKey,
          bgMode,
          colorA,
          colorB,
          jpgQuality,
        });
        const extension = slot.format === "jpg" ? "jpg" : "png";
        files.push({
          name: `${platform.store.toLowerCase().replace(/\s+/g, "-")}-${String(index + 1).padStart(2, "0")}.${extension}`,
          data: new Uint8Array(await blob.arrayBuffer()),
        });
      }

      setStatus("Building ZIP package...");
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
      setStatus(`Exported ${files.length} files as ZIP.`);
    } catch (error) {
      console.error(error);
      setStatus("Export failed. Check the console for details.");
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setDraggingSlot(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <h1>StoreShot</h1>
            <p>App Store and Google Play preview builder</p>
          </div>
        </div>

        <section className="panel-section">
          <div className="section-label">Platform</div>
          <div className="segmented" role="group" aria-label="Platform">
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
          <div className="section-label">Template</div>
          <div className="template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-option ${template.id === templateKey ? "is-active" : ""}`}
                onClick={() => setTemplateKey(template.id)}
              >
                <span className="template-icon">{template.icon}</span>
                <span>
                  <strong>{template.label}</strong>
                  <span>{template.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-label">Background</div>
          <div className="segmented" role="group" aria-label="Background mode">
            {(["gradient", "solid"] as BackgroundMode[]).map((mode) => (
              <button
                key={mode}
                className={`segment ${bgMode === mode ? "is-active" : ""}`}
                type="button"
                onClick={() => setBgMode(mode)}
              >
                {mode === "gradient" ? "Gradient" : "Solid"}
              </button>
            ))}
          </div>
          <div className="swatches" aria-label="Color palettes">
            {palettes.map(([a, b]) => (
              <button
                key={`${a}-${b}`}
                type="button"
                className={`swatch ${a === colorA && b === colorB ? "is-active" : ""}`}
                style={{ "--a": a, "--b": b } as CSSVars}
                title={`${a} and ${b}`}
                onClick={() => {
                  setColorA(a);
                  setColorB(b);
                }}
              />
            ))}
          </div>
          <label className="field">
            <span>Primary</span>
            <input type="color" value={colorA} onChange={(event) => setColorA(event.target.value)} />
          </label>
          <label className="field">
            <span>Secondary</span>
            <input type="color" value={colorB} onChange={(event) => setColorB(event.target.value)} />
          </label>
        </section>

        <section className="panel-section">
          <div className="section-label">Selected page</div>
          <label className="field">
            <span>Headline</span>
            <textarea
              rows={3}
              maxLength={64}
              value={selectedSlot.title}
              onChange={(event) => updateSelectedSlot({ title: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Caption</span>
            <textarea
              rows={2}
              maxLength={72}
              value={selectedSlot.subtitle}
              onChange={(event) => updateSelectedSlot({ subtitle: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Format</span>
            <select
              value={selectedSlot.format}
              onChange={(event) => updateSelectedSlot({ format: event.target.value as ExportFormat })}
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
            </select>
          </label>
        </section>

        <section className="panel-section export-panel">
          <div className="section-label">Export</div>
          <label className="field">
            <span>JPG quality</span>
            <input
              type="range"
              min={72}
              max={100}
              value={Math.round(jpgQuality * 100)}
              onChange={(event) => setJpgQuality(Number(event.target.value) / 100)}
            />
          </label>
          <button className="primary-action" type="button" onClick={exportZip}>
            Export ZIP
          </button>
          <label className="secondary-action upload-button" htmlFor="bulk-input">
            Upload images
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
            <p className="eyebrow">AppLaunchpad inspired workflow</p>
            <h2>Drag screenshots into device frames, then export store-ready files.</h2>
          </div>
          <div className="topbar-actions">
            <button className="secondary-action" type="button" onClick={resetCopy}>
              Reset copy
            </button>
            <button className="primary-action" type="button" onClick={exportZip}>
              Export ZIP
            </button>
          </div>
        </header>

        <section className="stage-wrap" aria-label="Screenshot pages">
          <div className="stage" style={stageStyle}>
            {slots.map((slot, index) => (
              <article
                className={`shot-card template-${templateKey} ${index === selected ? "is-selected" : ""}`}
                key={index}
              >
                <div className="shot-toolbar">
                  <button className="slot-button" type="button" onClick={() => setSelected(index)}>
                    #{String(index + 1).padStart(2, "0")} {platform.label}
                  </button>
                  <select
                    className="format-select"
                    aria-label="Screenshot format"
                    value={slot.format}
                    onChange={(event) => updateSlotFormat(index, event.target.value as ExportFormat)}
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </select>
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
                    <h3>{slot.title}</h3>
                    <p>{slot.subtitle}</p>
                  </div>
                  <div className={`device-frame ${platform.deviceClass}`}>
                    <div className="device-screen">
                      {slot.imageDataUrl ? (
                        // User-selected data URLs are already local previews, so Next image optimization is not useful here.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={`Uploaded screenshot ${index + 1}`} src={slot.imageDataUrl} />
                      ) : (
                        <div className="empty-screen">Drop screenshot</div>
                      )}
                    </div>
                    <div className="device-camera" />
                  </div>
                  <div className="drop-indicator">Drop image here</div>
                </div>
                <div className="shot-footer">
                  <label className="upload-button" htmlFor={`slot-file-${index}`}>
                    Upload
                  </label>
                  <span className="file-name">{slot.imageName || "No image"}</span>
                  <input
                    id={`slot-file-${index}`}
                    className="visually-hidden"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => handleSlotInput(event, index, assignFiles)}
                  />
                </div>
              </article>
            ))}
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

async function renderSlotToBlob({
  slot,
  index,
  platform,
  templateKey,
  bgMode,
  colorA,
  colorB,
  jpgQuality,
}: {
  slot: Slot;
  index: number;
  platform: PlatformDef;
  templateKey: TemplateKey;
  bgMode: BackgroundMode;
  colorA: string;
  colorB: string;
  jpgQuality: number;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = platform.width;
  canvas.height = platform.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is unavailable");
  }
  const bgB = bgMode === "solid" ? colorA : colorB;
  drawBackground(ctx, canvas.width, canvas.height, colorA, bgB, bgMode);
  await drawTemplate(ctx, canvas, slot, index, platform, templateKey);
  const mime = slot.format === "jpg" ? "image/jpeg" : "image/png";
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
  templateKey: TemplateKey,
) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(w / 1290, h / 2796);
  drawDecor(ctx, w, h);

  if (templateKey === "minimal") {
    const phone = phoneRect(w, h, platform, "minimal");
    await drawPhone(ctx, phone, platform, slot.imageDataUrl);
    drawTextGroup(ctx, slot, w * 0.08, h * 0.73, w * 0.84, platform, "bottom");
    drawPageNumber(ctx, index, w, h);
    return;
  }

  if (templateKey === "split") {
    drawTextGroup(ctx, slot, w * 0.08, h * 0.09, w * 0.74, platform, "top");
    const phone = phoneRect(w, h, platform, "split");
    ctx.save();
    ctx.translate(phone.x + phone.width / 2, phone.y + phone.height / 2);
    ctx.rotate((-7 * Math.PI) / 180);
    await drawPhone(
      ctx,
      { x: -phone.width / 2, y: -phone.height / 2, width: phone.width, height: phone.height },
      platform,
      slot.imageDataUrl,
    );
    ctx.restore();
    drawPageNumber(ctx, index, w, h);
    return;
  }

  drawTextGroup(ctx, slot, w * 0.08, h * 0.08, w * 0.84, platform, "top");
  const phone = phoneRect(w, h, platform, "bold");
  await drawPhone(ctx, phone, platform, slot.imageDataUrl);
  drawChips(ctx, w, h, scale);
  drawPageNumber(ctx, index, w, h);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colorA: string,
  colorB: string,
  mode: BackgroundMode,
) {
  if (mode === "solid") {
    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawDecor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(w * 0.88, h * 0.82, w * 0.34, h * 0.12, -0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.ellipse(w * 0.16, h * 0.45, w * 0.24, h * 0.09, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function phoneRect(w: number, h: number, platform: PlatformDef, template: TemplateKey): Rect {
  const ios = platform.label === "iOS";
  if (template === "minimal") {
    const phoneH = h * (ios ? 0.55 : 0.58);
    const phoneW = phoneH * 0.49;
    return {
      x: (w - phoneW) / 2,
      y: h * 0.11,
      width: phoneW,
      height: phoneH,
    };
  }
  if (template === "split") {
    const phoneH = h * (ios ? 0.56 : 0.62);
    const phoneW = phoneH * 0.49;
    return {
      x: w * 0.42,
      y: h * (ios ? 0.35 : 0.31),
      width: phoneW,
      height: phoneH,
    };
  }
  const phoneH = h * (ios ? 0.58 : 0.57);
  const phoneW = phoneH * 0.49;
  return {
    x: (w - phoneW) / 2,
    y: h - phoneH - h * 0.075,
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
  const r = rect.width * (platform.label === "iOS" ? 0.12 : 0.09);
  ctx.save();
  ctx.shadowColor = "rgba(2, 6, 23, 0.42)";
  ctx.shadowBlur = rect.width * 0.09;
  ctx.shadowOffsetY = rect.height * 0.035;
  const frameGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  frameGradient.addColorStop(0, "#475569");
  frameGradient.addColorStop(0.18, "#111827");
  frameGradient.addColorStop(0.7, "#020617");
  frameGradient.addColorStop(1, "#94a3b8");
  ctx.fillStyle = frameGradient;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, r);
  ctx.fill();
  ctx.restore();

  const pad = rect.width * 0.045;
  const screen = {
    x: rect.x + pad,
    y: rect.y + pad,
    width: rect.width - pad * 2,
    height: rect.height - pad * 2,
  };
  ctx.save();
  roundRect(ctx, screen.x, screen.y, screen.width, screen.height, r * 0.75);
  ctx.clip();
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);

  if (dataUrl) {
    const image = await loadImage(dataUrl);
    drawImageCover(ctx, image, screen.x, screen.y, screen.width, screen.height);
  } else {
    drawEmptyScreen(ctx, screen);
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#020617";
  if (platform.label === "iOS") {
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
  const gradient = ctx.createLinearGradient(screen.x, screen.y, screen.x + screen.width, screen.y + screen.height);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(1, "#dbeafe");
  ctx.fillStyle = gradient;
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  ctx.fillStyle = "#475569";
  ctx.font = `800 ${Math.round(screen.width * 0.075)}px Inter, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Drop screenshot", screen.x + screen.width / 2, screen.y + screen.height / 2);
}

function drawTextGroup(
  ctx: CanvasRenderingContext2D,
  slot: Slot,
  x: number,
  y: number,
  maxWidth: number,
  platform: PlatformDef,
  position: "top" | "bottom",
) {
  const ios = platform.label === "iOS";
  const titleSize = Math.round(platform.width * (ios ? 0.094 : 0.078));
  const subtitleSize = Math.round(platform.width * (ios ? 0.043 : 0.034));
  const lineHeight = Math.round(titleSize * 1.03);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `900 ${titleSize}px Inter, Arial, sans-serif`;
  const used = drawWrappedText(ctx, slot.title, x, y, maxWidth, lineHeight, 4);
  ctx.font = `800 ${subtitleSize}px Inter, Arial, sans-serif`;
  ctx.globalAlpha = 0.9;
  const subtitleY = y + used + (position === "bottom" ? subtitleSize * 0.56 : subtitleSize * 0.72);
  drawWrappedText(ctx, slot.subtitle, x, subtitleY, maxWidth, Math.round(subtitleSize * 1.2), 3);
  ctx.restore();
}

function drawChips(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  const labels = ["preview", "release", "store"];
  const chipY = h * 0.88;
  let chipX = w * 0.08;
  ctx.save();
  ctx.font = `900 ${Math.round(38 * scale)}px Inter, Arial, sans-serif`;
  labels.forEach((label) => {
    const paddingX = 28 * scale;
    const chipW = ctx.measureText(label).width + paddingX * 2;
    const chipH = 72 * scale;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.fillText(label, chipX + paddingX, chipY + chipH * 0.29);
    chipX += chipW + 20 * scale;
  });
  ctx.restore();
}

function drawPageNumber(ctx: CanvasRenderingContext2D, index: number, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(w * 0.026)}px Inter, Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`#${String(index + 1).padStart(2, "0")}`, w - w * 0.055, h - h * 0.04);
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
    ctx.fillText(line, x, y + index * lineHeight);
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
