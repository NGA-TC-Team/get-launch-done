export type LoadedSlotImage = {
  imageDataUrl: string;
  imageName: string;
};

export function applyLoadedImagesToSlots<TSlot extends LoadedSlotImage>(
  slots: TSlot[],
  startIndex: number,
  loaded: LoadedSlotImage[],
) {
  return slots.map((slot, index) => {
    const loadedIndex = index - startIndex;
    if (loadedIndex < 0 || loadedIndex >= loaded.length) {
      return slot;
    }
    return {
      ...slot,
      ...loaded[loadedIndex],
    };
  });
}
