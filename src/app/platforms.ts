export type PlatformKey = "ios" | "android";

export type PlatformDef = {
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

export const platformDefs: Record<PlatformKey, PlatformDef> = {
  ios: {
    label: "iOS",
    store: "앱스토어",
    storeSlug: "app-store",
    sizeLabel: "앱스토어 내보내기: 1284 x 2778 (iPhone 6.5 디스플레이)",
    width: 1284,
    height: 2778,
    ratio: "1284 / 2778",
    cardWidth: 288,
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
