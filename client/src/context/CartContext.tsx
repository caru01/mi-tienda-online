"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Interfaz que define la estructura de cada producto en el carrito
export interface CartItem {
  id: any; // Soporte para UUID de Supabase
  nombre: string;
  precio: number;
  cantidad: number;
  talla: string;
  imagen: string;
}

// Definición de las funciones y estados globales accesibles
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeItem: (id: any, talla: string) => void;
  updateQuantity: (id: any, talla: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  quickViewId: string | null;
  setQuickViewId: (id: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "galushop_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  // Inicializa el carrito desde localStorage (solo en el cliente)
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  // Sincroniza el carrito con localStorage cada vez que cambia
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      localStorage.setItem(`${CART_STORAGE_KEY}_timestamp`, Date.now().toString());
    } catch {
      // Si hay error (modo privado muy restrictivo), simplemente ignoramos
    }
  }, [cart]);

  // Verificar caducidad del carrito (48 horas)
  useEffect(() => {
    const lastSaved = localStorage.getItem(`${CART_STORAGE_KEY}_timestamp`);
    if (lastSaved) {
      const diff = Date.now() - parseInt(lastSaved);
      const hours = diff / (1000 * 60 * 60);
      if (hours > 48) {
        setCart([]);
        localStorage.removeItem(`${CART_STORAGE_KEY}_timestamp`);
      }
    }
  }, []);

  // Añade productos: si el ID y Talla ya existen, suma la cantidad
  const addToCart = (newItem: CartItem) => {
    setCart((prev) => {
      const existingItem = prev.find(
        (item) => item.id === newItem.id && item.talla === newItem.talla
      );
      if (existingItem) {
        return prev.map((item) =>
          item.id === newItem.id && item.talla === newItem.talla
            ? { ...item, cantidad: item.cantidad + newItem.cantidad }
            : item
        );
      }
      return [...prev, newItem];
    });
    setIsOpen(true);
  };

  // Elimina un producto específico por ID y Talla
  const removeItem = (id: any, talla: string) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.talla === talla)));
  };

  // Actualiza la cantidad (suma o resta), mínimo 1 unidad
  const updateQuantity = (id: any, talla: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && item.talla === talla
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item
      )
    );
  };

  // Vacía el carrito por completo (útil tras finalizar una compra)
  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
        quickViewId,
        setQuickViewId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Hook personalizado para usar el carrito en cualquier componente
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de un CartProvider");
  return context;
};