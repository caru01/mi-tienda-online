"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { ClipboardList, CreditCard, Truck, Send, Tag, Calendar, MapPin, Loader2, Star, Gift } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

// 2. BASE DE DATOS COMPLETA DE COLOMBIA (Manteniendo tu configuración)
const COLOMBIA_DB: Record<string, string[]> = {
  "Amazonas": ["Leticia", "Puerto Nariño"],
  "Antioquia": ["Medellín", "Bello", "Itagüí", "Envigado", "Apartadó", "Rionegro", "Caucasia", "Turbo"],
  "Arauca": ["Arauca", "Tame", "Saravena"],
  "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Baranoa"],
  "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar"],
  "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Puerto Boyacá"],
  "Caldas": ["Manizales", "La Dorada", "Riosucio", "Villamaría"],
  "Caquetá": ["Florencia", "San Vicente del Caguán"],
  "Casanare": ["Yopal", "Aguazul", "Villanueva"],
  "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada", "Patía"],
  "Cesar": ["Valledupar", "Aguachica", "Agustín Codazzi", "Bosconia", "Curumaní", "San Alberto", "Chiriguaná"],
  "Chocó": ["Quibdó", "Istmina", "Condoto"],
  "Córdoba": ["Montería", "Cereté", "Sahagún", "Lorica", "Montelíbano", "Planeta Rica"],
  "Cundinamarca": ["Bogotá", "Soacha", "Chía", "Zipaquirá", "Facatativá", "Fusagasugá", "Girardot", "Mosquera"],
  "Guainía": ["Inírida"],
  "Guaviare": ["San José del Guaviare"],
  "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata"],
  "La Guajira": ["Riohacha", "Maicao", "Uribia", "San Juan del Cesar", "Fonseca"],
  "Magdalena": ["Santa Marta", "Ciénaga", "Fundación", "El Banco", "Plato"],
  "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López"],
  "Nariño": ["Pasto", "Ipiales", "Tumaco", "Túquerres"],
  "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario", "Los Patios", "Tibú"],
  "Putumayo": ["Mocoa", "Puerto Asís", "Orito", "Valle del Guamuez"],
  "Quindío": ["Armenia", "Calarcá", "Quimbaya", "Montenegro"],
  "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia"],
  "San Andrés": ["San Andrés"],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "San Gil", "Socorro"],
  "Sucre": ["Sincelejo", "Corozal", "San Marcos", "Tolú"],
  "Tolima": ["Ibagué", "Espinal", "Melgar", "Mariquita", "Honda"],
  "Valle del Cauca": ["Cali", "Buenaventura", "Palmira", "Tuluá", "Buga", "Cartago", "Jamundí", "Yumbo"],
  "Vaupés": ["Mitú"],
  "Vichada": ["Puerto Carreño"]
};

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const [datos, setDatos] = useState({
    nombre: "", cedula: "", correo: "", telefono: "",
    departamento: "", ciudad: "", barrio: "", direccion: "",
    metodoPago: "Transferencia Bancaria",
  });

  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [envio, setEnvio] = useState(0);
  const [textoEnvio, setTextoEnvio] = useState("POR DEFINIR");

  const [inputCupon, setInputCupon] = useState("");
  const [cuponData, setCuponData] = useState<any>(null);
  const [descuentoValor, setDescuentoValor] = useState(0);
  const [mensajeCupon, setMensajeCupon] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Referido
  const [inputReferido, setInputReferido] = useState("");
  const [referidoValido, setReferidoValido] = useState(false);
  const [mensajeReferido, setMensajeReferido] = useState("");
  const [descuentoReferido, setDescuentoReferido] = useState(0);

  // Club Galu Puntos
  const [puntosDisponibles, setPuntosDisponibles] = useState(0);
  const [usarPuntos, setUsarPuntos] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  // VALIDACIÓN DE STOCK EN TIEMPO REAL AL ENTRAR AL CHECKOUT
  useEffect(() => {
    const validarStock = async () => {
      if (cart.length === 0) return;
      setIsProcessing(true);

      const ids = cart.map(item => item.id);
      const { data: variantes } = await supabase
        .from('variantes_producto')
        .select(`
          producto_id, 
          stock, 
          variante_atributos (
            atributo_valores (
              valor
            )
          )
        `)
        .in('producto_id', ids);

      if (variantes) {
        let stockInsuficiente = false;
        cart.forEach(item => {
          const vActual = variantes.find((v: any) => {
            const valores = v.variante_atributos?.map((va: any) => va.atributo_valores?.valor) || [];
            if (valores.length === 0) return v.producto_id === item.id && item.talla === 'Única';

            const nombreV1 = valores.join(' ');
            const nombreV2 = [...valores].reverse().join(' ');
            const nombreV3 = valores.join(' / ');

            return v.producto_id === item.id && (
              nombreV1 === item.talla ||
              nombreV2 === item.talla ||
              nombreV3 === item.talla
            );
          });

          if (!vActual || vActual.stock < item.cantidad) {
            stockInsuficiente = true;
          }
        });

        if (stockInsuficiente) {
          toast("🔥 Algunos productos ya no tienen stock suficiente. Por favor revisa tu bolsa antes de pagar.", "error");
        }
      }
      setIsProcessing(false);
    };
    validarStock();
  }, []);

  // Consultar puntos automáticamente al escribir correo válido
  useEffect(() => {
    const fetchPuntos = async () => {
      const emailLower = datos.correo.toLowerCase().trim();
      if (!emailLower.includes('@') || emailLower.length < 5) {
        setPuntosDisponibles(0);
        setUsarPuntos(false);
        return;
      }
      const { data } = await supabase.from('puntos_cliente').select('puntos, tipo').eq('cliente_email', emailLower);
      if (data) {
        const ganados = data.filter(p => p.tipo === 'ganado').reduce((acc, p) => acc + p.puntos, 0);
        const gastados = data.filter(p => p.tipo !== 'ganado').reduce((acc, p) => acc + Math.abs(p.puntos), 0);
        setPuntosDisponibles(Math.max(0, ganados - gastados));
      }
    };
    const timeout = setTimeout(fetchPuntos, 800);
    return () => clearTimeout(timeout);
  }, [datos.correo]);

  const getRangoEntrega = () => {
    const hoy = new Date();
    const calcularFechaFinal = (fechaBase: Date, diasHabiles: number) => {
      let f = new Date(fechaBase);
      let cont = 0;
      while (cont < diasHabiles) {
        f.setDate(f.getDate() + 1);
        if (f.getDay() !== 0 && f.getDay() !== 6) cont++;
      }
      return f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    return `Del ${hoy.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} al ${calcularFechaFinal(hoy, 7)}`;
  };

  const aplicarCupon = async () => {
    if (!inputCupon) return;
    setMensajeCupon("VALIDANDO...");
    const { data: cupon, error } = await supabase
      .from('cupones')
      .select('*')
      .eq('codigo', inputCupon.toUpperCase())
      .eq('activo', true)
      .single();

    if (error || !cupon) {
      setDescuentoValor(0);
      setMensajeCupon("CUPÓN NO VÁLIDO");
      return;
    }
    const v = cupon.tipo === 'porcentaje' ? subtotal * (cupon.valor / 100) : cupon.valor;
    setDescuentoValor(v);
    setCuponData(cupon);
    setMensajeCupon(`✅ ¡ENHORABUENA! CUPÓN ${cupon.codigo} APLICADO (-$${v.toLocaleString('es-CO')})`);
    toast(`¡Enhorabuena! Has aplicado tu cupón con éxito.`, "success");
  };

  const aplicarCodigoReferido = async () => {
    if (!inputReferido || referidoValido) return;
    setMensajeReferido("VALIDANDO CÓDIGO...");

    const { data: cupon } = await supabase
      .from('cupones')
      .select('*')
      .eq('codigo', inputReferido.toUpperCase().trim())
      .eq('activo', true)
      .single();

    const { data: ref } = await supabase
      .from('referidos')
      .select('*')
      .eq('codigo', inputReferido.toUpperCase().trim())
      .eq('estado', 'pendiente')
      .single();

    if (!cupon || !ref) {
      setMensajeReferido('CÓDIGO NO VÁLIDO O YA UTILIZADO');
      setReferidoValido(false);
      return;
    }

    const descPct = cupon.valor ?? 5;
    const descVal = subtotal * (descPct / 100);
    setDescuentoReferido(descVal);
    setReferidoValido(true);
    setMensajeReferido(`✅ ¡CÓDIGO APLICADO! ${descPct}% DE DESCUENTO POR REFERIDO`);
  };

  useEffect(() => {
    if (datos.departamento) {
      setCiudadesDisponibles(COLOMBIA_DB[datos.departamento] || []);
      setDatos(prev => ({ ...prev, ciudad: "" }));
    }
  }, [datos.departamento]);

  useEffect(() => {
    if (datos.metodoPago === "Pasa y Recoge") {
      setEnvio(0); setTextoEnvio("GRATIS");
    } else if (datos.ciudad === "Valledupar") {
      setEnvio(6000); setTextoEnvio("$6.000");
    } else if (datos.ciudad === "") {
      setEnvio(0); setTextoEnvio("POR DEFINIR");
    } else {
      setEnvio(0); setTextoEnvio("A CONVENIR (INTERRAPIDÍSIMO)");
    }
  }, [datos.ciudad, datos.metodoPago]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  const handleFinalizeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const cartConVariantes = [];
      for (const item of cart) {
        const { data: variantesProd, error: vErr } = await supabase
          .from('variantes_producto')
          .select(`id, stock, variante_atributos(atributo_valores(valor))`)
          .eq('producto_id', item.id);

        if (vErr || !variantesProd) throw new Error("No se pudieron cargar las variantes");

        const variante = variantesProd.find((v: any) => {
          const valores = v.variante_atributos?.map((va: any) => va.atributo_valores?.valor) || [];
          if (valores.length === 0) return item.talla === 'Única';
          const n1 = valores.join(' ');
          const n2 = [...valores].reverse().join(' ');
          const n3 = valores.join(' / ');
          return n1 === item.talla || n2 === item.talla || n3 === item.talla;
        });

        if (!variante || variante.stock < item.cantidad) {
          toast(`¡Lo sentimos! "${item.nombre.toUpperCase()}" en talla ${item.talla} no tiene stock suficiente`, "error");
          setIsProcessing(false);
          return;
        }
        cartConVariantes.push({ ...item, variante_id: variante.id, stock_actual: variante.stock });
      }

      const maxPuntosACanjear = Math.min(puntosDisponibles, subtotal + envio - descuentoValor - descuentoReferido);
      const descuentoPuntos = usarPuntos ? maxPuntosACanjear : 0;
      const totalFinal = subtotal + envio - descuentoValor - descuentoReferido - descuentoPuntos;
      const emailLower = datos.correo.toLowerCase().trim();

      const { data: clienteExiste } = await supabase.from('clientes').select('*').eq('email', emailLower).single();

      let nivelDescuento = 0.03;
      if (clienteExiste) {
        const gastoPrevio = Number(clienteExiste.total_gastado);
        if (gastoPrevio >= 500000) nivelDescuento = 0.08;
        else if (gastoPrevio >= 200000) nivelDescuento = 0.05;

        await supabase.from('clientes').update({
          total_gastado: gastoPrevio + totalFinal,
          total_pedidos: Number(clienteExiste.total_pedidos) + 1,
          nombre: datos.nombre,
          telefono: datos.telefono,
          cedula: datos.cedula,
          ciudad: datos.ciudad,
          departamento: datos.departamento,
          direccion: datos.direccion
        }).eq('id', clienteExiste.id);
      } else {
        await supabase.from('clientes').insert([{
          email: emailLower,
          nombre: datos.nombre,
          telefono: datos.telefono,
          cedula: datos.cedula,
          ciudad: datos.ciudad,
          departamento: datos.departamento,
          direccion: datos.direccion,
          total_gastado: totalFinal,
          total_pedidos: 1
        }]);
      }

      const { data: pedido, error: pErr } = await supabase
        .from("pedidos")
        .insert([{
          cliente_nombre: datos.nombre,
          cliente_email: emailLower,
          numero_whatsapp: datos.telefono,
          cedula: datos.cedula,
          departamento: datos.departamento,
          ciudad: datos.ciudad,
          barrio: datos.barrio,
          direccion: datos.direccion,
          metodo_pago: datos.metodoPago,
          subtotal: subtotal,
          descuento: descuentoValor + descuentoReferido,
          total_final: totalFinal
        }])
        .select().single();

      if (pErr) throw pErr;

      if (descuentoPuntos > 0) {
        await supabase.from('puntos_cliente').insert([{
          cliente_email: emailLower,
          pedido_id: pedido.id,
          puntos: -descuentoPuntos,
          tipo: 'canjeado',
          descripcion: `Canje en pedido #${pedido.numero_pedido}`
        }]);
      }

      if (totalFinal >= 50000) {
        const puntosGanados = Math.floor(totalFinal * nivelDescuento);
        await supabase.from('puntos_cliente').insert([{
          cliente_email: emailLower,
          pedido_id: pedido.id,
          puntos: puntosGanados,
          tipo: 'ganado',
          descripcion: `Puntos por compra #${pedido.numero_pedido}`
        }]);
      }

      for (const itemV of cartConVariantes) {
        await supabase.from('pedido_items').insert([{
          pedido_id: pedido.id,
          variante_id: itemV.variante_id,
          producto_nombre_snapshot: itemV.nombre,
          variante_detalle_snapshot: `Talla: ${itemV.talla}`,
          cantidad: itemV.cantidad,
          precio_unitario: itemV.precio,
          subtotal: itemV.precio * itemV.cantidad
        }]);

        await supabase.from('variantes_producto')
          .update({ stock: itemV.stock_actual - itemV.cantidad })
          .eq('id', itemV.variante_id);
      }

      const numeroWhatsApp = "573022461068";
      const numeroOrden = String(pedido.numero_pedido).padStart(4, '0');

      let texto = `¡Hola GALU SHOP! 🛍️\n\n`;
      texto += `Acabo de realizar el pedido *#${numeroOrden}* ✨\n\n`;

      texto += `👤 *DATOS DEL CLIENTE*\n`;
      texto += `• Nombre: ${datos.nombre.toUpperCase()}\n`;
      texto += `• Cédula: ${datos.cedula}\n`;
      texto += `• Teléfono: ${datos.telefono}\n`;
      texto += `• Correo: ${datos.correo.toLowerCase()}\n\n`;

      texto += `📍 *INFORMACIÓN DE ENTREGA*\n`;
      texto += `• Ciudad: ${datos.ciudad.toUpperCase()} (${datos.departamento.toUpperCase()})\n`;
      texto += `• Dirección: ${datos.direccion.toUpperCase()}\n`;
      texto += `• Barrio: ${datos.barrio.toUpperCase()}\n`;
      texto += `• Entrega estimada: ${getRangoEntrega()}\n\n`;

      texto += `💳 *MÉTODO DE PAGO Y ENVÍO*\n`;
      texto += `• Pago: ${datos.metodoPago.toUpperCase()}\n`;
      texto += `• Envío: ${textoEnvio}\n\n`;

      texto += `📦 *PRODUCTOS*\n`;
      cart.forEach((item) => {
        texto += `- ${item.nombre.toUpperCase()} (Talla: ${item.talla}) x${item.cantidad} - $${(item.precio * item.cantidad).toLocaleString("es-CO")}\n`;
      });

      texto += `\n💰 *RESUMEN DE COMPRA*\n`;
      texto += `* Subtotal: $${subtotal.toLocaleString("es-CO")}\n`;
      if (descuentoValor > 0) texto += `* 🏷️ Descuento cupón: -$${descuentoValor.toLocaleString("es-CO")}\n`;
      if (descuentoReferido > 0) texto += `* 🎁 Descuento referido: -$${descuentoReferido.toLocaleString("es-CO")}\n`;
      if (descuentoPuntos > 0) texto += `* ⭐ Puntos Galu canjeados: -$${descuentoPuntos.toLocaleString("es-CO")}\n`;
      texto += `*TOTAL FINAL: $${totalFinal.toLocaleString("es-CO")}* 💸\n\n`;

      texto += `------------------------------------------\n`;
      texto += `Para finalizar tu pedido, puedes realizar el pago a través de cualquiera de nuestros medios disponibles:\n\n`;
      texto += `🏦 *Opciones de pago disponibles:*\n`;
      texto += `🔹 Llave Bre-B: *@PLATA3206375509*\n`;
      texto += `👤 Titular de la cuenta: *Luzdanis Lara Severiche*\n\n`;
      texto += `📲 *Una vez realizado el pago:*\n`;
      texto += `✅ Envía el comprobante\n\n`; 1

      texto += `⚠️ *NOTA:* Hasta que no envíe el comprobante de pago no se confirmará el pedido y tiene un tiempo de *2 horas* para enviar el comprobante o su pedido será cancelado automáticamente.\n\n`;
      texto += `¡Gracias por elegir Galu Shop! 💖`;

      // Guardar en localStorage para la página de éxito (evitar latencia/RLS)
      localStorage.setItem(`order_${numeroOrden}`, JSON.stringify({ 
         pedido, 
         items: cartConVariantes.map(i => ({
            producto_nombre_snapshot: i.nombre,
            variante_detalle_snapshot: `Talla: ${i.talla}`,
            cantidad: i.cantidad,
            precio_unitario: i.precio,
            subtotal: i.precio * i.cantidad
         })) 
      }));

      clearCart();
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(texto)}`;
      window.open(whatsappUrl, "_blank");
      router.push(`/checkout/success?order=${numeroOrden}`);

    } catch (error: any) {
      toast("Error al procesar el pedido: " + error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) return <div className="min-h-screen bg-white"><Navbar /><div className="flex flex-col items-center py-20"><p className="font-bold mb-4 uppercase tracking-[0.2em]">Bolsa vacía</p><Link href="/" className="bg-black text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest">Volver</Link></div><Footer /></div>;

  return (
    <div className="bg-white min-h-screen text-black">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <form id="checkout-form" onSubmit={handleFinalizeOrder} className="space-y-10">
            <div className="flex items-center gap-4 border-b border-black pb-4">
              <ClipboardList size={24} />
              <h2 className="text-lg font-black uppercase tracking-widest">Datos de Envío</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Nombre Completo</label><input required name="nombre" value={datos.nombre} onChange={handleChange} className="border-b border-black py-2 text-sm outline-none focus:border-black font-bold text-black" /></div>
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Cédula o NIT</label><input required name="cedula" value={datos.cedula} onChange={handleChange} className="border-b border-black py-2 text-sm outline-none focus:border-black font-bold text-black" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Departamento</label><select required name="departamento" className="border-b border-black py-2 text-sm outline-none bg-transparent font-bold text-black" onChange={handleChange} value={datos.departamento}><option value="">Selecciona</option>{Object.keys(COLOMBIA_DB).sort().map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}</select></div>
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Ciudad</label><select required name="ciudad" className="border-b border-black py-2 text-sm outline-none bg-transparent font-bold text-black" onChange={handleChange} value={datos.ciudad} disabled={!datos.departamento}><option value="">Selecciona</option>{ciudadesDisponibles.sort().map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Barrio</label><input required name="barrio" onChange={handleChange} className="border-b border-black py-2 text-sm outline-none font-bold uppercase text-black" /></div>
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Dirección</label><input required name="direccion" onChange={handleChange} className="border-b border-black py-2 text-sm outline-none font-bold uppercase text-black" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Teléfono</label><input required name="telefono" value={datos.telefono} onChange={handleChange} className="border-b border-black py-2 text-sm outline-none font-bold text-black" /></div>
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Correo</label><input required name="correo" value={datos.correo} onChange={handleChange} className="border-b border-black py-2 text-sm outline-none font-bold uppercase text-black" /></div>
            </div>
            <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border border-amber-700/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Star size={18} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Club GALU</p>
                  <p className="text-[9px] text-yellow-700/80 mt-0.5">Esta compra acumulará puntos si supera $50.000</p>
                </div>
              </div>
              <Link href="/club" className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-yellow-500/40 transition-all whitespace-nowrap">
                Ver mis puntos
              </Link>
            </div>
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-4">
                <Gift size={18} />
                <h3 className="text-sm font-black uppercase tracking-widest">¿Tienes un código de referido?</h3>
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Si alguien te regaló un código, ¡úsalo aquí para obtener descuento!</p>
              <div className="flex gap-2">
                <input placeholder="GALU-XXXXX-XXXX" className="flex-1 border border-black p-3 text-xs font-bold uppercase text-black font-mono tracking-widest" value={inputReferido} onChange={(e) => setInputReferido(e.target.value)} disabled={referidoValido} />
                <button type="button" onClick={aplicarCodigoReferido} disabled={referidoValido} className="bg-black text-white px-4 text-[9px] font-black uppercase hover:bg-gray-800 transition-colors disabled:opacity-40">{referidoValido ? '✅' : 'Aplicar'}</button>
              </div>
              {mensajeReferido && <p className={`text-[10px] font-black uppercase italic ${referidoValido ? 'text-green-600' : 'text-gray-500'}`}>{mensajeReferido}</p>}
            </div>
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-4">
                <Tag size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">¿Tienes un Cupón?</h3>
              </div>
              <div className="flex gap-2">
                <input placeholder="CÓDIGO DE DESCUENTO" className="flex-1 border border-black p-3 text-xs font-bold uppercase text-black" value={inputCupon} onChange={(e) => setInputCupon(e.target.value)} />
                <button type="button" onClick={aplicarCupon} className="bg-black text-white px-6 text-[10px] font-black uppercase hover:bg-gray-800 transition-colors">Aplicar</button>
              </div>
              {mensajeCupon && <p className={`text-[10px] font-black uppercase italic ${mensajeCupon.includes('ENHORABUENA') ? 'text-green-600' : 'text-red-500'}`}>{mensajeCupon}</p>}
            </div>
            <div className="pt-6 space-y-6 text-black">
              <div className="flex items-center gap-4 border-b border-black pb-4 text-black">
                <CreditCard size={24} />
                <h2 className="text-lg font-black uppercase tracking-widest text-black">Método de Pago</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 text-black">
                <label className="flex items-center gap-4 p-5 border border-black rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-black">
                  <input type="radio" name="metodoPago" value="Transferencia Bancaria" checked={datos.metodoPago === "Transferencia Bancaria"} onChange={handleChange} className="accent-black scale-125" />
                  <div className="text-[12px] font-black uppercase tracking-widest text-black">Transferencia (Nequi / Bancolombia)</div>
                </label>
                <label className="flex items-center gap-4 p-5 border border-black rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-black">
                  <input type="radio" name="metodoPago" value="Pasa y Recoge" checked={datos.metodoPago === "Pasa y Recoge"} onChange={handleChange} className="accent-black scale-125" />
                  <div className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2 text-black">
                    <MapPin size={16} /> Pasa y Recoge (Valledupar) - Envío Gratis
                  </div>
                </label>
              </div>
            </div>
          </form>
          <div className="lg:sticky lg:top-10 h-fit bg-gray-100 p-8 border border-black space-y-8">
            <h2 className="text-xs font-black uppercase tracking-widest border-b border-black pb-4 text-black italic">Tu Resumen</h2>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 border-b border-black pb-6 text-black">
              {cart.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center text-black">
                  <div className="w-16 h-20 bg-white border border-black/10 rounded-sm overflow-hidden flex-shrink-0 text-black"><img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" /></div>
                  <div className="flex-1 flex justify-between items-center text-black">
                    <div><span className="font-black uppercase text-[12px] block text-black">{item.nombre}</span><p className="text-[10px] font-black uppercase text-gray-600">Talla: {item.talla} | Cant: {item.cantidad}</p></div>
                    <span className="font-black text-sm text-black">${(item.precio * item.cantidad).toLocaleString("es-CO")}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 pt-4 border-t-2 border-black border-dashed">
              <div className="flex justify-between items-center text-sm font-bold uppercase"><span className="text-gray-400">Subtotal</span><span className="text-black">${subtotal.toLocaleString("es-CO")}</span></div>
              <div className="flex justify-between items-center text-sm font-bold uppercase"><span className="text-gray-400">Envío ({textoEnvio})</span><span className="text-black">${envio.toLocaleString("es-CO")}</span></div>
              {descuentoValor > 0 && <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-green-600 px-2 py-1 bg-green-100">Descuento ({cuponData?.codigo})</span><span className="text-green-600">-${descuentoValor.toLocaleString("es-CO")}</span></div>}
              {descuentoReferido > 0 && <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-blue-600 px-2 py-1 bg-blue-100">Cód. Regalo Amigo</span><span className="text-blue-600">-${descuentoReferido.toLocaleString("es-CO")}</span></div>}
              {usarPuntos && <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-purple-600 px-2 py-1 bg-purple-100 border border-purple-200"><Star size={10} className="inline mr-1" /> Puntos Canjeados</span><span className="text-purple-600">-${Math.min(puntosDisponibles, subtotal + envio - descuentoValor - descuentoReferido).toLocaleString("es-CO")}</span></div>}
            </div>
            <div className="pt-4 border-t-4 border-black flex justify-between items-center">
              <span className="font-black uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black">${Math.max(0, subtotal + envio - descuentoValor - descuentoReferido - (usarPuntos ? puntosDisponibles : 0)).toLocaleString("es-CO")}</span>
            </div>
            {datos.ciudad === "Valledupar" && datos.metodoPago !== "Pasa y Recoge" && (
              <div className="bg-white p-4 border border-black flex gap-3 items-start shadow-sm text-black"><Calendar size={20} className="flex-shrink-0 mt-1 text-black" /><div><p className="text-[10px] font-black uppercase leading-tight text-black">Entrega estimada en Valledupar:</p><p className="text-[13px] font-black uppercase text-black mt-1">{getRangoEntrega()}</p><p className="text-[8px] font-bold text-gray-500 uppercase italic mt-1">(7 Días hábiles de proceso)</p></div></div>
            )}
            {puntosDisponibles > 0 && (
              <div className="bg-zinc-100 border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-2 fade-in duration-500 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10"><Star size={100} className="fill-black" /></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-black uppercase text-xl italic text-black">¡Atención VIP!</h3>
                    <p className="text-[11px] font-bold text-black uppercase tracking-widest mt-1">Tienes <span className="underline decoration-2 underline-offset-2">${puntosDisponibles.toLocaleString("es-CO")}</span> en puntos disponibles.</p>
                  </div>
                  <button type="button" onClick={() => setUsarPuntos(!usarPuntos)} className={`flex-shrink-0 border-2 border-black px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${usarPuntos ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}>{usarPuntos ? "No usar" : "Canjear"}</button>
                </div>
              </div>
            )}
            <button type="submit" form="checkout-form" disabled={isProcessing} className={`w-full bg-black text-white font-black uppercase tracking-[0.2em] py-5 rounded-full transition-all flex items-center justify-center gap-3 text-[11px] shadow-xl ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800'}`}>{isProcessing ? <>Procesando... <Loader2 className="animate-spin" size={16} /></> : <>Finalizar Pedido por WhatsApp <Send size={16} /></>}</button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}