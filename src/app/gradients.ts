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
