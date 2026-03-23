"use client";
import React, { useEffect, useState } from "react";
import { Image as ImageIcon, Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

const EMPTY = { titulo: "", subtitulo: "", imagen_url: "", imagen_movil: "", enlace: "", activo: true, orden: 0 };

export default function TabBanners({ toast }: { toast: (m: string, t?: any) => void }) {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ ...EMPTY });
    const [guardando, setGuardando] = useState(false);

    const cargar = async () => {
        const { data } = await supabase.from("banners").select("*").order("orden", { ascending: true });
        setBanners(data ?? []);
        setLoading(false);
    };

    useEffect(() => { cargar(); }, []);

    const crearBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        const { error } = await supabase.from("banners").insert([{
            titulo: form.titulo || null,
            subtitulo: form.subtitulo || null,
            imagen_url: form.imagen_url,
            imagen_movil: form.imagen_movil || null,
            enlace: form.enlace || null,
            activo: form.activo,
            orden: banners.length,
        }]);
        if (error) toast(error.message, "err");
        else { toast("Banner creado ✓", "ok"); setForm({ ...EMPTY }); cargar(); }
        setGuardando(false);
    };

    const toggleActivo = async (id: string, activo: boolean) => {
        await supabase.from("banners").update({ activo: !activo }).eq("id", id);
        cargar();
    };

    const eliminar = async (id: string) => {
        if (!confirm("¿Eliminar este banner?")) return;
        await supabase.from("banners").delete().eq("id", id);
        toast("Banner eliminado", "ok");
        cargar();
    };

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-black uppercase italic text-white">Banners del Carrusel</h2>

            {/* Vista previa actual */}
            {banners.filter(b => b.activo).length > 0 && (
                <div>
                    <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-3">Vista previa — Banner activo</p>
                    <div className="relative aspect-[16/5] rounded-xl overflow-hidden border border-white/10">
                        <img src={banners.filter(b => b.activo)[0]?.imagen_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center px-8">
                            {banners.filter(b => b.activo)[0]?.titulo && (
                                <p className="text-white text-2xl font-black uppercase italic">{banners.filter(b => b.activo)[0].titulo}</p>
                            )}
                            {banners.filter(b => b.activo)[0]?.subtitulo && (
                                <p className="text-white/70 text-sm">{banners.filter(b => b.activo)[0].subtitulo}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Formulario nuevo banner */}
            <form onSubmit={crearBanner} className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6 space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 border-b border-white/8 pb-3">
                    Agregar Nuevo Banner
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required placeholder="URL de la imagen (1400×500px recomendado)"
                        className="md:col-span-2 bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none focus:border-[#FCD7DE]/40"
                        value={form.imagen_url} onChange={e => setForm({ ...form, imagen_url: e.target.value })} />
                    <input placeholder="Título (opcional)"
                        className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
                        value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
                    <input placeholder="Subtítulo (opcional)"
                        className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
                        value={form.subtitulo} onChange={e => setForm({ ...form, subtitulo: e.target.value })} />
                    <input placeholder="URL de destino al hacer clic (opcional)"
                        className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
                        value={form.enlace} onChange={e => setForm({ ...form, enlace: e.target.value })} />
                    <input placeholder="URL imagen móvil (opcional)"
                        className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
                        value={form.imagen_movil} onChange={e => setForm({ ...form, imagen_movil: e.target.value })} />
                </div>

                {/* Preview URL mientras escribe */}
                {form.imagen_url && (
                    <div className="relative aspect-[16/4] rounded-lg overflow-hidden border border-white/10">
                        <img src={form.imagen_url} alt="Preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = "")} />
                    </div>
                )}

                <button type="submit" disabled={guardando}
                    className="w-full bg-[#FCD7DE] text-black font-black uppercase tracking-widest py-3.5 rounded-lg hover:bg-white transition-all text-[11px] disabled:opacity-40">
                    {guardando ? "Guardando…" : "Añadir Banner"}
                </button>
            </form>

            {/* Lista de banners */}
            <div className="space-y-3">
                {loading ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#1a1a1a] rounded-xl animate-pulse" />)}</div>
                ) : banners.map((b, idx) => (
                    <div key={b.id} className={`bg-[#1a1a1a] border rounded-xl overflow-hidden flex gap-4 p-4 ${b.activo ? "border-white/8" : "border-white/3 opacity-50"}`}>
                        <div className="w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                            <img src={b.imagen_url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-[12px] font-black uppercase">{b.titulo || "Sin título"}</p>
                            <p className="text-white/40 text-[10px] truncate mt-0.5">{b.imagen_url}</p>
                            {b.enlace && <p className="text-[#FCD7DE] text-[9px] mt-0.5">→ {b.enlace}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-white/20 text-[9px] font-black">#{idx + 1}</span>
                            <button onClick={() => toggleActivo(b.id, b.activo)}
                                className={`p-2 rounded-lg transition-all ${b.activo ? "text-green-400 hover:bg-green-500/20" : "text-white/20 hover:bg-white/5"}`}>
                                {b.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button onClick={() => eliminar(b.id)}
                                className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                {!loading && banners.length === 0 && (
                    <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-16 text-center">
                        <ImageIcon size={40} className="mx-auto text-white/10 mb-4" />
                        <p className="text-white/30 text-[11px] uppercase font-black">Sin banners. Añade el primero.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
