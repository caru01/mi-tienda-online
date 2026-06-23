import React, { useState, useMemo } from 'react';
import { Plus, Minus, Trash2, ShoppingBag, ShoppingCart } from 'lucide-react';
import { products, categories } from './data/products';

function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

  // Filtering products
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      });
    });
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  // Checkout handling (WhatsApp Integration)
  const handleCheckout = () => {
    if (!customer.name || !customer.phone) {
      alert("Por favor ingresa nombre y teléfono.");
      return;
    }
    
    // Configura aquí tu número de WhatsApp
    const phoneNumber = "573000000000"; // Reemplazar por el número real del comercio

    let message = `*NUEVO PEDIDO* 🛍️\n\n`;
    message += `*Cliente:* ${customer.name}\n`;
    message += `*Teléfono:* ${customer.phone}\n`;
    if (customer.address) message += `*Dirección:* ${customer.address}\n`;
    message += `\n*Detalle del pedido:*\n`;
    
    cart.forEach(item => {
      message += `- ${item.qty}x ${item.title} (${formatter.format(item.price * item.qty)})\n`;
    });
    
    message += `\n*Total a pagar: ${formatter.format(subtotal)}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

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
                <img src={product.image} alt={product.title} className="product-image" />
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
                <img src={item.image} alt={item.title} className="cart-item-img" />
                <div className="cart-item-details">
                  <h4 className="cart-item-title">{item.title}</h4>
                  <p className="cart-item-price">{formatter.format(item.price)}</p>
                  <div className="cart-item-actions">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>
                      <Minus size={14} />
                    </button>
                    <span className="qty">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>
                      <Plus size={14} />
                    </button>
                    <button className="qty-btn" onClick={() => removeItem(item.id)} style={{marginLeft: 'auto', color: '#ff4757'}}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          {/* Customer Data Form */}
          <div className="customer-form">
            <div className="form-group">
              <label>Nombre y Apellido</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Juan Pérez"
                value={customer.name}
                onChange={e => setCustomer({...customer, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Teléfono (WhatsApp)</label>
              <input 
                type="tel" 
                className="form-input" 
                placeholder="Ej. 3001234567"
                value={customer.phone}
                onChange={e => setCustomer({...customer, phone: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Dirección de Envío (Opcional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Calle 123 #45-67"
                value={customer.address}
                onChange={e => setCustomer({...customer, address: e.target.value})}
              />
            </div>
          </div>

          <div className="summary-row summary-total">
            <span>Total:</span>
            <span>{formatter.format(subtotal)}</span>
          </div>

          <button 
            className="checkout-btn" 
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            <ShoppingBag size={20} />
            Confirmar por WhatsApp
          </button>
        </div>
      </aside>
    </div>
  );
}

export default App;
