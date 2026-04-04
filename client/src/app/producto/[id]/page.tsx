// SERVER COMPONENT — maneja los metadatos Open Graph para compartir en redes sociales
import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ProductoClient from "./ProductoClient";

// Cliente Supabase para el servidor (sin cookies de sesión)
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// generateMetadata: Inyecta las etiquetas Open Graph dinámicamente por producto
// WhatsApp, Facebook, Twitter e iMessage las leen para generar la vista previa
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const { data: producto } = await supabaseServer
    .from("productos")
    .select("nombre, descripcion, imagen_principal, precio_base")
    .eq("id", id)
    .single();

  if (!producto) {
    return {
      title: "Producto no encontrado | GALU SHOP",
      description: "Este producto no está disponible.",
    };
  }

  const titulo = `${producto.nombre} | GALU SHOP`;
  const descripcion = producto.descripcion
    ? `${producto.descripcion.slice(0, 120)}... Solo $${Number(producto.precio_base).toLocaleString("es-CO")}`
    : `Cómpralo ahora en GALU SHOP por solo $${Number(producto.precio_base).toLocaleString("es-CO")}`;
  const imagen = producto.imagen_principal;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://galushop.store"}/producto/${id}`;

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      url,
      siteName: "GALU SHOP",
      images: [
        {
          url: imagen,
          width: 1200,
          height: 630,
          alt: producto.nombre,
        },
      ],
      locale: "es_CO",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
      images: [imagen],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// La página renderiza el Client Component con toda la interactividad
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProductoClient params={params} />;
}
