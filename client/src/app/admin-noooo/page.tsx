"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Tag, Hash, ShoppingBag, Layers, Ticket,
  Pencil, Check, X, Settings, Trash2, ChevronLeft,
  AlertTriangle, DollarSign, Users, ArrowUpRight,
  ArrowDownRight, RefreshCw, Clock, BarChart2, Eye,
  Bell, Image as ImageIcon, Sliders, MapPin, Star, Shield
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAdminRole } from "@/context/AdminRoleContext";
import TabNotificaciones from "@/components/admin/TabNotificaciones";
import TabClientes from "@/components/admin/TabClientes";
import TabBanners from "@/components/admin/TabBanners";
import TabConfiguracion from "@/components/admin/TabConfiguracion";
import TabResenas from "@/components/admin/TabResenas";
import TabUsuarios from "@/components/admin/TabUsuarios";
import TabClubGalu from "@/components/admin/TabClubGalu";


/* ─── Toast mínimo solo para el admin (sin depender del ToastContext del layout de tienda) ─── */
function useAdminToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "ok" | "err" | "warn" }[]>([]);
  let tid = 0;
  const toast = useCallback((msg: string, type: "ok" | "err" | "warn" = "ok") => {
    const id = ++tid;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter((t: { id: number }) => t.id !== id)), 4000);
  }, []);
  return { toasts, toast };
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, sub, icon: Icon, trend, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6 flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-[10px] font-black ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-white text-2xl font-black">{value}</p>
        {sub && <p className="text-white/30 text-[10px] mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ─── Badge de estado pedido ─── */
const ESTADO_STYLE: Record<string, string> = {
  pendiente_pago: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pagado: "bg-green-500/20 text-green-400 border-green-500/30",
  en_preparacion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  enviado: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
  entregado: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};
const ESTADO_LABEL: Record<string, string> = {
  pendiente_pago: "Pend. Pago", pagado: "Pagado",
  en_preparacion: "En Prep.", enviado: "Enviado",
  cancelado: "Cancelado", entregado: "Entregado",
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${ESTADO_STYLE[estado] ?? "bg-white/10 text-white/50 border-white/10"}`}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  // Leer tab desde URL al montar
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") ?? "dashboard";
    }
    return "dashboard";
  });
  const [loading, setLoading] = useState(false);
  const [guardandoProd, setGuardandoProd] = useState(false);
  const [guardandoVariante, setGuardandoVariante] = useState(false);
  const [guardandoAtributo, setGuardandoAtributo] = useState(false);
  const [guardandoCat, setGuardandoCat] = useState(false);
  const { toasts, toast } = useAdminToast();
  const { can, canSeeTab } = useAdminRole();

  // Sync tab con URL
  const irATab = (id: string) => {
    setTab(id);
    const url = id === "dashboard" ? "/admin" : `/admin?tab=${id}`;
    window.history.pushState({}, "", url);
  };

  /* datos */
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [atributos, setAtributos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cupones, setCupones] = useState<any[]>([]);

  /* edición */
  const [editId, setEditId] = useState<string | null>(null);
  const [tmpProd, setTmpProd] = useState<any>(null);

  /* inventario */
  const [prodInv, setProdInv] = useState<any>(null);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [nVar, setNVar] = useState({ sku: "", stock: 0, valor_id: "" });

  /* atributos modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [attrSel, setAttrSel] = useState<any>(null);
  const [nuevoValAttr, setNuevoValAttr] = useState("");

  /* forms */
  const [nProd, setNProd] = useState({ nombre: "", precio_base: "", categoria_id: "", imagen_principal: "", descripcion: "", es_ropa: true, destacado: false });
  const [nCat, setNCat] = useState({ nombre: "", slug: "", imagen: "" });
  const [nAttr, setNAttr] = useState("");
  const [nCupon, setNCupon] = useState({ codigo: "", tipo: "porcentaje", valor: "", uso_maximo: "", activo: true });

  /* filtros pedidos */
  const [filtroPedido, setFiltroPedido] = useState("todos");

  /* notificaciones sin leer */
  const [notifCount, setNotifCount] = useState(0);
  useEffect(() => {
    supabase.from("notificaciones_admin").select("id", { count: "exact" }).eq("leida", false)
      .then(({ count }) => setNotifCount(count ?? 0));
  }, []);


  /* ── Loaders ── */
  const load = useCallback(async () => {
    setLoading(true);
    const [rP, rC, rA, rPed, rCup] = await Promise.all([
      supabase.from("productos").select("*, categorias(nombre)").order("created_at", { ascending: false }),
      supabase.from("categorias").select("*").order("nombre"),
      supabase.from("atributos").select("*, atributo_valores(*)"),
      supabase.from("pedidos").select("*, pedido_items(*)").order("created_at", { ascending: false }),
      supabase.from("cupones").select("*, cupon_uso(pedido_id, cliente_email, fecha_uso)").order("created_at", { ascending: false }),
    ]);
    if (rP.data) setProductos(rP.data);
    if (rC.data) setCategorias(rC.data);
    if (rA.data) setAtributos(rA.data);
    if (rPed.data) setPedidos(rPed.data);
    if (rCup.data) setCupones(rCup.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadVariantes = async (id: string) => {
    const { data } = await supabase.from("variantes_producto")
      .select(`
        *,
        variante_atributos (
          atributo_valores (
            valor
          )
        )
      `)
      .eq("producto_id", id)
      .order("created_at", { ascending: false });
    if (data) setVariantes(data);
  };

  /* ── KPIs ── */
  const pedidosHoy = pedidos.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length;
  const ingresoTotal = pedidos.filter(p => p.estado !== "cancelado").reduce((s, p) => s + Number(p.total_final ?? 0), 0);
  const pedidosPendientes = pedidos.filter(p => p.estado === "pendiente_pago").length;
  const stockBajo = productos.filter(p => {
    const s = variantes.reduce((a: number, v: any) => (v.producto_id === p.id ? a + v.stock : a), 0);
    return s < 5;
  }).length;

  /* ── Pedidos: distribución por estado (para mini gráfico) ── */
  const estadoCount = pedidos.reduce((acc: any, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const totalPed = pedidos.length || 1;

  /* ── Acciones ── */
  const actualizarEstado = async (id: string, estado: string) => {
    const { error } = await supabase.from("pedidos").update({ estado }).eq("id", id);
    if (error) toast("Error al actualizar", "err");
    else { toast("Estado actualizado ✓", "ok"); load(); }
  };

  const guardarProd = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardandoProd(true);
    try {
      const { data: p, error } = await supabase.from("productos").insert([{
        nombre: nProd.nombre, precio_base: parseFloat(nProd.precio_base),
        categoria_id: nProd.categoria_id || null, imagen_principal: nProd.imagen_principal,
        descripcion: nProd.descripcion, es_ropa: nProd.es_ropa, destacado: nProd.destacado,
      }]).select().single();
      if (error) throw error;
      if (!nProd.es_ropa) {
        await supabase.from("variantes_producto").insert([{
          producto_id: p.id,
          sku: `GEN-${p.id.split("-")[0].toUpperCase()}`,
          stock: 0
        }]);
      }
      toast("Producto creado ✓", "ok");
      setNProd({ nombre: "", precio_base: "", categoria_id: "", imagen_principal: "", descripcion: "", es_ropa: true, destacado: false });
      load();
    } catch (err: any) { toast(err.message ?? "Error al crear producto", "err"); }
    finally { setGuardandoProd(false); }
  };

  const guardarEdicion = async (id: string) => {
    const { error } = await supabase.from("productos")
      .update({ nombre: tmpProd.nombre, precio_base: parseFloat(tmpProd.precio_base), destacado: tmpProd.destacado })
      .eq("id", id);
    if (error) toast(error.message, "err");
    else { toast("Guardado ✓", "ok"); setEditId(null); load(); }
  };

  const toggleActivo = async (id: string, activo: boolean) => {
    await supabase.from("productos").update({ activo: !activo }).eq("id", id);
    toast(activo ? "Producto desactivado" : "Producto activado", "ok"); load();
  };

  const crearCat = async () => {
    const nombreLimpio = nCat.nombre.trim();
    const imagenLimpia = nCat.imagen.trim();

    if (!nombreLimpio) { toast("¡Escribe un nombre!", "warn"); return; }
    if (!imagenLimpia) { toast("Pega el URL de la imagen", "warn"); return; }

    setGuardandoCat(true);
    try {
      const slugBase = nombreLimpio
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const slug = `${slugBase}-${Math.floor(Math.random() * 100000)}`;

      const { data, error } = await supabase
        .from("categorias")
        .insert([{
          nombre: nombreLimpio,
          slug,
          imagen: imagenLimpia,
          activa: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast(`Categoría "${data.nombre}" lista ✓`, "ok");
      
      // Añade a la lista sin recargar la base de datos completa
      setCategorias(prev => [...prev, data]);
      setNCat({ nombre: "", slug: "", imagen: "" });
      
    } catch (ex: any) {
      console.error("Error cat:", ex);
      toast(`Error: ${ex?.message || JSON.stringify(ex)}`, "err");
    } finally {
      setGuardandoCat(false);
    }
  };

  const crearVariante = async () => {
    if (!nVar.valor_id || !prodInv) {
      toast("Selecciona una talla o color primero", "warn"); return;
    }
    setGuardandoVariante(true);
    try {
      const { data: vData, error: vErr } = await supabase.from("variantes_producto").insert([{
        producto_id: prodInv.id,
        sku: nVar.sku || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        stock: nVar.stock,
      }]).select().single();
      if (vErr) throw vErr;
      const { error: vaErr } = await supabase.from("variante_atributos").insert([{
        variante_id: vData.id, atributo_valor_id: nVar.valor_id
      }]);
      if (vaErr) throw vaErr;
      loadVariantes(prodInv.id);
      setNVar({ sku: "", stock: 0, valor_id: "" });
      toast("Variante añadida ✓", "ok");
    } catch (err: any) {
      toast(err.message ?? "Error al crear variante", "err");
    } finally { setGuardandoVariante(false); }
  };

  const eliminarVariante = async (id: string) => {
    if (!confirm("¿Eliminar esta variante?")) return;
    await supabase.from("variante_atributos").delete().eq("variante_id", id);
    await supabase.from("variantes_producto").delete().eq("id", id);
    toast("Variante eliminada", "ok"); loadVariantes(prodInv.id);
  };

  const crearAtributo = async () => {
    if (!nAttr.trim()) { toast("Escribe un nombre", "warn"); return; }
    setGuardandoAtributo(true);
    const { error } = await supabase.from("atributos").insert([{ nombre: nAttr.trim().toUpperCase() }]);
    if (error) toast(error.message, "err");
    else { toast("Atributo creado ✓", "ok"); setNAttr(""); load(); }
    setGuardandoAtributo(false);
  };

  const guardarValAtrib = async () => {
    if (!nuevoValAttr || !attrSel) return;
    await supabase.from("atributo_valores").insert([{ atributo_id: attrSel.id, valor: nuevoValAttr.toUpperCase() }]);
    setNuevoValAttr(""); setModalOpen(false); load();
  };

  const crearCupon = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { error } = await supabase.from("cupones").insert([{
        codigo: nCupon.codigo.toUpperCase(), tipo: nCupon.tipo,
        valor: parseFloat(nCupon.valor),
        uso_maximo: nCupon.uso_maximo ? parseInt(nCupon.uso_maximo) : null,
        activo: nCupon.activo,
      }]);
      if (error) throw error;
      toast("Cupón creado ✓", "ok");
      setNCupon({ codigo: "", tipo: "porcentaje", valor: "", uso_maximo: "", activo: true }); load();
    } catch (err: any) { toast(err.message, "err"); }
    finally { setLoading(false); }
  };

  const pedidosFiltrados = filtroPedido === "todos" ? pedidos : pedidos.filter(p => p.estado === filtroPedido);

  /* ══ NAV tabs (filtrados por rol) ══ */
  const ALL_TABS = [
    { id: "dashboard", icon: BarChart2, label: "Dashboard" },
    { id: "pedidos", icon: ShoppingBag, label: "Pedidos" },
    { id: "productos", icon: Package, label: "Catálogo" },
    { id: "stock", icon: Hash, label: "Inventario" },
    { id: "categorias", icon: Tag, label: "Categorías" },
    { id: "atributos", icon: Layers, label: "Atributos" },
    { id: "cupones", icon: Ticket, label: "Cupones" },
    { id: "clientes", icon: Users, label: "Clientes" },
    { id: "club", icon: Star, label: "Club GALU" },
    { id: "resenas", icon: Star, label: "Reseñas" },
    { id: "banners", icon: ImageIcon, label: "Banners" },
    { id: "configuracion", icon: Sliders, label: "Configuración" },
    { id: "notificaciones", icon: Bell, label: "Notifs", badge: notifCount },
    { id: "usuarios", icon: Shield, label: "Usuarios" },
  ];
  // Mostrar solo los tabs que el rol del usuario puede ver
  const TABS = ALL_TABS.filter(t => canSeeTab(t.id));


  return (
    <div className="text-white min-h-full" style={{ fontFamily: "Arial, sans-serif" }}>

      {/* ── Toast container ── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`pointer-events-auto px-5 py-3 rounded-xl text-[12px] font-black shadow-2xl border ${t.type === "ok" ? "bg-green-900 border-green-500 text-green-300"
                : t.type === "err" ? "bg-red-900 border-red-500 text-red-300"
                  : "bg-yellow-900 border-yellow-500 text-yellow-300"}`}>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Sub-nav horizontal ── */}
      <div className="flex gap-1 mb-8 bg-[#1a1a1a] border border-white/8 rounded-xl p-1.5 overflow-x-auto">
        {TABS.map(({ id, icon: Icon, label, badge }: any) => (
          <button key={id} onClick={() => irATab(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${tab === id ? "bg-[#FCD7DE] text-black" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
            <Icon size={14} /> {label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        ))}


        <button onClick={() => { load(); toast("Datos actualizados ✓", "ok"); }}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/5 transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync
        </button>
      </div>

      {/* ══════════ DASHBOARD ══════════ */}
      {tab === "dashboard" && (
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-black uppercase italic text-white">Resumen General</h1>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">
              {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Ingresos Totales" value={`$${ingresoTotal.toLocaleString("es-CO")}`}
              sub={`${pedidos.filter(p => p.estado !== "cancelado").length} pedidos efectivos`}
              icon={DollarSign} color="bg-green-600" />
            <KpiCard label="Pedidos Hoy" value={pedidosHoy}
              sub={`${pedidos.length} en total`} icon={ShoppingBag} color="bg-blue-600" />
            <KpiCard label="Pend. de Pago" value={pedidosPendientes}
              sub="Confirmación pendiente" icon={Clock} color="bg-yellow-600" />
            <KpiCard label="Productos" value={productos.length}
              sub={`${categorias.length} categorías`} icon={Package} color="bg-purple-600" />
          </div>

          {/* Distribución de pedidos + Últimos pedidos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Gráfico de estados */}
            <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-6">Estado de Pedidos</h3>
              <div className="space-y-3">
                {Object.entries(estadoCount).map(([estado, cnt]: any) => (
                  <div key={estado}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-white/60">{ESTADO_LABEL[estado] ?? estado}</span>
                      <span className="text-[10px] font-black text-white">{cnt}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cnt / totalPed) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${estado === "enviado" ? "bg-purple-400"
                          : estado === "pagado" ? "bg-green-400"
                            : estado === "pendiente_pago" ? "bg-yellow-400"
                              : estado === "cancelado" ? "bg-red-400"
                                : "bg-blue-400"}`}
                      />
                    </div>
                  </div>
                ))}
                {pedidos.length === 0 && <p className="text-white/20 text-[10px] text-center py-4">Sin pedidos aún</p>}
              </div>
            </div>

            {/* Últimos 5 pedidos */}
            <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/8 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50">Últimas Ventas</h3>
                <button onClick={() => setTab("pedidos")} className="text-[9px] font-black uppercase text-[#FCD7DE] hover:underline">
                  Ver todas →
                </button>
              </div>
              <div className="space-y-3">
                {pedidos.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5">
                    <div>
                      <p className="text-[11px] font-black uppercase text-white">
                        #{String(p.numero_pedido).padStart(4, "0")} — {p.cliente_nombre}
                      </p>
                      <p className="text-white/30 text-[9px] mt-0.5">
                        {new Date(p.created_at).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <EstadoBadge estado={p.estado} />
                      <span className="text-white text-[11px] font-black">${Number(p.total_final).toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                ))}
                {pedidos.length === 0 && <p className="text-white/20 text-[10px] text-center py-8">No hay pedidos registrados</p>}
              </div>
            </div>
          </div>

          {/* Alertas stock bajo */}
          {stockBajo > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={18} className="text-yellow-400" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
                  Alerta de Stock Bajo ({stockBajo} productos)
                </h3>
              </div>
              <p className="text-white/40 text-[11px]">
                Hay productos con menos de 5 unidades. Ve a <button onClick={() => setTab("stock")} className="text-[#FCD7DE] underline font-black">Inventario</button> para revisar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════ PEDIDOS ══════════ */}
      {tab === "pedidos" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase italic">Gestión de Ventas</h2>
            <div className="flex gap-2 flex-wrap">
              {["todos", "pendiente_pago", "pagado", "en_preparacion", "enviado", "cancelado"].map(e => (
                <button key={e} onClick={() => setFiltroPedido(e)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all ${filtroPedido === e ? "bg-[#FCD7DE] text-black border-transparent" : "border-white/20 text-white/50 hover:border-white/40 hover:text-white"}`}>
                  {ESTADO_LABEL[e] ?? "Todos"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {pedidosFiltrados.map(ped => (
              <div key={ped.id} className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="text-white font-black text-sm">#{String(ped.numero_pedido).padStart(4, "0")}</span>
                    <EstadoBadge estado={ped.estado} />
                    <span className="text-white/30 text-[9px]">{new Date(ped.created_at).toLocaleString("es-CO")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={ped.estado} onChange={e => actualizarEstado(ped.id, e.target.value)}
                      className="bg-[#111] border border-white/20 text-white text-[10px] font-black uppercase px-3 py-2 rounded-lg outline-none">
                      <option value="pendiente_pago">Pendiente Pago</option>
                      <option value="pagado">Pagado</option>
                      <option value="en_preparacion">En Preparación</option>
                      <option value="enviado">Enviado</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-white/30 text-[9px] uppercase font-black mb-1">Cliente</p>
                    <p className="text-white text-[12px] font-black uppercase">{ped.cliente_nombre}</p>
                    <p className="text-white/50 text-[10px]">{ped.numero_whatsapp}</p>
                    <p className="text-white/30 text-[9px]">{ped.cliente_email}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[9px] uppercase font-black mb-1">Destino</p>
                    <p className="text-white/70 text-[11px] font-bold uppercase">{ped.direccion}</p>
                    <p className="text-white/50 text-[10px] uppercase">{ped.ciudad}, {ped.departamento}</p>
                    <p className="text-[#FCD7DE] text-[9px] font-black uppercase mt-1">{ped.metodo_pago}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[9px] uppercase font-black mb-1">Artículos</p>
                    <div className="space-y-1">
                      {ped.pedido_items?.map((item: any) => (
                        <p key={item.id} className="text-white/60 text-[10px]">
                          {item.cantidad}× {item.producto_nombre_snapshot} <span className="text-white/30">({item.variante_detalle_snapshot})</span>
                        </p>
                      ))}
                    </div>
                    <p className="text-white font-black text-sm mt-2">${Number(ped.total_final).toLocaleString("es-CO")}</p>
                  </div>
                </div>
              </div>
            ))}
            {pedidosFiltrados.length === 0 && (
              <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-16 text-center">
                <ShoppingBag size={40} className="mx-auto text-white/10 mb-4" />
                <p className="text-white/30 text-[11px] uppercase font-black">Sin pedidos en esta categoría</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ CATÁLOGO ══════════ */}
      {tab === "productos" && (
        <div className="space-y-8">
          <h2 className="text-xl font-black uppercase italic">Catálogo de Productos</h2>

          {/* Form nuevo producto */}
          <form onSubmit={guardarProd} className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <h3 className="md:col-span-2 text-[11px] font-black uppercase tracking-widest text-white/40 border-b border-white/8 pb-3 mb-2">Nuevo Producto</h3>
            {[
              { ph: "Nombre del producto", key: "nombre", type: "text", req: true },
              { ph: "Precio base (COP)", key: "precio_base", type: "number", req: true },
              { ph: "URL imagen principal", key: "imagen_principal", type: "text", req: true },
              { ph: "Descripción", key: "descripcion", type: "text", req: false },
            ].map(f => (
              <input key={f.key} type={f.type} required={f.req} placeholder={f.ph}
                className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none focus:border-[#FCD7DE]/50"
                value={(nProd as any)[f.key]} onChange={e => setNProd({ ...nProd, [f.key]: e.target.value })} />
            ))}
            <select required className="bg-[#111] border border-white/15 text-white px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
              value={nProd.categoria_id} onChange={e => setNProd({ ...nProd, categoria_id: e.target.value })}>
              <option value="">Seleccionar categoría…</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-white/50 cursor-pointer">
                <input type="checkbox" checked={nProd.es_ropa} onChange={e => setNProd({ ...nProd, es_ropa: e.target.checked })} /> ¿Es Ropa?
              </label>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-white/50 cursor-pointer">
                <input type="checkbox" checked={nProd.destacado} onChange={e => setNProd({ ...nProd, destacado: e.target.checked })} /> Destacado
              </label>
            </div>
            <button type="submit" disabled={guardandoProd}
              className="md:col-span-2 bg-[#FCD7DE] text-black font-black uppercase tracking-widest py-4 rounded-lg hover:bg-white transition-all disabled:opacity-40">
              {guardandoProd ? "Creando…" : "Crear Producto"}
            </button>
          </form>

          {/* Lista */}
          <div className="space-y-2">
            {productos.map(p => (
              <div key={p.id} className="bg-[#1a1a1a] border border-white/8 rounded-xl px-5 py-4 flex items-center gap-4">
                <img src={p.imagen_principal} className="w-12 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" alt={p.nombre} />
                <div className="flex-1 min-w-0">
                  {editId === p.id ? (
                    <div className="flex gap-2 flex-wrap">
                      <input className="bg-[#111] border border-white/20 text-white px-3 py-1.5 rounded text-xs flex-1 min-w-32" value={tmpProd.nombre} onChange={e => setTmpProd({ ...tmpProd, nombre: e.target.value })} />
                      <input type="number" className="bg-[#111] border border-white/20 text-white px-3 py-1.5 rounded text-xs w-28" value={tmpProd.precio_base} onChange={e => setTmpProd({ ...tmpProd, precio_base: e.target.value })} />
                    </div>
                  ) : (
                    <>
                      <p className="text-white text-[12px] font-black uppercase truncate">{p.nombre}</p>
                      <p className="text-white/40 text-[10px] mt-0.5">{p.categorias?.nombre} · ${Number(p.precio_base).toLocaleString("es-CO")} {p.destacado && <span className="text-[#FCD7DE] ml-1">★ Destacado</span>}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editId === p.id ? (
                    <>
                      <button onClick={() => guardarEdicion(p.id)} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40"><Check size={14} /></button>
                      <button onClick={() => setEditId(null)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(p.id); setTmpProd({ ...p }); }} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5"><Pencil size={14} /></button>
                      <button onClick={() => toggleActivo(p.id, p.activo !== false)} className={`p-2 rounded-lg transition-all ${p.activo !== false ? "text-green-400 hover:bg-green-500/20" : "text-red-400 hover:bg-red-500/20"}`}>
                        {p.activo !== false ? <Eye size={14} /> : <X size={14} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ INVENTARIO ══════════ */}
      {tab === "stock" && (
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase italic">Inventario PRO</h2>
          {!prodInv ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productos.map(p => (
                <button key={p.id} onClick={() => { setProdInv(p); loadVariantes(p.id); }}
                  className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 flex items-center gap-4 hover:border-[#FCD7DE]/40 hover:bg-[#FCD7DE]/5 transition-all text-left">
                  <img src={p.imagen_principal} className="w-12 h-14 object-cover rounded-lg border border-white/10" alt="" />
                  <div>
                    <p className="text-white text-[11px] font-black uppercase">{p.nombre}</p>
                    <p className="text-white/30 text-[9px] mt-0.5">{p.categorias?.nombre}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => setProdInv(null)} className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest">
                <ChevronLeft size={14} /> Volver
              </button>
              <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6">
                <h3 className="text-[11px] font-black uppercase text-white/40 mb-4">Nueva variante — {prodInv.nombre}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <select className="bg-[#111] border border-white/15 text-white px-3 py-2 rounded-lg text-[11px] font-bold outline-none col-span-2 md:col-span-1"
                    value={nVar.valor_id} onChange={e => setNVar({ ...nVar, valor_id: e.target.value })}>
                    <option value="">Elegir talla/color…</option>
                    {atributos.map(a => (
                      <optgroup key={a.id} label={a.nombre}>
                        {a.atributo_valores?.map((v: any) => <option key={v.id} value={v.id}>{v.valor}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input placeholder="SKU" className="bg-[#111] border border-white/15 text-white px-3 py-2 rounded-lg text-[11px] font-bold outline-none"
                    value={nVar.sku} onChange={e => setNVar({ ...nVar, sku: e.target.value })} />
                  <input type="number" placeholder="Stock" className="bg-[#111] border border-white/15 text-white px-3 py-2 rounded-lg text-[11px] font-bold outline-none"
                    value={nVar.stock} onChange={e => setNVar({ ...nVar, stock: parseInt(e.target.value) })} />
                  <button onClick={crearVariante} disabled={guardandoVariante}
                    className="bg-[#FCD7DE] text-black font-black uppercase text-[10px] rounded-lg hover:bg-white transition-all disabled:opacity-50">
                    {guardandoVariante ? "…" : "Añadir"}
                  </button>
                </div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
                <table className="w-full text-[11px] font-bold text-white">
                  <thead><tr className="border-b border-white/8 text-white/30 text-[9px] uppercase">
                    <th className="p-4 text-left">Variante</th><th className="p-4">SKU</th><th className="p-4">Stock</th><th className="p-4">Acción</th>
                  </tr></thead>
                  <tbody>
                    {variantes.map(v => (
                      <tr key={v.id} className="border-b border-white/5 hover:bg-white/3">
                        <td className="p-4 font-black text-white">{v.variante_atributos?.map((va: any) => va.atributo_valores?.valor).join(" / ") || "Base"}</td>
                        <td className="p-4 text-center text-white/30">{v.sku}</td>
                        <td className="p-4 text-center">
                          <input type="number" defaultValue={v.stock}
                            onBlur={async e => { await supabase.from("variantes_producto").update({ stock: parseInt(e.target.value) }).eq("id", v.id); toast("Stock actualizado ✓", "ok"); }}
                            className={`w-16 text-center px-2 py-1 rounded border text-black font-black ${v.stock < 5 ? "bg-red-400 border-red-500" : v.stock < 15 ? "bg-yellow-400 border-yellow-500" : "bg-green-400 border-green-500"}`} />
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => eliminarVariante(v.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ CATEGORÍAS ══════════ */}
      {tab === "categorias" && (
        <div className="space-y-8">
          <h2 className="text-xl font-black uppercase italic">Categorías</h2>
          <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Nombre" className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
              value={nCat.nombre} onChange={e => setNCat({ ...nCat, nombre: e.target.value })} />
            <input placeholder="URL imagen" className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
              value={nCat.imagen} onChange={e => setNCat({ ...nCat, imagen: e.target.value })} />
            <button onClick={crearCat} disabled={guardandoCat} className="bg-[#FCD7DE] text-black font-black uppercase tracking-widest rounded-lg hover:bg-white transition-all disabled:opacity-50">
              {guardandoCat ? "Creando..." : "Crear"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categorias.map(cat => (
              <div key={cat.id} className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden group">
                <div className="aspect-square"><img src={cat.imagen} className="w-full h-full object-cover" alt={cat.nombre} /></div>
                <div className="p-3 text-center">
                  <p className="text-white text-[10px] font-black uppercase">{cat.nombre}</p>
                  <p className="text-white/30 text-[9px]">/{cat.slug}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ ATRIBUTOS ══════════ */}
      {tab === "atributos" && (
        <div className="space-y-8">
          <h2 className="text-xl font-black uppercase italic">Atributos & Variantes</h2>
          <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6 flex gap-3">
            <input placeholder="Nombre del atributo (ej: TALLA, COLOR)" className="flex-1 bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
              value={nAttr} onChange={e => setNAttr(e.target.value)} />
            <button onClick={crearAtributo} disabled={guardandoAtributo}
              className="bg-[#FCD7DE] text-black font-black uppercase px-6 rounded-lg hover:bg-white transition-all text-[11px] tracking-widest disabled:opacity-50">
              {guardandoAtributo ? "…" : "Crear"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {atributos.map(attr => (
              <div key={attr.id} className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-white font-black uppercase text-sm">{attr.nombre}</p>
                  <Settings size={14} className="text-white/20" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {attr.atributo_valores?.map((v: any) => (
                    <span key={v.id} className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase text-white/70">{v.valor}</span>
                  ))}
                  <button onClick={() => { setAttrSel(attr); setModalOpen(true); }}
                    className="px-3 py-1 border border-dashed border-white/20 rounded-full text-[9px] font-black text-white/30 hover:text-white hover:border-white/50 transition-all">
                    + Añadir
                  </button>
                </div>
              </div>
            ))}
          </div>
          <AnimatePresence>
            {modalOpen && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#1a1a1a] border border-white/15 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-white font-black uppercase italic">Añadir valor — {attrSel?.nombre}</h4>
                    <button onClick={() => setModalOpen(false)} className="text-white/30 hover:text-white"><X size={20} /></button>
                  </div>
                  <input autoFocus placeholder="Valor (ej: XL, ROJO)" className="w-full bg-[#111] border border-white/20 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[13px] font-black uppercase mb-4 outline-none focus:border-[#FCD7DE]/50"
                    value={nuevoValAttr} onChange={e => setNuevoValAttr(e.target.value)} onKeyDown={e => e.key === "Enter" && guardarValAtrib()} />
                  <button onClick={guardarValAtrib} className="w-full bg-[#FCD7DE] text-black font-black uppercase tracking-widest py-3 rounded-lg hover:bg-white transition-all text-[11px]">Guardar</button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ══════════ CUPONES ══════════ */}
      {tab === "cupones" && (
        <div className="space-y-8">
          <h2 className="text-xl font-black uppercase italic">Cupones de Descuento</h2>
          <form onSubmit={crearCupon} className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <input required placeholder="CÓDIGO" className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-black uppercase outline-none col-span-2 md:col-span-1"
              value={nCupon.codigo} onChange={e => setNCupon({ ...nCupon, codigo: e.target.value })} />
            <select className="bg-[#111] border border-white/15 text-white px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
              value={nCupon.tipo} onChange={e => setNCupon({ ...nCupon, tipo: e.target.value })}>
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="fijo">Monto Fijo ($)</option>
            </select>
            <input required type="number" placeholder="Valor" className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
              value={nCupon.valor} onChange={e => setNCupon({ ...nCupon, valor: e.target.value })} />
            <input type="number" placeholder="Usos máx. (vacío = ∞)" className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-4 py-3 rounded-lg text-[12px] font-bold outline-none"
              value={nCupon.uso_maximo} onChange={e => setNCupon({ ...nCupon, uso_maximo: e.target.value })} />
            <button type="submit" disabled={loading} className="col-span-2 md:col-span-4 bg-[#FCD7DE] text-black font-black uppercase tracking-widest py-4 rounded-lg hover:bg-white transition-all">
              Crear Cupón
            </button>
          </form>
          <div className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-[11px] font-bold text-white">
              <thead><tr className="border-b border-white/8 text-white/30 text-[9px] uppercase">
                {["Código", "Descuento", "Usos", "Estado", "Historial"].map(h => <th key={h} className="p-4 text-left">{h}</th>)}
              </tr></thead>
              <tbody>
                {cupones.map(c => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="p-4 font-black text-[#FCD7DE]">{c.codigo}</td>
                    <td className="p-4">{c.tipo === "porcentaje" ? `${c.valor}%` : `$${c.valor}`}</td>
                    <td className="p-4 text-white/50">{c.usos_actuales ?? 0} / {c.uso_maximo ?? "∞"}</td>
                    <td className="p-4">
                      <button onClick={async () => { await supabase.from("cupones").update({ activo: !c.activo }).eq("id", c.id); load(); }}
                        className={`px-3 py-1 rounded-full text-[9px] font-black border ${c.activo ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="p-4 text-white/30 text-[9px] space-y-1">
                      {c.cupon_uso?.slice(0, 2).map((u: any, i: number) => <p key={i}>{u.cliente_email}</p>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ CLIENTES ══════════ */}
      {tab === "clientes" && <TabClientes toast={toast} />}

      {/* ══════════ CLUB GALU ══════════ */}
      {tab === "club" && <TabClubGalu toast={toast} />}

      {/* ══════════ RESEÑAS ══════════ */}
      {tab === "resenas" && <TabResenas toast={toast} />}

      {/* ══════════ BANNERS ══════════ */}
      {tab === "banners" && <TabBanners toast={toast} />}

      {/* ══════════ CONFIGURACIÓN ══════════ */}
      {tab === "configuracion" && <TabConfiguracion toast={toast} />}

      {/* ══════════ NOTIFICACIONES ══════════ */}
      {tab === "notificaciones" && <TabNotificaciones toast={toast} />}

      {/* ══════════ USUARIOS ADMIN (solo super_admin) ══════════ */}
      {tab === "usuarios" && <TabUsuarios toast={toast} />}

    </div>
  );
}