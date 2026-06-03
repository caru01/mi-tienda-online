import { useState } from 'react'
import { Printer, Package, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

const TABS = [
  { key: 'por_aceptar',   label: 'ACEPTAR',   color: 'yellow', statuses: ['por_aceptar'] },
  { key: 'en_preparacion', label: 'PREPARAR', color: 'blue',   statuses: ['en_preparacion', 'preparando'] },
  { key: 'por_entregar',  label: 'ENTREGAR',  color: 'green',  statuses: ['por_entregar', 'en_camino'] },
]

const TAB_COLORS: Record<string, string> = {
  yellow: 'text-yellow-400 border-yellow-400 bg-yellow-400',
  blue:   'text-blue-400   border-blue-400   bg-blue-400',
  green:  'text-green-400  border-green-400  bg-green-400',
}

export default function OrdersTab({ data, onRefresh }: { data: any, onRefresh: () => void }) {
  const [activeKanban, setActiveKanban] = useState('por_aceptar')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleStatus = async (id: string, status: string, customer_phone: string) => {
    setLoadingId(id)
    try {
      await fetch(`${API_URL}/orders/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, customer_phone })
      })
      onRefresh()
    } finally {
      setLoadingId(null)
    }
  }

  const handlePrint = (sale: any) => {
    const win = window.open('', '_blank', 'width=400,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>Ticket</title>
      <style>
        body { font-family: monospace; font-size: 13px; margin: 16px; }
        h2 { text-align: center; font-size: 16px; margin-bottom: 8px; }
        hr { border: 1px dashed #000; margin: 8px 0; }
        .total { font-size: 22px; font-weight: bold; text-align: center; margin-top: 8px; }
        .label { color: #555; font-size: 11px; text-transform: uppercase; }
      </style></head><body>
      <h2>🍔 DISTRITO BURGER 🍔</h2>
      <hr/>
      <p><span class="label">Orden #</span> ${sale.daily_order_number || '---'}</p>
      <p><span class="label">Cliente:</span> ${sale.customer_name || 'Sin nombre'}</p>
      <p><span class="label">Teléfono:</span> ${sale.customer_phone}</p>
      <p><span class="label">Tipo:</span> ${sale.delivery_type?.toUpperCase()}</p>
      ${sale.delivery_type === 'domicilio' ? `<p><span class="label">Dirección:</span> ${sale.delivery_address || ''} - ${sale.delivery_barrio || ''}</p>` : ''}
      <hr/>
      <p><span class="label">Pedido:</span></p>
      <pre>${sale.order_detail}</pre>
      ${sale.observations && sale.observations !== 'Ninguna' ? `<p><span class="label">Obs:</span> ${sale.observations}</p>` : ''}
      <hr/>
      <p><span class="label">Pago:</span> ${sale.payment_method?.toUpperCase()}</p>
      <div class="total">$ ${Number(sale.total_amount).toLocaleString()}</div>
      <hr/>
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    win.document.close()
  }

  const currentTab = TABS.find(t => t.key === activeKanban)!
  const filtered = data.active_sales.filter((s: any) => currentTab.statuses.includes(s.status))

  const countFor = (tab: typeof TABS[0]) =>
    data.active_sales.filter((s: any) => tab.statuses.includes(s.status)).length

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">Órdenes</h2>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg transition-colors"
        >
          ↺ Actualizar
        </button>
      </div>

      {/* Tab Bar - estilo móvil horizontal */}
      <div className="flex w-full mb-6 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
        {TABS.map(tab => {
          const isActive = tab.key === activeKanban
          const count = countFor(tab)
          const colors = TAB_COLORS[tab.color]
          return (
            <button
              key={tab.key}
              onClick={() => setActiveKanban(tab.key)}
              className={`flex-1 py-4 flex flex-col items-center gap-1 font-black text-xs md:text-sm tracking-widest transition-all relative ${
                isActive
                  ? `${colors.split(' ')[0]} bg-white/10 border-b-2 ${colors.split(' ')[1]}`
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className="text-lg md:text-xl">
                {tab.label === 'ACEPTAR' ? '📥' : tab.label === 'PREPARAR' ? '👨‍🍳' : '🛵'}
              </span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`absolute top-2 right-2 md:right-4 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                  isActive ? `${colors.split(' ')[2]} text-black` : 'bg-white/20 text-white'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista de Pedidos — scroll vertical */}
      <div className="space-y-4 overflow-y-auto flex-1 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <Package size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-bold">Sin órdenes aquí</p>
            <p className="text-sm">Las nuevas aparecerán automáticamente</p>
          </div>
        ) : (
          filtered.map((sale: any) => (
            <OrderCard
              key={sale.id}
              sale={sale}
              tab={activeKanban}
              loading={loadingId === sale.id}
              onStatus={handleStatus}
              onPrint={handlePrint}
            />
          ))
        )}
      </div>
    </div>
  )
}

function OrderCard({ sale, tab, loading, onStatus, onPrint }: {
  sale: any
  tab: string
  loading: boolean
  onStatus: (id: string, status: string, phone: string) => void
  onPrint: (sale: any) => void
}) {
  const timeAgo = format(new Date(sale.created_at), "h:mm a", { locale: es })
  const isTransfer = sale.payment_method === 'transferencia'

  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg border transition-all ${
      tab === 'por_aceptar'
        ? 'border-yellow-400/30 bg-gradient-to-b from-yellow-400/5 to-black/40'
        : tab === 'en_preparacion'
        ? 'border-blue-400/30 bg-gradient-to-b from-blue-400/5 to-black/40'
        : 'border-green-400/30 bg-gradient-to-b from-green-400/5 to-black/40'
    }`}>

      {/* Header de la tarjeta */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
            tab === 'por_aceptar' ? 'bg-yellow-400/20 text-yellow-400' :
            tab === 'en_preparacion' ? 'bg-blue-400/20 text-blue-400' :
            'bg-green-400/20 text-green-400'
          }`}>
            #{sale.daily_order_number || '---'}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={11} /> {timeAgo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
            isTransfer ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-300'
          }`}>
            {sale.payment_method}
          </span>
          <span className="text-xs text-gray-500 capitalize bg-white/5 px-2 py-0.5 rounded-full">
            {sale.delivery_type}
          </span>
        </div>
      </div>

      {/* Nombre y teléfono */}
      <div className="px-5 pb-2">
        <p className="font-black text-xl text-white leading-tight">{sale.customer_name || 'Sin nombre'}</p>
        <p className="text-sm text-gray-400">{sale.customer_phone}</p>
        {sale.delivery_type === 'domicilio' && sale.delivery_barrio && (
          <p className="text-xs text-gray-500 mt-0.5">📍 {sale.delivery_address} — {sale.delivery_barrio}</p>
        )}
      </div>

      {/* Detalle del pedido — bloque visual destacado */}
      <div className="mx-5 mb-3 bg-black/50 rounded-xl p-3 border border-white/5">
        <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Pedido</p>
        <pre className="text-white text-sm font-mono whitespace-pre-wrap leading-relaxed">
          {sale.order_detail}
        </pre>
        {sale.observations && sale.observations !== 'Ninguna' && (
          <p className="text-xs text-yellow-300/80 mt-2 border-t border-white/5 pt-2">
            📝 {sale.observations}
          </p>
        )}
      </div>

      {/* Total — texto grande */}
      <div className="px-5 pb-3">
        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total</p>
        <p className="text-4xl font-black text-white tracking-tight">
          ${Number(sale.total_amount).toLocaleString()}
        </p>
      </div>

      {/* Botones — full width, uno debajo del otro */}
      <div className="px-4 pb-4 space-y-2">
        {tab === 'por_aceptar' && (
          <button
            disabled={loading}
            onClick={() => onStatus(sale.id, 'en_preparacion', sale.customer_phone)}
            className={`w-full py-4 rounded-xl font-black text-base tracking-wide transition-all shadow-lg active:scale-95 ${
              isTransfer
                ? 'bg-distrito-accent text-black hover:bg-yellow-300 shadow-yellow-400/20'
                : 'bg-green-500 text-black hover:bg-green-400 shadow-green-500/20'
            } disabled:opacity-50`}
          >
            {loading ? '⏳ Procesando...' : isTransfer ? '✅ Transferencia Confirmada' : '✅ Aceptar Pedido'}
          </button>
        )}

        {tab === 'en_preparacion' && (
          <button
            disabled={loading}
            onClick={() => onStatus(sale.id, 'por_entregar', sale.customer_phone)}
            className="w-full py-4 rounded-xl font-black text-base tracking-wide bg-blue-500 text-white hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? '⏳ Procesando...' : '🛵 Despachar Pedido'}
          </button>
        )}

        {tab === 'por_entregar' && (
          <button
            disabled={loading}
            onClick={() => onStatus(sale.id, 'entregado', sale.customer_phone)}
            className="w-full py-4 rounded-xl font-black text-base tracking-wide bg-green-500 text-black hover:bg-green-400 transition-all shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? '⏳ Procesando...' : '🎉 Marcar Entregado'}
          </button>
        )}

        {/* Botón secundario: Imprimir */}
        <button
          onClick={() => onPrint(sale)}
          className="w-full py-3 rounded-xl font-bold text-sm text-gray-400 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Printer size={16} /> Imprimir Ticket
        </button>
      </div>
    </div>
  )
}
