import type { PlatformDef, PlatformKey } from "./platforms";

export type ExportExtension = "png" | "jpg";

export type ExportTarget = {
  name: string;
  slotIndex: number;
  platform: PlatformDef;
};

export const ipadExportDef: PlatformDef = {
  label: "iPad",
  store: "앱스토어 iPad",
  storeSlug: "ipad",
  sizeLabel: "앱스토어 iPad 내보내기: 2048 x 2732 (iPad 12.9 또는 13 디스플레이)",
  width: 2048,
  height: 2732,
  ratio: "2048 / 2732",
  cardWidth: 288,
  deviceClass: "ios",
};

export function getExportTargets({
  platformKey,
  platform,
  count,
  extension,
}: {
  platformKey: PlatformKey;
  platform: PlatformDef;
  count: number;
  extension: ExportExtension;
}): ExportTarget[] {
  const targets: ExportTarget[] = [];

  for (let index = 0; index < count; index += 1) {
    const page = String(index + 1).padStart(2, "0");
    targets.push({
      name: `${platform.storeSlug}-${page}.${extension}`,
      slotIndex: index,
      platform,
    });

    if (platformKey === "ios") {
      targets.push({
        name: `ipad/ipad-${page}.${extension}`,
        slotIndex: index,
        platform: ipadExportDef,
      });
    }
  }

  return targets;
}
