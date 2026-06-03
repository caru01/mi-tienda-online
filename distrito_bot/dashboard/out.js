import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, PackageSearch, ClipboardList, Utensils, TrendingUp, Settings, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ConfigurationTab from "./components/ConfigurationTab";
import ReportsTab from "./components/ReportsTab";
const API_URL = import.meta.env.PROD ? "/distrito/api/dashboard" : "http://localhost:8000/api/dashboard";
function App() {
  const [activeTab, setActiveTab] = useState("sales");
  const [data, setData] = useState({
    total_revenue: 0,
    total_orders: 0,
    inventory: [],
    products: [],
    active_sales: [],
    all_sales: []
  });
  const [ticketToPrint, setTicketToPrint] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", description: "", emoji: "", price: "", category: "Combos" });
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [newInventory, setNewInventory] = useState({ name: "", unit_measure: "", current_stock: "", minimum_stock: "" });
  const lastSaleIdRef = useRef(null);
  const fetchDashboardData = async (isPolling = false) => {
    try {
      const res = await fetch(`${API_URL}/stats`);
      const json = await res.json();
      if (isPolling && json.active_sales && json.active_sales.length > 0) {
        const latestSaleId = json.active_sales[0].id;
        if (lastSaleIdRef.current && lastSaleIdRef.current !== latestSaleId) {
          const audio = new Audio("/distrito/assets/bell.mp3");
          audio.play().catch(() => console.log("Auto-play blocked by browser"));
        }
        lastSaleIdRef.current = latestSaleId;
      } else if (!isPolling && json.active_sales && json.active_sales.length > 0) {
        lastSaleIdRef.current = json.active_sales[0].id;
      }
      if (json.status === "ok") {
        setData(json);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 1e4);
    return () => clearInterval(interval);
  }, []);
  const handlePrint = (sale) => {
    setTicketToPrint(sale);
    setTimeout(() => {
      window.print();
      setTicketToPrint(null);
    }, 500);
  };
  const handlePurchase = async (item_id) => {
    const qty = prompt("Cantidad comprada:");
    if (!qty) return;
    await fetch(`${API_URL}/inventory/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id, quantity: parseFloat(qty) })
    });
    fetchDashboardData();
  };
  const toggleProduct = async (product_id, currentStatus) => {
    await fetch(`${API_URL}/products/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id, is_active: !currentStatus })
    });
    fetchDashboardData();
  };
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    await fetch(`${API_URL}/products/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newProduct,
        price: parseFloat(newProduct.price),
        is_active: true
      })
    });
    setShowAddProduct(false);
    setNewProduct({ name: "", description: "", emoji: "", price: "", category: "Combos" });
    fetchDashboardData();
  };
  const handleAddInventory = async () => {
    if (!newInventory.name) return;
    await fetch(`${API_URL}/inventory/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newInventory,
        current_stock: parseFloat(newInventory.current_stock || "0"),
        minimum_stock: parseFloat(newInventory.minimum_stock || "0")
      })
    });
    setShowAddInventory(false);
    setNewInventory({ name: "", unit_measure: "", current_stock: "", minimum_stock: "" });
    fetchDashboardData();
  };
  const handleUpdateInventoryStock = async (id, current_stock) => {
    const newStockStr = prompt("Nuevo inventario actual:", current_stock.toString());
    if (newStockStr === null) return;
    const newStock = parseFloat(newStockStr);
    if (isNaN(newStock)) return;
    await fetch(`${API_URL}/inventory/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, current_stock: newStock })
    });
    fetchDashboardData();
  };
  const handleOrderStatus = async (id, status, customer_phone) => {
    await fetch(`${API_URL}/orders/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, customer_phone })
    });
    fetchDashboardData();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-distrito-dark text-distrito-text font-sans" }, /* @__PURE__ */ React.createElement("aside", { className: "fixed left-0 top-0 w-64 h-full glass border-r border-white/10 p-6 z-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-10" }, /* @__PURE__ */ React.createElement(Utensils, { className: "text-distrito-accent w-8 h-8" }), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-black tracking-tighter mb-12" }, "DISTRITO", /* @__PURE__ */ React.createElement("span", { className: "text-distrito-accent" }, "."), "BOT")), /* @__PURE__ */ React.createElement("nav", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveTab("sales"), className: `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === "sales" ? "bg-distrito-accent text-distrito-dark font-bold shadow-[0_0_15px_rgba(255,204,0,0.4)]" : "text-gray-400 hover:bg-white/5 hover:text-white"}` }, /* @__PURE__ */ React.createElement(LayoutDashboard, { size: 20 }), /* @__PURE__ */ React.createElement("span", null, "Ventas Activas")), /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveTab("reports"), className: `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === "reports" ? "bg-distrito-accent text-distrito-dark font-bold shadow-[0_0_15px_rgba(255,204,0,0.4)]" : "text-gray-400 hover:bg-white/5 hover:text-white"}` }, /* @__PURE__ */ React.createElement(TrendingUp, { size: 20 }), /* @__PURE__ */ React.createElement("span", null, "Reportes (BI)")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setActiveTab("catalog"),
      className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "catalog" ? "bg-distrito-accent text-black font-semibold" : "hover:bg-white/5"}`
    },
    /* @__PURE__ */ React.createElement(ClipboardList, { className: "w-5 h-5" }),
    /* @__PURE__ */ React.createElement("span", null, "Cat\xE1logo")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setActiveTab("inventory"),
      className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "inventory" ? "bg-distrito-accent text-black font-semibold" : "hover:bg-white/5"}`
    },
    /* @__PURE__ */ React.createElement(PackageSearch, { className: "w-5 h-5" }),
    /* @__PURE__ */ React.createElement("span", null, "Inventario")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setActiveTab("settings"),
      className: `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === "settings" ? "bg-distrito-accent/10 text-distrito-accent border border-distrito-accent/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}`
    },
    /* @__PURE__ */ React.createElement(Settings, { className: "w-5 h-5" }),
    /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Configuraci\xF3n")
  ))), /* @__PURE__ */ React.createElement("main", { className: "ml-64 p-10 min-h-screen relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-[-20%] left-[-10%] w-96 h-96 bg-distrito-accent/10 rounded-full blur-[100px] pointer-events-none" }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" }), /* @__PURE__ */ React.createElement("div", { className: "relative z-10 max-w-6xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-bold" }, "Kanban de Cocina")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start" }, /* @__PURE__ */ React.createElement("div", { className: "glass rounded-2xl p-4 min-h-[500px] border border-white/5 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 border-b border-white/10 pb-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-lg text-yellow-400" }, "Por Aceptar"), /* @__PURE__ */ React.createElement("span", { className: "bg-yellow-400/20 text-yellow-400 text-xs px-2 py-1 rounded-full font-bold" }, data.active_sales.filter((s) => s.status === "por_aceptar").length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 flex-1" }, data.active_sales.filter((s) => s.status === "por_aceptar").map((sale) => /* @__PURE__ */ React.createElement("div", { key: sale.id, className: "bg-black/40 rounded-xl p-4 border border-white/10 shadow-lg relative" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-distrito-accent font-bold" }, "Orden #", sale.daily_order_number || "---"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-lg" }, sale.customer_name || "Sin nombre", " ", /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-sm" }, "(", sale.customer_phone, ")")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold mt-1 mb-3 bg-white/10 inline-block px-2 py-0.5 rounded uppercase" }, sale.payment_method), sale.payment_method === "transferencia" ? /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOrderStatus(sale.id, "en_preparacion", sale.customer_phone),
      className: "w-full bg-distrito-accent text-black font-bold py-2 rounded-lg hover:bg-yellow-400 transition-colors"
    },
    "Transferencia Confirmada"
  ) : /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOrderStatus(sale.id, "en_preparacion", sale.customer_phone),
      className: "w-full bg-green-500/20 text-green-400 border border-green-500/50 font-bold py-2 rounded-lg hover:bg-green-500/30 transition-colors"
    },
    "Aceptar Pedido (Efectivo)"
  ))))), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-2xl p-4 min-h-[500px] border border-white/5 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 border-b border-white/10 pb-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-lg text-blue-400" }, "En Preparaci\xF3n"), /* @__PURE__ */ React.createElement("span", { className: "bg-blue-400/20 text-blue-400 text-xs px-2 py-1 rounded-full font-bold" }, data.active_sales.filter((s) => s.status === "en_preparacion" || s.status === "preparando").length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 flex-1" }, data.active_sales.filter((s) => s.status === "en_preparacion" || s.status === "preparando").map((sale) => /* @__PURE__ */ React.createElement("div", { key: sale.id, className: "bg-black/40 rounded-xl p-4 border border-blue-500/30 shadow-lg cursor-pointer hover:border-blue-500 transition-colors", onClick: () => setSelectedOrder(sale) }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-400 font-bold" }, "Orden #", sale.daily_order_number || "---"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-lg" }, sale.customer_name || "Sin nombre")), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
    e.stopPropagation();
    handlePrint(sale);
  }, className: "text-gray-400 hover:text-white bg-white/5 p-2 rounded-lg" }, /* @__PURE__ */ React.createElement(Printer, { size: 16 }))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        handleOrderStatus(sale.id, "por_entregar", sale.customer_phone);
      },
      className: "w-full mt-4 bg-blue-500/20 text-blue-400 border border-blue-500/50 font-bold py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
    },
    "Pedido Despachado"
  ))))), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-2xl p-4 min-h-[500px] border border-white/5 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 border-b border-white/10 pb-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-lg text-green-400" }, "Por Entregar"), /* @__PURE__ */ React.createElement("span", { className: "bg-green-400/20 text-green-400 text-xs px-2 py-1 rounded-full font-bold" }, data.active_sales.filter((s) => s.status === "por_entregar" || s.status === "en_camino").length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 flex-1" }, data.active_sales.filter((s) => s.status === "por_entregar" || s.status === "en_camino").map((sale) => /* @__PURE__ */ React.createElement("div", { key: sale.id, className: "bg-black/40 rounded-xl p-4 border border-green-500/30 shadow-lg relative" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-green-400 font-bold" }, "Orden #", sale.daily_order_number || "---"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-lg" }, sale.customer_name || "Sin nombre"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400 capitalize" }, sale.delivery_type, " ", sale.delivery_barrio ? `- ${sale.delivery_barrio}` : ""), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOrderStatus(sale.id, "entregado", sale.customer_phone),
      className: "w-full mt-4 bg-green-500 text-black font-bold py-2 rounded-lg hover:bg-green-400 transition-colors"
    },
    "Marcar Entregado (Finalizar)"
  ))))))), ") : activeTab === 'inventory' ? (", /* @__PURE__ */ React.createElement("div", { className: "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-bold" }, "Inventario de Insumos"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowAddInventory(true),
      className: "bg-distrito-accent text-distrito-dark px-4 py-2 rounded-lg font-bold"
    },
    "+ Nuevo Insumo"
  )), showAddInventory && /* @__PURE__ */ React.createElement("div", { className: "glass p-6 rounded-2xl border border-distrito-accent/50 shadow-[0_0_15px_rgba(255,204,0,0.3)]" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold mb-4" }, "Agregar Nuevo Insumo"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-4" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Nombre",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newInventory.name,
      onChange: (e) => setNewInventory({ ...newInventory, name: e.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Unidad (kg, und...)",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newInventory.unit_measure,
      onChange: (e) => setNewInventory({ ...newInventory, unit_measure: e.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Stock Actual",
      type: "number",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newInventory.current_stock,
      onChange: (e) => setNewInventory({ ...newInventory, current_stock: e.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Stock M\xEDnimo",
      type: "number",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newInventory.minimum_stock,
      onChange: (e) => setNewInventory({ ...newInventory, minimum_stock: e.target.value })
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end space-x-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowAddInventory(false), className: "px-4 py-2 text-gray-400 hover:text-white" }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { onClick: handleAddInventory, className: "bg-distrito-accent text-distrito-dark px-4 py-2 rounded font-bold" }, "Guardar"))), /* @__PURE__ */ React.createElement("div", { className: "glass p-6 rounded-2xl" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-white/10 text-gray-400" }, /* @__PURE__ */ React.createElement("th", { className: "pb-3 font-medium" }, "Insumo"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 font-medium" }, "Stock Actual"), /* @__PURE__ */ React.createElement("th", { className: "pb-3 font-medium text-right" }, "Acci\xF3n"))), /* @__PURE__ */ React.createElement("tbody", null, data.inventory.map((item) => /* @__PURE__ */ React.createElement("tr", { key: item.id, className: "border-b border-white/5 hover:bg-white/5 transition-colors" }, /* @__PURE__ */ React.createElement("td", { className: "py-4 font-medium" }, item.name), /* @__PURE__ */ React.createElement("td", { className: "py-4" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 rounded text-sm ${item.current_stock < 20 ? "bg-red-500/20 text-red-400" : "text-gray-300"}` }, item.current_stock, " ", item.unit)), /* @__PURE__ */ React.createElement("td", { className: "py-4 text-right" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleUpdateInventoryStock(item.id, item.current_stock),
      className: "px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors mr-2"
    },
    "Editar"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handlePurchase(item.id),
      className: "px-3 py-1 bg-distrito-accent/20 text-distrito-accent hover:bg-distrito-accent/30 rounded text-sm transition-colors font-medium"
    },
    "+ Compra"
  )))))))), ") : activeTab === 'catalog' ? (", /* @__PURE__ */ React.createElement("div", { className: "glass rounded-2xl p-8 border border-white/10 shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-distrito-accent" }, "Cat\xE1logo de Productos"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowAddProduct(true),
      className: "bg-distrito-accent text-distrito-dark px-4 py-2 rounded-lg font-bold"
    },
    "+ Nuevo Producto"
  )), showAddProduct && /* @__PURE__ */ React.createElement("div", { className: "glass p-6 rounded-2xl border border-distrito-accent/50 shadow-[0_0_15px_rgba(255,204,0,0.3)] mb-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold mb-4" }, "Agregar Nuevo Producto"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Nombre",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newProduct.name,
      onChange: (e) => setNewProduct({ ...newProduct, name: e.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Precio",
      type: "number",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newProduct.price,
      onChange: (e) => setNewProduct({ ...newProduct, price: e.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Descripci\xF3n corta",
      className: "bg-black/20 rounded p-2 text-white border border-white/10 md:col-span-2",
      value: newProduct.description,
      onChange: (e) => setNewProduct({ ...newProduct, description: e.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Emoji \u{1F354}",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newProduct.emoji,
      onChange: (e) => setNewProduct({ ...newProduct, emoji: e.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "Categor\xEDa (Ej: Combos, Bebidas)",
      className: "bg-black/20 rounded p-2 text-white border border-white/10",
      value: newProduct.category,
      onChange: (e) => setNewProduct({ ...newProduct, category: e.target.value })
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end space-x-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowAddProduct(false), className: "px-4 py-2 text-gray-400 hover:text-white" }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { onClick: handleAddProduct, className: "bg-distrito-accent text-distrito-dark px-4 py-2 rounded font-bold" }, "Guardar"))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, data.products.map((item) => /* @__PURE__ */ React.createElement("div", { key: item.id, className: "flex items-center justify-between p-4 bg-distrito-dark/50 rounded-xl border border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, item.emoji), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-white" }, item.name), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300" }, item.category || "Combos")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400" }, item.description), /* @__PURE__ */ React.createElement("p", { className: "text-distrito-accent font-bold mt-1" }, "$", item.price.toLocaleString()))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => toggleProduct(item.id, item.is_active),
      className: `px-4 py-2 rounded-lg font-bold text-sm transition-colors ${item.is_active ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`
    },
    item.is_active ? "Desactivar" : "Activar"
  ))))), ") : activeTab === 'reports' ? (", /* @__PURE__ */ React.createElement(ReportsTab, { data }), ") : activeTab === 'settings' ? (", /* @__PURE__ */ React.createElement(ConfigurationTab, null), ") : null")), ticketToPrint && /* @__PURE__ */ React.createElement("div", { className: "ticket-print" }, /* @__PURE__ */ React.createElement("h2", null, "DISTRITO BURGER"), /* @__PURE__ */ React.createElement("h3", null, "Ticket de Venta"), /* @__PURE__ */ React.createElement("div", { className: "line" }), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Fecha:"), " ", format(new Date(ticketToPrint.created_at), "dd/MM/yyyy HH:mm")), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Tel:"), " ", ticketToPrint.customer_phone), /* @__PURE__ */ React.createElement("div", { className: "line" }), /* @__PURE__ */ React.createElement("pre", { style: { whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "12px" } }, ticketToPrint.order_detail), /* @__PURE__ */ React.createElement("div", { className: "line" }), /* @__PURE__ */ React.createElement("h3", { style: { textAlign: "right" } }, "TOTAL: $", parseFloat(ticketToPrint.total_amount).toLocaleString()), /* @__PURE__ */ React.createElement("div", { className: "line" }), /* @__PURE__ */ React.createElement("p", { style: { textAlign: "center", fontSize: "10px" } }, "\xA1Gracias por tu compra!")), selectedOrder && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-900 border border-white/20 rounded-2xl w-full max-w-lg p-6 relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSelectedOrder(null), className: "absolute top-4 right-4 text-gray-400 hover:text-white" }, "\u2715"), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold mb-2" }, "Orden #", selectedOrder.daily_order_number || "---"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-400 mb-6" }, format(new Date(selectedOrder.created_at), "h:mm a - d 'de' MMMM", { locale: es })), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, "Cliente"), /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, selectedOrder.customer_name || "Sin nombre")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, "Tel\xE9fono"), /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, selectedOrder.customer_phone)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, "M\xE9todo de Pago"), /* @__PURE__ */ React.createElement("p", { className: "font-bold uppercase text-distrito-accent" }, selectedOrder.payment_method)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, "Entrega"), /* @__PURE__ */ React.createElement("p", { className: "font-bold capitalize" }, selectedOrder.delivery_type), selectedOrder.delivery_barrio && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-300" }, selectedOrder.delivery_barrio))), /* @__PURE__ */ React.createElement("div", { className: "bg-black/50 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap border border-white/5" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-white mb-2 pb-2 border-b border-white/10" }, "ITEMS DEL PEDIDO:"), selectedOrder.order_detail), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center text-xl" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-gray-400" }, "Total:"), /* @__PURE__ */ React.createElement("p", { className: "font-black text-distrito-accent" }, "$", Number(selectedOrder.total_amount).toLocaleString()))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        handlePrint(selectedOrder);
        setSelectedOrder(null);
      },
      className: "w-full bg-distrito-accent text-black font-black py-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-yellow-400 transition-colors"
    },
    /* @__PURE__ */ React.createElement(Printer, { size: 20 }),
    /* @__PURE__ */ React.createElement("span", null, "Imprimir Ticket de Cocina")
  ))));
}
export default App;
