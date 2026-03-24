"use client";
import React, { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ShoppingCart, Eye, X, Plus, Minus, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/context/ToastContext";

export default function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const { addToCart, setIsOpen } = useCart();
  const { toast } = useToast();

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
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);

  // Cerrar acciones al hacer clic fuera
  useEffect(() => {
    const handleGlobalClick = (e: any) => {
      if (!e.target.closest('.product-card-global')) {
        setActiveActionsId(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

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
              )
            `)
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
    <div className="bg-white min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 text-black">
        {/* BREADCRUMB */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b pb-4 border-gray-100">
          <nav className="hidden md:block text-black uppercase tracking-widest text-[11px] font-medium">
            Inicio <span className="mx-2 text-gray-300">/</span> <span className="font-black text-black">{categoriaNombre.toUpperCase()}</span>
          </nav>

          {/* CABECERA MÓVIL: NOMBRE + BOTONES */}
          <div className="w-full md:hidden flex flex-col items-center gap-6 mb-2">
            <h1 className="text-3xl font-black uppercase text-black italic tracking-tighter text-center">
              {categoriaNombre}
            </h1>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={() => { setShowFiltersMobile(!showFiltersMobile); setShowSortMobile(false); }}
                className={`flex items-center justify-center gap-2 py-3 border-2 border-black font-black uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${showFiltersMobile ? 'bg-zinc-100' : 'bg-white'}`}
              >
                Filtrar {hayFiltrosActivos && <span className="w-2 h-2 bg-black rounded-full"></span>}
              </button>
              <button 
                onClick={() => { setShowSortMobile(!showSortMobile); setShowFiltersMobile(false); }}
                className={`flex items-center justify-center gap-2 py-3 border-2 border-black font-black uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${showSortMobile ? 'bg-zinc-100' : 'bg-white'}`}
              >
                Ordenar
              </button>
            </div>
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

        {/* POPUP DE ORDENAMIENTO MÓVIL */}
        <AnimatePresence>
          {showSortMobile && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden bg-white border-2 border-black p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase mb-2 border-b-2 border-black pb-1 italic">Opciones de ordenamiento</p>
              {["novedad", "precio-menor", "precio-mayor", "a-z"].map((opt) => (
                <button 
                  key={opt} 
                  onClick={() => { setOrden(opt); setShowSortMobile(false); }}
                  className={`w-full text-left py-2 px-3 text-[10px] font-black uppercase ${orden === opt ? 'bg-black text-white' : 'hover:bg-gray-50 text-black'}`}
                >
                  {opt === "novedad" ? "Novedades" : opt === "precio-menor" ? "Menor Precio" : opt === "precio-mayor" ? "Mayor Precio" : "Nombre: A-Z"}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row gap-12">
          {/* ASIDE DE FILTROS (COLAPSABLE EN MÓVIL) */}
          <aside className={`w-full md:w-56 space-y-12 flex-shrink-0 ${!showFiltersMobile ? 'hidden md:block' : 'block mb-8 animate-in fade-in slide-in-from-top-4'}`}>
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
                        if (window.innerWidth < 1024) {
                          setActiveActionsId(activeActionsId === prod.id ? null : prod.id);
                        }
                      }}
                    >
                      <img
                        src={prod.imagen_principal}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-700"
                      />

                      <div 
                        className={`absolute inset-0 bg-black/5 transition-opacity flex items-center justify-center p-2 
                        ${activeActionsId === prod.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 md:group-hover/item:opacity-100 pointer-events-none md:group-hover/item:pointer-events-auto'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!seleccionarId && window.innerWidth < 1024) {
                            setActiveActionsId(null);
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