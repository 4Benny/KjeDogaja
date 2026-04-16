export type LatLng = { lat: number; lng: number };

export const CITY_FALLBACK_COORDS: Record<string, LatLng> = {
  slovenia: { lat: 46.1512, lng: 14.9955 },
  ljubljana: { lat: 46.0569, lng: 14.5058 },
  maribor: { lat: 46.5547, lng: 15.6459 },
  celje: { lat: 46.2397, lng: 15.2677 },
  koper: { lat: 45.5481, lng: 13.7302 },
  "novo mesto": { lat: 45.803, lng: 15.1689 },
};

export function normalizeCityKey(city: string | null | undefined): string {
  return String(city || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function coordsForCity(city: string | null | undefined): LatLng {
  const key = normalizeCityKey(city);
  return CITY_FALLBACK_COORDS[key] || CITY_FALLBACK_COORDS.slovenia;
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export function resolveEventCoords(eventLike: any): LatLng {
  const lat = Number(eventLike?.lat ?? eventLike?.latitude);
  const lng = Number(eventLike?.lng ?? eventLike?.longitude);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return coordsForCity(eventLike?.city);
}
