"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_")) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and run the SQL migration.");
  }
  if (!cached) {
    cached = createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
  }
  return cached;
}

export function throwOnError<T>(result: { data: T; error: { message: string } | null }): T;
export function throwOnError(result: { error: { message: string } | null }): void;
export function throwOnError<T>(result: { data?: T; error: { message: string } | null }): T | undefined {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
