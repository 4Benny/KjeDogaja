import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/app/integrations/supabase/client";

type Json = any;

const DEFAULT_TIMEOUT_MS = 12000;

function getConfiguredBackendUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;
  const fromExtra = (Constants.expoConfig as any)?.extra?.backendUrl as string | undefined;

  const raw = (fromEnv || fromExtra || "").trim();
  if (!raw) return null;

  // Disallow obvious placeholders.
  if (raw.includes("<") && raw.includes(">")) return null;

  // Normalize (no trailing slash)
  return raw.replace(/\/+$/, "");
}

export function isBackendConfigured(): boolean {
  return Boolean(getConfiguredBackendUrl());
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function requestJson<T = Json>(
  method: string,
  endpoint: string,
  body?: unknown,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const baseUrl = getConfiguredBackendUrl();
  if (!baseUrl) {
    throw new Error("Backend is not configured.");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const token = await getAuthToken();

  try {
    const res = await fetch(url, {
      ...init,
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const parsed = isJson && text ? (JSON.parse(text) as T) : (text as any as T);

    if (!res.ok) {
      const msg =
        typeof parsed === "string"
          ? parsed
          : (parsed as any)?.error || (parsed as any)?.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      (err as any).status = res.status;
      (err as any).url = url;
      (err as any).platform = Platform.OS;
      throw err;
    }

    return parsed;
  } finally {
    clearTimeout(t);
  }
}

export async function authenticatedGet<T = Json>(endpoint: string, init?: RequestInit) {
  return requestJson<T>("GET", endpoint, undefined, init);
}

export async function authenticatedPost<T = Json>(endpoint: string, body?: unknown, init?: RequestInit) {
  return requestJson<T>("POST", endpoint, body, init);
}

export async function authenticatedPut<T = Json>(endpoint: string, body?: unknown, init?: RequestInit) {
  return requestJson<T>("PUT", endpoint, body, init);
}

export async function authenticatedDelete<T = Json>(endpoint: string, init?: RequestInit) {
  return requestJson<T>("DELETE", endpoint, undefined, init);
}