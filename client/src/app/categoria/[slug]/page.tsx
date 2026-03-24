"use client";
import React, { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ShoppingCart, Eye, X, Plus, Minus, ChevronRight, Star, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

export default function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const { addToCart, setIsOpen } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const [productosDB, setProductosDB] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaNombre, setCategoriaNombre] = useState("");

  // Filtros dinámicos
  const [filtrosAtributos, setFiltrosAtributos] = useState<Record<string, string>>({});
  const [precioInfo, setPrecioInfo] = useState({ min: 0, max: 1000000, current: 1000000 });
  const [orden, setOrden] = useState("novedad");

  // Estados para el popup de selección rápida (Igual al carrusel)
  const [seleccionarId, setSeleccionarId] = useState<string | null>(null);
  const [opcionTemporal, setOpcionTemporal] = useState("");
  const [cantTemp, setCantTemp] = useState(1);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [stockMaximo, setStockMaximo] = useState(0);

  // Estados Interacción Móvil
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [showSortMobile, setShowSortMobile] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const { data: catData } = await supabase
          .from('categorias')
          .select('id, nombre')
          .eq('slug', slug)
          .single();

        if (catData) {
          setCategoriaNombre(catData.nombre);
          const { data: prods, error } = await supabase
            .from('productos')
            .select(`
              *,
              variantes_producto (
                stock,
                sku,
                variante_atributos (
                  atributo_valores (
                    valor,
                    atributos (nombre)
                  )
                )
              ),
              resenas (
                calificacion
              )
            `)
            .eq("resenas.aprobada", true)
            .eq('categoria_id', catData.id)
            .eq('activo', true);

          if (error) throw error;
          if (prods && prods.length > 0) {
            setProductosDB(prods);
            
            // Configurar los rangos de precio inicialmente
            const maxPrice = Math.max(...prods.map((p: any) => p.precio_base));
            const minPrice = Math.min(...prods.map((p: any) => p.precio_base));
            setPrecioInfo({ min: minPrice, max: maxPrice, current: maxPrice });
          } else {
            setProductosDB([]);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [slug]);

  // Cargar variantes cuando se hace clic para añadir
  const cargarVariantes = async (prodId: string) => {
    const { data } = await supabase
      .from('variantes_producto')
      .select('*, variante_atributos(atributo_valores(valor, atributos(nombre)))')
      .eq('producto_id', prodId)
      .eq('activo', true);
    
    if (data) {
      setVariantes(data);
      const prodActual = productosDB.find(p => p.id === prodId);
      if (data.length === 1 && (!data[0].variante_atributos || data[0].variante_atributos.length === 0)) {
        setStockMaximo(data[0].stock);
      }
    }
  };

  useEffect(() => {
    if (opcionTemporal && variantes.length > 0) {
      const v = variantes.find(v => {
        const nOpcion = v.variante_atributos?.length > 0 
          ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
          : v.sku || 'Única';
        return nOpcion === opcionTemporal;
      });
      setStockMaximo(v?.stock || 0);
    }
  }, [opcionTemporal, variantes]);

  const handleConfirmarAdd = (prod: any) => {
    const tieneOpciones = variantes.some(v => v.variante_atributos && v.variante_atributos.length > 0);
    if (tieneOpciones && !opcionTemporal) return;

    addToCart({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio_base,
      cantidad: cantTemp,
      talla: opcionTemporal || "Única",
      imagen: prod.imagen_principal
    });
    setSeleccionarId(null);
    setOpcionTemporal("");
    setCantTemp(1);
    setIsOpen(true);
    toast(`¡${prod.nombre} agregado!`, "success");
  };

  const atributosDisponibles = useMemo(() => {
    const grupos: Record<string, Set<string>> = {};
    productosDB.forEach(p => {
      p.variantes_producto?.forEach((vp: any) => {
        vp.variante_atributos?.forEach((va: any) => {
          const attrName = va.atributo_valores?.atributos?.nombre || "Opciones";
          const attrVal = va.atributo_valores?.valor;
          if (attrVal) {
            if (!grupos[attrName]) grupos[attrName] = new Set();
            grupos[attrName].add(attrVal);
          }
        });
      });
    });
    return grupos;
  }, [productosDB]);

  const productosProcesados = useMemo(() => {
    let resultado = [...productosDB].filter((p) => {
      // Filtro Precio (Usando Slider Mínimo/Máximo)
      const coincidePrecio = p.precio_base >= precioInfo.min && p.precio_base <= precioInfo.current;

      // Filtro Atributos Dinámicos
      const coincideAtributos = Object.entries(filtrosAtributos).every(([attrName, attrVal]) => {
        if (!attrVal) return true; // Ignorar si no está filtrado
        return p.variantes_producto?.some((vp: any) =>
          vp.variante_atributos?.some((va: any) => 
            va.atributo_valores?.atributos?.nombre === attrName && 
            va.atributo_valores?.valor === attrVal
          )
        );
      });

      return coincidePrecio && coincideAtributos;
    });

    if (orden === "precio-menor") resultado.sort((a, b) => a.precio_base - b.precio_base);
    if (orden === "precio-mayor") resultado.sort((a, b) => b.precio_base - a.precio_base);
    if (orden === "novedad") resultado.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (orden === "a-z") resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return resultado;
  }, [productosDB, precioInfo, filtrosAtributos, orden]);

  const toggleFiltroAtributo = (nombreAttr: string, valorAttr: string) => {
    setFiltrosAtributos(prev => ({
      ...prev,
      [nombreAttr]: prev[nombreAttr] === valorAttr ? "" : valorAttr
    }));
  };

  const hayFiltrosActivos = precioInfo.current < precioInfo.max || Object.values(filtrosAtributos).some(val => val !== "");

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 text-black">
        {/* BREADCRUMB */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b pb-4 border-gray-100">
          <nav className="hidden md:block text-black uppercase tracking-widest text-[11px] font-medium">
            Inicio <span className="mx-2 text-gray-300">/</span> <span className="font-black text-black">{categoriaNombre.toUpperCase()}</span>
          </nav>

          {/* CABECERA MÓVIL: NOMBRE */}
          <div className="w-full md:hidden flex flex-col items-center gap-2 mb-6 text-center">
            <h1 className="text-4xl font-black uppercase text-black italic tracking-tighter">
              {categoriaNombre}
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Nuestra Selección de Temporada</p>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <span className="text-[10px] font-black uppercase text-black">Ordenar por:</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="bg-white border-2 border-black rounded-none px-4 py-2 text-[10px] font-black uppercase text-black outline-none transition cursor-pointer"
            >
              <option value="novedad">Novedades</option>
              <option value="precio-menor">Precio: Menor a Mayor</option>
              <option value="precio-mayor">Precio: Mayor a Menor</option>
              <option value="a-z">Nombre: A-Z</option>
            </select>
          </div>
        </div>

        {/* BARRA FLOTANTE MÓVIL (MÁS PROFESIONAL) */}
        <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[40] w-full px-10 pointer-events-none">
          <div className="max-w-[280px] mx-auto bg-black text-white rounded-full flex divide-x divide-white/20 shadow-2xl pointer-events-auto border border-white/10 overflow-hidden scale-100 active:scale-95 transition-transform">
            <button 
              onClick={() => { setShowFiltersMobile(true); setShowSortMobile(false); }}
              className={`flex-1 flex items-center justify-center gap-3 py-4 hover:bg-zinc-900 transition-colors ${showFiltersMobile ? 'bg-zinc-800' : ''}`}
            >
              <SlidersHorizontal size={14} className="text-white/70" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                Filtrar {hayFiltrosActivos && <span className="ml-1 text-yellow-500">•</span>}
              </span>
            </button>
            <button 
              onClick={() => { setShowSortMobile(!showSortMobile); setShowFiltersMobile(false); }}
              className={`flex-1 flex items-center justify-center gap-3 py-4 hover:bg-zinc-900 transition-colors ${showSortMobile ? 'bg-zinc-800' : ''}`}
            >
              <ArrowUpDown size={14} className="text-white/70" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Ordenar</span>
            </button>
          </div>
        </div>

        {/* POPUP DE ORDENAMIENTO MÓVIL (MODERNIZADO) */}
        <AnimatePresence>
          {showSortMobile && (
            <div className="md:hidden fixed inset-0 z-[110] flex items-end">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowSortMobile(false)}
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                className="relative w-full bg-white rounded-t-3xl p-8 shadow-2xl space-y-4 border-t-2 border-black"
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest italic">Opciones de ordenamiento</h3>
                  <button onClick={() => setShowSortMobile(false)} className="text-black/30 hover:text-black">
                     <X size={20} />
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { id: "novedad", label: "Novedades de Temporada" },
                    { id: "precio-menor", label: "Precio: Menor a Mayor" },
                    { id: "precio-mayor", label: "Precio: Mayor a Menor" },
                    { id: "a-z", label: "Nombre: ALfabético (A-Z)" }
                  ].map((opt) => (
                    <button 
                      key={opt.id} 
                      onClick={() => { setOrden(opt.id); setShowSortMobile(false); }}
                      className={`w-full text-left py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-wide transition-all ${orden === opt.id ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-black active:bg-zinc-100'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DRAWER DE FILTROS MÓVIL (LEFT SIDE) */}
        <AnimatePresence>
          {showFiltersMobile && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowFiltersMobile(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
              />
              <motion.div 
                initial={{ x: "-100%" }} 
                animate={{ x: 0 }} 
                exit={{ x: "-100%" }} 
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 h-full w-[85%] max-w-[320px] bg-white z-[101] md:hidden shadow-2xl flex flex-col pt-6 pb-8"
              >
                <div className="flex justify-between items-center px-6 mb-6">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-black">Filtrar por</h2>
                  <button onClick={() => setShowFiltersMobile(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="px-6 mb-8">
                   <button
                    onClick={() => { 
                      setPrecioInfo(prev => ({ ...prev, current: prev.max })); 
                      setFiltrosAtributos({}); 
                    }}
                    className="text-red-600 font-bold uppercase text-[10px] tracking-widest border-b border-red-100 hover:border-red-600 transition-all"
                  >
                    Restablecer filtros
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-10 custom-scrollbar pb-10">
                  {/* FILTRO DE PRECIO */}
                  <div>
                    <div className="flex justify-between mb-4">
                      <h3 className="text-[11px] font-black text-black uppercase tracking-widest">Presupuesto</h3>
                      <span className="text-[11px] font-black text-zinc-600">${precioInfo.current.toLocaleString("es-CO")}</span>
                    </div>
                    <input
                      type="range"
                      min={precioInfo.min}
                      max={precioInfo.max}
                      step={5000}
                      value={precioInfo.current}
                      onChange={(e) => setPrecioInfo(prev => ({ ...prev, current: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                  </div>

                  {/* FILTROS ATRIBUTOS */}
                  {Object.entries(atributosDisponibles).map(([nombreAttr, valoresSet]) => (
                    <div key={nombreAttr}>
                      <h3 className="text-[11px] font-black text-black uppercase tracking-widest mb-4">{nombreAttr}</h3>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(valoresSet as Set<string>).map((valorAttr) => {
                          const estaSeleccionado = filtrosAtributos[nombreAttr] === valorAttr;
                          return (
                            <button
                              key={valorAttr}
                              onClick={() => toggleFiltroAtributo(nombreAttr, valorAttr)}
                              className={`px-3 py-2 min-w-[32px] text-[9px] font-black uppercase border-2 flex items-center justify-center transition-all ${
                                estaSeleccionado 
                                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                                  : 'bg-white text-black border-2 border-transparent hover:border-black'
                              }`}
                            >
                              {valorAttr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 mt-auto">
                  <button 
                    onClick={() => setShowFiltersMobile(false)}
                    className="w-full bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] py-4 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800 transition-all"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row gap-12">
          {/* ASIDE DE FILTROS DESKTOP */}
          <aside className="hidden md:block w-56 space-y-12 flex-shrink-0 sticky top-24 h-fit">
            <h2 className="text-sm font-black uppercase tracking-widest text-black border-b-2 border-black pb-2 italic">Filtrar por</h2>

            {/* FILTRO DE RANGO DE PRECIO */}
            <div>
              <div className="flex justify-between mb-4 mt-2">
                <h3 className="text-[11px] font-black text-black uppercase tracking-widest">Presupuesto</h3>
                <span className="text-[11px] font-black text-zinc-600">${precioInfo.current.toLocaleString("es-CO")}</span>
              </div>
              
              <div className="relative pt-1">
                <input
                   type="range"
                   min={precioInfo.min}
                   max={precioInfo.max}
                   step={5000}
                   value={precioInfo.current}
                   onChange={(e) => setPrecioInfo(prev => ({ ...prev, current: parseInt(e.target.value) }))}
                   className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-2 uppercase tracking-widest">
                  <span>Mín: ${precioInfo.min.toLocaleString("es-CO")}</span>
                  <span>Máx: ${precioInfo.max.toLocaleString("es-CO")}</span>
                </div>
              </div>
            </div>

            {/* FILTROS DINÁMICOS POR ATRIBUTOS (DEPENDIENTES DE BD) */}
            {Object.entries(atributosDisponibles).map(([nombreAttr, valoresSet]) => (
              <div key={nombreAttr}>
                <h3 className="text-[11px] font-black text-black uppercase tracking-widest mb-4">{nombreAttr}</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(valoresSet as Set<string>).map((valorAttr) => {
                    const estaSeleccionado = filtrosAtributos[nombreAttr] === valorAttr;
                    return (
                      <button
                        key={valorAttr}
                        onClick={() => toggleFiltroAtributo(nombreAttr, valorAttr)}
                        className={`px-3 py-2 min-w-[32px] text-[9px] font-black uppercase border-2 flex items-center justify-center transition-all ${
                          estaSeleccionado 
                            ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                            : 'bg-white text-black border-2 border-transparent hover:border-black'
                        }`}
                      >
                        {valorAttr}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* BOTÓN LIMPIAR */}
            {hayFiltrosActivos && (
              <button
                onClick={() => { 
                  setPrecioInfo(prev => ({ ...prev, current: prev.max })); 
                  setFiltrosAtributos({}); 
                }}
                className="w-full text-[10px] font-black uppercase tracking-widest text-white bg-black py-3 hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
              >
                ✕ Limpiar filtros
              </button>
            )}
          </aside>

          {/* GRID DE PRODUCTOS */}
          <div className="flex-1">
            {loading ? (
              <p className="text-center py-20 text-[10px] font-black uppercase tracking-widest text-black">Cargando Galu Shop...</p>
            ) : productosProcesados.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 md:gap-x-6 gap-y-8 md:gap-y-12">
                {productosProcesados.map((prod) => (
                  <div 
                    key={prod.id} 
                    className="group/item flex flex-col bg-white product-card-global relative"
                  >
                    <div 
                      className="aspect-[3/4] overflow-hidden bg-gray-50 rounded-none mb-4 relative border border-gray-100 cursor-pointer"
                      onClick={() => {
                        if (!seleccionarId) {
                          router.push(`/producto/${prod.id}`);
                        }
                      }}
                    >
                      <img
                        src={prod.imagen_principal}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-700"
                      />

                      <div 
                        className={`absolute inset-0 transition-all flex items-center justify-center p-2 
                        ${seleccionarId === prod.id ? 'opacity-100 pointer-events-auto bg-black/5' : 'opacity-100 md:opacity-0 md:group-hover/item:opacity-100 pointer-events-auto md:bg-black/5'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!seleccionarId) {
                            router.push(`/producto/${prod.id}`);
                          }
                        }}
                      >
                        {seleccionarId === prod.id ? (
                          <motion.div 
                            initial={{ scale: 0.9 }} 
                            animate={{ scale: 1 }} 
                            className="bg-white p-3 w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-between border-b pb-1 border-gray-100">
                              <span className="text-[9px] font-black uppercase text-black italic">Añadir</span>
                              <button onClick={(e) => { e.stopPropagation(); setSeleccionarId(null); }} className="text-black"><X size={14} /></button>
                            </div>

                            {variantes.some(v => v.variante_atributos?.length > 0) && (
                              <div className="text-left w-full space-y-1 mb-2">
                                <label className="text-[9px] font-black text-black uppercase">
                                  {variantes[0]?.variante_atributos?.[0]?.atributo_valores?.atributos?.nombre || "Opciones"}:
                                </label>
                                <select
                                  value={opcionTemporal}
                                  onChange={(e) => { e.stopPropagation(); setOpcionTemporal(e.target.value); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full border-2 border-black p-1 text-[10px] font-black bg-white text-black outline-none"
                                >
                                  <option value="">Selecciona...</option>
                                  {variantes.map((v: any) => {
                                    const nombreOpcion = v.variante_atributos?.length > 0 
                                      ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
                                      : v.sku;
                                    return (
                                      <option key={v.id} value={nombreOpcion} disabled={v.stock <= 0}>
                                        {nombreOpcion} {v.stock <= 0 ? '(Agotado)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}

                            <div className="flex justify-between items-center w-full px-1">
                               <span className="text-[9px] font-black uppercase italic text-black">CANTIDAD:</span>
                               {(opcionTemporal || !variantes.some(v => v.variante_atributos?.length > 0)) && (
                                 <span className={`text-[8px] font-black uppercase italic ${stockMaximo > 5 ? "text-green-600" : stockMaximo > 0 ? "text-orange-600" : "text-red-500"}`}>Stock disp: {stockMaximo}</span>
                               )}
                            </div>

                            <div className="flex items-center justify-between border-2 border-black p-1 bg-white">
                              <button onClick={() => setCantTemp(prev => Math.max(1, prev - 1))} className="text-black p-1"><Minus size={12} /></button>
                              <span className="text-[10px] font-black text-black">{cantTemp}</span>
                              <button onClick={() => setCantTemp(prev => prev < stockMaximo ? prev + 1 : prev)} className="text-black p-1"><Plus size={12} /></button>
                            </div>

                            <button
                              disabled={(variantes.some(v => v.variante_atributos?.length > 0) && !opcionTemporal) || stockMaximo <= 0}
                               onClick={(e) => { e.stopPropagation(); handleConfirmarAdd(prod); }}
                              className={`w-full py-2 text-[9px] font-black uppercase tracking-widest transition-all ${stockMaximo > 0 ? "bg-black text-white hover:bg-zinc-800" : "bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed"}`}
                            >
                              {stockMaximo <= 0 ? "Sin existencias" : "Confirmar Selección"}
                            </button>
                          </motion.div>
                        ) : (
                          <div className="flex gap-2">
                             <button
                                onClick={(e) => { e.stopPropagation(); setSeleccionarId(prod.id); cargarVariantes(prod.id); }}
                                className="bg-white text-black p-3 rounded-full shadow-md hover:bg-black hover:text-white transition-colors border-2 border-black"
                              >
                                <ShoppingCart size={18} />
                              </button>
                              <Link 
                                href={`/producto/${prod.id}`} 
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white text-black p-3 rounded-full shadow-md hover:bg-black hover:text-white transition-colors border-2 border-black"
                              >
                                <Eye size={18} />
                              </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-[12px] text-black uppercase font-black tracking-tighter mb-1">{prod.nombre}</h3>
                      <p className="font-black text-base text-black">${Number(prod.precio_base).toLocaleString("es-CO")}</p>
                      
                      {/* ESTRELLAS DE RESEÑA */}
                      <div className="flex justify-center items-center gap-1 mt-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const califs = prod.resenas || [];
                            const promedio = califs.length > 0 ? califs.reduce((acc: any, curr: any) => acc + curr.calificacion, 0) / califs.length : 0;
                            return (
                              <Star
                                key={s}
                                size={10}
                                className={s <= Math.round(promedio) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}
                              />
                            );
                          })}
                        </div>
                        {prod.resenas?.length > 0 && (
                          <span className="text-[9px] font-bold text-gray-400">({prod.resenas.length})</span>
                        )}
                      </div>

                      <div className="w-8 h-[2px] bg-black mx-auto mt-2 transition-all group-hover/item:w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-black">
                <p className="text-black text-[10px] font-black uppercase tracking-widest">No hay productos en esta categoría.</p>
                <button
                  onClick={() => { 
                    setPrecioInfo(prev => ({ ...prev, current: prev.max })); 
                    setFiltrosAtributos({}); 
                  }}
                  className="mt-4 text-[10px] font-black uppercase underline decoration-2 underline-offset-4"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}