export type PlatformKey = "ios" | "android";
export type StoreTargetCategory = "phone" | "tablet" | "tv" | "watch";
export type StoreRenderMode = "composed" | "raw-interface";
export type StoreTargetId =
  | "ios-phone-69"
  | "ios-tablet-13"
  | "ios-tv"
  | "ios-watch"
  | "android-phone"
  | "android-tablet"
  | "android-tv"
  | "android-wear";

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
  renderMode?: StoreRenderMode;
};

export type StoreTargetSpec = {
  id: StoreTargetId;
  platformKey: PlatformKey;
  category: StoreTargetCategory;
  label: string;
  shortLabel: string;
  description: string;
  requirement: string;
  folderName: string;
  isDefault: boolean;
  platform: PlatformDef;
};

export const storeTargetSpecs: Record<StoreTargetId, StoreTargetSpec> = {
  "ios-phone-69": {
    id: "ios-phone-69",
    platformKey: "ios",
    category: "phone",
    label: "iPhone 6.9",
    shortLabel: "Phone",
    description: "App Store iPhone 최고 해상도 세로 스크린샷",
    requirement: "필수 권장: 1320 x 2868, 1~10장",
    folderName: "iphone-69",
    isDefault: true,
    platform: {
      label: "iOS",
      store: "앱스토어",
      storeSlug: "app-store",
      sizeLabel: "앱스토어 iPhone 6.9 내보내기: 1320 x 2868",
      width: 1320,
      height: 2868,
      ratio: "1320 / 2868",
      cardWidth: 288,
      deviceClass: "ios",
      renderMode: "composed",
    },
  },
  "ios-tablet-13": {
    id: "ios-tablet-13",
    platformKey: "ios",
    category: "tablet",
    label: "iPad 13",
    shortLabel: "Tablet",
    description: "iPad 지원 앱용 13인치 App Store 규격",
    requirement: "iPad 실행 앱 필수: 2064 x 2752",
    folderName: "ipad-13",
    isDefault: false,
    platform: {
      label: "iPad",
      store: "앱스토어 iPad",
      storeSlug: "ipad-13",
      sizeLabel: "앱스토어 iPad 13 내보내기: 2064 x 2752",
      width: 2064,
      height: 2752,
      ratio: "2064 / 2752",
      cardWidth: 288,
      deviceClass: "ios",
      renderMode: "composed",
    },
  },
  "ios-tv": {
    id: "ios-tv",
    platformKey: "ios",
    category: "tv",
    label: "Apple TV",
    shortLabel: "TV",
    description: "tvOS 앱용 App Store 스크린샷",
    requirement: "Apple TV 앱 필수: 1920 x 1080",
    folderName: "apple-tv",
    isDefault: false,
    platform: {
      label: "Apple TV",
      store: "앱스토어 Apple TV",
      storeSlug: "apple-tv",
      sizeLabel: "앱스토어 Apple TV 내보내기: 1920 x 1080",
      width: 1920,
      height: 1080,
      ratio: "1920 / 1080",
      cardWidth: 360,
      deviceClass: "tv",
      renderMode: "raw-interface",
    },
  },
  "ios-watch": {
    id: "ios-watch",
    platformKey: "ios",
    category: "watch",
    label: "Apple Watch",
    shortLabel: "Watch",
    description: "watchOS 앱용 최신 Apple Watch 규격",
    requirement: "Apple Watch 앱 필수: 422 x 514",
    folderName: "apple-watch",
    isDefault: false,
    platform: {
      label: "Apple Watch",
      store: "앱스토어 Apple Watch",
      storeSlug: "apple-watch",
      sizeLabel: "앱스토어 Apple Watch 내보내기: 422 x 514",
      width: 422,
      height: 514,
      ratio: "422 / 514",
      cardWidth: 220,
      deviceClass: "watch",
      renderMode: "raw-interface",
    },
  },
  "android-phone": {
    id: "android-phone",
    platformKey: "android",
    category: "phone",
    label: "Android Phone",
    shortLabel: "Phone",
    description: "Google Play 휴대전화 권장 세로 스크린샷",
    requirement: "권장: 1080 x 1920, 최소 4장",
    folderName: "android-phone",
    isDefault: true,
    platform: {
      label: "Android",
      store: "구글 플레이",
      storeSlug: "google-play",
      sizeLabel: "구글 플레이 Phone 내보내기: 1080 x 1920",
      width: 1080,
      height: 1920,
      ratio: "1080 / 1920",
      cardWidth: 312,
      deviceClass: "android",
      renderMode: "composed",
    },
  },
  "android-tablet": {
    id: "android-tablet",
    platformKey: "android",
    category: "tablet",
    label: "Android Tablet",
    shortLabel: "Tablet",
    description: "Google Play 태블릿/Chromebook 권장 가로 스크린샷",
    requirement: "대화면 권장: 1920 x 1080, 최소 4장",
    folderName: "android-tablet",
    isDefault: false,
    platform: {
      label: "Android Tablet",
      store: "구글 플레이 Tablet",
      storeSlug: "android-tablet",
      sizeLabel: "구글 플레이 Tablet 내보내기: 1920 x 1080",
      width: 1920,
      height: 1080,
      ratio: "1920 / 1080",
      cardWidth: 360,
      deviceClass: "android",
      renderMode: "raw-interface",
    },
  },
  "android-tv": {
    id: "android-tv",
    platformKey: "android",
    category: "tv",
    label: "Android TV",
    shortLabel: "TV",
    description: "Android TV 배포용 Google Play 스크린샷",
    requirement: "TV 배포 필수: 1920 x 1080 1장 이상",
    folderName: "android-tv",
    isDefault: false,
    platform: {
      label: "Android TV",
      store: "구글 플레이 TV",
      storeSlug: "android-tv",
      sizeLabel: "구글 플레이 Android TV 내보내기: 1920 x 1080",
      width: 1920,
      height: 1080,
      ratio: "1920 / 1080",
      cardWidth: 360,
      deviceClass: "tv",
      renderMode: "raw-interface",
    },
  },
  "android-wear": {
    id: "android-wear",
    platformKey: "android",
    category: "watch",
    label: "Wear OS",
    shortLabel: "Wear",
    description: "Wear OS 앱/워치페이스용 정사각형 스크린샷",
    requirement: "Wear OS 필수: 384 x 384 이상, 1:1",
    folderName: "wear-os",
    isDefault: false,
    platform: {
      label: "Wear OS",
      store: "구글 플레이 Wear OS",
      storeSlug: "wear-os",
      sizeLabel: "구글 플레이 Wear OS 내보내기: 384 x 384",
      width: 384,
      height: 384,
      ratio: "384 / 384",
      cardWidth: 220,
      deviceClass: "watch",
      renderMode: "raw-interface",
    },
  },
};

