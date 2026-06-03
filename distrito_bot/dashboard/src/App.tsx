import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, PackageSearch, ClipboardList, Utensils, TrendingUp, Settings, Printer, History, Clock, ChefHat } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ConfigurationTab from './components/ConfigurationTab'
import ReportsTab from './components/ReportsTab'
import InventoryTab from './components/InventoryTab'
import SalesSummaryTab from './components/SalesSummaryTab'
import SchedulesTab from './components/SchedulesTab'
import RecipeTab from './components/RecipeTab'
import OrdersTab from './components/OrdersTab'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

function App() {
  const [activeTab, setActiveTab] = useState('sales')
  const [data, setData] = useState({
    total_revenue: 0,
    total_orders: 0,
    inventory: [],
    products: [],
    active_sales: [],
    all_sales: []
  })
  const [ticketToPrint, setTicketToPrint] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', description: '', emoji: '', price: '', category: 'Combos' })
  
  const lastSaleIdRef = useRef<string | null>(null)

  const fetchDashboardData = async (isPolling = false) => {
    try {
      const res = await fetch(`${API_URL}/stats`)
      const json = await res.json()
      
      if (isPolling && json.active_sales && json.active_sales.length > 0) {
        const latestSaleId = json.active_sales[0].id
        if (lastSaleIdRef.current && lastSaleIdRef.current !== latestSaleId) {
          const audio = new Audio('/distrito/assets/bell.mp3')
          audio.play().catch(() => console.log('Auto-play blocked by browser'))
        }
        lastSaleIdRef.current = latestSaleId
      } else if (!isPolling && json.active_sales && json.active_sales.length > 0) {
        lastSaleIdRef.current = json.active_sales[0].id
      }
      
      if (json.status === 'ok') {
        setData(json)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(() => {
      fetchDashboardData(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handlePrint = (sale: any) => {
    setTicketToPrint(sale)
    setTimeout(() => {
      window.print()
      setTicketToPrint(null)
    }, 500)
  }

  const toggleProduct = async (product_id: string, currentStatus: boolean) => {
    await fetch(`${API_URL}/products/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id, is_active: !currentStatus })
    })
    fetchDashboardData()
  }

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return
    await fetch(`${API_URL}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newProduct,
        price: parseFloat(newProduct.price),
        is_active: true
      })
    })
    setShowAddProduct(false)
    setNewProduct({ name: '', description: '', emoji: '', price: '', category: 'Combos' })
    fetchDashboardData()
  }

  return (
    <div className="min-h-screen bg-distrito-dark text-distrito-text font-sans">
      {/* Sidebar — oculto en móvil, visible en desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 w-64 h-full glass border-r border-white/10 p-6 z-10 flex-col">
        <div className="flex items-center gap-3 mb-10">
          <Utensils className="text-distrito-accent w-8 h-8" />
          <h1 className="text-2xl font-black tracking-tighter">
            DISTRITO<span className="text-distrito-accent">.</span>BOT
          </h1>
        </div>
          <nav className="space-y-1 flex-1">
            <button onClick={() => setActiveTab('sales')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'sales' ? 'bg-distrito-accent text-distrito-dark font-bold shadow-[0_0_15px_rgba(255,204,0,0.4)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <LayoutDashboard size={20} />
              <span>Órdenes</span>
            </button>
            <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-distrito-accent text-distrito-dark font-bold shadow-[0_0_15px_rgba(255,204,0,0.4)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <TrendingUp size={20} />
              <span>Reportes (BI)</span>
            </button>
            <button onClick={() => setActiveTab('history')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-distrito-accent text-distrito-dark font-bold shadow-[0_0_15px_rgba(255,204,0,0.4)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <History size={20} />
              <span>Resumen de Venta</span>
            </button>
          
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-distrito-accent text-black font-semibold' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Catálogo</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-distrito-accent text-black font-semibold' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <PackageSearch className="w-5 h-5" />
            <span>Inventario</span>
          </button>
          <button 
            onClick={() => setActiveTab('recipes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'recipes' ? 'bg-distrito-accent text-black font-semibold' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <ChefHat className="w-5 h-5" />
            <span>Recetas</span>
          </button>
          <button 
            onClick={() => setActiveTab('schedules')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'schedules' ? 'bg-distrito-accent text-black font-semibold' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Clock className="w-5 h-5" />
            <span>Horarios</span>
          </button>
          <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'settings' 
                  ? 'bg-distrito-accent/10 text-distrito-accent border border-distrito-accent/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Configuración</span>
            </button>
        </nav>
      </aside>

      {/* Barra de navegación inferior — solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 glass border-t border-white/10 flex justify-around items-center px-2 py-2">
        {[
          { key: 'sales',     icon: <LayoutDashboard size={22}/>, label: 'Órdenes' },
          { key: 'reports',   icon: <TrendingUp size={22}/>,     label: 'Reportes' },
          { key: 'catalog',   icon: <ClipboardList size={22}/>,  label: 'Menú / Carta' },
          { key: 'schedules', icon: <Clock size={22}/>,          label: 'Horarios' },
          { key: 'settings',  icon: <Settings size={22}/>,       label: 'Config.' },
        ].map(item => (
          <button key={item.key} onClick={() => setActiveTab(item.key)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
              activeTab === item.key ? 'text-distrito-accent' : 'text-gray-500'
            }`}>
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-10 pb-24 md:pb-10 min-h-screen relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-distrito-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto">
          {activeTab === 'sales' ? (
            <OrdersTab data={data} onRefresh={fetchDashboardData} />
            ) : activeTab === 'inventory' ? (
              <InventoryTab />
            ) : activeTab === 'catalog' ? (
              <div className="glass rounded-2xl p-8 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-distrito-accent">Menú / Carta de Productos</h2>
                  <button 
                    onClick={() => setShowAddProduct(true)}
                    className="bg-distrito-accent text-distrito-dark px-4 py-2 rounded-lg font-bold"
                  >
                    + Nuevo Producto
                  </button>
                </div>
                
                {showAddProduct && (
                  <div className="glass p-6 rounded-2xl border border-distrito-accent/50 shadow-[0_0_15px_rgba(255,204,0,0.3)] mb-6">
                    <h3 className="text-xl font-bold mb-4">Agregar Nuevo Producto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input placeholder="Nombre" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                      <input placeholder="Precio" type="number" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                      <input placeholder="Descripción corta" className="bg-black/20 rounded p-2 text-white border border-white/10 md:col-span-2"
                        value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                      <input placeholder="Emoji 🍔" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newProduct.emoji} onChange={e => setNewProduct({...newProduct, emoji: e.target.value})} />
                      <input placeholder="Categoría (Ej: Combos, Bebidas)" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setShowAddProduct(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                      <button onClick={handleAddProduct} className="bg-distrito-accent text-distrito-dark px-4 py-2 rounded font-bold">Guardar</button>
                    </div>
                  </div>
                )}
                <div className="grid gap-4">
                  {data.products.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-distrito-dark/50 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{item.emoji}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-white">{item.name}</p>
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{item.category || 'Combos'}</span>
                          </div>
                          <p className="text-sm text-gray-400">{item.description}</p>
                          <p className="text-distrito-accent font-bold mt-1">${item.price.toLocaleString()}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleProduct(item.id, item.is_active)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                          item.is_active 
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        {item.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'reports' ? (
              <ReportsTab data={data} />
            ) : activeTab === 'history' ? (
              <SalesSummaryTab />
            ) : activeTab === 'recipes' ? (
              <RecipeTab data={data} />
            ) : activeTab === 'schedules' ? (
              <SchedulesTab />
            ) : activeTab === 'settings' ? (
              <ConfigurationTab />
            ) : null}
        </div>
      </main>

      {/* COMPONENTE DE IMPRESIÓN (OCULTO EN PANTALLA) */}
      {ticketToPrint && (
        <div className="ticket-print">
          <h2>DISTRITO BURGER</h2>
          <h3>Ticket de Venta</h3>
          <div className="line"></div>
          <p><strong>Fecha:</strong> {format(new Date(ticketToPrint.created_at), "dd/MM/yyyy HH:mm")}</p>
          <p><strong>Tel:</strong> {ticketToPrint.customer_phone}</p>
          <div className="line"></div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
            {ticketToPrint.order_detail}
          </pre>
          <div className="line"></div>
          <h3 style={{ textAlign: 'right' }}>
            TOTAL: ${parseFloat(ticketToPrint.total_amount).toLocaleString()}
          </h3>
          <div className="line"></div>
          <p style={{ textAlign: 'center', fontSize: '10px' }}>¡Gracias por tu compra!</p>
        </div>
      )}
      {/* Modal for Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
            <h2 className="text-2xl font-bold mb-2">Orden #{selectedOrder.daily_order_number || '---'}</h2>
            <p className="text-gray-400 mb-6">{format(new Date(selectedOrder.created_at), "h:mm a - d 'de' MMMM", { locale: es })}</p>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-bold">{selectedOrder.customer_name || 'Sin nombre'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-bold">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Método de Pago</p>
                  <p className="font-bold uppercase text-distrito-accent">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entrega</p>
                  <p className="font-bold capitalize">{selectedOrder.delivery_type}</p>
                  {selectedOrder.delivery_barrio && <p className="text-sm text-gray-300">{selectedOrder.delivery_barrio}</p>}
                </div>
              </div>

              <div className="bg-black/50 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap border border-white/5">
                <p className="font-bold text-white mb-2 pb-2 border-b border-white/10">ITEMS DEL PEDIDO:</p>
                {selectedOrder.order_detail}
              </div>

              <div className="flex justify-between items-center text-xl">
                <p className="font-bold text-gray-400">Total:</p>
                <p className="font-black text-distrito-accent">${Number(selectedOrder.total_amount).toLocaleString()}</p>
              </div>
            </div>

            <button 
              onClick={() => { handlePrint(selectedOrder); setSelectedOrder(null); }}
              className="w-full bg-distrito-accent text-black font-black py-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-yellow-400 transition-colors"
            >
              <Printer size={20} />
              <span>Imprimir Ticket de Cocina</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
