"use client";
import React, { useState, useEffect, use } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingBag, Truck, ShieldCheck, ArrowLeft, RefreshCw, Plus, Minus, Star, ChevronLeft, ChevronRight, Send, Copy } from "lucide-react";
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
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<Record<string, string>>({});
  const [cantidad, setCantidad] = useState(1);
  const [stockDisponible, setStockDisponible] = useState(0);
  const [skuActual, setSkuActual] = useState("");
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
        
        // Inicializar SKU por defecto
        if (prod.sku) setSkuActual(prod.sku);
        else if (vars && vars.length > 0) setSkuActual(vars[0].sku || "");

      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    if (resolvedParams.id) fetchDatosProducto();
  }, [resolvedParams.id]);

  // Agrupar atributos disponibles dinámicamente
  const gruposAtributos = React.useMemo(() => {
    const grupos: Record<string, string[]> = {};
    variantes.forEach(v => {
      v.variante_atributos?.forEach((va: any) => {
        const nombreAttr = va.atributo_valores?.atributos?.nombre;
        const valorAttr = va.atributo_valores?.valor;
        if (nombreAttr && valorAttr) {
          if (!grupos[nombreAttr]) grupos[nombreAttr] = [];
          if (!grupos[nombreAttr].includes(valorAttr)) {
            grupos[nombreAttr].push(valorAttr);
          }
        }
      });
    });
    return grupos;
  }, [variantes]);

  // 2. ACTUALIZAR STOCK DINÁMICO
  useEffect(() => {
    if (variantes.length > 0) {
      const nombresAtributosRequeridos = Object.keys(gruposAtributos);
      const seleccionCompleta = nombresAtributosRequeridos.every(nombre => atributosSeleccionados[nombre]);

      if (nombresAtributosRequeridos.length > 0) {
        if (seleccionCompleta) {
          const vFound = variantes.find(v => {
            return nombresAtributosRequeridos.every(nombre => {
              const valorSeleccionado = atributosSeleccionados[nombre];
              return v.variante_atributos?.some((va: any) => 
                va.atributo_valores?.atributos?.nombre === nombre && 
                va.atributo_valores?.valor === valorSeleccionado
              );
            });
          });
          if (vFound) {
            setStockDisponible(vFound.stock);
            if (vFound.sku) setSkuActual(vFound.sku);
          } else {
            setStockDisponible(0);
          }
        }
      } else {
        setStockDisponible(variantes[0]?.stock || 0);
        if (variantes[0]?.sku) setSkuActual(variantes[0]?.sku);
      }
    } else {
      setStockDisponible(producto?.stock_total || 0);
      if (producto?.sku) setSkuActual(producto?.sku);
    }
    setCantidad(1);
  }, [atributosSeleccionados, variantes, gruposAtributos, producto?.stock_total, producto?.sku]);

  const handleAddToCart = () => {
    const nombresAtributosRequeridos = Object.keys(gruposAtributos);
    const atributosFaltantes = nombresAtributosRequeridos.filter(nombre => !atributosSeleccionados[nombre]);

    if (variantes.length > 0 && atributosFaltantes.length > 0) {
      toast(`Por favor elige: ${atributosFaltantes.join(', ')}`, "warning");
      return;
    }

    if (stockDisponible <= 0) {
      toast("No hay unidades disponibles", "error");
      return;
    }

    const detalleVariante = Object.entries(atributosSeleccionados)
      .map(([k, v]) => `${k}: ${v.split('|')[0]}`)
      .join(' / ');

    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio_base,
      cantidad: cantidad,
      talla: detalleVariante || "Única",
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
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-black">{producto.nombre}</h1>
                <div className="flex items-center gap-3 group">
                  <p className="text-[10px] font-bold text-gray-400">SKU: {skuActual || producto.sku || 'N/A'}</p>
                  {(skuActual || producto.sku) && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(skuActual || producto.sku);
                        toast("Código copiado", "success");
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copiar SKU"
                    >
                      <Copy size={10} className="text-gray-400" />
                    </button>
                  )}
                  {/* ESTRELLAS AL LADO DEL SKU */}
                  <div className={`flex gap-0.5 ml-1 ${resenas.length > 0 ? "text-yellow-400" : "text-gray-200"}`}>
                    {[1, 2, 3, 4, 5].map(s => {
                      const val = resenas.length > 0 ? Math.round(resenas.reduce((a, b) => a + b.calificacion, 0) / resenas.length) : 0;
                      return <Star key={s} size={12} className={s <= val ? "fill-current" : ""} />;
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <p className="text-2xl font-bold text-black font-sans">${Number(producto.precio_base).toLocaleString("es-CO")}</p>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="text-gray-500 text-[14px] leading-relaxed font-normal">{producto.descripcion}</p>
              </div>
            </div>

            {variantes.length > 0 && (
              <div className="space-y-6">
                {Object.entries(gruposAtributos).map(([nombreGroup, valores]) => (
                  <div key={nombreGroup} className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase italic tracking-widest text-black">{nombreGroup}</h3>
                    <div className="flex flex-wrap gap-2">
                      {valores.map(val => (
                        <button 
                          key={val} 
                          onClick={() => setAtributosSeleccionados(prev => ({...prev, [nombreGroup]: val}))} 
                          className={`px-6 py-2 border font-bold text-[11px] uppercase transition-all rounded-full ${atributosSeleccionados[nombreGroup] === val ? "bg-black text-white border-black" : "bg-white text-black border-gray-200 hover:border-black"}`}
                        >
                          {val.split('|')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-8">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase italic tracking-widest text-black">Cantidad</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center w-fit gap-4 bg-white px-4 py-2 border border-gray-200 rounded-full">
                    <button onClick={() => setCantidad(p => Math.max(1, p-1))}><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-bold">{cantidad}</span>
                    <button onClick={() => setCantidad(p => p < stockDisponible ? p + 1 : p)}><Plus size={14} /></button>
                  </div>
                  {stockDisponible > 0 ? (
                    <span className="text-[10px] font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                      {stockDisponible} en stock
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                      Producto Agotado
                    </span>
                  )}
                </div>
              </div>

              <button 
                disabled={stockDisponible <= 0 || Object.keys(gruposAtributos).some(n => !atributosSeleccionados[n])} 
                onClick={handleAddToCart} 
                className={`w-full py-5 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all rounded-full ${stockDisponible > 0 && Object.keys(gruposAtributos).every(n => atributosSeleccionados[n]) ? "bg-[#e5e7eb] text-[#374151] hover:bg-gray-300" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}
              >
                <ShoppingBag size={18} /> Agregar al Carrito
              </button>

              {/* BADGES VERTICALES CON COLORES */}
              <div className="space-y-6 pt-8 border-t border-gray-100">
                <div className="flex items-start gap-4">
                  <ShieldCheck size={20} className="text-blue-500 mt-0.5" />
                  <p className="text-[10px] font-bold uppercase text-gray-900 tracking-tight">Pago 100% Seguro</p>
                </div>
                <div className="flex items-start gap-4">
                  <Truck size={20} className="text-green-500 mt-0.5" />
                  <p className="text-[10px] font-bold uppercase text-gray-900 tracking-tight">Envíos a todo Colombia</p>
                </div>
                <div className="flex items-start gap-4">
                  <RefreshCw size={20} className="text-orange-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-gray-900 tracking-tight">Política de devolución</p>
                    <p className="text-[9px] text-gray-500 leading-tight font-medium">No realizamos devoluciones de dinero. Sin embargo, puedes cambiar tu artículo por otro de igual valor o de mayor valor pagando la diferencia.</p>
                  </div>
                </div>
              </div>
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