export const storeTargetOrder: Record<PlatformKey, StoreTargetId[]> = {
  ios: ["ios-phone-69", "ios-tablet-13", "ios-tv", "ios-watch"],
  android: ["android-phone", "android-tablet", "android-tv", "android-wear"],
};

export const platformDefs: Record<PlatformKey, PlatformDef> = {
  ios: storeTargetSpecs["ios-phone-69"].platform,
  android: storeTargetSpecs["android-phone"].platform,
};

export function getDefaultStoreTargetIds(platformKey: PlatformKey): StoreTargetId[] {
  return storeTargetOrder[platformKey].filter((id) => storeTargetSpecs[id].isDefault);
}

export function getStoreTargetSpecs(platformKey: PlatformKey, selectedTargetIds: readonly string[]): StoreTargetSpec[] {
  const selected = new Set(
    selectedTargetIds.filter((id): id is StoreTargetId => isStoreTargetId(id) && storeTargetSpecs[id].platformKey === platformKey),
  );
  const specs = storeTargetOrder[platformKey].filter((id) => selected.has(id)).map((id) => storeTargetSpecs[id]);
  return specs.length ? specs : getDefaultStoreTargetIds(platformKey).map((id) => storeTargetSpecs[id]);
}

export function isStoreTargetId(value: string): value is StoreTargetId {
  return Object.prototype.hasOwnProperty.call(storeTargetSpecs, value);
}
