"use client";
import React, { useEffect, useState } from "react";
import { X, Trash2, ShoppingBag, ArrowRight, Plus, Minus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

export default function CartDrawer() {
  const { cart, isOpen, setIsOpen, removeItem, updateQuantity } = useCart();
  const { toast } = useToast();

  // Estado para guardar el stock real de los productos que están en el carrito
  const [stocks, setStocks] = useState<{ [key: string]: number }>({});

  // Cálculo del total
  const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  // EFECTO: Cada vez que el carrito cambia, consultamos el stock real en la DB
  useEffect(() => {
    const fetchStocks = async () => {
      if (cart.length === 0) return;

      const newStocks: { [key: string]: number } = {};

      for (const item of cart) {
        const { data, error } = await supabase
          .from('variantes_producto')
          .select('stock, sku, variante_atributos(atributo_valores(valor))')
          .eq('producto_id', item.id)
          .eq('activo', true);

        if (data) {
          const variante = data.find(v => {
            const nombreV = v.variante_atributos?.length > 0 
              ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
              : v.sku || 'Única';
            return nombreV === item.talla;
          });
          if (variante) {
            newStocks[`${item.id}-${item.talla}`] = variante.stock;
          }
        }
      }
      setStocks(newStocks);
    };

    if (isOpen) fetchStocks();
  }, [cart, isOpen]);

  // Función validada para aumentar cantidad según stock
  const handleIncrease = (item: any) => {
    const stockDisponible = stocks[`${item.id}-${item.talla}`] || 0;
    if (item.cantidad < stockDisponible) {
      updateQuantity(item.id, item.talla, 1);
    } else {
      toast(`Solo quedan ${stockDisponible} unidades disponibles`, "warning");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Fondo oscuro traslúcido */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Panel Blanco Lateral */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" style={{ fontFamily: 'Arial, sans-serif' }}>

        {/* Cabecera del Carrito */}
        <div className="p-6 border-b border-black/10 flex justify-between items-center bg-white">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-black flex items-center gap-2">
            <ShoppingBag size={16} /> Tu Carrito
          </h2>
          <button onClick={() => setIsOpen(false)} className="text-black hover:rotate-90 transition-transform duration-300">
            <X size={22} />
          </button>
        </div>

        {/* Lista de productos agregados */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <ShoppingBag size={40} className="text-gray-200" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic">Tu bolsa está vacía</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black underline uppercase tracking-widest text-black"
              >
                Volver a la tienda
              </button>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.id}-${item.talla}`} className="flex gap-4 items-start border-b border-gray-50 pb-6">
                {/* Imagen del producto conectada a item.imagen */}
                <div className="w-20 h-24 bg-gray-50 rounded-sm overflow-hidden flex-shrink-0 border border-gray-100">
                  <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[11px] font-black uppercase text-black truncate pr-2">{item.nombre}</h3>
                    <button
                      onClick={() => removeItem(item.id, item.talla)}
                      className="text-gray-300 hover:text-black transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Opción: {item.talla}</p>

                    {/* SELECTOR DE CANTIDAD (+ / -) CON VALIDACIÓN DE STOCK */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-black rounded-full px-2 py-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.talla, -1)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          disabled={item.cantidad <= 1}
                        >
                          <Minus size={12} className={item.cantidad <= 1 ? "text-gray-300" : "text-black"} />
                        </button>

                        <span className="text-[11px] font-black px-3 w-6 text-center">
                          {item.cantidad}
                        </span>

                        <button
                          onClick={() => handleIncrease(item)} // Cambiado para validar stock
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Plus size={12} className="text-black" />
                        </button>
                      </div>
                      {/* Indicador visual si está al límite de stock */}
                      {(stocks[`${item.id}-${item.talla}`] ?? 999) <= item.cantidad && (
                        <span className="text-[8px] font-bold text-orange-500 uppercase">Límite alcanzado</span>
                      )}
                    </div>

                    <p className="text-sm font-black text-black mt-2">
                      ${(item.precio * item.cantidad).toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resumen y Botón de Navegación al Checkout */}
        {cart.length > 0 && (
          <div className="p-8 border-t border-gray-100 bg-gray-50 space-y-6">
            <div className="flex justify-between items-center text-black">
              <span className="text-[11px] font-black uppercase tracking-widest">Subtotal</span>
              <span className="text-xl font-black">${subtotal.toLocaleString("es-CO")}</span>
            </div>

            <p className="text-[9px] text-gray-400 uppercase font-bold italic">
              Los costos de envío se calculan en la siguiente página.
            </p>

            <Link
              href="/checkout"
              onClick={() => setIsOpen(false)}
              className="w-full bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-full hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-3 group text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
            >
              Ir a Pagar <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}