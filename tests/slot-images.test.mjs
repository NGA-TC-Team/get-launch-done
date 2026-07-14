import { describe, expect, test } from "bun:test";
import { applyLoadedImagesToSlots } from "../src/app/slot-images";

describe("applyLoadedImagesToSlots", () => {
  test("여러 이미지를 시작 위치부터 순서대로 채운다", () => {
    const slots = createSlots(5);
    const loaded = [
      { imageDataUrl: "data:first", imageName: "01.png" },
      { imageDataUrl: "data:second", imageName: "02.png" },
      { imageDataUrl: "data:third", imageName: "03.png" },
    ];

    const result = applyLoadedImagesToSlots(slots, 1, loaded);

    expect(result.map((slot) => slot.imageName)).toEqual(["", "01.png", "02.png", "03.png", ""]);
    expect(result.map((slot) => slot.imageDataUrl)).toEqual([
      "",
      "data:first",
      "data:second",
      "data:third",
      "",
    ]);
  });

  test("남은 슬롯보다 이미지가 많으면 초과 이미지는 버린다", () => {
    const slots = createSlots(3);
    const loaded = [
      { imageDataUrl: "data:first", imageName: "01.png" },
      { imageDataUrl: "data:second", imageName: "02.png" },
      { imageDataUrl: "data:third", imageName: "03.png" },
    ];

    const result = applyLoadedImagesToSlots(slots, 2, loaded);

    expect(result.map((slot) => slot.imageName)).toEqual(["", "", "01.png"]);
  });
});

function createSlots(count) {
  return Array.from({ length: count }, () => ({
    title: "",
    subtitle: "",
    imageDataUrl: "",
    imageName: "",
    templateId: "hero-center-01",
  }));
}
