import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  ChefHat, 
  Truck, 
  Activity, 
  FileText, 
  Plus, 
  MapPin, 
  Coffee, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Navigation
} from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';
const GQL_BASE = 'http://localhost:3000/graphql';

function App() {
  // Application State
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRest, setSelectedRest] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({}); // { itemId: quantity }
  const [deliveryAddress, setDeliveryAddress] = useState('123 Avenue Bourguiba, Tunis');
  
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('logs'); // logs | drivers | newdriver
  
  // New Driver Form
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('Motorcycle');

  // Loading/Error states
  const [loading, setLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchRestaurants();
    fetchDrivers();
    
    // Poll logs, orders, and drivers every 2 seconds
    const interval = setInterval(() => {
      fetchLogs();
      fetchOrders();
      fetchDrivers();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Fetch menu when restaurant changes
  useEffect(() => {
    if (selectedRest) {
      fetchMenu(selectedRest.id);
      setCart({});
    }
  }, [selectedRest]);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch(`${API_BASE}/restaurants`);
      const data = await res.json();
      setRestaurants(data.restaurants || []);
      if (data.restaurants && data.restaurants.length > 0 && !selectedRest) {
        setSelectedRest(data.restaurants[0]);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      setApiError('Could not connect to API Gateway');
    }
  };

  const fetchMenu = async (restId) => {
    try {
      const res = await fetch(`${API_BASE}/restaurants/${restId}/menu`);
      const data = await res.json();
      setMenu(data.items || []);
    } catch (err) {
      console.error('Error fetching menu:', err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_BASE}/drivers`);
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      const data = await res.json();
      setLogs(data || []);
      setApiError(null); // Clear errors if connected
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      // Query GraphQL for user orders (we use a mock userId "user_1" for the customer)
      const query = `
        query GetUserOrders($userId: String!) {
          userOrders(userId: $userId) {
            id
            restaurant_id
            total_price
            status
            delivery_address
            driver_id
            created_at
            items {
              item_id
              name
              quantity
              price
            }
            delivery {
              id
              driver_name
              status
              eta
            }
          }
        }
      `;

      const res = await fetch(GQL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { userId: 'user_1' }
        })
      });
      const result = await res.json();
      setOrders(result.data?.userOrders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Cart Operations
  const updateCartQty = (itemId, delta) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, qty]) => {
      const item = menu.find(i => i.id === itemId);
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  // Submit Order via GraphQL Mutation
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0 || !selectedRest) return;

    setOrderSubmitting(true);
    try {
      const itemsList = Object.entries(cart).map(([itemId, qty]) => {
        const menuItem = menu.find(i => i.id === itemId);
        return {
          item_id: itemId,
          name: menuItem.name,
          quantity: qty,
          price: menuItem.price
        };
      });

      const mutation = `
        mutation CreateOrder($userId: String!, $restaurantId: String!, $items: [OrderItemInput!]!, $deliveryAddress: String!) {
          createOrder(
            user_id: $userId
            restaurant_id: $restaurantId
            items: $items
            delivery_address: $deliveryAddress
          ) {
            id
            status
            total_price
            created_at
          }
        }
      `;

      const response = await fetch(GQL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mutation,
          variables: {
            userId: 'user_1',
            restaurantId: selectedRest.id,
            items: itemsList,
            deliveryAddress: deliveryAddress
          }
        })
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      console.log('Order created successfully:', result.data.createOrder);
      setCart({});
      fetchOrders();
      fetchLogs();
    } catch (err) {
      console.error('Failed to place order:', err);
      alert(`Order placement failed: ${err.message}`);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Register Driver via GraphQL Mutation
  const handleRegisterDriver = async (e) => {
    e.preventDefault();
    if (!newDriverName.trim()) return;

    try {
      const mutation = `
        mutation RegisterDriver($name: String!, $vehicle: String!) {
          registerDriver(name: $name, vehicle: $vehicle) {
            id
            name
            vehicle
            status
          }
        }
      `;

      const response = await fetch(GQL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mutation,
          variables: {
            name: newDriverName,
            vehicle: newDriverVehicle
          }
        })
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setNewDriverName('');
      fetchDrivers();
      setActiveTab('drivers');
    } catch (err) {
      console.error('Failed to register driver:', err);
      alert(`Driver registration failed: ${err.message}`);
    }
  };

  // Simulate Driver Coordinate Movement (GraphQL Mutation)
  const simulateMove = async (driverId, latDelta, lngDelta) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const newLat = driver.lat + latDelta;
    const newLng = driver.lng + lngDelta;

    try {
      const mutation = `
        mutation UpdateDriverLocation($driverId: ID!, $lat: Float!, $lng: Float!) {
          updateDriverLocation(driverId: $driverId, lat: $lat, lng: $lng)
        }
      `;

      await fetch(GQL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mutation,
          variables: {
            driverId,
            lat: newLat,
            lng: newLng
          }
        })
      });

      fetchDrivers();
    } catch (err) {
      console.error('Failed to update driver coordinates:', err);
    }
  };

  // Helpers
  const getStatusBadgeClass = (status) => {
    return status || 'PENDING';
  };

  const getOrderStatusIcon = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 className="pulse-dot text-emerald" size={16} />;
      case 'CANCELLED_RESTAURANT_REJECTED':
      case 'CANCELLED_NO_DRIVERS':
      case 'CANCELLED':
        return <XCircle className="text-rose" size={16} />;
      case 'PENDING':
        return <Clock className="text-amber" size={16} />;
      default:
        return <Activity className="text-cyan" size={16} />;
    }
  };

  // Mock Map percentage coordinate converters
  const getMapCoords = (lat, lng) => {
    // Tunis center lat/lng: 36.8065, 10.1815
    // Map bounding boxes: lat (36.78 to 36.86), lng (10.15 to 10.25)
    const minLat = 36.78;
    const maxLat = 36.86;
    const minLng = 10.15;
    const maxLng = 10.25;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100; // invert y for top-left origin
    
    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(5, Math.min(95, y))}%`
    };
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header glass">
        <div className="header-title-container">
          <ChefHat size={32} className="text-cyan glow-cyan" />
          <h1 className="header-logo">
            <span>DelivSaga</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>Smart Food Delivery</span>
          </h1>
        </div>
        
        <div className="header-status-panel">
          {apiError ? (
            <div className="status-indicator">
              <span className="pulse-dot pulse-red"></span>
              <span>API Gateway Offline</span>
            </div>
          ) : (
            <>
              <div className="status-indicator">
                <span className="pulse-dot pulse-green"></span>
                <span>Gateway Connected</span>
              </div>
              <div className="status-indicator">
                <span className="pulse-dot pulse-green"></span>
                <span>Kafka Broker Up</span>
              </div>
            </>
          )}
        </div>
      </header>

      {apiError && (
        <div className="glass" style={{ padding: '16px', borderColor: 'var(--accent-rose)', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(244, 63, 94, 0.05)' }}>
          <AlertCircle className="text-rose" />
          <div>
            <h4 style={{ fontWeight: 'bold' }}>System Connection Error</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Please ensure the API Gateway and Kafka are running. Run `npm run dev` at the workspace root to launch all microservices.</p>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        
        {/* PANEL 1: Catalog & Checkout */}
        <section className="glass panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <ShoppingBag size={20} className="text-cyan" />
              <span>Catalog & Menu</span>
            </h2>
          </div>
          
          <div className="panel-content">
            {/* Restaurant Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Select Restaurant</label>
              {restaurants.map(rest => (
                <div 
                  key={rest.id} 
                  className={`restaurant-card glass glass-interactive ${selectedRest?.id === rest.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRest(rest)}
                >
                  <div className="restaurant-name">{rest.name}</div>
                  <div className="restaurant-meta">
                    <span>{rest.cuisine}</span>
                    <span>{rest.address}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Menu List */}
            {selectedRest && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Menu - {selectedRest.name}</label>
                <div className="menu-section">
                  {menu.map(item => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id} className="menu-item-row">
                        <div className="menu-item-info">
                          <span className="menu-item-name">{item.name}</span>
                          <span className="menu-item-price">{item.price.toFixed(2)} DT</span>
                        </div>
                        <div className="quantity-controls">
                          {qty > 0 && (
                            <>
                              <button className="qty-btn" onClick={() => updateCartQty(item.id, -1)}>-</button>
                              <span style={{ fontSize: '14px', fontWeight: '600', width: '20px', textAlign: 'center' }}>{qty}</span>
                            </>
                          )}
                          <button className="qty-btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Checkout Form */}
            {Object.keys(cart).length > 0 && (
              <form onSubmit={handlePlaceOrder} className="order-form">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '15px', marginBottom: '8px' }}>
                  <span>Total Price:</span>
                  <span className="text-cyan glow-cyan">{getCartTotal().toFixed(2)} DT</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Delivery Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={orderSubmitting}>
                  {orderSubmitting ? 'Processing Saga Transaction...' : 'Place Order'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* PANEL 2: Active Saga Orders */}
        <section className="glass panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <FileText size={20} className="text-purple" />
              <span>Active Orders (Saga States)</span>
            </h2>
            <button 
              onClick={fetchOrders} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          
          <div className="panel-content">
            <div className="orders-list">
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No active orders found. Add items to your cart and place an order to see the Saga orchestrator update state in real-time.
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className={`order-tracker-card glass STATUS_${getStatusBadgeClass(order.status)}`}>
                    <div className="order-tracker-header">
                      <span className="order-tracker-id">{order.id}</span>
                      <span className={`order-badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="order-tracker-details">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Restaurant ID:</span>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{order.restaurant_id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Price:</span>
                        <span style={{ fontWeight: '600', color: 'var(--accent-cyan)' }}>{order.total_price.toFixed(2)} DT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Address:</span>
                        <span style={{ wordBreak: 'break-all', textAlign: 'right' }}>{order.delivery_address}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Status Flow:</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                          {getOrderStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </div>

                      {/* Items Collapse */}
                      <div className="order-tracker-items">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="order-tracker-item">
                            <span>{item.name} x {item.quantity}</span>
                            <span>{(item.price * item.quantity).toFixed(2)} DT</span>
                          </div>
                        ))}
                      </div>

                      {/* Driver details if assigned */}
                      {order.delivery && (
                        <div className="order-tracker-driver">
                          <Truck size={14} className="text-cyan" />
                          <div style={{ fontSize: '12px' }}>
                            <strong>Driver:</strong> {order.delivery.driver_name} | <strong>Status:</strong> {order.delivery.status} | <strong>ETA:</strong> {order.delivery.eta}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* PANEL 3: Telemetry, Logs & Map */}
        <section className="glass panel">
          <div className="telemetry-tabs">
            <button 
              className={`telemetry-tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <Activity size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Kafka Events
            </button>
            <button 
              className={`telemetry-tab ${activeTab === 'drivers' ? 'active' : ''}`}
              onClick={() => setActiveTab('drivers')}
            >
              <Truck size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Driver Simulation
            </button>
            <button 
              className={`telemetry-tab ${activeTab === 'newdriver' ? 'active' : ''}`}
              onClick={() => setActiveTab('newdriver')}
            >
              <Plus size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Add Driver
            </button>
          </div>

          <div className="panel-content">
            
            {/* TAB 1: Live Kafka Logs */}
            {activeTab === 'logs' && (
              <div style={{ display: 'flex', flexType: 'column', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Real-Time Event stream</label>
                <div className="log-timeline">
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Listening to Kafka broker for topics order-events, restaurant-events, delivery-events...
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="log-item">
                        <div className="log-header">
                          <span className={`log-topic-badge ${log.topic}`}>{log.topic}</span>
                          <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }}>
                          Event: {log.type}
                        </div>
                        <div className="log-body">
                          <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Driver Simulation Map & Coords */}
            {activeTab === 'drivers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Visual Grid Map */}
                <div className="map-simulation">
                  {/* Grid Lines */}
                  <div className="map-grid-line" style={{ width: '100%', height: '1px', top: '25%' }}></div>
                  <div className="map-grid-line" style={{ width: '100%', height: '1px', top: '50%' }}></div>
                  <div className="map-grid-line" style={{ width: '100%', height: '1px', top: '75%' }}></div>
                  <div className="map-grid-line" style={{ height: '100%', width: '1px', left: '25%' }}></div>
                  <div className="map-grid-line" style={{ height: '100%', width: '1px', left: '50%' }}></div>
                  <div className="map-grid-line" style={{ height: '100%', width: '1px', left: '75%' }}></div>

                  {/* Restaurants pins */}
                  <div className="map-restaurant-pin" style={{ left: '30%', top: '40%' }}>
                    <Coffee size={18} className="text-cyan glow-cyan" />
                    <span className="pin-label">La Bella Pizza</span>
                  </div>
                  <div className="map-restaurant-pin" style={{ left: '70%', top: '30%' }}>
                    <Coffee size={18} className="text-cyan glow-cyan" />
                    <span className="pin-label">The Burger Club</span>
                  </div>
                  <div className="map-restaurant-pin" style={{ left: '50%', top: '70%' }}>
                    <Coffee size={18} className="text-cyan glow-cyan" />
                    <span className="pin-label">Sushi Zen</span>
                  </div>

                  {/* Drivers pins */}
                  {drivers.map(drv => {
                    const coords = getMapCoords(drv.lat, drv.lng);
                    return (
                      <div key={drv.id} className="map-driver-pin" style={{ ...coords }}>
                        <Navigation 
                          size={16} 
                          className="text-purple" 
                          style={{ 
                            transform: drv.status === 'DELIVERING' ? 'rotate(45deg)' : 'none',
                            filter: 'drop-shadow(0 0 4px var(--accent-purple))'
                          }} 
                        />
                        <span className="pin-label" style={{ borderColor: drv.status === 'DELIVERING' ? 'var(--accent-purple)' : 'var(--border-color)' }}>
                          {drv.name} ({drv.status})
                        </span>
                      </div>
                    );
                  })}
                </div>

                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Delivery Drivers</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                  {drivers.map(drv => (
                    <div key={drv.id} className="driver-sim-card">
                      <div className="driver-info-sim">
                        <span className="driver-name-sim">{drv.name}</span>
                        <span className="driver-status-sim">
                          {drv.vehicle} • <span style={{ color: drv.status === 'DELIVERING' ? 'var(--accent-purple)' : 'var(--accent-emerald)', fontWeight: 'bold' }}>{drv.status}</span>
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          ({drv.lat.toFixed(4)}, {drv.lng.toFixed(4)})
                        </span>
                      </div>
                      <div className="driver-coords-controls">
                        <button 
                          className="sim-coord-btn" 
                          onClick={() => simulateMove(drv.id, 0.002, 0.002)}
                          title="Move driver coordinates north-east to simulate travel"
                        >
                          Simulate Travel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Add new driver */}
            {activeTab === 'newdriver' && (
              <form onSubmit={handleRegisterDriver} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Register New Agent</label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Driver Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Slimane Trabelsi" 
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vehicle Type</label>
                  <select 
                    className="form-input"
                    value={newDriverVehicle}
                    onChange={(e) => setNewDriverVehicle(e.target.value)}
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Car</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary">
                  Register Driver (GraphQL Mutation)
                </button>
              </form>
            )}

          </div>
        </section>

      </div>
    </div>
  );
}

export default App;
