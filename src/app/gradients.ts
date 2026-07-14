export type GradientType = "linear" | "radial";

export type GradientStop = {
  id: string;
  color: string;
  position: number;
};

export type GradientConfig = {
  type: GradientType;
  angle: number;
  stops: GradientStop[];
};

export function normalizeGradientStops(stops: GradientStop[]) {
  return stops
    .map((stop) => ({
      ...stop,
      position: clampStopPosition(stop.position),
    }))
    .sort((a, b) => a.position - b.position);
}

export function createCssGradient(config: GradientConfig) {
  const stops = normalizeGradientStops(config.stops);
  const stopText = stops.map((stop) => `${stop.color} ${stop.position}%`).join(", ");

  if (config.type === "radial") {
    return `radial-gradient(circle at center, ${stopText})`;
  }

  return `linear-gradient(${normalizeAngle(config.angle)}deg, ${stopText})`;
}

export function getSolidGradientColor(config: GradientConfig) {
  return normalizeGradientStops(config.stops)[0]?.color ?? "#111111";
}

export function normalizeHexColor(input: string) {
  const value = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    const [r, g, b] = value.toLowerCase().split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return `#${value.toLowerCase()}`;
  }
  return null;
}

function clampStopPosition(position: number) {
  if (!Number.isFinite(position)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(position)));
}

function normalizeAngle(angle: number) {
  if (!Number.isFinite(angle)) {
    return 135;
  }
  return Math.round(((angle % 360) + 360) % 360);
}
