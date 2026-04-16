import { supabase } from "@/app/integrations/supabase/client";

type ResolveArgs = {
  bucket: string;
  value: string | null | undefined;
  expiresIn?: number;
};

const DEFAULT_EXPIRES_IN = 60 * 60; // 1h

type StorageUrlCacheEntry = {
  url: string;
  expiresAtMs: number;
};

const storageUrlCache = new Map<string, StorageUrlCacheEntry>();

function cacheKey({ bucket, path, exp }: { bucket: string; path: string; exp: number }): string {
  return `${bucket}|${exp}|${path}`;
}

function tryExtractBucketPath(bucket: string, value: string): string | null {
  // Already a plain path
  if (!value.startsWith("http")) {
    return value.replace(/^\/+/, "");
  }

  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  const signedIndex = value.indexOf(signedMarker);
  if (signedIndex >= 0) {
    return value.slice(signedIndex + signedMarker.length).split("?")[0];
  }

  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = value.indexOf(publicMarker);
  if (markerIndex >= 0) {
    return value.slice(markerIndex + publicMarker.length).split("?")[0];
  }

  // Sometimes URLs can be in the form .../storage/v1/object/${bucket}/...
  const genericMarker = `/storage/v1/object/${bucket}/`;
  const genericIndex = value.indexOf(genericMarker);
  if (genericIndex >= 0) {
    return value.slice(genericIndex + genericMarker.length).split("?")[0];
  }

  return null;
}

export function extractStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // Strip common prefixes
  return v.replace(/^\//, "");
}

export async function resolveStorageUrl({ bucket, value, expiresIn = 60 * 60 }: ResolveArgs): Promise<string | null> {
  const path = extractStoragePath(value);
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Try signed URL first (works for private buckets, and also for public buckets).
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // ignore
  }

  // Fallback to public URL.
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}
