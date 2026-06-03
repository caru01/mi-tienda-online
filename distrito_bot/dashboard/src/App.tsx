import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, PackageSearch, ClipboardList, Utensils, TrendingUp, Settings, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ConfigurationTab from './components/ConfigurationTab'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

function App() {
  const [activeTab, setActiveTab] = useState('sales')
  const [data, setData] = useState({
    total_revenue: 0,
    total_orders: 0,
    inventory: [],
    products: [],
    recent_sales: []
  })
  const [ticketToPrint, setTicketToPrint] = useState<any>(null)
  
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', description: '', emoji: '', price: '', category: 'Combos' })
  
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [newInventory, setNewInventory] = useState({ name: '', unit_measure: '', current_stock: '', minimum_stock: '' })
  
  const lastSaleIdRef = useRef<string | null>(null)

  const fetchDashboardData = async (isPolling = false) => {
    try {
      const res = await fetch(`${API_URL}/stats`)
      const json = await res.json()
      
      if (isPolling && json.recent_sales && json.recent_sales.length > 0) {
        const latestSaleId = json.recent_sales[0].id
        if (lastSaleIdRef.current && lastSaleIdRef.current !== latestSaleId) {
          const audio = new Audio('/distrito/assets/bell.mp3')
          audio.play().catch(() => console.log('Auto-play blocked by browser'))
        }
        lastSaleIdRef.current = latestSaleId
      } else if (!isPolling && json.recent_sales && json.recent_sales.length > 0) {
        lastSaleIdRef.current = json.recent_sales[0].id
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

  const handlePurchase = async (item_id: number) => {
    const qty = prompt("Cantidad comprada:")
    if (!qty) return
    
    await fetch(`${API_URL}/inventory/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id, quantity: parseFloat(qty) })
    })
    fetchDashboardData()
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

  const handleAddInventory = async () => {
    if (!newInventory.name) return
    await fetch(`${API_URL}/inventory/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newInventory,
        current_stock: parseFloat(newInventory.current_stock || '0'),
        minimum_stock: parseFloat(newInventory.minimum_stock || '0')
      })
    })
    setShowAddInventory(false)
    setNewInventory({ name: '', unit_measure: '', current_stock: '', minimum_stock: '' })
    fetchDashboardData()
  }

  const handleUpdateInventoryStock = async (id: number, current_stock: number) => {
    const newStockStr = prompt("Nuevo inventario actual:", current_stock.toString())
    if (newStockStr === null) return
    const newStock = parseFloat(newStockStr)
    if (isNaN(newStock)) return

    await fetch(`${API_URL}/inventory/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, current_stock: newStock })
    })
    fetchDashboardData()
  }

  return (
    <div className="min-h-screen bg-distrito-dark text-distrito-text font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-64 h-full glass border-r border-white/10 p-6 z-10">
        <div className="flex items-center gap-3 mb-10">
          <Utensils className="text-distrito-accent w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight">Distrito Burger</h1>
        </div>
        
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'sales' ? 'bg-distrito-accent text-black font-semibold' : 'hover:bg-white/5'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-distrito-accent text-black font-semibold' : 'hover:bg-white/5'}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Catálogo</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-distrito-accent text-black font-semibold' : 'hover:bg-white/5'}`}
          >
            <PackageSearch className="w-5 h-5" />
            <span>Inventario</span>
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

      {/* Main Content */}
      <main className="ml-64 p-10 min-h-screen relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-distrito-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto">
          {activeTab === 'sales' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-bold">Resumen de Ventas</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 font-medium mb-1">Ingresos Totales</p>
                    <h3 className="text-4xl font-bold text-distrito-accent">${data.total_revenue.toLocaleString()}</h3>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-distrito-accent/20 flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-distrito-accent" />
                  </div>
                </div>
                
                <div className="glass p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 font-medium mb-1">Pedidos Completados</p>
                    <h3 className="text-4xl font-bold">{data.total_orders}</h3>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <ClipboardList className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              <div className="glass p-6 rounded-2xl mt-8">
                <h3 className="text-xl font-bold mb-6 text-distrito-accent flex items-center space-x-2">
                  <ClipboardList className="w-6 h-6" />
                  <span>Últimos Pedidos</span>
                </h3>
                <div className="space-y-4">
                  {data.recent_sales.map((sale: any) => (
                    <div key={sale.id} className="p-4 bg-distrito-dark/50 rounded-xl border border-white/5 hover:border-distrito-accent/30 transition-colors flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm text-gray-400 font-mono">
                            {format(new Date(sale.created_at), "dd MMM HH:mm", { locale: es })}
                          </span>
                          <span className="bg-distrito-accent/20 text-distrito-accent text-xs px-2 py-1 rounded-full font-bold">
                            COMPLETADO
                          </span>
                        </div>
                        <p className="text-white font-medium mb-1">Cliente: {sale.customer_phone}</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{sale.order_detail}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-xl font-bold text-distrito-accent mb-3">
                          ${parseFloat(sale.total_amount).toLocaleString()}
                        </p>
                        <button
                          onClick={() => handlePrint(sale)}
                          className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Imprimir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'inventory' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">Inventario de Insumos</h2>
                  <button 
                    onClick={() => setShowAddInventory(true)}
                    className="bg-distrito-accent text-distrito-dark px-4 py-2 rounded-lg font-bold"
                  >
                    + Nuevo Insumo
                  </button>
                </div>
                
                {showAddInventory && (
                  <div className="glass p-6 rounded-2xl border border-distrito-accent/50 shadow-[0_0_15px_rgba(255,204,0,0.3)]">
                    <h3 className="text-xl font-bold mb-4">Agregar Nuevo Insumo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <input placeholder="Nombre" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newInventory.name} onChange={e => setNewInventory({...newInventory, name: e.target.value})} />
                      <input placeholder="Unidad (kg, und...)" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newInventory.unit_measure} onChange={e => setNewInventory({...newInventory, unit_measure: e.target.value})} />
                      <input placeholder="Stock Actual" type="number" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newInventory.current_stock} onChange={e => setNewInventory({...newInventory, current_stock: e.target.value})} />
                      <input placeholder="Stock Mínimo" type="number" className="bg-black/20 rounded p-2 text-white border border-white/10"
                        value={newInventory.minimum_stock} onChange={e => setNewInventory({...newInventory, minimum_stock: e.target.value})} />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setShowAddInventory(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                      <button onClick={handleAddInventory} className="bg-distrito-accent text-distrito-dark px-4 py-2 rounded font-bold">Guardar</button>
                    </div>
                  </div>
                )}
              
              <div className="glass p-6 rounded-2xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="pb-3 font-medium">Insumo</th>
                      <th className="pb-3 font-medium">Stock Actual</th>
                      <th className="pb-3 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inventory.map((item: any) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 font-medium">{item.name}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-sm ${item.current_stock < 20 ? 'bg-red-500/20 text-red-400' : 'text-gray-300'}`}>
                            {item.current_stock} {item.unit}
                          </span>
                        </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => handleUpdateInventoryStock(item.id, item.current_stock)}
                              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors mr-2"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handlePurchase(item.id)}
                              className="px-3 py-1 bg-distrito-accent/20 text-distrito-accent hover:bg-distrito-accent/30 rounded text-sm transition-colors font-medium"
                            >
                              + Compra
                            </button>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            ) : activeTab === 'catalog' ? (
              <div className="glass rounded-2xl p-8 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-distrito-accent">Catálogo de Productos</h2>
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
            ) : activeTab === 'settings' ? (
              <ConfigurationTab />
            ) : null
          }
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
    </div>
  )
}

export default App
