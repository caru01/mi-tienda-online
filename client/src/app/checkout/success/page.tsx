"use client";
import React, { useEffect, useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  CheckCircle2, ShoppingBag, ArrowRight, Printer, 
  MapPin, CreditCard, User, Box, Copy, Check, 
  ChevronRight, Building2, Phone, Mail, BadgeCheck,
  Receipt, Wallet, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const { toast } = useToast();
  
  const [pedido, setPedido] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPedido = async () => {
      if (!orderNumber) return;
      
      try {
        setLoading(true);

        // Intento 1: LOCALSTORAGE (Instantáneo e inmune a RLS)
        const localData = localStorage.getItem(`order_${orderNumber}`);
        if (localData) {
          const parsed = JSON.parse(localData);
          setPedido(parsed.pedido);
          setItems(parsed.items || []);
          setLoading(false);
          return;
        }

        // Intento 2: BASE DE DATOS (Fallback si recargan o borran cache)
        const { data: pData, error: pErr } = await supabase
          .from("pedidos")
          .select("*")
          .eq("numero_pedido", parseInt(orderNumber))
          .single();

        if (pErr) throw pErr;
        setPedido(pData);

        const { data: iData, error: iErr } = await supabase
           .from("pedido_items")
           .select("*")
           .eq("pedido_id", pData.id);
        
        if (!iErr) setItems(iData || []);

      } catch (err) {
        console.error("Error cargando pedido:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPedido();
  }, [orderNumber]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast("LLAVE COPIADA CON ÉXITO", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
       <div className="w-16 h-16 border-8 border-black border-t-transparent animate-spin mb-6" />
       <p className="font-black uppercase text-[12px] tracking-[0.3em] text-black">Galu Shop - Generando Comprobante...</p>
    </div>
  );

  if (!pedido) return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center uppercase font-black">
        <AlertCircle size={60} className="text-gray-200 mb-6" />
        <p className="text-black mb-8 tracking-[0.2em] text-lg">No encontramos el pedido #{orderNumber}</p>
        <Link href="/" className="bg-black text-white px-10 py-4 font-black text-[10px] tracking-widest hover:scale-105 transition-all outline outline-offset-4 outline-black">
           Volver a Galu Shop
        </Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="bg-white min-h-screen text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .receipt-box { 
            border: 3px solid black !important; 
            box-shadow: none !important; 
            width: 100% !important; 
            margin: 0 !important;
            padding: 40px !important;
          }
          .receipt-header { border-bottom: 3px solid black !important; pb: 40px !important; }
        }
      `}</style>
      
      <div className="no-print"><Navbar /></div>
      
      <main className="max-w-6xl mx-auto px-4 py-10 md:py-20">
        
        {/* CABECERA PRINCIPAL (NO PRINT) */}
        <div className="no-print text-center mb-16 space-y-4">
          <div className="inline-block bg-black text-white p-4 rounded-full mb-4">
            <ShoppingBag size={40} />
          </div>
          <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter">
             PEDIDO RECIBIDO
          </h1>
          <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-400">
             Orden #{String(pedido.numero_pedido).padStart(4, '0')} - Resumen de Orden Pendiente
          </p>
        </div>

        {/* --- 1. INSTRUCCIONES DE PAGO (TOP, NO PRINT) --- */}
        <div className="no-print mb-12">
           <div className="bg-black text-white p-8 md:p-12 border-4 border-black shadow-[10px_10px_0px_0px_rgba(30,30,30,1)] relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
                 <CreditCard size={180} />
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <Wallet size={24} className="text-gray-400" />
                       <h2 className="text-2xl font-black uppercase italic tracking-widest text-[#FFF]">Instrucciones de Pago</h2>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest leading-loose text-gray-400">
                      Tu pedido está reservado. Envía el comprobante de transferencia a nuestro WhatsApp para procesar el envío.
                    </p>
                 </div>
                 <div className="space-y-4">
                    <div className="bg-white/10 p-6 border-2 border-white/20 flex flex-col gap-1 backdrop-blur-sm group">
                       <span className="text-[9px] font-black uppercase italic text-gray-500">Llave Bre-B (Nequi/Otros)</span>
                       <div className="flex justify-between items-center group">
                          <p className="text-xl md:text-2xl font-black tracking-widest select-all">@PLATA3206375509</p>
                          <button 
                            onClick={() => copyToClipboard("@PLATA3206375509")}
                            className="p-3 hover:bg-white hover:text-black transition-all rounded-full"
                          >
                             {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                          </button>
                       </div>
                       <p className="text-[10px] font-black uppercase mt-2 text-white/40">Titular: Luzdanis Lara Severiche</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* --- 2. RECIBO PROFESIONAL (CONTENIDO A IMPRIMIR) --- */}
        <div className="receipt-box bg-white border-4 border-black p-6 md:p-16 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] font-sans">
           
           {/* HEADER FACTURA */}
           <div className="receipt-header flex flex-col md:flex-row justify-between items-start md:items-end gap-12 border-b-4 border-black pb-12 mb-12">
              <div className="space-y-6">
                 <div className="text-4xl font-black uppercase italic tracking-tighter">GALU SHOP</div>
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed text-gray-500">
                    Marca Independiente • High Energy Gear<br/>
                    Colombia | Valledupar<br/>
                    Venta por Catálogo & Redes sociales
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-gray-400 italic">Orden Digital</p>
                 <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none italic">#{String(pedido.numero_pedido).padStart(4, '0')}</h2>
                 <p className="text-[11px] font-black mt-4 uppercase">Emitido: {new Date(pedido.created_at).toLocaleDateString('es-CO')}</p>
              </div>
           </div>

           {/* INFO CLIENTE & ENVÍO */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] border-b border-black pb-2 flex items-center gap-2">
                   <User size={12}/> Cliente Detalles
                 </h3>
                 <div className="space-y-2">
                    <p className="font-black text-xl uppercase italic">{pedido.cliente_nombre}</p>
                    <p className="text-[11px] font-black uppercase text-gray-500 italic">Cédula: {pedido.cedula}</p>
                    <p className="text-[11px] font-black uppercase text-gray-500 italic">Tel: {pedido.numero_whatsapp}</p>
                    <p className="text-[11px] font-black text-gray-500 font-mono tracking-tighter lowercase">{pedido.cliente_email}</p>
                 </div>
              </div>
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] border-b border-black pb-2 flex items-center gap-2">
                   <MapPin size={12}/> Ubicación de Entrega
                 </h3>
                 <div className="space-y-2">
                    <p className="font-black text-lg uppercase leading-tight italic">{pedido.direccion}</p>
                    <p className="text-xs font-black uppercase text-gray-500 italic">Barrio: {pedido.barrio}</p>
                    <p className="text-xs font-black uppercase inline-block bg-black text-white px-3 py-1 mt-2">
                       {pedido.ciudad}, {pedido.departamento}
                    </p>
                    <p className="text-[9px] font-black uppercase mt-4 block italic">Pago: {pedido.metodo_pago}</p>
                 </div>
              </div>
           </div>

           {/* TABLA ITEMS */}
           <div className="mb-16">
              <div className="grid grid-cols-12 bg-black text-white p-4 font-black uppercase text-[10px] tracking-[0.2em] italic">
                 <div className="col-span-12 md:col-span-7">Detalle de Producto</div>
                 <div className="hidden md:block md:col-span-2 text-center">Cant</div>
                 <div className="hidden md:block md:col-span-3 text-right">Subtotal</div>
              </div>
              <div className="border-x-4 border-black border-b-4">
                 {items.length > 0 ? (
                   items.map((item, idx) => (
                     <div key={idx} className="grid grid-cols-12 p-6 md:p-8 border-b-2 border-black last:border-0 items-center">
                        <div className="col-span-12 md:col-span-7 space-y-2">
                           <p className="font-black uppercase text-sm md:text-lg italic tracking-tighter leading-none">{item.producto_nombre_snapshot}</p>
                           <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">{item.variante_detalle_snapshot}</span>
                           <div className="md:hidden flex justify-between items-center bg-gray-50 p-2 mt-4 text-[10px] font-black">
                              <span>Cantidad: x{item.cantidad}</span>
                              <span>${Number(item.subtotal).toLocaleString('es-CO')}</span>
                           </div>
                        </div>
                        <div className="hidden md:block md:col-span-2 text-center font-black text-lg italic">x{item.cantidad}</div>
                        <div className="hidden md:block md:col-span-3 text-right font-black text-lg italic">${Number(item.subtotal).toLocaleString('es-CO')}</div>
                     </div>
                   ))
                 ) : (
                   <div className="p-20 text-center space-y-4">
                      <div className="w-10 h-10 border-4 border-black border-t-transparent animate-spin mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] italic text-gray-300">Candidato a recibo vacío...</p>
                      <button onClick={() => window.location.reload()} className="text-[9px] font-black underline uppercase">Forzar Recarga</button>
                   </div>
                 )}
              </div>
           </div>

           {/* TOTALES */}
           <div className="flex flex-col md:flex-row justify-end text-right">
              <div className="w-full md:w-96 space-y-6">
                 <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-gray-500">
                    <span>Bruto / Subtotal</span>
                    <span>${Number(pedido.subtotal).toLocaleString('es-CO')}</span>
                 </div>
                 <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-red-600 italic">
                    <span>(-) Cupones & Puntos</span>
                    <span>-${Number(pedido.descuento).toLocaleString('es-CO')}</span>
                 </div>
                 <div className="pt-8 border-t-8 border-black flex justify-between items-end gap-10">
                    <div className="text-left">
                       <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Total Final</p>
                       <p className="text-[8px] font-bold uppercase text-gray-400">Impuestos Incluídos</p>
                    </div>
                    <p className="text-4xl md:text-6xl font-black italic tracking-tighter leading-none transition-all">
                       ${Number(pedido.total_final).toLocaleString('es-CO')}
                    </p>
                 </div>
              </div>
           </div>

           {/* SELLO / BRANDING RECIBO */}
           <div className="mt-24 pt-10 border-t-2 border-dashed border-gray-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
              <div className="flex items-center gap-4 text-gray-300">
                 <Receipt size={40} />
                 <div className="text-[8px] font-black uppercase leading-relaxed tracking-widest">
                    Galu Shop Official System<br/>
                    Original Invoice Copy<br/>
                    #{pedido.id.split('-')[0].toUpperCase()}
                 </div>
              </div>
              <div className="text-right text-[10px] font-black uppercase italic tracking-widest text-gray-400">
                 ¡GRACIAS POR ELEGIRNOS! 👋
              </div>
           </div>

        </div>

        {/* ACCIONES (NO PRINT) */}
        <div className="no-print mt-20 flex flex-col md:flex-row gap-6">
           <button 
             onClick={() => window.print()} 
             className="flex-1 bg-black text-white py-8 font-black uppercase text-xs tracking-[0.4em] flex items-center justify-center gap-6 group hover:translate-x-2 hover:-translate-y-2 transition-all shadow-[12px_12px_0px_0px_rgba(200,200,200,1)] hover:shadow-none"
           >
              <Printer size={24} className="group-hover:rotate-12 transition-transform" /> 
              Imprimir mi Recibo
           </button>
           <Link 
             href="/" 
             className="flex-1 bg-white border-4 border-black py-8 font-black uppercase text-xs tracking-[0.4em] flex items-center justify-center gap-6 hover:bg-black hover:text-white transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)]"
           >
              Seguir Comprando <ArrowRight size={24} />
           </Link>
        </div>

      </main>

      <div className="no-print"><Footer /></div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SuccessContent />
    </Suspense>
  );
}
