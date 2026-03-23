"use client";
import React, { useState } from "react";
import { supabase } from "../../../lib/supabase"; 
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error de acceso: " + error.message);
      setLoading(false);
    } else {
      alert("¡Bienvenido, Administrador!");
      router.push("/admin");
    }
  };

  return (
    // Se añade font-sans y style Arial para asegurar la tipografía
    <div className="min-h-screen bg-[#FCD7DE] flex items-center justify-center px-4 font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-md w-full bg-white p-10 shadow-2xl rounded-sm border-t-8 border-black">
        
        <div className="text-center mb-10">
          {/* Cambiado a text-black y tracking normal para lectura clara */}
          <h1 className="text-4xl font-black italic uppercase mb-2 tracking-tighter text-black">
            GALU SHOP
          </h1>
          <p className="text-xs font-bold text-black uppercase tracking-widest">
            Admin Login
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            {/* Etiquetas ahora en negro puro y un poco más grandes */}
            <label className="text-xs font-black uppercase flex items-center gap-2 text-black">
              <Mail size={14} className="text-black" /> Correo Electrónico
            </label>
            <input 
              type="email" 
              required
              className="w-full p-4 border-2 border-black outline-none focus:bg-gray-50 text-base font-bold text-black placeholder:text-gray-400"
              placeholder="admin@galushop.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase flex items-center gap-2 text-black">
              <Lock size={14} className="text-black" /> Contraseña
            </label>
            <input 
              type="password" 
              required
              className="w-full p-4 border-2 border-black outline-none focus:bg-gray-50 text-base font-bold text-black placeholder:text-gray-400"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white font-black uppercase tracking-[0.1em] py-5 flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all text-sm disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar al Panel"} <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}