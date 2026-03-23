"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-[#FCD7DE] text-4xl font-black italic tracking-tighter mb-2">GALU SHOP</div>
          <div className="text-white/30 text-[10px] font-black uppercase tracking-[0.4em]">Panel de Administración</div>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-white text-lg font-black uppercase italic mb-8">Iniciar Sesión</h1>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-[11px] font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="admin@galushop.com"
                className="w-full bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3.5 rounded-xl text-sm font-bold outline-none focus:border-[#FCD7DE]/40 transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Lock size={12} /> Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3.5 rounded-xl text-sm font-bold outline-none focus:border-[#FCD7DE]/40 transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FCD7DE] text-black font-black uppercase tracking-[0.15em] py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white transition-all text-sm disabled:opacity-40 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verificando…
                </>
              ) : (
                <>Entrar al Panel <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/15 text-[9px] uppercase tracking-widest mt-8">
          © {new Date().getFullYear()} GALU SHOP · Solo acceso autorizado
        </p>
      </div>
    </div>
  );
}