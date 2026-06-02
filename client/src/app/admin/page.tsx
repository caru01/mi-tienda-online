"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Tag, Plus, Save, Hash, Wifi, WifiOff, ListOrdered, Star, ExternalLink,
  Pencil, Check, X, Layers, Settings, Trash2, Search, ChevronLeft, Ticket, ShoppingBag // Añadido ShoppingBag
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("productos");
  const [loading, setLoading] = useState(false);
  const [listaProductos, setListaProductos] = useState<any[]>([]);
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [listaAtributos, setListaAtributos] = useState<any[]>([]);
  const [listaPedidos, setListaPedidos] = useState<any[]>([]); // Estado para pedidos
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // --- ESTADOS PARA CUPONES ---
  const [listaCupones, setListaCupones] = useState<any[]>([]);
  const [nuevoCupon, setNuevoCupon] = useState({
    codigo: "",
    tipo: "porcentaje",
    valor: "",
    uso_maximo: "",
    activo: true
  });

  // --- ESTADOS PARA EDICIÓN ---
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tempProducto, setTempProducto] = useState<any>(null);

  // --- ESTADOS PARA INVENTARIO PRO ---
  const [productoInventario, setProductoInventario] = useState<any>(null);
  const [variantesProducto, setVariantesProducto] = useState<any[]>([]);
  const [nuevaVariante, setNuevaVariante] = useState({ sku: "", stock: 0, valor_id: "" });

  // --- ESTADOS PARA MODAL ATRIBUTOS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [atributoSeleccionado, setAtributoSeleccionado] = useState<any>(null);
  const [nuevoValorAtributo, setNuevoValorAtributo] = useState("");

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "", precio_base: "", categoria_id: "", imagen_principal: "", 
    descripcion: "", es_ropa: true, destacado: false 
  });

  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: "", slug: "", imagen: "" });
  const [nuevoAtributo, setNuevoAtributo] = useState("");

  const cargarTodo = async () => {
    setLoading(true);
    await Promise.all([
        cargarProductos(), 
        cargarCategorias(), 
        cargarAtributos(),
        cargarCupones(),
        cargarPedidos() // Nueva carga de pedidos
    ]);
    setLoading(false);
  };

  const cargarAtributos = async () => {
    const { data } = await supabase.from('atributos').select('*, atributo_valores(*)');
    if (data) setListaAtributos(data);
  };

  const cargarProductos = async () => {
    const { data } = await supabase.from('productos').select('*, categorias(nombre)').order('created_at', { ascending: false });
    if (data) setListaProductos(data);
  };

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
    if (data) setListaCategorias(data);
  };

  const cargarVariantes = async (prodId: string) => {
    const { data } = await supabase
      .from('variantes_producto')
      .select('*, variante_atributos(atributo_valores(valor))')
      .eq('producto_id', prodId);
    if (data) setVariantesProducto(data);
  };

  const cargarCupones = async () => {
    const { data } = await supabase
      .from('cupones')
      .select('*, cupon_uso(pedido_id, cliente_email, fecha_uso)')
      .order('created_at', { ascending: false });
    if (data) setListaCupones(data);
  };

  // --- NUEVA FUNCIÓN: CARGAR PEDIDOS ---
  const cargarPedidos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, pedido_items(*)')
      .order('created_at', { ascending: false });
    if (data) setListaPedidos(data);
  };

  useEffect(() => { cargarTodo(); }, []);

  // --- LÓGICA DE PEDIDOS ---
  const actualizarEstadoPedido = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    
    if (!error) {
      alert("Estado actualizado");
      cargarPedidos();
    }
  };

  // --- LÓGICA DE CUPONES ---
  const crearCupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('cupones').insert([{
        codigo: nuevoCupon.codigo.toUpperCase(),
        tipo: nuevoCupon.tipo,
        valor: parseFloat(nuevoCupon.valor),
        uso_maximo: nuevoCupon.uso_maximo ? parseInt(nuevoCupon.uso_maximo) : null,
        activo: nuevoCupon.activo
      }]);
      if (error) throw error;
      alert("Cupón creado");
      setNuevoCupon({ codigo: "", tipo: "porcentaje", valor: "", uso_maximo: "", activo: true });
      cargarCupones();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const alternarEstadoCupon = async (id: string, estadoActual: boolean) => {
    await supabase.from('cupones').update({ activo: !estadoActual }).eq('id', id);
    cargarCupones();
  };

  // --- LÓGICA DE EDICIÓN RÁPIDA ---
  const iniciarEdicion = (prod: any) => {
    setEditandoId(prod.id);
    setTempProducto({ ...prod });
  };

  const guardarEdicion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({
          nombre: tempProducto.nombre,
          precio_base: parseFloat(tempProducto.precio_base),
          destacado: tempProducto.destacado
        })
        .eq('id', id);
      if (error) throw error;
      setEditandoId(null);
      cargarProductos();
    } catch (e: any) { alert(e.message); }
  };

  // --- LÓGICA GUARDAR PRODUCTO ---
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: prod, error } = await supabase.from('productos').insert([{ 
        nombre: nuevoProducto.nombre, 
        precio_base: parseFloat(nuevoProducto.precio_base), 
        categoria_id: nuevoProducto.categoria_id, 
        imagen_principal: nuevoProducto.imagen_principal,           
        descripcion: nuevoProducto.descripcion,
        es_ropa: nuevoProducto.es_ropa,
        destacado: nuevoProducto.destacado 
      }]).select().single();

      if (error) throw error;
      if (!nuevoProducto.es_ropa) {
        await supabase.from('variantes_producto').insert([{
          producto_id: prod.id,
          sku: `GEN-${prod.id.split('-')[0]}`,
          stock: 0
        }]);
      }
      alert("Producto creado exitosamente");
      setNuevoProducto({ nombre: "", precio_base: "", categoria_id: "", imagen_principal: "", descripcion: "", es_ropa: true, destacado: false });
      cargarProductos();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  // --- LÓGICA INVENTARIO PRO ---
  const manejarCrearVariante = async () => {
    if (!nuevaVariante.valor_id || !productoInventario) return;
    const { data: vData } = await supabase.from('variantes_producto').insert([{
      producto_id: productoInventario.id,
      sku: nuevaVariante.sku || `SKU-${Math.random().toString(36).substr(2,5).toUpperCase()}`,
      stock: nuevaVariante.stock
    }]).select().single();

    if (vData) {
      await supabase.from('variante_atributos').insert([{
        variante_id: vData.id,
        atributo_valor_id: nuevaVariante.valor_id
      }]);
      cargarVariantes(productoInventario.id);
      setNuevaVariante({ sku: "", stock: 0, valor_id: "" });
    }
  };

  // --- LÓGICA MODAL ATRIBUTOS ---
  const manejarGuardarValorAtributo = async () => {
    if (!nuevoValorAtributo || !atributoSeleccionado) return;
    const { error } = await supabase.from('atributo_valores').insert([{
      atributo_id: atributoSeleccionado.id,
      valor: nuevoValorAtributo.toUpperCase()
    }]);
    if (!error) {
      setNuevoValorAtributo("");
      setIsModalOpen(false);
      cargarAtributos();
    }
  };

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = nuevaCategoria.nombre.toLowerCase().replace(/ /g, "-");
    const { error } = await supabase.from('categorias').insert([{ ...nuevaCategoria, slug }]);
    if (!error) {
      alert("Categoría Creada");
      setNuevaCategoria({ nombre: "", slug: "", imagen: "" });
      cargarCategorias();
    }
  };

  return (
    <div className="bg-white min-h-screen text-black font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          <aside className="w-full md:w-64 space-y-2">
            <h2 className="text-xl font-black uppercase italic mb-6 text-black">GALU ADMIN</h2>
            <button onClick={() => setActiveTab("categorias")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'categorias' ? 'bg-[#FCD7DE] border-l-4 border-black' : 'hover:bg-gray-100'}`}><Tag size={18} /> Categorías</button>
            <button onClick={() => setActiveTab("productos")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'productos' ? 'bg-[#FCD7DE] border-l-4 border-black' : 'hover:bg-gray-100'}`}><Package size={18} /> Catálogo</button>
            <button onClick={() => setActiveTab("stock")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'stock' ? 'bg-[#FCD7DE] border-l-4 border-black' : 'hover:bg-gray-100'}`}><Hash size={18} /> Inventario PRO</button>
            <button onClick={() => setActiveTab("pedidos")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'pedidos' ? 'bg-[#FCD7DE] border-l-4 border-black' : 'hover:bg-gray-100'}`}><ShoppingBag size={18} /> Pedidos</button>
            <button onClick={() => setActiveTab("atributos")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'atributos' ? 'bg-[#FCD7DE] border-l-4 border-black' : 'hover:bg-gray-100'}`}><Layers size={18} /> Atributos</button>
            <button onClick={() => setActiveTab("cupones")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'cupones' ? 'bg-[#FCD7DE] border-l-4 border-black' : 'hover:bg-gray-100'}`}><Ticket size={18} /> Cupones</button>
            
            <button onClick={() => cargarTodo()} className="w-full mt-10 flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase border border-black hover:bg-black hover:text-white transition-all">
               <Wifi size={14}/> Sincronizar Sistema
            </button>
          </aside>

          <section className="flex-1 bg-gray-50 p-8 border border-gray-100 rounded-sm">
            
            {/* PESTAÑA PEDIDOS (NUEVA) */}
            {activeTab === "pedidos" && (
              <div className="space-y-8 animate-in fade-in">
                <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 italic">Gestión de Ventas</h3>
                <div className="grid grid-cols-1 gap-6">
                  {listaPedidos.map((pedido) => (
                    <div key={pedido.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <div className="p-4 bg-black text-white flex justify-between items-center">
                        <span className="font-black uppercase text-xs">Pedido #{String(pedido.numero_pedido).padStart(4, '0')}</span>
                        <span className="text-[10px] font-bold">{new Date(pedido.created_at).toLocaleString()}</span>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Info Cliente */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Cliente</p>
                          <p className="font-black text-sm uppercase">{pedido.cliente_nombre}</p>
                          <p className="text-xs font-bold">{pedido.numero_whatsapp}</p>
                          <p className="text-[10px] text-gray-500">{pedido.cliente_email}</p>
                        </div>
                        {/* Info Envío */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Dirección</p>
                          <p className="text-xs font-bold uppercase">{pedido.direccion}</p>
                          <p className="text-xs font-bold uppercase">{pedido.barrio} - {pedido.ciudad}</p>
                          <p className="text-[10px] font-black text-pink-500 uppercase">{pedido.metodo_pago}</p>
                        </div>
                        {/* Estado y Acciones */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Estado actual: <span className="text-black">{pedido.estado}</span></p>
                          <select 
                            value={pedido.estado} 
                            onChange={(e) => actualizarEstadoPedido(pedido.id, e.target.value)}
                            className="w-full p-2 border-2 border-black font-black text-[10px] bg-[#FCD7DE] uppercase"
                          >
                            <option value="pendiente_pago">Pendiente Pago</option>
                            <option value="pagado">Pagado / Confirmado</option>
                            <option value="en_preparacion">En Preparación</option>
                            <option value="enviado">Enviado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>
                      </div>
                      {/* Detalles Productos */}
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                         <p className="text-[9px] font-black uppercase mb-2 text-gray-400">Artículos del pedido</p>
                         <div className="space-y-2">
                            {pedido.pedido_items?.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-xs font-bold">
                                <span>{item.cantidad}x {item.producto_nombre_snapshot} ({item.variante_detalle_snapshot})</span>
                                <span>${Number(item.subtotal).toLocaleString()}</span>
                              </div>
                            ))}
                         </div>
                         <div className="border-t border-black mt-4 pt-2 flex justify-between font-black">
                            <span className="uppercase">Total Final</span>
                            <span className="text-lg font-black italic">${Number(pedido.total_final).toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                  ))}
                  {listaPedidos.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-black">
                      <p className="font-black uppercase text-gray-400">No hay pedidos registrados aún</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA PRODUCTOS */}
            {activeTab === "productos" && (
              <div className="space-y-12 animate-in fade-in">
                <form onSubmit={guardarProducto} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-2 gap-6">
                  <h3 className="md:col-span-2 font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Nuevo Producto Maestro</h3>
                  <div className="space-y-4">
                    <input required placeholder="NOMBRE" className="w-full p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} />
                    <input required type="number" placeholder="PRECIO BASE COP" className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevoProducto.precio_base} onChange={e => setNuevoProducto({...nuevoProducto, precio_base: e.target.value})} />
                    <select required className="w-full p-3 border-2 border-black font-bold bg-white outline-none text-black" value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({...nuevoProducto, categoria_id: e.target.value})}>
                      <option value="">CATEGORÍA...</option>
                      {listaCategorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <input required placeholder="URL IMAGEN PRINCIPAL" className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevoProducto.imagen_principal} onChange={e => setNuevoProducto({...nuevoProducto, imagen_principal: e.target.value})} />
                    <div className="grid grid-cols-2 gap-2 text-black">
                        <label className="flex items-center gap-2 p-2 border-2 border-black text-[10px] font-black uppercase cursor-pointer">
                            <input type="checkbox" checked={nuevoProducto.es_ropa} onChange={e => setNuevoProducto({...nuevoProducto, es_ropa: e.target.checked})} /> ¿Es Ropa?
                        </label>
                        <label className="flex items-center gap-2 p-2 border-2 border-black text-[10px] font-black uppercase cursor-pointer">
                            <input type="checkbox" checked={nuevoProducto.destacado} onChange={e => setNuevoProducto({...nuevoProducto, destacado: e.target.checked})} /> Destacado
                        </label>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="md:col-span-2 bg-black text-white font-black py-4 uppercase tracking-widest hover:bg-zinc-800">
                    {loading ? "GUARDANDO..." : "CREAR PRODUCTO BASE"}
                  </button>
                </form>

                <div className="grid grid-cols-1 gap-4">
                   {listaProductos.map(prod => (
                     <div key={prod.id} className="bg-white p-4 border-2 border-black flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4">
                            <img src={prod.imagen_principal} className="w-12 h-12 object-cover border border-black" />
                            <div className="flex-1">
                              {editandoId === prod.id ? (
                                <div className="space-y-2">
                                  <input className="border border-black p-1 text-xs w-full text-black" value={tempProducto.nombre} onChange={e => setTempProducto({...tempProducto, nombre: e.target.value})}/>
                                  <input type="number" className="border border-black p-1 text-xs w-full text-black" value={tempProducto.precio_base} onChange={e => setTempProducto({...tempProducto, precio_base: e.target.value})}/>
                                  <label className="text-[10px] font-black uppercase flex items-center gap-2 text-black">
                                    <input type="checkbox" checked={tempProducto.destacado} onChange={e => setTempProducto({...tempProducto, destacado: e.target.checked})}/> Destacado
                                  </label>
                                </div>
                              ) : (
                                <>
                                  <p className="font-black text-xs uppercase text-black">{prod.nombre}</p>
                                  <p className="text-[10px] font-bold text-gray-400">{prod.categorias?.nombre} | ${prod.precio_base} {prod.destacado && <span className="text-pink-500 font-black">★ DESTACADO</span>}</p>
                                </>
                              )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                          {editandoId === prod.id ? (
                            <>
                              <button onClick={() => guardarEdicion(prod.id)} className="text-green-600"><Check/></button>
                              <button onClick={() => setEditandoId(null)} className="text-red-600"><X/></button>
                            </>
                          ) : (
                            <button onClick={() => iniciarEdicion(prod)} className="p-2 border-2 border-black hover:bg-black hover:text-white"><Pencil size={14}/></button>
                          )}
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {/* PESTAÑA CUPONES */}
            {activeTab === "cupones" && (
              <div className="space-y-8 animate-in fade-in">
                <form onSubmit={crearCupon} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-3 gap-4">
                  <h3 className="md:col-span-3 font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Nuevo Cupón de Descuento</h3>
                  <input required placeholder="CÓDIGO" className="p-3 border-2 border-black font-black uppercase text-black" value={nuevoCupon.codigo} onChange={e => setNuevoCupon({...nuevoCupon, codigo: e.target.value})} />
                  <select className="p-3 border-2 border-black font-black text-black" value={nuevoCupon.tipo} onChange={e => setNuevoCupon({...nuevoCupon, tipo: e.target.value})}>
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto">Monto Fijo ($)</option>
                  </select>
                  <input required type="number" placeholder="VALOR" className="p-3 border-2 border-black font-black text-black" value={nuevoCupon.valor} onChange={e => setNuevoCupon({...nuevoCupon, valor: e.target.value})} />
                  <input type="number" placeholder="USOS (VACIO = ∞)" className="p-3 border-2 border-black font-black text-black" value={nuevoCupon.uso_maximo} onChange={e => setNuevoCupon({...nuevoCupon, uso_maximo: e.target.value})} />
                  <button type="submit" className="md:col-span-2 bg-black text-white font-black uppercase py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">Crear Cupón</button>
                </form>

                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <table className="w-full text-left text-black">
                    <thead className="bg-black text-white text-[10px] font-black uppercase italic">
                      <tr>
                        <th className="p-4">Código</th>
                        <th className="p-4">Descuento</th>
                        <th className="p-4">Usos</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-center">Historial</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold uppercase">
                      {listaCupones.map(c => (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-black">{c.codigo}</td>
                          <td className="p-4">{c.tipo === 'porcentaje' ? `${c.valor}%` : `$${c.valor}`}</td>
                          <td className="p-4">{c.usos_actuales} / {c.uso_maximo || '∞'}</td>
                          <td className="p-4">
                            <button onClick={() => alternarEstadoCupon(c.id, c.activo)} className={`px-3 py-1 border-2 border-black ${c.activo ? 'bg-green-400' : 'bg-red-400'}`}>
                              {c.activo ? 'ACTIVO' : 'INACTIVO'}
                            </button>
                          </td>
                          <td className="p-4 text-[8px] space-y-1">
                              {c.cupon_uso?.map((uso: any, i: number) => (
                                <p key={i}>Pedido: {uso.pedido_id?.slice(0,8)}... - {uso.cliente_email}</p>
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PESTAÑA INVENTARIO PRO */}
            {activeTab === "stock" && (
              <div className="space-y-6 animate-in fade-in">
                {!productoInventario ? (
                  <div className="bg-white border-2 border-black p-10 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Search size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="font-black uppercase italic text-lg mb-4 text-black">Gestión de Existencias por Variantes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      {listaProductos.map(p => (
                        <div key={p.id} onClick={() => {setProductoInventario(p); cargarVariantes(p.id);}} className="border-2 border-black p-3 hover:bg-[#FCD7DE] cursor-pointer flex items-center gap-4 text-black">
                          <img src={p.imagen_principal} className="w-10 h-10 object-cover border border-black" />
                          <span className="font-black text-[10px] uppercase">{p.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button onClick={() => setProductoInventario(null)} className="flex items-center gap-2 text-[10px] font-black uppercase hover:underline text-black"> <ChevronLeft size={14}/> Volver</button>
                    <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="font-black uppercase italic text-sm mb-4 text-black">Nueva Variante: {productoInventario.nombre}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <select className="p-2 border-2 border-black font-bold text-xs bg-white outline-none text-black" value={nuevaVariante.valor_id} onChange={e => setNuevaVariante({...nuevaVariante, valor_id: e.target.value})}>
                          <option value="">Elegir Talla/Color...</option>
                          {listaAtributos.map(attr => (
                            <optgroup key={attr.id} label={attr.nombre}>
                              {attr.atributo_valores?.map((v:any) => <option key={v.id} value={v.id}>{v.valor}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <input placeholder="SKU" className="p-2 border-2 border-black font-bold text-xs outline-none text-black" value={nuevaVariante.sku} onChange={e => setNuevaVariante({...nuevaVariante, sku: e.target.value})} />
                        <input type="number" placeholder="STOCK" className="p-2 border-2 border-black font-bold text-xs outline-none text-black" value={nuevaVariante.stock} onChange={e => setNuevaVariante({...nuevaVariante, stock: parseInt(e.target.value)})} />
                        <button onClick={manejarCrearVariante} className="bg-black text-white font-black uppercase text-[10px]">Añadir</button>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <table className="w-full text-[10px] font-bold text-black">
                        <thead className="bg-black text-white uppercase italic">
                          <tr><th className="p-3 text-left">Variante</th><th className="p-3">SKU</th><th className="p-3">Stock</th><th className="p-3">Acción</th></tr>
                        </thead>
                        <tbody>
                          {variantesProducto.map(v => (
                            <tr key={v.id} className="border-b border-gray-100 uppercase">
                              <td className="p-3">{v.variante_atributos?.map((va:any) => va.atributo_valores?.valor).join(' / ') || 'Base'}</td>
                              <td className="p-3 text-gray-400 text-center">{v.sku}</td>
                              <td className="p-3 text-center">
                                <input type="number" defaultValue={v.stock} onBlur={async (e) => {
                                  await supabase.from('variantes_producto').update({ stock: parseInt(e.target.value) }).eq('id', v.id);
                                }} className="w-12 border border-black p-1 text-center text-black"/>
                              </td>
                              <td className="p-3 text-center"><button className="text-red-500"><Trash2 size={14}/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA ATRIBUTOS CON MODAL */}
            {activeTab === "atributos" && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black uppercase text-lg border-b-2 border-black mb-4 italic text-black">Gestión Atributos</h3>
                        <div className="flex gap-2">
                            <input placeholder="NOMBRE ATRIBUTO" className="flex-1 p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevoAtributo} onChange={e => setNuevoAtributo(e.target.value)} />
                            <button onClick={async () => {
                                await supabase.from('atributos').insert([{ nombre: nuevoAtributo.toUpperCase() }]);
                                setNuevoAtributo(""); cargarAtributos();
                            }} className="bg-black text-white px-6 font-black uppercase tracking-widest">Crear</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {listaAtributos.map(attr => (
                            <div key={attr.id} className="bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative text-black">
                                <p className="font-black uppercase text-sm italic mb-4 flex justify-between">
                                    {attr.nombre} <Settings size={14} />
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {attr.atributo_valores?.map((v:any) => (
                                        <span key={v.id} className="px-2 py-1 bg-black text-white font-black text-[9px] uppercase">{v.valor}</span>
                                    ))}
                                    <button onClick={() => { setAtributoSeleccionado(attr); setIsModalOpen(true); }} className="px-3 py-1 border-2 border-black border-dashed font-black text-[10px] hover:bg-black hover:text-white transition-colors">+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <AnimatePresence>
                      {isModalOpen && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border-4 border-black p-8 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex justify-between items-center mb-6">
                              <h4 className="font-black uppercase italic text-xl">Añadir a {atributoSeleccionado?.nombre}</h4>
                              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <input autoFocus placeholder="VALOR" className="w-full p-4 border-2 border-black font-black uppercase mb-6 outline-none text-black" value={nuevoValorAtributo} onChange={e => setNuevoValorAtributo(e.target.value)} onKeyDown={e => e.key === 'Enter' && manejarGuardarValorAtributo()} />
                            <button onClick={manejarGuardarValorAtributo} className="w-full bg-black text-white py-3 font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">Guardar</button>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                </div>
            )}

            {/* PESTAÑA CATEGORÍAS */}
            {activeTab === "categorias" && (
              <div className="space-y-8 animate-in fade-in">
                <form onSubmit={crearCategoria} className="bg-white p-6 border-2 border-black space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
                  <h3 className="font-black uppercase italic">Nueva Categoría</h3>
                  <input required placeholder="NOMBRE" className="w-full p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevaCategoria.nombre} onChange={e => setNuevaCategoria({...nuevaCategoria, nombre: e.target.value})} />
                  <input placeholder="URL IMAGEN" className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevaCategoria.imagen} onChange={e => setNuevaCategoria({...nuevaCategoria, imagen: e.target.value})} />
                  <button className="bg-black text-white w-full py-4 font-black uppercase tracking-widest">Crear</button>
                </form>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {listaCategorias.map(cat => (
                    <div key={cat.id} className="relative aspect-square border-2 border-black overflow-hidden group shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <img src={cat.imagen} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-black p-2 text-center uppercase font-black text-[10px] text-black">
                        {cat.nombre}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}