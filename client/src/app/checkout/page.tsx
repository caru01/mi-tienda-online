"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { ClipboardList, CreditCard, Truck, Send, Tag, Calendar, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; 

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

  const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

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
    setMensajeCupon(`CUPÓN ${cupon.codigo} APLICADO`);
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

  // --- PROCESAMIENTO FINAL CON NUEVA BASE DE DATOS ---
  const handleFinalizeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. VALIDACIÓN DE STOCK REAL POR VARIANTE
      const cartConVariantes = [];
      for (const item of cart) {
        const { data: variante, error: vErr } = await supabase
          .from('variantes_producto')
          .select(`id, stock, variante_atributos!inner(atributo_valores!inner(valor))`)
          .eq('producto_id', item.id)
          .eq('variante_atributos.atributo_valores.valor', item.talla)
          .single();

        if (vErr || !variante || variante.stock < item.cantidad) {
          alert(`¡Lo sentimos! El producto "${item.nombre.toUpperCase()}" en talla ${item.talla} no tiene stock suficiente.`);
          setIsProcessing(false);
          return;
        }
        cartConVariantes.push({ ...item, variante_id: variante.id, stock_actual: variante.stock });
      }

      const totalFinal = subtotal + envio - descuentoValor;

      // 2. GUARDAR EL PEDIDO (Tabla 'pedidos')
      const { data: pedido, error: pErr } = await supabase
        .from("pedidos")
        .insert([{
          cliente_nombre: datos.nombre,
          cliente_email: datos.correo,
          numero_whatsapp: datos.telefono,
          cedula: datos.cedula,
          departamento: datos.departamento,
          ciudad: datos.ciudad,
          barrio: datos.barrio,
          direccion: datos.direccion,
          metodo_pago: datos.metodoPago,
          subtotal: subtotal,
          descuento: descuentoValor,
          total_final: totalFinal,
          cupon_id: cuponData?.id || null
        }])
        .select().single();

      if (pErr) throw pErr;

      // 3. REGISTRAR ITEMS (pedido_items) Y ACTUALIZAR STOCK (variantes_producto)
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

      // 4. CONSTRUCCIÓN DEL MENSAJE WHATSAPP (MANTENIENDO TU FORMATO EXACTO)
      const numeroWhatsApp = "573022461068";
      const numeroOrden = String(pedido.numero_pedido).padStart(4, '0');
      
      let texto = `¡Hola GALU SHOP!\n\n`;
      texto += `Acabo de realizar el pedido *#${numeroOrden}*\n\n`;
      
      texto += `*DATOS DEL CLIENTE*\n`;
      texto += `* Nombre: ${datos.nombre.toUpperCase()}\n`;
      texto += `* Cédula: ${datos.cedula}\n`;
      texto += `* Teléfono: ${datos.telefono}\n`;
      texto += `* Correo: ${datos.correo.toLowerCase()}\n\n`;
      
      texto += `*INFORMACIÓN DE ENTREGA*\n`;
      texto += `* Ciudad: ${datos.ciudad.toUpperCase()} (${datos.departamento.toUpperCase()})\n`;
      texto += `* Dirección: ${datos.direccion.toUpperCase()}\n`;
      texto += `* Barrio: ${datos.barrio.toUpperCase()}\n`;
      texto += `* Entrega estimada: ${getRangoEntrega()}\n\n`;

      texto += `*MÉTODO DE PAGO Y ENVÍO*\n`;
      texto += `* Pago: ${datos.metodoPago.toUpperCase()}\n`;
      texto += `* Envío: ${textoEnvio}\n\n`;

      texto += `*PRODUCTOS:*\n`;
      cart.forEach((item) => {
        texto += `- ${item.nombre.toUpperCase()} (Talla: ${item.talla}) x${item.cantidad} - $${(item.precio * item.cantidad).toLocaleString("es-CO")}\n`;
      });

      texto += `\n*RESUMEN:*\n`;
      texto += `* Subtotal: $${subtotal.toLocaleString("es-CO")}\n`;
      if (descuentoValor > 0) texto += `* Descuento: -$${descuentoValor.toLocaleString("es-CO")}\n`;
      texto += `*TOTAL FINAL: $${totalFinal.toLocaleString("es-CO")}*\n\n`;

      texto += `*Adjunto comprobante de pago*\n`;
      texto += `*NOTA:* Hasta que no envíe el comprobante de pago no se confirmará el pedido y tiene un tiempo de *2 horas* para enviar el comprobante o su pedido será cancelado automáticamente.\n\n`;
      texto += `Gracias`;

      clearCart();
      window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`, "_blank");
      
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) return <div className="min-h-screen bg-white"><Navbar /><div className="flex flex-col items-center py-20"><p className="font-bold mb-4 uppercase tracking-[0.2em]">Bolsa vacía</p><Link href="/" className="bg-black text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest">Volver</Link></div><Footer /></div>;

  return (
    <div className="bg-white min-h-screen text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <form id="checkout-form" onSubmit={handleFinalizeOrder} className="space-y-10">
            <div className="flex items-center gap-4 border-b border-black pb-4">
              <ClipboardList size={24} />
              <h2 className="text-lg font-black uppercase tracking-widest">Datos de Envío</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Nombre Completo</label><input required name="nombre" value={datos.nombre} onChange={handleChange} className="border-b border-black py-2 text-sm outline-none focus:border-[#FCD7DE] uppercase font-bold text-black" /></div>
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black uppercase">Cédula o NIT</label><input required name="cedula" value={datos.cedula} onChange={handleChange} className="border-b border-black py-2 text-sm outline-none focus:border-[#FCD7DE] font-bold text-black" /></div>
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

            <div className="pt-4 border-t border-gray-100 space-y-4 text-black">
              <div className="flex items-center gap-4"><Tag size={20} /><h3 className="text-sm font-black uppercase tracking-widest">¿Tienes un Cupón?</h3></div>
              <div className="flex gap-2">
                <input placeholder="CÓDIGO DE DESCUENTO" className="flex-1 border border-black p-3 text-xs font-bold uppercase text-black" value={inputCupon} onChange={(e) => setInputCupon(e.target.value)} />
                <button type="button" onClick={aplicarCupon} className="bg-black text-white px-6 text-[10px] font-black uppercase hover:bg-gray-800 transition-colors">Aplicar</button>
              </div>
              {mensajeCupon && <p className="text-[10px] font-black uppercase italic text-gray-500">{mensajeCupon}</p>}
            </div>

            <div className="pt-6 space-y-6 text-black">
              <div className="flex items-center gap-4 border-b border-black pb-4 text-black"><CreditCard size={24} /><h2 className="text-lg font-black uppercase tracking-widest text-black">Método de Pago</h2></div>
              <div className="grid grid-cols-1 gap-4 text-black">
                <label className="flex items-center gap-4 p-5 border border-black rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-black"><input type="radio" name="metodoPago" value="Transferencia Bancaria" checked={datos.metodoPago === "Transferencia Bancaria"} onChange={handleChange} className="accent-black scale-125" /><div className="text-[12px] font-black uppercase tracking-widest text-black">Transferencia (Nequi / Bancolombia)</div></label>
                <label className="flex items-center gap-4 p-5 border border-black rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-black"><input type="radio" name="metodoPago" value="Pasa y Recoge" checked={datos.metodoPago === "Pasa y Recoge"} onChange={handleChange} className="accent-black scale-125" /><div className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2 text-black"><MapPin size={16} /> Pasa y Recoge (Valledupar) - Envío Gratis</div></label>
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

            <div className="space-y-4 pt-2 text-black">
              <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-black"><span>Subtotal</span><span>${subtotal.toLocaleString("es-CO")}</span></div>
              {descuentoValor > 0 && <div className="flex justify-between items-center text-green-600 font-black uppercase text-xs"><span>Descuento</span><span>-${descuentoValor.toLocaleString("es-CO")}</span></div>}
              <div className={`flex justify-between items-center font-black italic ${envio === 0 ? 'text-green-600' : 'text-[#d14d64]'}`}><span className="text-[11px] uppercase tracking-widest flex items-center gap-2"><Truck size={14} /> Envío</span><span>{textoEnvio}</span></div>

              {datos.ciudad === "Valledupar" && datos.metodoPago !== "Pasa y Recoge" && (
                <div className="bg-white p-4 border border-black flex gap-3 items-start shadow-sm text-black"><Calendar size={20} className="flex-shrink-0 mt-1 text-black" /><div><p className="text-[10px] font-black uppercase leading-tight text-black">Entrega estimada en Valledupar:</p><p className="text-[13px] font-black uppercase text-black mt-1">{getRangoEntrega()}</p><p className="text-[8px] font-bold text-gray-500 uppercase italic mt-1">(7 Días hábiles de proceso)</p></div></div>
              )}

              <div className="flex justify-between items-center border-t border-black pt-4 text-black"><span className="text-sm font-black uppercase tracking-widest text-black">Total a pagar</span><span className="text-2xl font-black text-black">${(subtotal + envio - descuentoValor).toLocaleString("es-CO")}</span></div>
            </div>

            <button type="submit" form="checkout-form" disabled={isProcessing} className={`w-full bg-black text-white font-black uppercase tracking-[0.2em] py-5 rounded-full transition-all flex items-center justify-center gap-3 text-[11px] shadow-xl ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#FCD7DE] hover:text-black'}`}>
              {isProcessing ? <>Procesando... <Loader2 className="animate-spin" size={16} /></> : <>Finalizar Pedido por WhatsApp <Send size={16} /></>}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}