
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  data: {
    all_sales: any[]
    total_revenue: number
    total_orders: number
  }
}

export default function ReportsTab({ data }: Props) {
  // Procesar ventas de los últimos 7 días
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i)
    return format(d, 'yyyy-MM-dd')
  })

  const salesByDay = last7Days.map(dayStr => {
    const daySales = data.all_sales.filter(s => s.created_at.startsWith(dayStr))
    const total = daySales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0)
    return {
      name: format(parseISO(dayStr), 'EEEE', { locale: es }),
      Total: total
    }
  })

  const nequiTotal = data.all_sales
    .filter(s => s.payment_method === 'transferencia')
    .reduce((acc, s) => acc + Number(s.total_amount || 0), 0)

  const cashTotal = data.all_sales
    .filter(s => s.payment_method === 'efectivo')
    .reduce((acc, s) => acc + Number(s.total_amount || 0), 0)

  const deliveryCount = data.all_sales.filter(s => s.delivery_type === 'domicilio').length
  const pickupCount = data.all_sales.filter(s => s.delivery_type === 'recoger').length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold">Reportes y BI</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-2xl border border-distrito-accent/20">
          <p className="text-gray-400 font-bold">💰 Facturado (Total)</p>
          <p className="text-4xl font-black text-distrito-accent mt-2">
            ${data.total_revenue.toLocaleString()}
          </p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-gray-400 font-bold">💳 Nequi / Transf.</p>
          <p className="text-3xl font-bold mt-2 text-white">
            ${nequiTotal.toLocaleString()}
          </p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-gray-400 font-bold">💵 Efectivo</p>
          <p className="text-3xl font-bold mt-2 text-white">
            ${cashTotal.toLocaleString()}
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
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Total']}
              />
              <Line type="monotone" dataKey="Total" stroke="#FFCC00" strokeWidth={3} dot={{ r: 6, fill: '#FFCC00' }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
