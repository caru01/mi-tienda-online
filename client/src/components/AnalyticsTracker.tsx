"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

/**
 * AnalyticsTracker
 * - Envía un evento 'engaged' si el usuario se queda > 10 segundos.
 * - Captura ubicación básica del visitante.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // 1 - Ignorar rutas de administración para no ensuciar datos
    if (pathname.includes("/admin") || pathname.includes("/login")) return;

    console.log("Analytics: Motor de rastreo activo para:", pathname);

    const startTime = Date.now();
    let geoCache: any = null;

    const fetchGeoData = async () => {
       try {
         // Intentamos obtener la ubicación por IP (Servicio gratuito)
         const res = await fetch("https://ipapi.co/json/");
         if (res.ok) geoCache = await res.json();
       } catch (e) {
         console.warn("Analytics: Fallo al obtener ubicación, usando genérico.");
       }
    };

    const sendEvent = async (tipo = "engaged", dataExtra = {}) => {
      // Si no tenemos geo todavía, intentamos cargarla ahora
      if (!geoCache) await fetchGeoData();

      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Intentar extraer ID de producto de la URL
      let proudctoId = null;
      if (pathname.includes("/producto/")) {
        proudctoId = pathname.split("/").pop();
      }

      const payload = {
        ip: geoCache?.ip || "visitante-anonimo",
        ciudad: geoCache?.city || "Unknown City",
        pais: geoCache?.country_name || "Unknown Country",
        url: pathname,
        tiempo_s: duration > 0 ? duration : 0,
        evento: tipo,
        producto_id: (proudctoId && proudctoId.length > 20) ? proudctoId : null,
        ...dataExtra
      };

      try {
        const { error } = await supabase.from("analitica_visitas").insert([payload]);
        if (error) {
           console.error("Analytics: Error al guardar en Supabase", error.message);
           // Si el error es 404/403, probablemente sea la tabla o RLS
           if (error.code === 'PGRST116' || error.message.includes('permission denied')) {
             console.error("SOLUCIÓN: Verifica que creaste la tabla 'analitica_visitas' y ejecutaste 'DISABLE ROW LEVEL SECURITY'");
           }
        } else {
           console.log("Analytics: Evento '" + tipo + "' registrado con éxito ✅");
        }
      } catch (err) {
        console.error("Analytics: Error crítico", err);
      }
    };

    // --- PROGRAMAR EVENTO 'ENGAGED' (10 SEGUNDOS) ---
    console.log("Analytics: Esperando 10 segundos para confirmar sesión de calidad...");
    const engagedTimer = setTimeout(() => {
       sendEvent("engaged");
    }, 10000);

    // --- ESCUCHAR INTENCIONES DE COMPRA (ADD TO CART) ---
    // Emitido manualmente desde los botones de compra
    const handlePurchaseIntent = (e: any) => {
       sendEvent("engaged", { evento: "add_to_cart" });
    };

    window.addEventListener("track-purchase-intent", handlePurchaseIntent);

    return () => {
      clearTimeout(engagedTimer);
      window.removeEventListener("track-purchase-intent", handlePurchaseIntent);
    };
  }, [pathname]);

  return null;
}
