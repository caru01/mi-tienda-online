import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, Search } from 'lucide-react';

export default function OrderHistoryTab({ data }: { data: any }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Filter only completed or cancelled orders
  const pastOrders = data.active_sales.filter(
    (s: any) => s.status === 'entregado' || s.status === 'cancelado'
  ).filter((s: any) => 
    (s.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.customer_phone || '').includes(searchTerm)
  ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <History className="w-8 h-8 text-distrito-accent" />
          <h2 className="text-3xl font-bold">Historial de Órdenes</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o teléfono..." 
            className="bg-black/30 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-distrito-accent transition-colors w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="py-4 px-6 font-bold text-gray-400">Orden / Fecha</th>
              <th className="py-4 px-6 font-bold text-gray-400">Cliente</th>
              <th className="py-4 px-6 font-bold text-gray-400">Detalle</th>
              <th className="py-4 px-6 font-bold text-gray-400">Total</th>
              <th className="py-4 px-6 font-bold text-gray-400">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pastOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No hay historial de órdenes que coincidan con la búsqueda.
                </td>
              </tr>
            ) : pastOrders.map((sale: any) => (
              <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                <td className="py-4 px-6">
                  <p className="font-bold text-distrito-accent">#{sale.daily_order_number || '---'}</p>
                  <p className="text-sm text-gray-400">{format(new Date(sale.created_at), "dd MMM, h:mm a", { locale: es })}</p>
                </td>
                <td className="py-4 px-6">
                  <p className="font-medium text-white">{sale.customer_name || 'Sin nombre'}</p>
                  <p className="text-xs text-gray-400">{sale.customer_phone}</p>
                </td>
                <td className="py-4 px-6">
                  <p className="text-xs font-mono text-gray-300 max-w-[200px] truncate" title={sale.order_detail}>
                    {sale.order_detail.split('\n')[0]}...
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{sale.delivery_type}</p>
                </td>
                <td className="py-4 px-6 font-bold text-white">
                  ${Number(sale.total_amount).toLocaleString()}
                  <p className="text-xs text-gray-500 capitalize font-normal">{sale.payment_method}</p>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    sale.status === 'entregado' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {sale.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
