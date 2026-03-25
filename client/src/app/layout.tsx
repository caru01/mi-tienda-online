import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import CartDrawer from "@/components/CartDrawer";
import QuickView from "@/components/QuickView";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GALU SHOP | Tu Mundo de Tendencias",
  description: "Explora un mundo infinito de estilo: desde la última moda hasta las mejores tendencias para tu hogar y día a día. Galu Shop, tu destino favorito para lo que realmente quieres.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={outfit.variable}>
      <body className={`${outfit.className} antialiased`}>
        <ToastProvider>
          <CartProvider>
            <AnalyticsTracker />
            {children}
            <CartDrawer />
            <QuickView />
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}