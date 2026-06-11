import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { format, parseISO, subDays, startOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { API_URL } from '../config'

interface Props {
  data: {
    all_sales: any[]
    total_revenue: number
    total_orders: number
  }
}

const COLORS = ['#FFCC00', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function ReportsTab({ data }: Props) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [recoveryStats, setRecoveryStats] = useState<any>(null)

  useEffect(() => {
    fetch(`${API_URL}/purchases`)
      .then(res => res.json())
      .then(d => {
        if (d.status === 'ok') setPurchases(d.purchases || [])
      })
      .catch(console.error)

    fetch(`${API_URL}/dashboard/recovery-stats`)
      .then(res => res.json())
      .then(d => {
        if (d.status === 'ok') setRecoveryStats(d.stats)
      })
      .catch(console.error)
  }, [])

  // Filter out corrupt entries
  const cleanSales = (data.all_sales || []).filter((s: any) => !!s && !!s.created_at)

  // Procesar ventas de los últimos 7 días
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i)
    return format(d, 'yyyy-MM-dd')
  })

  const salesByDay = last7Days.map(dayStr => {
    const daySales = cleanSales.filter((s: any) => s.created_at.startsWith(dayStr))
    const total = daySales.reduce((acc: number, s: any) => acc + Number(s.total_amount || 0), 0)
    return {
      name: format(parseISO(dayStr), 'EEEE', { locale: es }),
      Total: total
    }
  })

  // --- Compras por día (últimos 7 días) ---
  const purchasesByDay = last7Days.map(dayStr => {
    const dayPurchases = purchases.filter((p: any) => p.purchase_date && p.purchase_date.startsWith(dayStr))
    const total = dayPurchases.reduce((acc: number, p: any) => acc + Number(p.total_price || 0), 0)
    return {
      name: format(parseISO(dayStr), 'EEEE', { locale: es }),
      Total: total
    }
  })

  // --- Compras por Proveedor ---
  const supplierMap: Record<string, number> = {}
  purchases.forEach(p => {
    const supplier = p.supplier || 'Sin Proveedor'
    supplierMap[supplier] = (supplierMap[supplier] || 0) + Number(p.total_price || 0)
  })
  const purchasesBySupplier = Object.keys(supplierMap).map(k => ({ name: k, value: supplierMap[k] })).sort((a,b) => b.value - a.value)

  // --- Compras por Insumo ---
  const itemMap: Record<string, number> = {}
  purchases.forEach(p => {
    const itemName = p.inventory_items?.name || 'Desconocido'
    itemMap[itemName] = (itemMap[itemName] || 0) + Number(p.total_price || 0)
  })
  const purchasesByItem = Object.keys(itemMap).map(k => ({ name: k, value: itemMap[k] })).sort((a,b) => b.value - a.value)

  const nequiTotal = cleanSales
    .filter((s: any) => s.payment_method === 'transferencia')
    .reduce((acc: number, s: any) => acc + Number(s.total_amount || 0), 0)

  const cashTotal = cleanSales
    .filter((s: any) => s.payment_method === 'efectivo')
    .reduce((acc: number, s: any) => acc + Number(s.total_amount || 0), 0)

  const deliveryCount = cleanSales.filter((s: any) => s.delivery_type === 'domicilio').length
  const pickupCount = cleanSales.filter((s: any) => s.delivery_type === 'recoger').length

  const formatCurrency = (val: number) => `$${Number(val).toLocaleString()}`

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold">Reportes y BI</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-2xl border border-distrito-accent/20">
          <p className="text-gray-400 font-bold">💰 Facturado (Total)</p>
          <p className="text-4xl font-black text-distrito-accent mt-2">
            {formatCurrency(data.total_revenue)}
          </p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-gray-400 font-bold">💳 Nequi / Transf.</p>
          <p className="text-3xl font-bold mt-2 text-white">
            {formatCurrency(nequiTotal)}
          </p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-gray-400 font-bold">💵 Efectivo</p>
          <p className="text-3xl font-bold mt-2 text-white">
            {formatCurrency(cashTotal)}
          </p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-gray-400 font-bold">🛵 Domicilios vs Local</p>
          <p className="text-xl font-bold mt-2 text-white">
            {deliveryCount} Domicilios
          </p>
          <p className="text-sm text-gray-400">
            {pickupCount} Recogida en local
          </p>
        </div>
      </div>

      <div className="glass p-6 rounded-2xl border border-white/10 mt-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] -z-10" />
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🛒</span> Pedidos Abandonados (Hoy)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-400">Iniciados</p>
            <p className="text-2xl font-bold">{recoveryStats?.iniciados || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Confirmados</p>
            <p className="text-2xl font-bold text-green-400">{recoveryStats?.confirmados || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Abandonados</p>
            <p className="text-2xl font-bold text-red-400">{recoveryStats?.abandonados || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Recuperados</p>
            <p className="text-2xl font-bold text-blue-400">{recoveryStats?.recuperados || 0}</p>
          </div>
          <div className="col-span-2 md:col-span-1 border-l border-white/10 pl-4">
            <p className="text-sm text-gray-400">Tasa Recuperación</p>
            <p className="text-3xl font-black text-distrito-accent">{recoveryStats?.tasa || 0}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass p-8 rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold mb-6">Ventas de los últimos 7 días</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#888" tickFormatter={(str) => str.charAt(0).toUpperCase() + str.slice(1)} />
                <YAxis stroke="#888" tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #FFCC00', borderRadius: '8px' }}
                  formatter={(value: any) => [formatCurrency(value), 'Ventas']}
                />
                <Line type="monotone" dataKey="Total" stroke="#FFCC00" strokeWidth={3} dot={{ r: 6, fill: '#FFCC00' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-8 rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold mb-6">Compras de Insumos (7 días)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchasesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#888" tickFormatter={(str) => str.charAt(0).toUpperCase() + str.slice(1)} />
                <YAxis stroke="#888" tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #ff4444', borderRadius: '8px' }}
                  formatter={(value: any) => [formatCurrency(value), 'Gasto']}
                />
                <Bar dataKey="Total" fill="#ff4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold mb-6">Gasto por Proveedor</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={purchasesBySupplier} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => entry.name}>
                  {purchasesBySupplier.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ backgroundColor: '#111', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-8 rounded-2xl border border-white/10 overflow-auto">
          <h3 className="text-xl font-bold mb-6">Gasto por Insumo</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="pb-3">Insumo</th>
                <th className="pb-3 text-right">Total Invertido</th>
              </tr>
            </thead>
            <tbody>
              {purchasesByItem.map((item, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 text-white">{item.name}</td>
                  <td className="py-3 text-right font-bold text-distrito-accent">{formatCurrency(item.value)}</td>
                </tr>
              ))}
              {purchasesByItem.length === 0 && (
                <tr><td colSpan={2} className="py-4 text-center text-gray-500">No hay compras registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
