"use client";

export default function TestEnv() {
  return (
    <div className="p-10">
      <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      <p>KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "OK" : "NO KEY"}</p>
    </div>
  );
}
