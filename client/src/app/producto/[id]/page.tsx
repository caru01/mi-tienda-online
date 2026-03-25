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

  // 1. CARGA DE DATOS DESDE LA NUEVA ESTRUCTURA
  useEffect(() => {
    const fetchDatosProducto = async () => {
      try {
        // Traer Producto Base
        const { data: prod, error: prodErr } = await supabase
          .from("productos")
          .select("*")
          .eq("id", resolvedParams.id)
          .single();

        if (prodErr) throw prodErr;
        setProducto(prod);

        // Traer imágenes adicionales (Silencioso se la tabla no existe)
        try {
          const { data: imgs, error: imgErr } = await supabase
            .from("producto_imagenes")
            .select("*")
            .eq("producto_id", resolvedParams.id)
            .order("orden", { ascending: true });
          
          if (!imgErr && imgs) setImagenes(imgs);
          else setImagenes([]);
        } catch (e) {
          setImagenes([]);
        }

        // Traer reseñas aprobadas
        const { data: revs } = await supabase
          .from("resenas")
          .select("*")
          .eq("producto_id", resolvedParams.id)
          .eq("aprobada", true)
          .order("created_at", { ascending: false });
        setResenas(revs ?? []);
        
        // Calcular promedio inicial si hay reseñas
        const sum = (revs ?? []).reduce((acc: any, r: any) => acc + r.calificacion, 0);
        const avg = revs && revs.length > 0 ? sum / revs.length : 0;
        // (No necesitamos setPromedio si lo calculamos al vuelo o con un useMemo)

        // Traer Variantes
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

        // Si no es ropa, el stock es el de la variante única
        if (!prod.es_ropa && vars && vars.length > 0) {
          setStockDisponible(vars[0].stock);
        }

      } catch (error) {
        console.error("Error cargando producto:", error);
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) fetchDatosProducto();
  }, [resolvedParams.id]);

  // 2. ACTUALIZAR STOCK AL CAMBIAR COLOR O TALLA
  useEffect(() => {
    if (variantes.length > 0) {
      if (colorSeleccionado && tallaSeleccionada) {
        const varianteElegida = variantes.find(v => {
          const tieneColor = v.variante_atributos?.some((va:any) => va.atributo_valores?.valor.startsWith(colorSeleccionado));
          const tieneTalla = v.variante_atributos?.some((va:any) => va.atributo_valores?.valor === tallaSeleccionada);
          return tieneColor && tieneTalla;
        });
        setStockDisponible(varianteElegida?.stock || 0);
        setCantidad(1);
      } else if (colorSeleccionado) {
        // Si solo hay color, mostrar el stock total de ese color
        const totalColor = variantes
          .filter(v => v.variante_atributos?.some((va:any) => va.atributo_valores?.valor.startsWith(colorSeleccionado)))
          .reduce((acc, v) => acc + (v.stock || 0), 0);
        setStockDisponible(totalColor);
      } else {
        const total = variantes.reduce((acc, v) => acc + (v.stock || 0), 0);
        setStockDisponible(total);
      }
    }
  }, [colorSeleccionado, tallaSeleccionada, variantes]);

  const handleAddToCart = () => {
    if (variantes.length > 0 && !tallaSeleccionada) {
      toast("Por favor, selecciona una opción antes de agregar al carrito", "warning");
      return;
    }

    if (stockDisponible <= 0) {
      toast("Lo sentimos, esta opción no tiene existencias", "error");
      return;
    }

    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio_base,
      cantidad: cantidad,
      talla: `${colorSeleccionado} / ${tallaSeleccionada}` || "Única",
      imagen: producto.imagen_principal,
    });

    toast(`¡${producto.nombre} agregado a tu bolsa!`, "success");
    setIsOpen(true);
    // DISPARAR EVENTO DE ANALITICA (INTENTO DE COMPRA)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("track-purchase-intent", { detail: { productoId: producto.id } }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans uppercase font-black text-xs tracking-widest text-black">
        Cargando Galu Shop...
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="p-10 text-center font-bold text-black uppercase tracking-widest text-xs">
        Producto no encontrado
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12 text-black">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black mb-8 transition-colors">
          <ArrowLeft size={14} /> Volver a la tienda
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">

          {/* COLUMNA IZQUIERDA: GALERÍA DE IMÁGENES */}
          <div className="space-y-3">
            {/* Imagen principal */}
            <div className="relative bg-gray-50 rounded-sm overflow-hidden aspect-[3/4] group">
              <img
                src={imagenes[imgActual]?.url ?? producto.imagen_principal}
                alt={producto.nombre}
                className="w-full h-full object-cover transition-all duration-300"
              />
              {/* Navigación si hay múltiples imágenes */}
              {imagenes.length > 1 && (
                <>
                  <button onClick={() => setImgActual(p => Math.max(0, p - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <ChevronLeft size={16} className="text-black" />
                  </button>
                  <button onClick={() => setImgActual(p => Math.min(imagenes.length - 1, p + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <ChevronRight size={16} className="text-black" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {imagenes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagenes.map((img, i) => (
                  <button key={img.id} onClick={() => setImgActual(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${imgActual === i ? "border-black" : "border-transparent hover:border-gray-300"}`}>
                    <img src={img.url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: INFO */}
          <div className="flex flex-col space-y-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-1 italic">
                {producto.nombre}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                {variantes.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#B0B0B0]">
                    SKU: {variantes.find(v => {
                      const n = v.variante_atributos?.length > 0
                        ? v.variante_atributos.map((va: any) => va.atributo_valores?.valor).join(' / ')
                        : (v.sku || 'Única');
                      return n === tallaSeleccionada;
                    })?.sku || variantes[0]?.sku || "N / A"}
                  </p>
                )}
                {resenas.length > 0 && (
                  <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const promedio = resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length;
                        return (
                          <Star
                            key={star}
                            size={12}
                            className={`${star <= Math.round(promedio) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">({resenas.length})</span>
                  </div>
                )}
              </div>
              <p className="text-xl font-bold text-black">
                ${Number(producto.precio_base).toLocaleString("es-CO")}
              </p>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed border-b border-gray-100 pb-6 font-medium">
              {producto.descripcion}
            </p>

            {/* SELECCIÓN DE VARIANTE (PASOS FIJOS) */}
            {variantes.length > 0 && (
              <div className="pb-4 space-y-10">
                
                {/* 1. SELECCIÓN DE COLOR (SOLO TEXTO) */}
                {(() => {
                   const mapaColores = new Map();
                   variantes.forEach(v => {
                      v.variante_atributos?.forEach((va:any) => {
                         if (va.atributo_valores?.atributos?.nombre.toLowerCase().includes('color')) {
                            const val = va.atributo_valores.valor;
                            const [nombre] = val.split('|');
                            mapaColores.set(nombre, { nombre });
                         }
                      });
                   });

                   if (mapaColores.size === 0) return null;

                   return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black italic">1. Elige tu Color</h3>
                           <span className="text-[10px] font-black uppercase text-gray-400 italic">{colorSeleccionado || 'Selecciona uno'}</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                           {Array.from(mapaColores.values()).map((c: any) => (
                              <button
                                 key={c.nombre}
                                 onClick={() => {
                                    setColorSeleccionado(c.nombre);
                                    setTallaSeleccionada(""); 
                                 }}
                                 className={`px-6 py-4 border-2 font-black text-[12px] uppercase transition-all tracking-tighter rounded-sm ${
                                    colorSeleccionado === c.nombre ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]" : 
                                    "bg-white text-black border-black hover:bg-zinc-50 active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"
                                 }`}
                              >
                                 {c.nombre}
                              </button>
                           ))}
                        </div>
                      </div>
                   );
                })()}

                {/* 2. SELECCIÓN DE TALLA */}
                {(() => {
                   const todasLasTallas = new Set<string>();
                   variantes.forEach(v => {
                      v.variante_atributos?.forEach((va:any) => {
                         if (va.atributo_valores?.atributos?.nombre.toLowerCase().includes('talla')) {
                            todasLasTallas.add(va.atributo_valores.valor);
                         }
                      });
                   });

                   if (todasLasTallas.size === 0) return null;

                   return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black italic">2. Elige tu Talla</h3>
                           <span className="text-[10px] font-black uppercase text-gray-400 italic">{tallaSeleccionada || (colorSeleccionado ? 'Selecciona talla' : 'Espera...')}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                           {Array.from(todasLasTallas).map((t) => {
                              const varianteParaColorYTalla = variantes.find(v => {
                                 const tieneColor = !colorSeleccionado || v.variante_atributos?.some((va:any) => va.atributo_valores?.valor.startsWith(colorSeleccionado));
                                 const tieneTalla = v.variante_atributos?.some((va:any) => va.atributo_valores?.valor === t);
                                 return tieneColor && tieneTalla;
                              });

                              const isAgotado = !varianteParaColorYTalla || varianteParaColorYTalla.stock <= 0;
                              const isSelected = tallaSeleccionada === t;
                              const isOculta = colorSeleccionado && !varianteParaColorYTalla;

                              return (
                                <button
                                  key={t}
                                  disabled={isAgotado || !colorSeleccionado}
                                  onClick={() => setTallaSeleccionada(t)}
                                  className={`relative py-4 border-2 font-black text-[12px] uppercase transition-all tracking-tighter rounded-sm ${
                                    isOculta ? "hidden" :
                                    isAgotado ? "opacity-20 border-gray-100 bg-gray-50 text-gray-300 line-through cursor-not-allowed" :
                                    !colorSeleccionado ? "opacity-30 border-gray-100 text-gray-300 cursor-not-allowed" :
                                    isSelected ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(252,215,222,1)] -translate-y-1" : 
                                    "bg-white text-black border-black hover:bg-zinc-50 active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"
                                  }`}
                                >
                                  {t}
                                </button>
                              );
                           })}
                        </div>
                      </div>
                   );
                })()}

              </div>
            )}

            {/* CANTIDAD */}
            <div className="space-y-4">
              <div className="flex justify-between items-center w-32">
                <h3 className="text-[11px] font-bold text-black uppercase tracking-widest">Cantidad</h3>
              </div>
              <div className="flex items-center border border-black w-32 justify-between rounded-full px-2">
                <button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-black"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold text-sm text-black">{cantidad}</span>
                <button
                  onClick={() => {
                    if (cantidad < stockDisponible) {
                      setCantidad(cantidad + 1);
                    } else {
                      toast(`Solo hay ${stockDisponible} unidades disponibles`, "warning");
                    }
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-black"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* DISPONIBILIDAD Y BARRA DE STOCK */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-black">Disponibilidad</h3>
                  <span className={`text-[10px] font-black uppercase ${stockDisponible <= 10 && stockDisponible > 0 ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                    {stockDisponible > 0 
                      ? (stockDisponible <= 10 ? `¡Sólo quedan ${stockDisponible}!` : `Disponible (${stockDisponible} uds)`)
                      : "Sin existencias"}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200">
                  <div 
                    className={`${stockDisponible <= 10 ? 'bg-red-600' : 'bg-green-500'} h-full transition-all duration-1000 ease-out rounded-full`}
                    style={{ width: `${Math.min((stockDisponible / 15) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* BOTÓN AGREGAR */}
            <div className="flex flex-col gap-4 pt-4">
               {(() => {
                  const tieneColor = variantes.some(v => v.variante_atributos?.some((va:any) => va.atributo_valores?.atributos?.nombre.toLowerCase().includes('color')));
                  const tieneTalla = variantes.some(v => v.variante_atributos?.some((va:any) => va.atributo_valores?.atributos?.nombre.toLowerCase().includes('talla')));
                  
                  const seleccionIncompleta = (tieneColor && !colorSeleccionado) || (tieneTalla && !tallaSeleccionada);

                  return (
                    <button
                      onClick={handleAddToCart}
                      disabled={stockDisponible <= 0 || seleccionIncompleta}
                      className={`w-full font-black uppercase tracking-[0.2em] text-[12px] py-4 rounded-full transition-all flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${stockDisponible <= 0 || seleccionIncompleta
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        : "bg-black text-white hover:bg-zinc-800"
                        }`}
                    >
                      {stockDisponible <= 0 && !seleccionIncompleta ? "Agotado" : <><ShoppingBag size={18} /> Agregar al Carrito</>}
                    </button>
                  );
               })()}
            </div>

            {/* INFO EXTRA - BADGES DE CONFIANZA PREMIUM */}
            <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100">
               <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg group hover:bg-black transition-all duration-500">
                  <ShieldCheck size={24} className="text-black group-hover:text-yellow-400 transition-colors mb-2" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-center group-hover:text-white">Pago 100%<br/>Seguro</p>
               </div>
               <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg group hover:bg-black transition-all duration-500">
                  <Truck size={24} className="text-black group-hover:text-yellow-400 transition-colors mb-2" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-center group-hover:text-white">Envíos<br/>Nacionales</p>
               </div>
               <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg group hover:bg-black transition-all duration-500">
                  <RefreshCw size={24} className="text-black group-hover:text-yellow-400 transition-colors mb-2" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-center group-hover:text-white">Garantía<br/>Galu Shop</p>
               </div>
            </div>

            <div className="mt-4 p-4 bg-zinc-50 border-l-4 border-black">
                <p className="text-[9px] text-gray-500 leading-normal font-bold uppercase italic">
                  * Cambios únicamente el mismo día de la compra por artículos de igual o mayor valor. No realizamos devoluciones de dinero.
                </p>
            </div>
          </div>
        </div>

        {/* ── SECCIÓN DE RESEÑAS ── */}
        <div className="mt-20 border-t border-gray-100 pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Reseñas existentes */}
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tight text-black mb-6">
                Opiniones de Clientes
                {resenas.length > 0 && (
                  <span className="ml-3 text-sm font-bold text-gray-400 not-italic">({resenas.length})</span>
                )}
              </h2>

              {resenas.length === 0 ? (
                <div className="bg-gray-50 rounded-sm p-8 text-center">
                  <Star size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm font-bold uppercase">Sé el primero en opinar</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {resenas.map(r => (
                    <div key={r.id} className="border-b border-gray-100 pb-5">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-black text-sm uppercase text-black">{r.cliente_nombre}</p>
                          <p className="text-gray-400 text-[9px]">{new Date(r.created_at).toLocaleDateString("es-CO")}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={14} className={s <= r.calificacion ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                          ))}
                        </div>
                      </div>
                      {r.titulo && <p className="font-black text-[12px] text-black mb-1">{r.titulo}</p>}
                      {r.comentario && <p className="text-gray-500 text-sm leading-relaxed">{r.comentario}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form nueva reseña */}
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tight text-black mb-6">Deja tu Reseña</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setEnviandoResena(true);
                const { error } = await supabase.from("resenas").insert([{
                  producto_id: producto.id,
                  cliente_nombre: resenaForm.nombre,
                  cliente_email: resenaForm.email,
                  calificacion: resenaForm.calificacion,
                  comentario: resenaForm.comentario,
                  aprobada: false,
                }]);
                if (error) toast("Error al enviar la reseña", "error");
                else {
                  toast("¡Reseña enviada! Será publicada tras revisión.", "success");
                  setResenaForm({ nombre: "", email: "", calificacion: 5, comentario: "" });
                }
                setEnviandoResena(false);
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Tu nombre" className="p-3 border-2 border-black font-bold text-sm text-black outline-none" value={resenaForm.nombre} onChange={e => setResenaForm({ ...resenaForm, nombre: e.target.value })} />
                  <input required type="email" placeholder="Tu correo" className="p-3 border-2 border-black font-bold text-sm text-black outline-none" value={resenaForm.email} onChange={e => setResenaForm({ ...resenaForm, email: e.target.value })} />
                </div>
                {/* Estrellas interactivas */}
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Calificación</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button type="button" key={s} onClick={() => setResenaForm({ ...resenaForm, calificacion: s })}>
                        <Star size={24} className={s <= resenaForm.calificacion ? "text-yellow-400 fill-yellow-400" : "text-gray-200 hover:text-yellow-300"} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea required rows={4} placeholder="Cuéntanos tu experiencia con el producto..." className="w-full p-3 border-2 border-black font-medium text-sm text-black outline-none resize-none" value={resenaForm.comentario} onChange={e => setResenaForm({ ...resenaForm, comentario: e.target.value })} />
                <button type="submit" disabled={enviandoResena}
                  className="w-full bg-black text-white font-black uppercase tracking-widest py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-40">
                  {enviandoResena ? "Enviando…" : <><Send size={16} /> Publicar Reseña</>}
                </button>
                <p className="text-[9px] text-gray-400 font-bold">* Las reseñas se publican tras ser revisadas por nuestro equipo.</p>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
