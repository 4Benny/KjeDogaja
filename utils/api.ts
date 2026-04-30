import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/app/integrations/supabase/client";

type Json = any;

// Android tends to have slower networks, especially on 4G/3G
const DEFAULT_TIMEOUT_MS = Platform.OS === 'android' ? 20000 : 12000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;

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

function isNetworkError(err: any): boolean {
  const message = (err?.message?.toLowerCase() || '');
  const name = err?.name?.toLowerCase() || '';
  
  return (
    name === 'aborterror' ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('econnreset') ||
    message.includes('fetchwithretry') ||
    (err?.status >= 502 && err?.status <= 504)
  );
}

async function requestJson<T = Json>(
  method: string,
  endpoint: string,
  body?: unknown,
  init?: RequestInit & { timeoutMs?: number; retryCount?: number }
): Promise<T> {
  const baseUrl = getConfiguredBackendUrl();
  if (!baseUrl) {
    throw new Error("Backend is not configured.");
  }

  // Validate URL format at runtime
  try {
    const urlString = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    new URL(urlString);
  } catch (err) {
    throw new Error(`Invalid backend URL: ${err}`);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const retryCount = init?.retryCount ?? 0;

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
      
      // Retry on server errors
      if (res.status >= 502 && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return requestJson(method, endpoint, body, {
          ...init,
          retryCount: retryCount + 1,
        });
      }
      
      throw err;
    }

    return parsed;
  } catch (err: any) {
    // Retry on network errors (but not AbortError from intentional cancel)
    if (retryCount < MAX_RETRIES && isNetworkError(err) && err.name !== 'AbortError') {
      const delay = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
      console.log(`[API] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms for ${method} ${endpoint}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return requestJson(method, endpoint, body, {
        ...init,
        retryCount: retryCount + 1,
      });
    }

    // Don't log AbortError as it's expected when component unmounts
    if (err.name !== 'AbortError') {
      console.error(`[API] ${method} ${endpoint} failed:`, err);
    }

    throw err;
  } finally {
    clearTimeout(timeout);
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