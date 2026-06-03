import { useState, useEffect } from 'react'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Filter, DollarSign, ShoppingBag, Download } from 'lucide-react'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

export default function SalesSummaryTab() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Por defecto, mostrar desde el inicio del mes actual
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const fetchSales = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/sales/history?start_date=${startDate}&end_date=${endDate}`)
      const data = await res.json()
      if (data.status === 'ok') {
        setSales(data.sales)
      }
    } catch (e) {
      console.error("Error fetching sales history", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [])

  // Métricas
  const totalRevenue = sales.filter(s => s.status === 'entregado').reduce((acc, s) => acc + Number(s.total_amount || 0), 0)
  const totalOrders = sales.filter(s => s.status === 'entregado').length
  const nequiTotal = sales.filter(s => s.status === 'entregado' && s.payment_method === 'transferencia').reduce((acc, s) => acc + Number(s.total_amount || 0), 0)
  const cashTotal = sales.filter(s => s.status === 'entregado' && s.payment_method === 'efectivo').reduce((acc, s) => acc + Number(s.total_amount || 0), 0)

  const handleExportCSV = () => {
    if (sales.length === 0) return
    const headers = "Fecha,Orden,Cliente,Telefono,Tipo,Total,Metodo Pago,Estado\n"
    const rows = sales.map(s => {
      const date = format(new Date(s.created_at), "yyyy-MM-dd HH:mm")
      return `${date},${s.daily_order_number || ''},"${s.customer_name || ''}",${s.customer_phone},${s.delivery_type},${s.total_amount},${s.payment_method},${s.status}`
    }).join("\n")
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `historial_ventas_${startDate}_al_${endDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 px-1 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Resumen de Venta</h2>
          <p className="text-gray-400 text-sm mt-1">Historial completo de órdenes finalizadas</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 flex-1 md:flex-none">
            <Calendar size={16} className="text-gray-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none w-full md:w-auto"
            />
          </div>
          <span className="text-gray-500 font-bold hidden md:block">-</span>
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 flex-1 md:flex-none">
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none w-full md:w-auto text-right md:text-left"
            />
          </div>
          <button 
            onClick={fetchSales}
            className="bg-distrito-accent text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-lg w-full md:w-auto justify-center"
          >
            <Filter size={16} /> Filtrar
          </button>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-distrito-dark/50 border border-green-500/20 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-green-400">
            <DollarSign size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">Total Facturado</span>
          </div>
          <p className="text-3xl font-black text-white">${totalRevenue.toLocaleString()}</p>
        </div>
        
        <div className="bg-distrito-dark/50 border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <ShoppingBag size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">Órdenes Exitosas</span>
          </div>
          <p className="text-3xl font-black text-white">{totalOrders}</p>
        </div>

        <div className="bg-distrito-dark/50 border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-blue-400">
            <span className="font-bold text-sm uppercase tracking-wider">📲 Nequi/Transf</span>
          </div>
          <p className="text-2xl font-bold text-white">${nequiTotal.toLocaleString()}</p>
        </div>

        <div className="bg-distrito-dark/50 border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-yellow-400">
            <span className="font-bold text-sm uppercase tracking-wider">💵 Efectivo</span>
          </div>
          <p className="text-2xl font-bold text-white">${cashTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="font-bold text-lg">Historial Detallado</h3>
          <button onClick={handleExportCSV} className="text-sm font-bold text-distrito-accent hover:text-yellow-300 flex items-center gap-1">
            <Download size={16} /> Exportar CSV
          </button>
        </div>
        
        <div className="overflow-auto flex-1 p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-distrito-accent"></div>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600">
              <ShoppingBag size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-bold">No hay ventas finalizadas en estas fechas.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-black/60 text-gray-400 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Fecha / Hora</th>
                  <th className="px-6 py-4">Orden</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Método Pago</th>
                  <th className="px-6 py-4">Tipo Entrega</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(sale.created_at), "dd MMM, h:mm a", { locale: es })}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      #{sale.daily_order_number || '---'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{sale.customer_name || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-500">{sale.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        sale.payment_method === 'transferencia' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {sale.delivery_type}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-white text-base">
                      ${Number(sale.total_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        sale.status === 'entregado' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  )
}
