"use client";
import React, { useState, useEffect, use } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingBag, Truck, ShieldCheck, ArrowLeft, RefreshCw, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function ProductoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [producto, setProducto] = useState<any>(null);
  const [variantes, setVariantes] = useState<any[]>([]); // Para manejar tallas profesionales
  const [loading, setLoading] = useState(true);
  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [stockDisponible, setStockDisponible] = useState(0); // Stock dinámico por talla
  
  const { addToCart, setIsOpen } = useCart();

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

        // Traer Variantes (Tallas/Atributos) vinculadas
        const { data: vars, error: varsErr } = await supabase
          .from("variantes_producto")
          .select(`
            id, 
            stock, 
            variante_atributos (
              atributo_valores (valor)
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

  // 2. ACTUALIZAR STOCK AL CAMBIAR TALLA
  useEffect(() => {
    if (tallaSeleccionada) {
      const varianteElegida = variantes.find(v => 
        v.variante_atributos.some((va: any) => va.atributo_valores.valor === tallaSeleccionada)
      );
      setStockDisponible(varianteElegida?.stock || 0);
      setCantidad(1); // Resetear cantidad al cambiar de talla
    }
  }, [tallaSeleccionada, variantes]);

  const handleAddToCart = () => {
    if (producto.es_ropa && !tallaSeleccionada) {
      alert("Por favor, selecciona una talla antes de agregar al carrito.");
      return;
    }

    if (stockDisponible <= 0) {
      alert("Lo sentimos, esta opción no tiene existencias.");
      return;
    }

    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio_base, // Usando el nuevo nombre de columna
      cantidad: cantidad,
      talla: tallaSeleccionada || "Única",
      imagen: producto.imagen_principal, // Usando el nuevo nombre de columna
    });

    setIsOpen(true);
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
      <div className="p-10 text-center font-bold text-black" style={{ fontFamily: 'Arial' }}>
        Producto no encontrado
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12 text-black">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black mb-8 transition-colors">
          <ArrowLeft size={14} /> Volver a la tienda
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          
          {/* COLUMNA IZQUIERDA: IMAGEN */}
          <div className="bg-gray-50 rounded-sm overflow-hidden aspect-[3/4]">
            <img 
              src={producto.imagen_principal} 
              alt={producto.nombre} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* COLUMNA DERECHA: INFO */}
          <div className="flex flex-col space-y-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-2 italic">
                {producto.nombre}
              </h1>
              <p className="text-xl font-bold text-black">
                ${Number(producto.precio_base).toLocaleString("es-CO")}
              </p>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed border-b border-gray-100 pb-6 font-medium">
              {producto.descripcion}
            </p>

            {/* SELECCIÓN DE TALLA (DINÁMICA DESDE VARIANTES) */}
            {producto.es_ropa && variantes.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-black uppercase tracking-widest mb-4 italic">
                  Talla: {tallaSeleccionada || "Selecciona una"}
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {variantes.map((v: any) => {
                    const valorTalla = v.variante_atributos[0]?.atributo_valores?.valor;
                    return (
                      <button
                        key={v.id}
                        disabled={v.stock <= 0}
                        onClick={() => setTallaSeleccionada(valorTalla)}
                        className={`w-12 h-12 text-xs font-bold border transition-all ${
                          tallaSeleccionada === valorTalla 
                          ? 'bg-black text-white border-black' 
                          : v.stock <= 0 
                            ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                            : 'bg-white text-black border-gray-200 hover:border-black'
                        }`}
                      >
                        {valorTalla}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CANTIDAD */}
            <div className="space-y-4">
              <div className="flex justify-between items-center w-32">
                <h3 className="text-[11px] font-bold text-black uppercase tracking-widest">Cantidad</h3>
                {tallaSeleccionada && (
                  <span className="text-[9px] font-black text-gray-400">Stock: {stockDisponible}</span>
                )}
              </div>
              <div className="flex items-center border border-black w-32 justify-between rounded-full px-2">
                <button 
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="p-2 hover:bg-[#FCD7DE] rounded-full transition-colors text-black"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold text-sm text-black">{cantidad}</span>
                <button 
                  onClick={() => {
                    if(cantidad < stockDisponible) {
                      setCantidad(cantidad + 1);
                    } else {
                      alert(`Solo hay ${stockDisponible} unidades disponibles en esta opción.`);
                    }
                  }}
                  className="p-2 hover:bg-[#FCD7DE] rounded-full transition-colors text-black"
                >
                  <Plus size={16} />
                </button>
              </div>
              {stockDisponible <= 5 && stockDisponible > 0 && (
                <p className="text-[10px] text-orange-600 font-bold uppercase">¡Quedan pocas unidades!</p>
              )}
            </div>

            {/* BOTÓN AGREGAR */}
            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={handleAddToCart}
                disabled={stockDisponible <= 0 || (producto.es_ropa && !tallaSeleccionada)}
                className={`w-full font-black uppercase tracking-[0.2em] text-[12px] py-4 rounded-full transition-all flex items-center justify-center gap-3 shadow-lg ${
                  stockDisponible <= 0 || (producto.es_ropa && !tallaSeleccionada && variantes.length > 0)
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                  : "bg-[#FCD7DE] text-black hover:bg-black hover:text-white"
                }`}
              >
                {stockDisponible <= 0 && (tallaSeleccionada || !producto.es_ropa) ? "Producto Agotado" : <><ShoppingBag size={18} /> Agregar al Carrito</>}
              </button>
            </div>

            {/* INFO EXTRA */}
            <div className="pt-8 space-y-6 border-t border-gray-100">
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-gray-500">
                <ShieldCheck size={18} className="text-black" /> Pago 100% seguro
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-gray-500">
                <Truck size={18} className="text-black" /> Envíos a todo Colombia
              </div>
              <div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-gray-500">
                  <RefreshCw size={18} className="text-black"/> Política de Devolución
                </div>
                <p className="text-[10px] text-gray-600 leading-normal font-bold">
                  No realizamos devoluciones de dinero. Sin embargo, puedes cambiar tu artículo por otro de igual valor o de mayor valor pagando la diferencia. Los cambios se realizan únicamente el mismo día de la compra.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}