import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Scene from './Scene';
import FoodModel from './FoodModel';

// Use the live backend URL if deployed, otherwise fallback to localhost for local development
// Note: In Vite, environment variables must start with VITE_
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_BASE_URL = `${BACKEND_URL}/api`;

// Helper to ensure media URLs always point to the Django backend
const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('/')) return `${BACKEND_URL}${path}`;
  return path;
};

// A wrapper that rotates all of its children together on the Y axis
function RotatingGroup({ children }) {
  const groupRef = useRef();
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3; // Adjust the speed of the group rotation here
    }
  });
  return <group ref={groupRef}>{children}</group>;
}

function App() {
  const [flavorColor, setFlavorColor] = useState('#ffffff');
  // State for order tracking
  const [trackId, setTrackId] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  // State to manage simple navigation between Home and Menu pages
  const [currentView, setCurrentView] = useState('home');

  // State to manage which Brand (Category) the user is currently viewing
  const [selectedCategory, setSelectedCategory] = useState(null);

  // State to manage selected options for items with variants (e.g., 6pcs vs 12pcs)
  const [selectedOptions, setSelectedOptions] = useState({});

  const handleOptionChange = (itemId, optionId) => {
    setSelectedOptions(prev => ({ ...prev, [itemId]: optionId }));
  };

  // Cart & Checkout State
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('munchies_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('munchies_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true); // Open cart automatically when an item is added
  };

  const updateCartQuantity = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const orderPayload = {
      customer_name: checkoutData.name,
      phone_number: checkoutData.phone,
      delivery_address: checkoutData.address,
      total_amount: cartTotal.toFixed(2),
      order_items: cartItems.map(item => ({
        menu_item: item.menu_item_id,
        selected_option: item.selected_option_id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }))
    };

    try {
      const response = await fetch(`${API_BASE_URL}/order/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      
      if (!response.ok) throw new Error('Checkout failed.');
      
      const data = await response.json();
      setOrderSuccess(data);
      setCartItems([]);
      setCheckoutData({ name: '', phone: '', address: '' });
    } catch (err) {
      console.error(err);
      alert('There was an issue placing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    if (!trackId) return;
    setTrackError('');
    setTrackResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/track/${trackId}/`);
      if (!response.ok) throw new Error('Order not found. Please check your Order ID.');
      const data = await response.json();
      setTrackResult(data);
    } catch (err) {
      setTrackError(err.message);
    }
  };

  // Map the backend status to progress bar steps
  const statuses = ['Pending', 'Processing', 'Out for Delivery', 'Delivered'];

  // Features data for the grid
  const features = [
    { title: 'Fast Delivery', description: 'Hot and fresh to your door in under 30 minutes.', icon: '🚀' },
    { title: 'Premium Ingredients', description: '100% organic, locally sourced produce and meats.', icon: '🥑' },
    { title: 'Exclusive Shakes', description: 'Handcrafted flavor combinations you won’t find anywhere else.', icon: '🥤' },
  ];

  // State for dynamically fetched categories
  const [categories, setCategories] = useState([]);
  const [brandAssets, setBrandAssets] = useState({});
  const [events, setEvents] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/menu/`);
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      }
    };
    const fetchBrandData = async () => {
      try {
        const [assetsRes, eventsRes, jobsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/brand-assets/`),
          fetch(`${API_BASE_URL}/events/`),
          fetch(`${API_BASE_URL}/jobs/`)
        ]);
        setBrandAssets(await assetsRes.json());
        setEvents(await eventsRes.json());
        setJobs(await jobsRes.json());
      } catch (error) {
        console.error('Failed to fetch brand data:', error);
      }
    };
    fetchMenu();
    fetchBrandData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0d] font-['Inter'] text-white selection:bg-[#ff2d55] selection:text-white relative pb-24 scroll-smooth">
      
      {/* 1. Glassmorphism Navigation Bar */}
      <div className="fixed top-4 left-4 right-4 md:left-10 md:right-10 z-50">
        <nav className="grid grid-cols-2 md:grid-cols-3 items-center bg-[#2D1611]/95 backdrop-blur-md border border-[#3D1D16] px-6 py-3 md:py-4 rounded-2xl shadow-2xl">
          
          {/* Left: Navigation Links */}
          <div className="hidden md:flex space-x-6 lg:space-x-8 font-medium text-sm text-[#FFFDD0]">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('home'); window.scrollTo(0,0); }} className="hover:text-[#ff2d55] transition-colors">Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('menu'); setSelectedCategory(null); window.scrollTo(0,0); }} className="hover:text-[#ff2d55] transition-colors">Menu</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('events'); window.scrollTo(0,0); }} className="hover:text-[#ff2d55] transition-colors">Events</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('careers'); window.scrollTo(0,0); }} className="hover:text-[#ff2d55] transition-colors">Careers</a>
          </div>

          {/* Center: Logo */}
          <div className="flex md:justify-center">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('home'); window.scrollTo(0,0); }} className="flex items-center justify-center h-12 md:h-16 w-48 md:w-64">
              {brandAssets.header_image && (
                <img src={getMediaUrl(brandAssets.header_image)} alt="Munchies and Shakes" className="w-full h-full object-contain object-center scale-[3.2] drop-shadow-xl" />
              )}
            </a>
          </div>

          {/* Right: Actions & 3D Element */}
          <div className="flex justify-end items-center gap-4 lg:gap-6">
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-[#FFFDD0] hover:text-[#ff2d55] transition-colors group" aria-label="Cart">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-[#ff2d55] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center translate-x-1 -translate-y-1 group-hover:scale-110 transition-transform shadow-md">
                  {cartItemCount}
                </span>
              )}
            </button>
            <button className="p-2 text-[#FFFDD0] hover:text-[#ff2d55] transition-colors" aria-label="User Profile">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </button>
            <button className="hidden md:block px-5 py-2.5 bg-[#ff2d55] text-white text-sm font-bold rounded-2xl hover:bg-[#e0264b] transition-colors shadow-[0_4px_15px_rgba(255,45,85,0.4)]">
              Login
            </button>
          </div>
        </nav>
      </div>

      {/* ---- HOME PAGE VIEW ---- */}
      {currentView === 'home' && (
        <>
          {/* Background Video */}
          {brandAssets.background_video && (
            <div className="fixed top-0 left-0 w-full h-screen z-0 overflow-hidden pointer-events-none">
              <video src={getMediaUrl(brandAssets.background_video)} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30" />
              {/* Heavy dark overlay to push the video to the background and ensure page items are highly visible */}
              <div className="absolute inset-0 bg-[#0d0d0d]/80"></div>
              {/* Smooth fade-out gradient at the bottom edge */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0d0d0d] to-transparent"></div>
            </div>
          )}

          {/* 2. Split Hero Section */}
          <section className="relative z-10 container mx-auto px-6 pt-36 pb-16 md:pt-48 md:pb-24 flex flex-col md:flex-row items-center gap-12">
            
            {/* Left Side: Text */}
            <div className="flex-1 space-y-8 text-center md:text-left z-10">
              <h1 className="text-4xl md:text-5xl font-['Poppins'] font-black leading-tight tracking-tight">
                Your Cravings, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d55] to-purple-500">
                  Delivered.
                </span>
              </h1>
              <p className="text-sm md:text-base text-gray-400 max-w-lg mx-auto md:mx-0 font-light leading-relaxed">
                The ultimate comfort food experience. Smash burgers, crispy fries, and thick shakes engineered to blow your mind.
              </p>
              <button onClick={() => { setCurrentView('menu'); setSelectedCategory(null); window.scrollTo(0,0); }} className="px-8 py-4 bg-[#ff2d55] text-white font-bold text-base rounded-3xl shadow-[0_8px_30px_rgba(255,45,85,0.4)] hover:shadow-[0_8px_40px_rgba(255,45,85,0.6)] hover:-translate-y-1 transition-all transform w-full md:w-auto">
                Start Ordering
              </button>
            </div>

            {/* Right Side: 3D Floating Food */}
            <div className="flex-1 w-full relative h-[500px] md:h-[700px]">
              <div className="absolute inset-0 bg-[#ff2d55]/20 blur-[100px] rounded-full z-0 pointer-events-none"></div>
              <div className="absolute inset-0 z-10">
                <Scene>
                  <RotatingGroup>
                    <FoodModel 
                      url="/models/scene_modern.glb" 
                      scale={3}
                    />
                  </RotatingGroup>
                </Scene>
              </div>
            </div>

          </section>

          {/* 3. Order Tracking Section */}
          <section className="relative z-10 container mx-auto px-6 py-12">
            <div className="max-w-2xl mx-auto bg-[#1a1a1a] rounded-3xl p-8 border border-white/5 shadow-2xl">
              <h2 className="text-xl font-['Poppins'] font-bold mb-6 text-center">Track Your Order</h2>
              <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Enter Order ID"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  className="flex-1 bg-[#242424] text-white text-sm px-5 py-3 rounded-full outline-none border border-gray-700 focus:border-[#ff2d55] transition-colors"
                />
                <button type="submit" className="px-6 py-3 bg-[#ff2d55] text-white text-sm font-bold rounded-full shadow-[0_4px_15px_rgba(255,45,85,0.4)] hover:bg-[#e0264b] transition-colors">
                  Track
                </button>
              </form>
              
              {trackError && <p className="text-red-500 text-center text-sm font-medium">{trackError}</p>}
              
              {trackResult && trackResult.status !== 'Cancelled' && (
                <div className="mt-8 animate-fade-in">
                  <h3 className="text-base font-['Poppins'] font-bold mb-4">Order #{trackResult.id} for {trackResult.customer_name}</h3>
                  <div className="relative pt-4">
                    <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-700">
                      <div style={{ width: `${(statuses.indexOf(trackResult.status) + 1) * 25}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#ff2d55] transition-all duration-700 ease-out"></div>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 font-semibold mt-2">
                      <span className={statuses.indexOf(trackResult.status) >= 0 ? "text-[#ff2d55]" : ""}>Received</span>
                      <span className={statuses.indexOf(trackResult.status) >= 1 ? "text-[#ff2d55]" : ""}>Preparing</span>
                      <span className={statuses.indexOf(trackResult.status) >= 2 ? "text-[#ff2d55]" : ""}>On the Way</span>
                      <span className={statuses.indexOf(trackResult.status) >= 3 ? "text-[#ff2d55]" : ""}>Delivered</span>
                    </div>
                  </div>
                </div>
              )}

              {trackResult && trackResult.status === 'Cancelled' && (
                <div className="mt-8 text-center text-red-500 font-bold text-base animate-fade-in">
                  This order has been cancelled.
                </div>
              )}
            </div>
          </section>

          {/* 4. Features Grid */}
          <section className="relative z-10 container mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-[#1a1a1a] p-10 rounded-3xl border border-white/5 hover:border-[#ff2d55]/50 transition-colors shadow-xl">
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-['Poppins'] font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Our Story Section */}
          <section id="about" className="relative z-10 container mx-auto px-6 py-16 text-center max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-['Poppins'] font-bold mb-6 text-[#ff2d55]">Our Story</h2>
            <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-6">
              Born out of a late-night craving for something out of this world, Munchies and Shakes was created to redefine comfort food. We believe in using only the freshest ingredients, smashing our burgers to perfection, and blending shakes that take you to another galaxy.
            </p>
          </section>

          {/* 6. Contact Section */}
          <section id="contact" className="relative z-10 container mx-auto px-6 py-16 mb-12 text-center">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 md:p-16 max-w-4xl mx-auto border border-white/5 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-['Poppins'] font-bold mb-6">Hit Us Up</h2>
              <p className="text-sm text-gray-400 mb-12">Got a question or just want to say hi? We'd love to hear from you.</p>
              <div className="flex flex-col md:flex-row justify-center items-center gap-12 text-left">
                <div className="flex-1">
                  <h4 className="text-[#ff2d55] font-bold text-base mb-2">Location</h4>
                  <p className="text-gray-300 text-sm">123 Galactic Way<br/>Calabar, Nigeria</p>
                </div>
                <div className="w-px h-16 bg-gray-800 hidden md:block"></div>
                <div className="flex-1">
                  <h4 className="text-[#ff2d55] font-bold text-base mb-2">Hours</h4>
                  <p className="text-gray-300 text-sm">Mon-Sun: 11 AM - 11 PM</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ---- MENU PAGE VIEW ---- */}
      {currentView === 'menu' && (
        <section className="relative z-10 container mx-auto px-6 pt-36 py-16 min-h-screen">
          {!selectedCategory ? (
            <>
              {/* Brands Overview */}
              <div className="text-center mb-16">
                <h1 className="text-3xl md:text-5xl font-['Poppins'] font-black mb-4">Our Brands</h1>
                <p className="text-base text-gray-400">Choose a brand to explore its out-of-this-world menu.</p>
              </div>
              
              {categories.length === 0 && (
                <div className="text-center text-gray-500 text-base py-12">Loading out-of-this-world brands...</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {categories.map((category) => (
                  <div 
                    key={category.id} 
                    onClick={() => setSelectedCategory(category)}
                    className="group cursor-pointer relative bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-white/5 hover:border-[#ff2d55]/50 transition-all duration-300 flex flex-col hover:-translate-y-2"
                  >
                    <div className="h-64 w-full relative bg-gray-800 overflow-hidden">
                      <img 
                        src={getMediaUrl(category.image) || `https://placehold.co/600x400/2a2a2a/ffffff?text=${encodeURIComponent(category.name)}`} 
                        alt={category.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-center items-center bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]">
                      <h3 className="text-xl font-['Poppins'] font-bold text-center group-hover:text-[#ff2d55] transition-colors">{category.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Specific Brand View */}
              <div className="mb-12">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-[#ff2d55] hover:text-white text-sm font-bold flex items-center gap-2 transition-colors mb-6"
                >
                  ← Back to Brands
                </button>
                <div className="flex items-center gap-6 mb-8">
                  {selectedCategory.image && (
                    <img src={getMediaUrl(selectedCategory.image)} alt={selectedCategory.name} className="w-20 h-20 rounded-full object-cover border-2 border-[#ff2d55]" />
                  )}
                  <div>
                    <h1 className="text-3xl md:text-5xl font-['Poppins'] font-black">{selectedCategory.name}</h1>
                  </div>
                </div>
              </div>

              {(() => {
                // Group items by subcategory
                const groupedItems = selectedCategory.menu_items.reduce((acc, item) => {
                  const sub = item.subcategory || 'Main Menu';
                  if (!acc[sub]) acc[sub] = [];
                  acc[sub].push(item);
                  return acc;
                }, {});

                return Object.entries(groupedItems).map(([subName, items]) => (
                  <div key={subName} className="mb-16">
                    {/* Only show the subcategory title if it's not the default "Main Menu" OR if there are multiple categories */}
                    {(subName !== 'Main Menu' || Object.keys(groupedItems).length > 1) && (
                      <h3 className="text-2xl font-['Poppins'] font-bold mb-8 border-l-4 border-[#ff2d55] pl-4 text-white">
                        {subName}
                      </h3>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                      {items.map((item) => {
                        const hasOptions = item.options && item.options.length > 0;
                        const selectedOptionId = selectedOptions[item.id] || (hasOptions ? item.options[0].id : null);
                        const selectedOption = hasOptions ? item.options.find(opt => opt.id === selectedOptionId) || item.options[0] : null;
                        const currentPrice = hasOptions ? selectedOption.price : item.price;

                        return (
                          <div key={item.id} className="group relative bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-white/5 hover:border-[#ff2d55]/50 transition-all duration-300 flex flex-col hover:-translate-y-2">
                            {/* Recommended Badge */}
                            {item.recommended && (
                              <span className="absolute top-4 right-4 bg-[#ff2d55] text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10 shadow-[0_4px_10px_rgba(255,45,85,0.4)] tracking-wider uppercase">
                                Recommended
                              </span>
                            )}
                            <div className="h-64 w-full relative bg-gray-800 overflow-hidden">
                              <img 
                                src={getMediaUrl(item.image) || `https://placehold.co/600x400/2a2a2a/ffffff?text=${encodeURIComponent(item.name)}`} 
                                alt={item.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                              />
                            </div>
                            <div className="p-8 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]">
                              <div className="flex justify-between items-start mb-4 gap-4">
                                <div>
                                  <h3 className="text-lg font-['Poppins'] font-bold mb-1">{item.name}</h3>
                                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{item.description}</p>
                                </div>
                                <span className="text-[#ff2d55] font-black text-lg">₦{currentPrice}</span>
                              </div>
                              
                              {hasOptions && (
                                <div className="mb-4">
                                  <select 
                                    value={selectedOptionId}
                                    onChange={(e) => handleOptionChange(item.id, parseInt(e.target.value))}
                                    className="w-full bg-[#242424] text-white text-sm px-3 py-2 rounded-xl outline-none border border-gray-700 focus:border-[#ff2d55] transition-colors"
                                  >
                                    {item.options.map(opt => (
                                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                            </div>
                            <button 
                              onClick={() => addToCart({ 
                                id: hasOptions ? `${item.id}-${selectedOption.id}` : item.id, 
                                name: hasOptions ? `${item.name} (${selectedOption.name})` : item.name, 
                                price: currentPrice,
                                menu_item_id: item.id,
                                selected_option_id: hasOptions ? selectedOption.id : null 
                              })} 
                              className="w-full py-3 bg-white/5 border border-white/10 text-white text-sm font-bold rounded-2xl hover:bg-[#ff2d55] hover:border-[#ff2d55] hover:shadow-[0_0_20px_rgba(255,45,85,0.4)] transition-all duration-300 active:scale-95"
                            >
                              Add to Cart
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </section>
      )}

      {/* ---- EVENTS PAGE VIEW ---- */}
      {currentView === 'events' && (
        <section className="relative z-10 container mx-auto px-6 pt-36 py-16 min-h-screen">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-['Poppins'] font-black mb-4">Events & Promos</h1>
            <p className="text-base text-gray-400">See what's happening at Munchies and Shakes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {events.length === 0 ? (
               <p className="text-center text-gray-500 col-span-1 md:col-span-2 text-base">No active events or promos at this time. Stay tuned!</p>
            ) : (
               events.map(event => (
                 <div key={event.id} className="bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col">
                   {event.image && <img src={getMediaUrl(event.image)} alt={event.title} className="w-full h-72 object-cover" />}
                   <div className="p-8 flex-1 flex flex-col justify-center">
                     <h3 className="text-xl font-['Poppins'] font-bold mb-2">{event.title}</h3>
                     <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
                   </div>
                 </div>
               ))
            )}
          </div>
        </section>
      )}

      {/* ---- CAREERS PAGE VIEW ---- */}
      {currentView === 'careers' && (
        <section className="relative z-10 container mx-auto px-6 pt-36 py-16 min-h-screen">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-['Poppins'] font-black mb-4">Join Our Team</h1>
            <p className="text-base text-gray-400">We are always looking for passionate people to create magic.</p>
          </div>
          <div className="max-w-4xl mx-auto space-y-6">
            {jobs.length === 0 ? (
               <p className="text-center text-gray-500 text-base">No open positions right now, but we are always taking resumes!</p>
            ) : (
               jobs.map(job => (
                 <div key={job.id} className="bg-[#1a1a1a] p-8 md:p-10 rounded-3xl shadow-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="flex-1">
                     <h3 className="text-lg md:text-xl font-['Poppins'] font-bold mb-2">{job.title}</h3>
                     <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
                   </div>
                   <button className="w-full md:w-auto px-6 py-3 bg-white/10 text-white font-bold text-sm rounded-2xl hover:bg-[#ff2d55] transition-colors border border-white/10 shrink-0 shadow-lg">
                     Apply Now
                   </button>
                 </div>
               ))
            )}
          </div>
        </section>
      )}

      {/* ---- CART MODAL ---- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          ></div>
          
          {/* Sidebar */}
          <div className="relative w-full max-w-md bg-[#1a1a1a] h-full shadow-2xl flex flex-col border-l border-white/10 animate-fade-in">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a] z-10">
              <h2 className="text-2xl font-['Poppins'] font-bold">Your Order</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2 text-2xl leading-none">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                  <p className="text-lg">Your cart is empty.</p>
                  <button onClick={() => { setIsCartOpen(false); setCurrentView('menu'); window.scrollTo(0,0); }} className="px-6 py-3 bg-white/10 text-white font-bold rounded-2xl hover:bg-[#ff2d55] transition-colors">
                    Browse Menu
                  </button>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 bg-[#242424] p-4 rounded-2xl border border-white/5">
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-1 leading-tight">{item.name}</h4>
                      <p className="text-[#ff2d55] font-black text-sm">₦{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-1 border border-white/10">
                      <button onClick={() => updateCartQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-[#ff2d55] rounded-lg transition-colors font-bold">
                        -
                      </button>
                      <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-[#ff2d55] rounded-lg transition-colors font-bold">
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {cartItems.length > 0 && (
              <div className="p-6 bg-[#1a1a1a] border-t border-white/10 z-10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-400 font-medium">Total</span>
                  <span className="text-3xl font-black font-['Poppins']">₦{cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-4 bg-[#ff2d55] text-white font-bold text-lg rounded-2xl shadow-[0_8px_30px_rgba(255,45,85,0.4)] hover:shadow-[0_8px_40px_rgba(255,45,85,0.6)] hover:-translate-y-1 transition-all active:scale-95"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- CHECKOUT MODAL ---- */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isSubmitting && !orderSuccess && setIsCheckoutOpen(false)}></div>
          <div className="relative bg-[#1a1a1a] rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-white/10 animate-fade-in">
            {orderSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#ff2d55]/20 text-[#ff2d55] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                  ✓
                </div>
                <h2 className="text-3xl font-['Poppins'] font-black mb-4">Order Received!</h2>
                <p className="text-gray-400 mb-6">Your order <span className="text-white font-bold">#{orderSuccess.id}</span> is now being prepared. Use your tracking number to see its status!</p>
                <button 
                  onClick={() => { setIsCheckoutOpen(false); setIsCartOpen(false); setOrderSuccess(null); }}
                  className="w-full py-4 bg-[#ff2d55] text-white font-bold rounded-2xl hover:bg-[#e0264b] transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-['Poppins'] font-bold">Checkout</h2>
                  <button onClick={() => !isSubmitting && setIsCheckoutOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2 text-2xl leading-none">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    <input required type="text" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} className="w-full bg-[#242424] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#ff2d55] outline-none transition-colors" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                    <input required type="tel" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} className="w-full bg-[#242424] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#ff2d55] outline-none transition-colors" placeholder="08012345678" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Delivery Address</label>
                    <textarea required value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} className="w-full bg-[#242424] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#ff2d55] outline-none transition-colors h-24 resize-none" placeholder="123 Galaxy Avenue..." />
                  </div>
                  
                  <div className="pt-4 border-t border-white/10 mt-6 flex justify-between items-center">
                    <span className="text-gray-400">Total</span>
                    <span className="text-2xl font-black text-[#ff2d55]">₦{cartTotal.toFixed(2)}</span>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    type="submit" 
                    className="w-full py-4 mt-6 bg-[#ff2d55] text-white font-bold text-lg rounded-2xl shadow-[0_4px_15px_rgba(255,45,85,0.4)] hover:bg-[#e0264b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Processing...' : 'Place Order'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default App
