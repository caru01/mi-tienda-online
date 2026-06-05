import { useState, useEffect } from 'react'
import { Users, Megaphone, Send, Clock, Star, Save, MessageSquareText, Search, UploadCloud, MessageCircle } from 'lucide-react'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

export default function CrmTab() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [messagesSentToday, setMessagesSentToday] = useState(0)
  const DAILY_LIMIT = 1000 // Límite YCloud / Meta Tier 1 usual
  
  // Modal notas
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [intervalSecs, setIntervalSecs] = useState(2.0)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/crm/customers`)
      const data = await res.json()
      if (data.status === 'ok') {
        setCustomers(data.customers || [])
        setMessagesSentToday(data.messages_sent_today || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [])

  // Filtrado
  const filteredCustomers = customers.filter(c => {
    // Filtro por botones
    let matchesFilter = true
    if (filter === 'vip') matchesFilter = c.total_orders >= 5
    if (filter === 'new') matchesFilter = c.total_orders === 1
    if (filter === 'dormant') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      matchesFilter = new Date(c.last_order_at) < thirtyDaysAgo
    }
    
    // Filtro por búsqueda de texto
    let matchesSearch = true
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const name = (c.customer_name || '').toLowerCase()
      const phone = (c.customer_phone || '').toLowerCase()
      const barrio = (c.delivery_barrio || '').toLowerCase()
      matchesSearch = name.includes(term) || phone.includes(term) || barrio.includes(term)
    }

    return matchesFilter && matchesSearch
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch(`${API_URL}/crm/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.status === 'success') {
        setImageUrl(data.url)
      } else {
        alert('Error subiendo imagen: ' + data.message)
      }
    } catch (error) {
      alert('Error de red al subir la imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return
    setSavingNotes(true)
    await fetch(`${API_URL}/crm/customers/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_phone: selectedCustomer.customer_phone, notes })
    })
    setSavingNotes(false)
    setSelectedCustomer(null)
    fetchCustomers()
  }

  const handleSendBroadcast = async () => {
    if (!messageBody || !campaignName) return
    if (!confirm(`¿Seguro que deseas enviar este mensaje a ${filteredCustomers.length} clientes en el segmento "${filter}"?`)) return
    
    setSendingBroadcast(true)
    const payload = { 
      campaign_name: campaignName, 
      message_body: messageBody, 
      target_segment: filter,
      image_url: imageUrl,
      interval: intervalSecs
    }
    const res = await fetch(`${API_URL}/crm/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    setSendingBroadcast(false)
    
    if (data.status === 'success') {
      alert(`¡Campaña enviada a ${data.sent_count} clientes exitosamente!`)
      setShowBroadcast(false)
      setCampaignName('')
      setMessageBody('')
      setImageUrl('')
      fetchCustomers() // Para actualizar el contador de mensajes
    } else {
      alert(`Error al enviar: ${data.message}`)
    }
  }

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Cargando base de datos de clientes...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-distrito-accent" /> WhatsApp CRM
          </h2>
          <p className="text-sm text-gray-400 mt-1">{customers.length} clientes registrados en total.</p>
        </div>
        <button
          onClick={() => setShowBroadcast(!showBroadcast)}
          className="flex items-center gap-2 bg-green-500 text-white font-black px-5 py-2.5 rounded-xl hover:bg-green-400 transition-all shadow-lg"
        >
          <Megaphone size={18} /> Nueva Campaña
        </button>
      </div>

      {showBroadcast && (
        <div className="glass rounded-2xl border border-green-500/30 p-6 animate-in slide-in-from-top-4">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Send className="text-green-400" size={18} /> Enviar Mensaje Masivo (Broadcast)
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre de la Campaña (Interno)</label>
              <input 
                value={campaignName} onChange={e => setCampaignName(e.target.value)}
                placeholder="Ej: Promo de Fin de Semana" 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" 
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Segmento Destino</label>
              <select 
                value={filter} onChange={e => setFilter(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white appearance-none"
              >
                <option value="all">Todos los clientes ({customers.length})</option>
                <option value="vip">Clientes VIP ({customers.filter(c => c.total_orders >= 5).length})</option>
                <option value="new">Clientes Nuevos ({customers.filter(c => c.total_orders === 1).length})</option>
                <option value="dormant">Inactivos +30 días ({customers.filter(c => new Date(c.last_order_at) < new Date(Date.now() - 30*24*60*60*1000)).length})</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Imagen de la Campaña (Opcional)</label>
              {imageUrl ? (
                <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 p-2">
                  <img src={imageUrl} alt="Campaña" className="w-full h-24 object-cover rounded-lg" />
                  <button 
                    onClick={() => setImageUrl('')}
                    className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="w-full bg-black/40 border border-white/10 border-dashed rounded-xl p-3 text-center transition-all hover:bg-white/5 relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  />
                  <div className="flex flex-col items-center justify-center text-gray-400 py-2">
                    <UploadCloud size={24} className="mb-1" />
                    <span className="text-sm font-bold">{uploadingImage ? 'Subiendo...' : 'Seleccionar Imagen'}</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Intervalo de Envío (Segundos)</label>
              <input 
                type="number" step="0.5" min="1"
                value={intervalSecs} onChange={e => setIntervalSecs(parseFloat(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" 
              />
              <p className="text-[10px] text-gray-500 mt-1">Tiempo de espera entre cada mensaje para evitar baneos por Spam (Recomendado: 2s)</p>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Cuerpo del Mensaje (Soporta *negrita*, _cursiva_ y emojis)</label>
            <textarea 
              value={messageBody} onChange={e => setMessageBody(e.target.value)}
              placeholder="¡Hola! Te extrañamos por acá. Hoy tenemos un 20% de descuento en el Combo Parche..." 
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white resize-none"
            />
          </div>
          <div className="mb-4 bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Mensajes Enviados Hoy (Estimado)</span>
              <span className="text-white font-bold">{messagesSentToday} / {DAILY_LIMIT}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full ${messagesSentToday > DAILY_LIMIT * 0.8 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${Math.min((messagesSentToday / DAILY_LIMIT) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-yellow-400 mt-2">
              ⚠️ Las cuentas nuevas de WhatsApp API (Tier 1) pueden enviar hasta 1,000 mensajes diarios a clientes. Mantén el intervalo alto para evitar bloqueos por SPAM.
            </p>
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={handleSendBroadcast}
              disabled={sendingBroadcast || !messageBody || !campaignName}
              className="bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-400 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {sendingBroadcast ? 'Enviando...' : `Enviar a ${filteredCustomers.length} clientes`}
            </button>
          </div>
        </div>
      )}

      {/* Buscador y Filtros Rápidos */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Barra de Búsqueda */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-500" size={18} />
          </div>
          <input
            type="text"
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-distrito-accent transition-colors"
            placeholder="Buscar cliente por nombre, teléfono o barrio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtros Rapidos */}
        <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 items-center">
          {[
            { id: 'all', icon: <Users size={16}/>, label: 'Todos', count: customers.length },
            { id: 'vip', icon: <Star size={16}/>, label: 'VIPs', count: customers.filter(c => c.total_orders >= 5).length },
            { id: 'new', icon: <Star size={16}/>, label: 'Nuevos', count: customers.filter(c => c.total_orders === 1).length },
            { id: 'dormant', icon: <Clock size={16}/>, label: 'Inactivos', count: customers.filter(c => new Date(c.last_order_at) < new Date(Date.now() - 30*24*60*60*1000)).length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold whitespace-nowrap transition-all ${
                filter === f.id ? 'bg-distrito-accent text-black border-distrito-accent' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {f.icon} {f.label} <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-black">Cliente</th>
                <th className="px-6 py-4 font-black">Teléfono</th>
                <th className="px-6 py-4 font-black text-center">Pedidos</th>
                <th className="px-6 py-4 font-black">Última Compra</th>
                <th className="px-6 py-4 font-black text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      {c.customer_name || 'Sin nombre'}
                    </div>
                    {/* Etiquetas Visuales */}
                    <div className="flex gap-1 mt-1">
                      {c.total_orders >= 5 && <span className="bg-distrito-accent text-black text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10}/> VIP</span>}
                      {c.total_orders === 1 && <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">NUEVO</span>}
                      {new Date(c.last_order_at) < new Date(Date.now() - 30*24*60*60*1000) && <span className="bg-gray-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">INACTIVO</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{c.delivery_barrio || 'Sin dirección'}</div>
                  </td>
                  <td className="px-6 py-4 text-white font-mono">{c.customer_phone}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-distrito-accent/10 text-distrito-accent font-black px-2.5 py-1 rounded-lg">
                      {c.total_orders}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap">
                    {new Date(c.last_order_at).toLocaleDateString()} a las {new Date(c.last_order_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <button 
                        onClick={() => { setSelectedCustomer(c); setNotes(c.notes || ''); }}
                        className={`p-2 rounded-xl transition-all ${c.notes ? 'text-distrito-accent bg-distrito-accent/10' : 'text-gray-500 hover:bg-white/10'}`}
                        title="Ver/Editar Notas"
                      >
                        <MessageSquareText size={18} />
                      </button>
                      <a 
                        href={`https://wa.me/${c.customer_phone.replace('+', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all"
                        title="Chatear en WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron clientes en este segmento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Notas */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <h3 className="text-xl font-black mb-1 text-white flex items-center gap-2">
              <MessageSquareText className="text-distrito-accent"/> Notas del Cliente
            </h3>
            <p className="text-sm text-gray-400 mb-5">{selectedCustomer.customer_name || selectedCustomer.customer_phone}</p>
            
            <textarea 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white resize-none mb-4"
              rows={4}
              placeholder="Anota preferencias, alergias o información importante de este cliente..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex-1 py-3 rounded-xl font-black bg-distrito-accent text-black hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {savingNotes ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
