import type { NextConfig } from "next";

// TEMPORARY DIAGNOSTIC - remove once the Supabase URL issue is confirmed fixed.
// Prints only the SHAPE of the env vars (length, whether it looks like a URL,
// whether it has stray quotes/whitespace) - never the actual secret value.
// This runs during `next build`, so it shows up in the Vercel build log even
// though the dashboard itself can never reveal a "Sensitive" variable's value.
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