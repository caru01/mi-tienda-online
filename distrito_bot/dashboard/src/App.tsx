import { useState, useEffect, useRef, useCallback } from 'react'
import { LayoutDashboard, PackageSearch, ClipboardList, Utensils, TrendingUp, Settings, History, Clock, ChefHat, Store, Volume2 } from 'lucide-react'
import ConfigurationTab from './components/ConfigurationTab'
import ReportsTab from './components/ReportsTab'
import InventoryTab from './components/InventoryTab'
import SalesSummaryTab from './components/SalesSummaryTab'
import SchedulesTab from './components/SchedulesTab'
import RecipeTab from './components/RecipeTab'
import OrdersTab from './components/OrdersTab'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

// ─── Genera un beep sintetizado (no necesita archivo externo) ─────────────────
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }
    playTone(880, 0, 0.15)
    playTone(1100, 0.18, 0.15)
    playTone(880, 0.36, 0.2)
  } catch (e) { console.log('Audio error:', e) }
}

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
  const [isOpen, setIsOpen] = useState<boolean | null>(null)
  const [togglingStore, setTogglingStore] = useState(false)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const alertTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alertCountRef = useRef(0)
  const knownSaleIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', description: '', emoji: '', price: '', category: 'Combos' })

  // ── Fetch principal ─────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (isPolling = false) => {
    try {
      const res = await fetch(`${API_URL}/stats`)
      const json = await res.json()
      if (json.status !== 'ok') return

      // Detectar órdenes nuevas sólo en polling (no en carga inicial)
      if (isPolling && json.active_sales?.length > 0) {
        const incoming = (json.active_sales as any[]).filter(s => s?.id && !knownSaleIdsRef.current.has(s.id))
        if (incoming.length > 0) {
          setNewOrderIds(prev => {
            const next = new Set(prev)
            incoming.forEach(s => next.add(s.id))
            return next
          })
          // Arrancar alarma — beep cada 5s hasta 1 minuto (12 veces)
          if (alertTimerRef.current) clearInterval(alertTimerRef.current)
          alertCountRef.current = 0
          playAlertBeep()
          alertTimerRef.current = setInterval(() => {
            alertCountRef.current++
            if (alertCountRef.current >= 12) {
              clearInterval(alertTimerRef.current!)
              alertTimerRef.current = null
            } else {
              playAlertBeep()
            }
          }, 5000)
        }
        // Actualizar lista conocida
        ;(json.active_sales as any[]).forEach((s: any) => { if (s?.id) knownSaleIdsRef.current.add(s.id) })
      } else if (isFirstLoadRef.current) {
        // Primera carga: guardar todos los IDs actuales como "ya conocidos"
        ;(json.active_sales as any[]).forEach((s: any) => { if (s?.id) knownSaleIdsRef.current.add(s.id) })
        isFirstLoadRef.current = false
      }

      setData(json)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [])

  // ── Fetch status tienda ─────────────────────────────────────────────────────
  const fetchStoreStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/settings`)
      const json = await res.json()
      if (json.status === 'ok') setIsOpen(json.settings?.is_open ?? true)
    } catch (e) { console.error(e) }
  }, [])

  const toggleStore = async () => {
    if (togglingStore) return
    setTogglingStore(true)
    const newVal = !isOpen
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: newVal })
      })
      setIsOpen(newVal)
    } catch (e) { console.error(e) }
    setTogglingStore(false)
  }

  useEffect(() => {
    fetchDashboardData()
    fetchStoreStatus()
    const interval = setInterval(() => fetchDashboardData(true), 10000)
    return () => {
      clearInterval(interval)
      if (alertTimerRef.current) clearInterval(alertTimerRef.current)
    }
  }, [fetchDashboardData, fetchStoreStatus])

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
      body: JSON.stringify({ ...newProduct, price: parseFloat(newProduct.price), is_active: true })
    })
    setShowAddProduct(false)
    setNewProduct({ name: '', description: '', emoji: '', price: '', category: 'Combos' })
    fetchDashboardData()
  }

  // ── Sidebar nav items en el orden correcto ──────────────────────────────────
  const navItems = [
    { key: 'sales',     icon: <LayoutDashboard size={20}/>, label: 'Órdenes' },
    { key: 'catalog',   icon: <ClipboardList size={20}/>,   label: 'Menú / Carta' },
    { key: 'history',   icon: <History size={20}/>,         label: 'Resumen de Venta' },
    { key: 'schedules', icon: <Clock size={20}/>,           label: 'Horarios' },
    { key: 'reports',   icon: <TrendingUp size={20}/>,      label: 'Reportes (BI)' },
    { key: 'inventory', icon: <PackageSearch size={20}/>,   label: 'Inventario' },
    { key: 'recipes',   icon: <ChefHat size={20}/>,         label: 'Recetas' },
    { key: 'settings',  icon: <Settings size={20}/>,        label: 'Configuración' },
  ]

  // Quitar alerta verde cuando el usuario toca la orden
  const handleDismissNew = (id: string) => {
    setNewOrderIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  return (
    <div className="min-h-screen bg-distrito-dark text-distrito-text font-sans">

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 w-64 h-full glass border-r border-white/10 p-6 z-10 flex-col">
        <div className="flex items-center gap-3 mb-8">
          <Utensils className="text-distrito-accent w-7 h-7" />
          <h1 className="text-xl font-black tracking-tighter">
            DISTRITO<span className="text-distrito-accent">.</span>BOT
          </h1>
        </div>

        {/* Botón Abrir/Cerrar tienda */}
        <button
          onClick={toggleStore}
          disabled={togglingStore || isOpen === null}
          className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl font-black text-sm mb-6 transition-all border ${
            isOpen
              ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
          }`}
        >
          <Store size={18} />
          <span>{isOpen ? '✅ Tienda Abierta' : '🔴 Tienda Cerrada'}</span>
        </button>

        <nav className="space-y-1 flex-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
                activeTab === item.key
                  ? 'bg-distrito-accent text-distrito-dark font-bold shadow-[0_0_15px_rgba(255,204,0,0.3)]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Barra superior — solo móvil, con botón tienda */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 glass border-b border-white/10 flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Utensils className="text-distrito-accent w-5 h-5" />
          <span className="font-black text-sm tracking-tight">DISTRITO<span className="text-distrito-accent">.</span>BOT</span>
        </div>
        <button
          onClick={toggleStore}
          disabled={togglingStore || isOpen === null}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${
            isOpen
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
        >
          <Store size={14} />
          <span>{isOpen ? 'Abierta' : 'Cerrada'}</span>
        </button>
      </div>

      {/* Barra de navegación inferior — solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 glass border-t border-white/10 flex justify-around items-center px-1 py-1.5">
        {[
          { key: 'sales',     icon: <LayoutDashboard size={20}/>, label: 'Órdenes' },
          { key: 'catalog',   icon: <ClipboardList size={20}/>,   label: 'Menú' },
          { key: 'history',   icon: <History size={20}/>,         label: 'Ventas' },
          { key: 'schedules', icon: <Clock size={20}/>,           label: 'Horarios' },
          { key: 'settings',  icon: <Settings size={20}/>,        label: 'Config.' },
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
      <main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8 pb-24 md:pb-8 min-h-screen relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-distrito-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          {activeTab === 'sales' ? (
            <OrdersTab data={data} onRefresh={() => fetchDashboardData()} newOrderIds={newOrderIds} onDismissNew={handleDismissNew} />
          ) : activeTab === 'inventory' ? (
            <InventoryTab />
          ) : activeTab === 'catalog' ? (
            <div className="glass rounded-2xl p-6 border border-white/10 shadow-2xl">
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

      {/* Alerta visual de nueva orden */}
      {newOrderIds.size > 0 && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-green-500 text-black px-4 py-3 rounded-2xl font-black shadow-2xl flex items-center gap-2">
            <Volume2 size={20} />
            <span>🔔 {newOrderIds.size} orden{newOrderIds.size > 1 ? 'es' : ''} nueva{newOrderIds.size > 1 ? 's' : ''}!</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
