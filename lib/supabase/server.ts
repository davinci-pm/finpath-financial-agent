import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "./client";

/**
 * 服务端 Supabase client（cookies 会话，RLS 生效）。
 * 未配置 Supabase 时返回 null，调用方回退到 DemoRepository。
 */
export async function createServerSupabaseClient() {
  if (!hasSupabaseEnv()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components 中无法写 cookie，忽略（Route Handler 可写）
          }
        },
      },
    },
  );
}
