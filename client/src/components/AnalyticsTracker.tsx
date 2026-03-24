"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

/**
 * AnalyticsTracker
 * - Monitorea el tiempo de permanencia (>10s)
 * - Captura IP y Ubicación básica del visitante (via ipapi.co)
 * - Registra eventos de visualización de productos específicos
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const sessionChecked = useRef(false);

  useEffect(() => {
    // Solo rastreamos usuarios que no sean del panel admin
    if (pathname.includes("/admin")) return;

    const startTime = Date.now();
    let visitorData: any = null;

    const fetchGeo = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        visitorData = await res.json();
      } catch (e) {
        console.warn("Fallo al obtener geo-localización", e);
      }
    };

    const registerEngagedVisit = async () => {
      if (!visitorData) await fetchGeo();
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Solo registramos si se quedaron > 10 seg
      if (duration < 10) return;

      // Extraer ID de producto si es una página de producto
      let productoId = null;
      if (pathname.includes("/producto/")) {
         productoId = pathname.split("/").pop();
      }

      try {
        await supabase.from("analitica_visitas").insert([{
          ip: visitorData?.ip || "unknown",
          ciudad: visitorData?.city || "Unknown",
          pais: visitorData?.country_name || "Unknown",
          url: pathname,
          tiempo_s: duration,
          evento: "engaged",
          producto_id: (productoId && productoId.length > 30) ? productoId : null
        }]);
      } catch (err) {
        // Silencio para no molestar la experiencia del usuario si falla la DB
      }
    };

    // Al montar la página, esperamos 10 segundos para marcar Engagement
    const timer = setTimeout(registerEngagedVisit, 10500);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
