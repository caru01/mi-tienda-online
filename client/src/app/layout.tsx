import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import CartDrawer from "@/components/CartDrawer";


export const metadata: Metadata = {
  title: "GALU SHOP | Tienda de Moda",
  description: "Encuentra lo último en tendencia y estilo en GALU SHOP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ToastProvider>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}