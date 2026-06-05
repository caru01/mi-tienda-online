import { useState, useEffect } from 'react'
import { Printer, Package, Clock } from 'lucide-react'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

const TABS = [
  { key: 'por_aceptar',    label: 'ACEPTAR',  emoji: '📥', color: 'yellow', statuses: ['por_aceptar'] },
  { key: 'en_preparacion', label: 'PREPARAR', emoji: '👨‍🍳', color: 'blue',   statuses: ['en_preparacion', 'preparando'] },
  { key: 'por_entregar',   label: 'ENTREGAR', emoji: '🛵', color: 'green',  statuses: ['por_entregar', 'en_camino'] },
]

// Filter out corrupt orders
const isValidOrder = (s: any) => !!s && !!s.id && !!s.customer_phone

export default function OrdersTab({
  data,
  onRefresh,
  newOrderIds,
  onDismissNew,
}: {
  data: any
  onRefresh: () => void
  newOrderIds: Set<string>
  onDismissNew: (id: string) => void
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  // Tick every minute to update elapsed times
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  const handleStatus = async (id: string, status: string, customer_phone: string) => {
    setLoadingId(id)
    onDismissNew(id)
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
      <p><span class="label">Tipo:</span> ${(sale.delivery_type || '').toUpperCase()}</p>
      ${sale.delivery_type === 'domicilio' ? `<p><span class="label">Dirección:</span> ${sale.delivery_address || ''} — ${sale.delivery_barrio || ''}</p>` : ''}
      <hr/>
      <p><span class="label">Pedido:</span></p>
      <pre>${sale.order_detail}</pre>
      ${sale.observations && sale.observations !== 'Ninguna' ? `<p><span class="label">Obs:</span> ${sale.observations}</p>` : ''}
      <hr/>
      <p><span class="label">Pago:</span> ${(sale.payment_method || '').toUpperCase()}</p>
      <div class="total">$ ${Number(sale.total_amount).toLocaleString()}</div>
      <hr/>
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    win.document.close()
  }

  const countFor = (tab: typeof TABS[0]) =>
    (data.active_sales as any[]).filter(s => isValidOrder(s) && tab.statuses.includes(s.status)).length

  const filteredFor = (tab: typeof TABS[0]) =>
    (data.active_sales as any[]).filter(s => isValidOrder(s) && tab.statuses.includes(s.status))

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

      {/* ── KANBAN: 3 columnas siempre visibles en desktop, scroll horizontal en móvil ── */}
      <div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 flex-1 min-h-0">
        {TABS.map(tab => {
          const orders = filteredFor(tab)
          const count = countFor(tab)

          const headerColor = tab.color === 'yellow'
            ? 'border-yellow-400/40 text-yellow-400 bg-yellow-400/10'
            : tab.color === 'blue'
            ? 'border-blue-400/40 text-blue-400 bg-blue-400/10'
            : 'border-green-400/40 text-green-400 bg-green-400/10'

          return (
            <div key={tab.key} className="flex flex-col min-w-[300px] md:min-w-0 md:flex-1">
              {/* Columna header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border mb-3 ${headerColor}`}>
                <span className="font-black text-sm tracking-widest flex items-center gap-2">
                  {tab.emoji} {tab.label}
                </span>
                {count > 0 && (
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full bg-black/30`}>
                    {count}
                  </span>
                )}
              </div>

              {/* Lista de órdenes */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-0.5">
                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-700 rounded-2xl border border-dashed border-white/5">
                    <Package size={32} className="mb-2 opacity-30" />
                    <p className="text-sm font-bold">Sin órdenes</p>
                  </div>
                ) : (
                  orders.map((sale: any) => (
                    <OrderCard
                      key={sale.id}
                      sale={sale}
                      tab={tab.key}
                      loading={loadingId === sale.id}
                      isNew={newOrderIds.has(sale.id)}
                      now={now}
                      onStatus={handleStatus}
                      onPrint={handlePrint}
                      onDismissNew={onDismissNew}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tarjeta compacta ────────────────────────────────────────────────────────
function OrderCard({ sale, tab, loading, isNew, now, onStatus, onPrint, onDismissNew }: {
  sale: any
  tab: string
  loading: boolean
  isNew: boolean
  now: number
  onStatus: (id: string, status: string, phone: string) => void
  onPrint: (sale: any) => void
  onDismissNew: (id: string) => void
}) {
  const safeDate = sale.created_at ? new Date(sale.created_at) : new Date()
  const isValidDate = !isNaN(safeDate.getTime())

  const minutesAgo = isValidDate
    ? Math.floor((now - safeDate.getTime()) / 60000)
    : 0

  const minuteLabel = minutesAgo < 1
    ? 'Ahora'
    : minutesAgo === 1
    ? '1 min'
    : `${minutesAgo} min`

  const isTransfer = sale.payment_method === 'transferencia'

  // Color borde según tiempo: < 10min normal, 10-20 amarillo, >20 rojo
  const timeBorderColor = minutesAgo < 10
    ? 'border-white/10'
    : minutesAgo < 20
    ? 'border-yellow-500/50'
    : 'border-red-500/60'

  const newGlow = isNew ? 'shadow-[0_0_20px_rgba(34,197,94,0.5)] border-green-400/60' : timeBorderColor

  return (
    <div
      onClick={() => isNew && onDismissNew(sale.id)}
      className={`rounded-2xl overflow-hidden border transition-all cursor-default ${newGlow} ${
        isNew
          ? 'bg-gradient-to-b from-green-500/10 to-black/50 animate-pulse'
          : tab === 'por_aceptar'
          ? 'bg-gradient-to-b from-yellow-400/5 to-black/40'
          : tab === 'en_preparacion'
          ? 'bg-gradient-to-b from-blue-400/5 to-black/40'
          : 'bg-gradient-to-b from-green-400/5 to-black/40'
      }`}
    >
      {/* ── Cabecera compacta ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <div className="flex items-center gap-2">
          {/* ID de la orden */}
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
            tab === 'por_aceptar' ? 'bg-yellow-400/20 text-yellow-400' :
            tab === 'en_preparacion' ? 'bg-blue-400/20 text-blue-400' :
            'bg-green-400/20 text-green-400'
          }`}>
            #{sale.daily_order_number || '?'}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
            isTransfer ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-300'
          }`}>
            {sale.payment_method || '--'}
          </span>
        </div>

        {/* Minutos desde el pedido — top right */}
        <div className={`flex items-center gap-1 text-xs font-black rounded-full px-2 py-0.5 ${
          minutesAgo >= 20 ? 'bg-red-500/20 text-red-400' :
          minutesAgo >= 10 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-white/5 text-gray-400'
        }`}>
          <Clock size={10} />
          {minuteLabel}
        </div>
      </div>

      {/* ── Info principal ── */}
      <div className="px-4 pb-2">
        {/* Nombre cliente */}
        <p className="font-black text-white text-base leading-tight truncate">
          {sale.customer_name || 'Sin nombre'}
        </p>

        {/* Tipo entrega + dirección/barrio */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500 capitalize bg-white/5 px-1.5 py-0.5 rounded-md">
            {sale.delivery_type || '--'}
          </span>
          {sale.delivery_type === 'domicilio' && (
            <span className="text-xs text-gray-400 truncate max-w-[160px]">
              📍 {[sale.delivery_address, sale.delivery_barrio].filter(Boolean).join(' — ') || 'Sin dirección'}
            </span>
          )}
        </div>

        {/* Total */}
        <p className="text-lg font-black text-white mt-1">
          ${Number(sale.total_amount).toLocaleString()}
        </p>
      </div>

      {/* ── Botones de acción ── */}
      <div className="px-3 pb-3 space-y-1.5">
        {tab === 'por_aceptar' && (
          <button
            disabled={loading}
            onClick={() => onStatus(sale.id, 'en_preparacion', sale.customer_phone)}
            className={`w-full py-2.5 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95 ${
              isTransfer
                ? 'bg-distrito-accent text-black hover:bg-yellow-300'
                : 'bg-green-500 text-black hover:bg-green-400'
            } disabled:opacity-50`}
          >
            {loading ? '⏳...' : isTransfer ? '✅ Confirmar Transferencia' : '✅ Aceptar Pedido'}
          </button>
        )}

        {tab === 'en_preparacion' && (
          <button
            disabled={loading}
            onClick={() => onStatus(sale.id, 'por_entregar', sale.customer_phone)}
            className="w-full py-2.5 rounded-xl font-black text-sm bg-blue-500 text-white hover:bg-blue-400 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? '⏳...' : '🛵 Despachar'}
          </button>
        )}

        {tab === 'por_entregar' && (
          <button
            disabled={loading}
            onClick={() => onStatus(sale.id, 'entregado', sale.customer_phone)}
            className="w-full py-2.5 rounded-xl font-black text-sm bg-green-500 text-black hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? '⏳...' : '🎉 Marcar Entregado'}
          </button>
        )}

        <button
          onClick={() => onPrint(sale)}
          className="w-full py-2 rounded-xl font-bold text-xs text-gray-500 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Printer size={13} /> Imprimir Ticket
        </button>
      </div>
    </div>
  )
}
