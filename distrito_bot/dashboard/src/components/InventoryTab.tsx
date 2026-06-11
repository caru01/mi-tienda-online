import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock?: number;
}

interface Purchase {
  id: string;
  inventory_item_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  supplier?: string;
  created_at: string;
  inventory_items?: {
    name: string;
    unit: string;
  };
}

interface PurchaseStats {
  total_invested_30d: number;
  most_bought_item: string;
  most_bought_item_total: number;
}

export default function InventoryTab() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  
  // States for the new purchase form
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // States for the new item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: '', current_stock: 0, minimum_stock: 0 });

  

  const fetchPurchases = async () => {
    try {
      const res = await fetch(`${API_URL}/purchases`);
      const data = await res.json();
      if (data.status === 'ok') setPurchases(data.purchases);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/purchases/stats`);
      const data = await res.json();
      if (data.status === 'ok') setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchStats();
    fetch(`${API_URL}/stats`).then(res => res.json()).then(data => {
      if(data.status === 'ok') setItems(data.inventory);
    });
  }, []);

  const handleSavePurchase = async () => {
    if (!selectedItemId || !quantity || !unitPrice) {
      alert("Por favor completa los campos requeridos");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        inventory_item_id: selectedItemId,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        total_price: Number(quantity) * Number(unitPrice),
        purchase_date: new Date(purchaseDate).toISOString(),
        supplier: supplier
      };
      
      const res = await fetch(`${API_URL}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        alert("Compra guardada y stock actualizado exitosamente.");
        // Reset form
        setSelectedItemId('');
        setQuantity('');
        setUnitPrice('');
        setSupplier('');
        // Refresh data
        fetchPurchases();
        fetchStats();
        // Refresh inventory
        fetch(`${API_URL}/stats`).then(res => res.json()).then(d => {
          if(d.status === 'ok') setItems(d.inventory);
        });
      } else {
        alert("Error al guardar: " + data.message);
      }
    } catch (e) {
      alert("Error de conexión");
    }
    setLoading(false);
  };

  const handleAddItem = async () => {
    try {
      const payload = {
        name: newItem.name,
        unit: newItem.unit,
        current_stock: Number(newItem.current_stock),
        minimum_stock: Number(newItem.minimum_stock)
      };
      const res = await fetch(`${API_URL}/inventory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAddItem(false);
        setNewItem({ name: '', unit: '', current_stock: 0, minimum_stock: 0 });
        fetch(`${API_URL}/stats`).then(res => res.json()).then(d => {
          if(d.status === 'ok') setItems(d.inventory);
        });
      } else {
        alert("Error: " + data.message);
      }
    } catch(e) {
      alert("Error de conexion");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white pb-20 md:pb-0">
      
      {/* ALERTAS DE INVENTARIO */}
      {(() => {
        const outOfStock = items.filter(i => i.current_stock <= 0);
        const lowStock = items.filter(i => i.current_stock > 0 && i.current_stock <= (i.minimum_stock || 0));
        
        if (outOfStock.length === 0 && lowStock.length === 0) return null;

        return (
          <div className="bg-red-900/30 border border-red-500/50 rounded-2xl p-6">
            <h3 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
              <span>⚠️</span> Alertas de Inventario
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outOfStock.length > 0 && (
                <div className="bg-black/40 rounded-xl p-4">
                  <h4 className="text-red-500 font-bold mb-2">Agotados:</h4>
                  <ul className="list-disc list-inside text-sm text-red-200">
                    {outOfStock.map(i => <li key={i.id}>{i.name} (0 {i.unit})</li>)}
                  </ul>
                </div>
              )}
              {lowStock.length > 0 && (
                <div className="bg-black/40 rounded-xl p-4">
                  <h4 className="text-orange-400 font-bold mb-2">Stock Bajo:</h4>
                  <ul className="list-disc list-inside text-sm text-orange-200">
                    {lowStock.map(i => <li key={i.id}>{i.name} ({i.current_stock} {i.unit} / Min: {i.minimum_stock})</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* C. PANEL DE METRICAS FINANCIERAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-6 rounded-2xl border border-distrito-accent/20">
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Invertido (Últimos 30 días)</h3>
          <p className="text-4xl font-black text-distrito-accent">
            {stats ? formatCurrency(stats.total_invested_30d) : '$0'}
          </p>
        </div>
        <div className="glass p-6 rounded-2xl border border-distrito-accent/20">
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Insumo con Más Gasto</h3>
          <p className="text-2xl font-bold text-white mb-1">
            {stats ? stats.most_bought_item : 'N/A'}
          </p>
          <p className="text-distrito-accent font-bold">
            {stats ? formatCurrency(stats.most_bought_item_total) : '$0'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* A. FORMULARIO DE NUEVA COMPRA */}
        <div className="lg:col-span-1 glass p-6 rounded-2xl border border-white/10 h-fit">
          <h3 className="text-xl font-bold mb-6 text-distrito-accent">📝 Registrar Nueva Compra</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Insumo Comprado</label>
              <select 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white appearance-none focus:border-distrito-accent focus:ring-1 focus:ring-distrito-accent transition-all"
                value={selectedItemId}
                onChange={e => setSelectedItemId(Number(e.target.value))}
              >
                <option value="">-- Seleccionar Insumo --</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.current_stock} {item.unit} en stock)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cantidad</label>
                <input 
                  type="number" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-distrito-accent focus:ring-1 focus:ring-distrito-accent transition-all"
                  placeholder="Ej: 50"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Precio Unit. ($)</label>
                <input 
                  type="number" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-distrito-accent focus:ring-1 focus:ring-distrito-accent transition-all"
                  placeholder="Ej: 3500"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Valor Total (Calculado)</label>
              <div className="w-full bg-distrito-dark border border-distrito-accent/30 rounded-xl p-3 text-distrito-accent font-black text-xl text-center">
                {quantity && unitPrice ? formatCurrency(Number(quantity) * Number(unitPrice)) : '$0'}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Fecha de Compra</label>
              <input 
                type="date" 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-distrito-accent focus:ring-1 focus:ring-distrito-accent transition-all"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Proveedor (Opcional)</label>
              <input 
                type="text" 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-distrito-accent focus:ring-1 focus:ring-distrito-accent transition-all"
                placeholder="Ej: Distribuidora XYZ"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
              />
            </div>

            <button 
              onClick={handleSavePurchase}
              disabled={loading}
              className="w-full bg-distrito-accent text-distrito-dark font-black text-lg py-4 rounded-xl mt-4 hover:bg-distrito-accent/90 transition-all shadow-[0_0_15px_rgba(255,204,0,0.3)] disabled:opacity-50"
            >
              {loading ? 'Guardando...' : '💾 Guardar Compra'}
            </button>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => setShowAddItem(!showAddItem)}
                className="text-sm text-distrito-accent hover:underline"
              >
                ¿Falta un insumo? Crear nuevo Insumo
              </button>
            </div>
            
            {showAddItem && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                <input placeholder="Nombre (Ej: Pan)" className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <input placeholder="Unidad (Ej: und)" className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"
                  value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">Stock Inicial</label>
                    <input type="number" placeholder="Ej: 0" className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"
                      value={newItem.current_stock} onChange={e => setNewItem({...newItem, current_stock: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Stock Mínimo</label>
                    <input type="number" placeholder="Ej: 5" className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"
                      value={newItem.minimum_stock} onChange={e => setNewItem({...newItem, minimum_stock: Number(e.target.value)})} />
                  </div>
                </div>
                <button onClick={handleAddItem} className="w-full bg-white/20 hover:bg-white/30 py-2 rounded font-bold text-sm transition-all">Crear Insumo Base</button>
              </div>
            )}

          </div>
        </div>

        {/* B. HISTORIAL DE COMPRAS */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>📜</span> Bitácora de Compras
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="pb-3 px-4 font-medium">Fecha</th>
                  <th className="pb-3 px-4 font-medium">Insumo</th>
                  <th className="pb-3 px-4 font-medium">Proveedor</th>
                  <th className="pb-3 px-4 font-medium text-right">Cant.</th>
                  <th className="pb-3 px-4 font-medium text-right">P. Unitario</th>
                  <th className="pb-3 px-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No hay compras registradas aún.
                    </td>
                  </tr>
                ) : (
                  purchases.map(p => {
                    const dateObj = new Date(p.purchase_date);
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {dateObj.toLocaleDateString('es-CO')}
                        </td>
                        <td className="py-4 px-4 font-medium">
                          {p.inventory_items?.name || 'Insumo Eliminado'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {p.supplier || '-'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="bg-white/10 px-2 py-1 rounded text-sm font-mono">
                            {p.quantity} {p.inventory_items?.unit}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-gray-400">
                          {formatCurrency(p.unit_price)}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-distrito-accent">
                          {formatCurrency(p.total_price)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
