"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Interfaz que define la estructura de cada producto en el carrito
export interface CartItem {
  id: any; // Cambiado a any para soportar UUID de Supabase
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
  clearCart: () => void; // <-- AGREGADO PARA EL CIERRE DE PEDIDOS
  totalItems: number;
  totalPrice: number; // <-- AGREGADO PARA FACILITAR CÁLCULOS
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Lógica para añadir productos: Si el ID y la Talla coinciden, incrementa la cantidad
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

  // Elimina un producto específico basándose en su ID y Talla única
  const removeItem = (id: any, talla: string) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.talla === talla)));
  };

  // Actualiza la cantidad permitiendo sumar o restar, con un mínimo de 1 unidad
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

  // Calcula el total de unidades en la bolsa
  const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

  // Calcula el precio total de la compra
  const totalPrice = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeItem, 
      updateQuantity, 
      clearCart, // <-- AGREGADO AL PROVIDER
      totalItems,
      totalPrice, // <-- AGREGADO AL PROVIDER
      isOpen, 
      setIsOpen 
    }}>
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