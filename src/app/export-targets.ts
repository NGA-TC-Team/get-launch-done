import type { PlatformDef, StoreTargetSpec } from "./platforms";

export type ExportExtension = "png" | "jpg";

export type ExportTarget = {
  name: string;
  slotIndex: number;
  platform: PlatformDef;
  targetSpec: StoreTargetSpec;
};

export function getExportTargets({
  targetSpecs,
  count,
  extension,
}: {
  targetSpecs: readonly StoreTargetSpec[];
  count: number;
  extension: ExportExtension;
}): ExportTarget[] {
  const targets: ExportTarget[] = [];
  const useFolders = targetSpecs.length > 1;

  for (let index = 0; index < count; index += 1) {
    const page = String(index + 1).padStart(2, "0");
    targetSpecs.forEach((targetSpec) => {
      const filePrefix = useFolders ? targetSpec.folderName : targetSpec.platform.storeSlug;
      const fileName = `${filePrefix}-${page}.${extension}`;
      targets.push({
        name: useFolders ? `${targetSpec.folderName}/${fileName}` : fileName,
        slotIndex: index,
        platform: targetSpec.platform,
        targetSpec,
      });
    });
  }

  return targets;
}
