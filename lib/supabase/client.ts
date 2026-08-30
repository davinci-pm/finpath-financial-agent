import { createClient } from "@supabase/supabase-js";

/** Supabase 是否已配置（存在 URL 与 anon key） */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** 浏览器端 Supabase client（仅在有凭据时创建） */
export function createBrowserSupabaseClient() {
  if (!hasSupabaseEnv()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
