import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingBag, ShoppingCart, Copy, Check } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/distrito/api/pedidos' : 'http://localhost:8000/api/pedidos';

function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  
  // Data from Backend
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({ whatsapp_number: '', nequi_number: '', bancolombia_number: '' });
  const [loading, setLoading] = useState(true);

  // Form State
  const [customer, setCustomer] = useState({ 
    name: '', 
    phone: '', 
    address: '',
    barrio: '',
    comment: '',
    deliveryType: 'domicilio', // 'domicilio' | 'recoger'
    paymentMethod: 'efectivo', // 'efectivo' | 'transferencia'
    cashAmount: ''
  });

  const [copiedNequi, setCopiedNequi] = useState(false);
  const [copiedBanco, setCopiedBanco] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/init`)
      .then(res => res.json())
      .then(data => {
        if(data.status === 'ok') {
          setProducts(data.products || []);
          setSettings(data.settings || {});
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return [{ id: 'all', name: 'Todos' }, ...Array.from(cats).map(c => ({ id: c, name: c }))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter(p => p.category === activeCategory);
  }, [activeCategory, products]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'nequi') { setCopiedNequi(true); setTimeout(() => setCopiedNequi(false), 2000); }
    if (type === 'banco') { setCopiedBanco(true); setTimeout(() => setCopiedBanco(false), 2000); }
  };

  const handleCheckout = () => {
    if (!customer.name || !customer.phone) {
      alert("Por favor ingresa nombre y teléfono.");
      return;
    }
    if (customer.deliveryType === 'domicilio' && (!customer.address || !customer.barrio)) {
      alert("Por favor ingresa la dirección y el barrio para el domicilio.");
      return;
    }
    if (customer.paymentMethod === 'efectivo' && !customer.cashAmount) {
      alert("Por favor ingresa con cuánto vas a pagar.");
      return;
    }
    
    const phoneNumber = settings.whatsapp_number || "573000000000";

    let message = `*NUEVO PEDIDO* 🛍️\n\n`;
    message += `*Cliente:* ${customer.name}\n`;
    message += `*Teléfono:* ${customer.phone}\n`;
    message += `*Entrega:* ${customer.deliveryType === 'domicilio' ? '🛵 A Domicilio' : '🏪 Recoger en Local'}\n`;
    
    if (customer.deliveryType === 'domicilio') {
      message += `*Dirección:* ${customer.address}\n`;
      message += `*Barrio:* ${customer.barrio}\n`;
    }
    
    message += `*Medio de Pago:* ${customer.paymentMethod === 'efectivo' ? '💵 Efectivo' : '💳 Transferencia'}\n`;
    if (customer.paymentMethod === 'efectivo') {
      message += `*Paga con:* ${formatter.format(customer.cashAmount)}\n`;
      const change = customer.cashAmount - subtotal;
      message += `*Cambio sugerido:* ${change > 0 ? formatter.format(change) : '$0'}\n`;
    }

    if (customer.comment) {
      message += `*Comentarios:* ${customer.comment}\n`;
    }

    message += `\n*Detalle del pedido:*\n`;
    cart.forEach(item => {
      message += `- ${item.qty}x ${item.title} (${formatter.format(item.price * item.qty)})\n`;
    });
    message += `\n*Total a pagar: ${formatter.format(subtotal)}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <div className="loading-screen">Cargando menú...</div>;

  return (
    <div className="app-container">
      {/* Main Area */}
      <main className="main-content">
        <header className="header">
          <h1>Toma tu Pedido</h1>
          <p>Selecciona los productos deliciosos que deseas hoy.</p>
        </header>

        {/* Categories */}
        <div className="categories">
          {categories.map(cat => (
            <button 
              key={cat.id} 
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="product-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                {product.image ? (
                  <img src={product.image} alt={product.title} className="product-image" />
                ) : (
                  <div className="product-placeholder">Sin Imagen</div>
                )}
              </div>
              <div className="product-info">
                <h3 className="product-title">{product.title}</h3>
                <p className="product-desc">{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">{formatter.format(product.price)}</span>
                  <button className="add-btn" onClick={() => addToCart(product)}>
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="no-products">No hay productos en esta categoría.</div>
          )}
        </div>
      </main>

      {/* Sidebar / Cart */}
      <aside className="cart-sidebar">
        <div className="cart-header">
          <h2>Mi Pedido</h2>
          <span className="cart-count">
            {cart.reduce((sum, item) => sum + item.qty, 0)} items
          </span>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart size={48} opacity={0.3} />
              <p>Tu carrito está vacío. ¡Agrega algunos productos!</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-details">
                  <h4 className="cart-item-title">{item.title}</h4>
                  <p className="cart-item-price">{formatter.format(item.price)}</p>
                  <div className="cart-item-actions">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button>
                    <span className="qty">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button>
                    <button className="qty-btn" onClick={() => removeItem(item.id)} style={{marginLeft: 'auto', color: '#ff4757'}}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="customer-form">
            <h3 style={{margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>Datos del Cliente</h3>
            <div className="form-group">
              <input type="text" className="form-input" placeholder="Nombre y Apellido" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
            </div>
            <div className="form-group">
              <input type="tel" className="form-input" placeholder="Teléfono (WhatsApp)" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
            </div>

            <h3 style={{margin: '15px 0 10px 0', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>Forma de Entrega</h3>
            <div className="radio-group" style={{display: 'flex', gap: '15px', marginBottom: '10px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px'}}>
                <input type="radio" name="deliveryType" checked={customer.deliveryType === 'domicilio'} onChange={() => setCustomer({...customer, deliveryType: 'domicilio'})} />
                A Domicilio
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px'}}>
                <input type="radio" name="deliveryType" checked={customer.deliveryType === 'recoger'} onChange={() => setCustomer({...customer, deliveryType: 'recoger'})} />
                Recoger Local
              </label>
            </div>

            {customer.deliveryType === 'domicilio' && (
              <>
                <div className="form-group">
                  <input type="text" className="form-input" placeholder="Dirección completa" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
                </div>
                <div className="form-group">
                  <input type="text" className="form-input" placeholder="Barrio" value={customer.barrio} onChange={e => setCustomer({...customer, barrio: e.target.value})} />
                </div>
              </>
            )}

            <div className="form-group">
              <input type="text" className="form-input" placeholder="Comentario (opcional)" value={customer.comment} onChange={e => setCustomer({...customer, comment: e.target.value})} />
            </div>

            <h3 style={{margin: '15px 0 10px 0', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>Forma de Pago</h3>
            <div className="radio-group" style={{display: 'flex', gap: '15px', marginBottom: '10px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px'}}>
                <input type="radio" name="payment" checked={customer.paymentMethod === 'efectivo'} onChange={() => setCustomer({...customer, paymentMethod: 'efectivo'})} />
                Efectivo
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px'}}>
                <input type="radio" name="payment" checked={customer.paymentMethod === 'transferencia'} onChange={() => setCustomer({...customer, paymentMethod: 'transferencia'})} />
                Transferencia
              </label>
            </div>

            {customer.paymentMethod === 'efectivo' && (
              <div className="form-group animate-in fade-in">
                <input type="number" className="form-input" placeholder="¿Con cuánto vas a pagar?" value={customer.cashAmount} onChange={e => setCustomer({...customer, cashAmount: e.target.value})} />
              </div>
            )}

            {customer.paymentMethod === 'transferencia' && (
              <div className="transfer-info animate-in fade-in" style={{background: '#f9f9f9', padding: '10px', borderRadius: '8px', marginBottom: '10px'}}>
                <p style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>Haz clic para copiar el número de cuenta:</p>
                
                <button 
                  onClick={() => copyToClipboard(settings.nequi_number, 'nequi')}
                  style={{display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', marginBottom: '5px', cursor: 'pointer', alignItems: 'center'}}
                >
                  <span style={{fontSize: '13px', fontWeight: 'bold'}}>Nequi: {settings.nequi_number || 'No configurado'}</span>
                  {copiedNequi ? <Check size={16} color="green" /> : <Copy size={16} color="#999" />}
                </button>
                
                <button 
                  onClick={() => copyToClipboard(settings.bancolombia_number, 'banco')}
                  style={{display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: 'pointer', alignItems: 'center'}}
                >
                  <span style={{fontSize: '13px', fontWeight: 'bold'}}>Bancolombia/bre-b: {settings.bancolombia_number || 'No config'}</span>
                  {copiedBanco ? <Check size={16} color="green" /> : <Copy size={16} color="#999" />}
                </button>
              </div>
            )}
          </div>

          <div className="summary-row summary-total">
            <span>Total:</span>
            <span>{formatter.format(subtotal)}</span>
          </div>

          <button className="checkout-btn" disabled={cart.length === 0} onClick={handleCheckout}>
            <ShoppingBag size={20} />
            Confirmar por WhatsApp
          </button>
        </div>
      </aside>
    </div>
  );
}

export default App;
