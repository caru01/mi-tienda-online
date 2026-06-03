import { useState, useEffect } from 'react'
import { LayoutDashboard, PackageSearch, ClipboardList, Utensils, TrendingUp } from 'lucide-react'

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
  
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/stats`)
      const json = await res.json()
      if (json.status === 'ok') {
        setData(json)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePurchase = async (item_id: number) => {
    const qty = prompt("Cantidad comprada:")
    if (!qty) return
    
    await fetch(`${API_URL}/inventory/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id, quantity: parseFloat(qty) })
    })
    fetchData()
  }
  
  const toggleProduct = async (product_id: string, currentStatus: boolean) => {
    await fetch(`${API_URL}/products/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id, is_active: !currentStatus })
    })
    fetchData()
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
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-10 min-h-screen relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-distrito-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* SALES TAB */}
          {activeTab === 'sales' && (
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
                <h3 className="text-xl font-bold mb-4">Últimas Ventas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400">
                        <th className="pb-3 font-medium">Cliente</th>
                        <th className="pb-3 font-medium">Método</th>
                        <th className="pb-3 font-medium">Tipo</th>
                        <th className="pb-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_sales.map((sale: any) => (
                        <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4">{sale.customer_name || 'Desconocido'}</td>
                          <td className="py-4 capitalize">{sale.payment_method}</td>
                          <td className="py-4 capitalize">{sale.delivery_type}</td>
                          <td className="py-4 font-bold text-distrito-accent">${sale.total_amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                      {data.recent_sales.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-gray-500">No hay ventas registradas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CATALOG TAB */}
          {activeTab === 'catalog' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Catálogo Dinámico</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.products.map((prod: any) => (
                  <div key={prod.id} className="glass p-6 rounded-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-4xl">{prod.emoji}</span>
                      <button 
                        onClick={() => toggleProduct(prod.id, prod.is_active)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${prod.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                      >
                        {prod.is_active ? 'ACTIVO' : 'INACTIVO'}
                      </button>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{prod.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 h-10">{prod.description}</p>
                    <p className="text-2xl font-bold text-distrito-accent">${prod.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-bold">Inventario de Insumos</h2>
              
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
                            onClick={() => handlePurchase(item.id)}
                            className="px-4 py-2 bg-distrito-accent/10 hover:bg-distrito-accent/20 text-distrito-accent rounded-lg transition-colors text-sm font-semibold"
                          >
                            + Registrar Compra
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
