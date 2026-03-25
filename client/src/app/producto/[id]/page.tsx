"use client";
import React, { useState, useEffect, use } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingBag, Truck, ShieldCheck, ArrowLeft, RefreshCw, Plus, Minus, Star, ChevronLeft, ChevronRight, Send } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

export default function ProductoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [producto, setProducto] = useState<any>(null);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [imagenes, setImagenes] = useState<any[]>([]);
  const [resenas, setResenas] = useState<any[]>([]);
  const [imgActual, setImgActual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [colorSeleccionado, setColorSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [stockDisponible, setStockDisponible] = useState(0);
  // Form reseña
  const [resenaForm, setResenaForm] = useState({ nombre: "", email: "", calificacion: 5, comentario: "" });
  const [enviandoResena, setEnviandoResena] = useState(false);

  const { addToCart, setIsOpen } = useCart();
  const { toast } = useToast();

  // 1. CARGA DE DATOS
  useEffect(() => {
    const fetchDatosProducto = async () => {
      try {
        const { data: prod, error: prodErr } = await supabase
          .from("productos")
          .select("*")
          .eq("id", resolvedParams.id)
          .single();

        if (prodErr) throw prodErr;
        setProducto(prod);

        try {
          const { data: imgs } = await supabase
            .from("producto_imagenes")
            .select("*")
            .eq("producto_id", resolvedParams.id)
            .order("orden", { ascending: true });
          setImagenes(imgs || []);
        } catch (e) {
          setImagenes([]);
        }

        const { data: revs } = await supabase
          .from("resenas")
          .select("*")
          .eq("producto_id", resolvedParams.id)
          .eq("aprobada", true)
          .order("created_at", { ascending: false });
        setResenas(revs ?? []);
        
        const { data: vars, error: varsErr } = await supabase
          .from("variantes_producto")
          .select(`
            id, 
            stock, 
            sku,
            variante_atributos (
              atributo_valores (
                valor,
                atributos (nombre)
              )
            )
          `)
          .eq("producto_id", resolvedParams.id)
          .eq("activo", true);

        if (varsErr) throw varsErr;
        setVariantes(vars || []);

      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    if (resolvedParams.id) fetchDatosProducto();
  }, [resolvedParams.id]);

  // Detectar atributos existentes
  const tieneColor = variantes.some(v => v.variante_atributos?.some((va:any) => va.atributo_valores?.atributos?.nombre.toLowerCase().includes('color')));
  const tieneTalla = variantes.some(v => v.variante_atributos?.some((va:any) => va.atributo_valores?.atributos?.nombre.toLowerCase().includes('talla')));

  // 2. ACTUALIZAR STOCK
  useEffect(() => {
    if (variantes.length > 0) {
      if (tieneColor && tieneTalla) {
        if (colorSeleccionado && tallaSeleccionada) {
          const v = variantes.find(v => 
            v.variante_atributos?.some((va:any) => va.atributo_valores?.valor.startsWith(colorSeleccionado)) &&
            v.variante_atributos?.some((va:any) => va.atributo_valores?.valor === tallaSeleccionada)
          );
          setStockDisponible(v ? v.stock : 0);
        } else {
          setStockDisponible(0);
        }
      } else if (tieneColor && !tieneTalla) {
        if (colorSeleccionado) {
          const v = variantes.find(v => v.variante_atributos?.some((va:any) => va.atributo_valores?.valor.startsWith(colorSeleccionado)));
          setStockDisponible(v ? v.stock : 0);
        } else {
          setStockDisponible(0);
        }
      } else if (!tieneColor && tieneTalla) {
        if (tallaSeleccionada) {
          const v = variantes.find(v => v.variante_atributos?.some((va:any) => va.atributo_valores?.valor === tallaSeleccionada));
          setStockDisponible(v ? v.stock : 0);
        } else {
          setStockDisponible(0);
        }
      } else {
        setStockDisponible(variantes[0]?.stock || 0);
      }
    } else {
      setStockDisponible(producto?.stock_total || 0);
    }
    setCantidad(1);
  }, [colorSeleccionado, tallaSeleccionada, variantes, tieneColor, tieneTalla, producto?.stock_total]);

  const handleAddToCart = () => {
    const faltaColor = tieneColor && !colorSeleccionado;
    const faltaTalla = tieneTalla && !tallaSeleccionada;

    if (variantes.length > 0 && (faltaColor || faltaTalla)) {
      toast(`Elige ${faltaColor ? 'color' : ''}${faltaColor && faltaTalla ? ' y ' : ''}${faltaTalla ? 'talla' : ''}`, "warning");
      return;
    }

    if (stockDisponible <= 0) {
      toast("No hay unidades disponibles", "error");
      return;
    }

    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio_base,
      cantidad: cantidad,
      talla: `${colorSeleccionado || ''} ${tallaSeleccionada || ''}`.trim() || "Única",
      imagen: producto.imagen_principal
    });
    toast(`¡${producto.nombre} agregado!`, "success");
    setIsOpen(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-xs tracking-widest text-black">Cargando...</div>;
  if (!producto) return <div className="p-10 text-center font-bold text-black uppercase tracking-widest text-xs">No encontrado</div>;

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-12 text-black">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black mb-8">
          <ArrowLeft size={14} /> Volver
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* GALERÍA */}
          <div className="space-y-3">
            <div className="relative bg-gray-50 rounded-sm overflow-hidden aspect-[3/4] group border">
              <img src={imagenes[imgActual]?.url ?? producto.imagen_principal} alt={producto.nombre} className="w-full h-full object-cover" />
              {imagenes.length > 1 && (
                <>
                  <button onClick={() => setImgActual(p => Math.max(0, p - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={18} /></button>
                  <button onClick={() => setImgActual(p => Math.min(imagenes.length - 1, p + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={18} /></button>
                </>
              )}
            </div>
            {imagenes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imagenes.map((img, i) => (
                  <button key={img.id} onClick={() => setImgActual(i)} className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${imgActual === i ? "border-black" : "border-transparent opacity-60"}`}>
                    <img src={img.url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-black uppercase text-black italic">{producto.nombre}</h1>
              <div className="flex items-center gap-6">
                <p className="text-3xl font-bold text-black font-sans">${Number(producto.precio_base).toLocaleString("es-CO")}</p>
                {resenas.length > 0 && (
                   <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                     <div className="flex text-yellow-400">
                       {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(resenas.reduce((a,b)=>a+b.calificacion,0)/resenas.length) ? "fill-current" : "text-gray-200"} />)}
                     </div>
                     <span className="text-[10px] font-black">({resenas.length})</span>
                   </div>
                )}
              </div>
              <p className="text-gray-500 text-[15px] leading-relaxed font-medium">{producto.descripcion}</p>
            </div>

            {/* SELECCIÓN */}
            {variantes.length > 0 && (
              <div className="space-y-10 border-y py-10">
                {tieneColor && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <h3 className="text-[11px] font-black uppercase tracking-widest italic">1. Elige Color</h3>
                      <span className="text-[10px] font-black uppercase text-gray-400">{colorSeleccionado || 'Selecciona uno'}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {Array.from(new Set(variantes.flatMap(v => v.variante_atributos.filter((va:any) => va.atributo_valores.atributos.nombre.toLowerCase().includes('color')).map((va:any) => va.atributo_valores.valor.split('|')[0])))).map(c => (
                        <button key={c} onClick={() => { setColorSeleccionado(c); if(tieneTalla) setTallaSeleccionada(""); }} className={`px-6 py-4 border-2 font-black text-[12px] uppercase transition-all rounded-sm ${colorSeleccionado === c ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]" : "bg-white text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                )}

                {tieneTalla && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <h3 className="text-[11px] font-black uppercase tracking-widest italic">2. Elige Talla</h3>
                      <span className="text-[10px] font-black uppercase text-gray-400">{tallaSeleccionada || 'Selecciona talla'}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {Array.from(new Set(variantes.flatMap(v => v.variante_atributos.filter((va:any) => va.atributo_valores.atributos.nombre.toLowerCase().includes('talla')).map((va:any) => va.atributo_valores.valor)))).map(t => {
                        const vMatch = variantes.find(v => (!tieneColor || !colorSeleccionado || v.variante_atributos.some((va:any) => va.atributo_valores.valor.startsWith(colorSeleccionado))) && v.variante_atributos.some((va:any) => va.atributo_valores.valor === t));
                        const isAgotado = !vMatch || vMatch.stock <= 0;
                        const isOculta = tieneColor && colorSeleccionado && !vMatch;
                        return (
                          <button key={t} disabled={isAgotado || (tieneColor && !colorSeleccionado)} onClick={() => setTallaSeleccionada(t)} className={`py-4 border-2 font-black text-[12px] uppercase transition-all rounded-sm ${isOculta ? "hidden" : isAgotado ? "opacity-20 line-through" : (tieneColor && !colorSeleccionado) ? "opacity-30" : tallaSeleccionada === t ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]" : "bg-white text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"}`}>{t}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACCIONES */}
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 border-2 border-black rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <button onClick={() => setCantidad(p => Math.max(1, p-1))}><Minus size={18} /></button>
                  <span className="w-8 text-center text-lg font-black">{cantidad}</span>
                  <button onClick={() => setCantidad(p => p < stockDisponible ? p + 1 : p)}><Plus size={18} /></button>
                </div>
                <p className={`text-[11px] font-black uppercase italic ${stockDisponible > 0 ? "text-green-600" : "text-red-500"}`}>{stockDisponible > 0 ? `Stock: ${stockDisponible}` : "Agotado"}</p>
              </div>
              <button disabled={stockDisponible <= 0 || (tieneColor && !colorSeleccionado) || (tieneTalla && !tallaSeleccionada)} onClick={handleAddToCart} className={`w-full py-6 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all rounded-sm ${stockDisponible > 0 && (!tieneColor || colorSeleccionado) && (!tieneTalla || tallaSeleccionada) ? "bg-black text-white shadow-[6px_6px_0px_0px_rgba(252,215,222,1)]" : "bg-gray-100 text-gray-300 border-2"}`}><ShoppingBag size={24} /> Añadir al Carrito</button>
            </div>

            {/* BADGES */}
            <div className="pt-8 grid grid-cols-3 gap-4 border-t">
              {[ {icon: ShieldCheck, text: "Pago Seguro"}, {icon: Truck, text: "Nacional"}, {icon: RefreshCw, text: "Garantía"} ].map((b, i) => (
                <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg group hover:bg-black transition-all">
                  <b.icon size={24} className="group-hover:text-yellow-400 mb-2" />
                  <p className="text-[8px] font-black uppercase text-center group-hover:text-white">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RESEÑAS */}
        <div className="mt-20 border-t pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Opiniones</h2>
              {resenas.length === 0 ? <p className="text-gray-400 text-xs font-black uppercase">Sé el primero en opinar</p> : (
                <div className="space-y-6">
                  {resenas.map(r => (
                    <div key={r.id} className="border-b pb-6">
                      <div className="flex justify-between mb-2">
                        <p className="font-black text-sm uppercase">{r.cliente_nombre}</p>
                        <div className="flex text-yellow-400">{[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= r.calificacion ? "fill-current" : "text-gray-200"} />)}</div>
                      </div>
                      <p className="text-gray-600 text-sm">{r.comentario}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-2xl font-black uppercase italic mb-8">Escribe una reseña</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setEnviandoResena(true);
                const { error } = await supabase.from("resenas").insert([{ producto_id: producto.id, cliente_nombre: resenaForm.nombre, cliente_email: resenaForm.email, calificacion: resenaForm.calificacion, comentario: resenaForm.comentario }]);
                if (error) toast("Error", "error");
                else { toast("Enviada", "success"); setResenaForm({ nombre: "", email: "", calificacion: 5, comentario: "" }); }
                setEnviandoResena(false);
              }} className="space-y-6">
                <input required placeholder="Nombre" className="w-full p-4 border-2 border-black font-bold outline-none" value={resenaForm.nombre} onChange={e => setResenaForm({...resenaForm, nombre: e.target.value})} />
                <input required type="email" placeholder="Email" className="w-full p-4 border-2 border-black font-bold outline-none" value={resenaForm.email} onChange={e => setResenaForm({...resenaForm, email: e.target.value})} />
                <div className="flex gap-2">{[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => setResenaForm({...resenaForm, calificacion: s})}><Star size={24} className={s <= resenaForm.calificacion ? "text-yellow-400 fill-current" : "text-gray-300"} /></button>)}</div>
                <textarea required placeholder="Comentario" className="w-full p-4 border-2 border-black font-medium outline-none resize-none" rows={4} value={resenaForm.comentario} onChange={e => setResenaForm({...resenaForm, comentario: e.target.value})} />
                <button type="submit" disabled={enviandoResena} className="w-full bg-black text-white font-black uppercase py-5 shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]">{enviandoResena ? "..." : "Publicar"}</button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
