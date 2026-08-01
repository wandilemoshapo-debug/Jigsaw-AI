import type { NextConfig } from "next";

// TEMPORARY DIAGNOSTIC - remove once the Supabase URL issue is confirmed fixed.
function inspect(name: string) {
  const v = process.env[name] || '';
  console.log(`[ENV CHECK] ${name}:`, {
    length: v.length,
    startsWithHttps: v.startsWith('https://'),
    hasDoubleQuote: v.includes('"'),
    hasSingleQuote: v.includes("'"),
    hasNewline: v.includes('\n'),
    hasLeadingOrTrailingSpace: v !== v.trim(),
    firstChar: v.slice(0, 1),
    lastChar: v.slice(-1),
  });
}
inspect('NEXT_PUBLIC_SUPABASE_URL');
inspect('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;