import { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import Scene from './Scene';
import FoodModel from './FoodModel';
import { useDesign } from './design/DesignContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8000`;
const API_BASE_URL = `${BACKEND_URL}/api`;

const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('/')) return `${BACKEND_URL}${path}`;
  return path;
};

const fmtPrice = (val) => {
  const n = parseFloat(val);
  return n % 1 === 0 ? n.toLocaleString('en-NG') : n.toLocaleString('en-NG', { minimumFractionDigits: 2 });
};

function RotatingGroup({ children }) {
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.25; });
  return <group ref={ref}>{children}</group>;
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const DARK = {
  bg:          '#17120D',
  bgCard:      '#1F1812',
  bgElev:      '#271E15',
  bgInput:     '#2D2018',
  bgNav:       'rgba(23,18,13,0.97)',
  navBorder:   'rgba(193,92,46,0.12)',
  text:        '#EDE0C8',
  textMuted:   '#8A7060',
  textSubtle:  '#5A4A3A',
  accent:      '#C15C2E',
  accentHover: '#D46A38',
  border:      'rgba(193,92,46,0.1)',
  borderAcc:   'rgba(193,92,46,0.22)',
  shadow:      '0 2px 20px rgba(0,0,0,0.25)',
  shadowHover: '0 8px 40px rgba(0,0,0,0.4)',
  tag:         'rgba(193,92,46,0.08)',
  tagText:     '#EDE0C8',
  divider:     'linear-gradient(to right, transparent, rgba(193,92,46,0.3), transparent)',
  cartBg:      '#1A140F',
};

// ─── Shared micro-components ──────────────────────────────────────────────────
function SectionLabel({ t, children }) {
  return (
    <p style={{ color: t.accent, fontFamily: "'DM Sans', sans-serif" }}
       className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3">
      {children}
    </p>
  );
}

function PrimaryBtn({ t, onClick, type = 'button', disabled, children, full }) {
  const [hover, setHover] = useState(false);
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`${full ? 'w-full' : ''} px-7 py-3.5 rounded-xl font-semibold text-[13px]
                  tracking-wide transition-all active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{
        background: hover ? t.accentHover : t.accent,
        color: '#fff',
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: hover ? `0 4px 20px rgba(193,92,46,0.35)` : 'none',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
      }}>
      {children}
    </button>
  );
}

function GhostBtn({ t, onClick, children, full }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`${full ? 'w-full' : ''} px-7 py-3.5 rounded-xl font-semibold text-[13px]
                  tracking-wide transition-all active:scale-95`}
      style={{
        border: `1.5px solid ${t.border}`,
        color: t.text,
        background: hover ? t.bgElev : 'transparent',
        fontFamily: "'DM Sans', sans-serif",
      }}>
      {children}
    </button>
  );
}

function CloseBtn({ t, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="p-2 rounded-lg transition-colors"
      style={{ color: t.textMuted, background: hover ? t.bgElev : 'transparent' }}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function Tag({ t, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
          style={{ background: t.tag, color: t.tagText, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </span>
  );
}

function Divider({ t }) {
  return <div style={{ height: '1px', background: t.divider, margin: '0 0' }} />;
}


function Spinner({ t }) {
  return (
    <div className="flex flex-col items-center py-28 gap-4">
      <div className="w-8 h-8 rounded-full border-[3px] animate-spin"
           style={{ borderColor: `${t.border}`, borderTopColor: t.accent }} />
      <p className="text-[12px] tracking-widest uppercase" style={{ color: t.textMuted,
         fontFamily: "'DM Sans', sans-serif" }}>Loading…</p>
    </div>
  );
}

function CartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const t = DARK;

  const [currentView,      setCurrentView]      = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedOptions,  setSelectedOptions]  = useState({});

  const [cartItems, setCartItems] = useState(() => {
    try {
      const items = JSON.parse(localStorage.getItem('munchies_cart')) || [];
      // Migrate old items that used `id` as menu_item_id (CartManager era)
      return items.map(i => ({
        ...i,
        menu_item_id:       i.menu_item_id ?? (typeof i.id === 'number' ? i.id : undefined),
        selected_option_id: i.selected_option_id ?? null,
      }));
    }
    catch { return []; }
  });
  const [isCartOpen,     setIsCartOpen]     = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData,   setCheckoutData]   = useState({ name: '', phone: '', address: '' });
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [orderSuccess,   setOrderSuccess]   = useState(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimatingCart,  setIsAnimatingCart]  = useState(false);
  const [toastMessage,     setToastMessage]     = useState(null);
  const toastRef = useRef(null);
  const videoRef  = useRef(null);

  const [trackId,     setTrackId]     = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError,  setTrackError]  = useState('');

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [categories,  setCategories]  = useState([]);
  const [brandAssets, setBrandAssets] = useState({});
  const [events,      setEvents]      = useState([]);
  const [jobs,        setJobs]        = useState([]);

  const popSound = useMemo(() => new Audio('/sounds/pop.mp3'), []);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    localStorage.setItem('munchies_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.muted = true; v.play().catch(() => {}); }
  }, [brandAssets.background_video]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/menu/`).then(r => r.json()).then(setCategories).catch(console.error);
    Promise.all([
      fetch(`${API_BASE_URL}/brand-assets/`),
      fetch(`${API_BASE_URL}/events/`),
      fetch(`${API_BASE_URL}/jobs/`),
    ]).then(async ([a, e, j]) => {
      setBrandAssets(await a.json());
      setEvents(await e.json());
      setJobs(await j.json());
    }).catch(console.error);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const navigate = (view, opts = {}) => {
    setCurrentView(view);
    if (opts.resetCategory) setSelectedCategory(null);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleOptionChange = (itemId, optionId) =>
    setSelectedOptions(p => ({ ...p, [itemId]: optionId }));

  const addToCart = (item) => {
    setCartItems(prev => {
      const found = prev.find(i => i.id === item.id);
      return found
        ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...item, quantity: 1 }];
    });
    setIsAnimatingCart(true);
    setTimeout(() => setIsAnimatingCart(false), 400);
    setToastMessage('Added to your order');
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMessage(null), 2800);
    popSound.currentTime = 0;
    popSound.play().catch(() => {});
  };

  const updateQty = (id, delta) =>
    setCartItems(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
          .filter(i => i.quantity > 0)
    );

  const cartTotal     = cartItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  const cartItemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/order/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:    checkoutData.name,
          phone_number:     checkoutData.phone,
          delivery_address: checkoutData.address,
          total_amount:     cartTotal.toFixed(2),
          order_items:      cartItems.map(i => ({
            menu_item:         i.menu_item_id ?? i.id,
            selected_option:   i.selected_option_id ?? null,
            quantity:          i.quantity,
            price_at_purchase: i.price,
          })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(errData));
      }
      setOrderSuccess(await res.json());
      setCartItems([]);
      setCheckoutData({ name: '', phone: '', address: '' });
    } catch (err) {
      console.error('Order failed:', err.message);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    if (!trackId) return;
    setTrackError(''); setTrackResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/track/${trackId}/`);
      if (!res.ok) throw new Error('Order not found. Please check your Order ID.');
      setTrackResult(await res.json());
    } catch (err) { setTrackError(err.message); }
  };

  const statuses   = ['Pending', 'Processing', 'Out for Delivery', 'Delivered'];
  const stepLabels = ['Received', 'Preparing', 'On the Way', 'Delivered'];

  const navLinks = [
    { label: 'Home',    view: 'home',    extra: {} },
    { label: 'Menu',    view: 'menu',    extra: { resetCategory: true } },
    { label: 'Events',  view: 'events',  extra: {} },
    { label: 'Careers', view: 'careers', extra: {} },
  ];

  const inputStyle = {
    background: t.bgInput,
    color: t.text,
    border: `1.5px solid ${t.border}`,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    borderRadius: '10px',
    padding: '12px 16px',
    width: '100%',
  };

  // ─── Design tokens (live-editable via DesignPanel in dev mode) ───────────
  const { design } = useDesign();

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: t.bg, color: t.text, fontFamily: "'DM Sans', sans-serif",
                  minHeight: '100vh', transition: 'background 0.3s, color 0.3s' }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50"
           style={{ background: t.bgNav, borderBottom: `1px solid ${t.navBorder}`,
                    backdropFilter: 'blur(16px)' }}>
        <div className="container mx-auto px-6">
          <nav className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center"
               style={{ height: `${design.navbarHeight}px` }}>

            {/* Left — hamburger / links */}
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(v => !v)}
                className="p-2 -ml-1 rounded-lg transition-colors"
                style={{ color: t.textMuted }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/>
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7h16M4 12h16M4 17h16"/>
                  }
                </svg>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(l => (
                <button key={l.view} onClick={() => navigate(l.view, l.extra)}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    color: currentView === l.view ? t.text : t.textMuted,
                    background: currentView === l.view ? t.bgElev : 'transparent',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Center — Logo */}
            <div className="flex justify-center">
              <button onClick={() => navigate('home')}
                className="flex items-center justify-center"
                style={{
                  height: isMobile ? `${design.logoHeightMobile}px`  : `${design.logoHeightDesktop}px`,
                  width:  isMobile ? `${design.logoWidthMobile}px`   : `${design.logoWidthDesktop}px`,
                }}>
                {brandAssets.header_image
                  ? <img src={getMediaUrl(brandAssets.header_image)} alt="Munchies and Shakes"
                         className="w-full h-full object-contain" />
                  : <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700,
                                   fontSize: '18px', color: t.text, letterSpacing: '0.01em' }}>
                      Munchies<span style={{ color: t.accent }}> &amp; </span>Shakes
                    </span>
                }
              </button>
            </div>

            {/* Right — actions */}
            <div className="flex items-center justify-end gap-2">
              {/* Cart */}
              <button onClick={() => setIsCartOpen(true)}
                className={`relative p-2.5 rounded-lg transition-all duration-300 ${isAnimatingCart ? 'scale-125' : ''}`}
                style={{ color: isAnimatingCart ? t.accent : t.textMuted }}>
                <CartIcon />
                {cartItemCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 text-[9px] font-bold w-4 h-4
                                    rounded-full flex items-center justify-center shadow
                                    ${isAnimatingCart ? 'animate-bounce' : ''}`}
                        style={{ background: t.accent, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
                    {cartItemCount}
                  </span>
                )}
              </button>

              {/* Order CTA */}
              <button onClick={() => navigate('menu', { resetCategory: true })}
                className="hidden md:block px-5 py-2.5 rounded-xl text-[12px] font-bold
                           tracking-wide transition-all"
                style={{ background: t.accent, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.accent; e.currentTarget.style.transform = 'none'; }}>
                Order Now
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile dropdown */}
        {isMobileMenuOpen && (
          <div style={{ borderTop: `1px solid ${t.border}`, background: t.bgNav }}
               className="animate-fade-up">
            <div className="container mx-auto px-6 py-3 flex flex-col gap-1">
              {navLinks.map(l => (
                <button key={l.view} onClick={() => navigate(l.view, l.extra)}
                  className="text-left px-4 py-3.5 rounded-xl text-[14px] font-medium transition-colors"
                  style={{ color: currentView === l.view ? t.accent : t.textMuted,
                           background: currentView === l.view ? t.bgElev : 'transparent',
                           fontFamily: "'DM Sans', sans-serif" }}>
                  {l.label}
                </button>
              ))}
              <div className="pt-2 pb-1">
                <PrimaryBtn t={t} onClick={() => navigate('menu', { resetCategory: true })} full>
                  Order Now
                </PrimaryBtn>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HOME
      ══════════════════════════════════════════════════════════════════════ */}
      {currentView === 'home' && (
        <>
          {/* Background video */}
          {brandAssets.background_video && (
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
              <video ref={videoRef} src={getMediaUrl(brandAssets.background_video)}
                     autoPlay loop muted playsInline
                     className="w-full h-full object-cover"
                     style={{ opacity: 0.28 }} />
              <div className="absolute inset-0"
                   style={{ background: `${t.bg}cc` }} />
            </div>
          )}

          {/* ── Hero ───────────────────────────────────────────────────── */}
          <section className="relative z-10 min-h-screen container mx-auto px-6
                              flex flex-col md:flex-row items-center pb-16 md:py-0"
                   style={{
                     paddingTop: `${design.heroPaddingTop}px`,
                     gap: isMobile ? `${design.heroGapMobile}px` : `${design.heroGapDesktop}px`,
                   }}>
            {/* Copy */}
            <div className="flex-1 w-full max-w-xl mx-auto md:mx-0 space-y-5 text-center md:text-left animate-fade-up">
              <SectionLabel t={t}>Calabar's Finest · Est. 2023</SectionLabel>

              <h1 style={{ fontFamily: "'Fraunces', serif", color: t.text,
                           fontSize: `clamp(${design.heroH1SizeMinRem}rem, ${design.heroH1SizeVW}vw, ${design.heroH1SizeMaxRem}rem)`,
                           fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                Good Food,{' '}
                <em style={{ fontStyle: 'italic', color: t.accent }}>Honestly</em>
                <br />Made.
              </h1>

              <p style={{ color: t.textMuted, fontSize: '15px', lineHeight: 1.85,
                          maxWidth: '390px', margin: '0 auto' }}
                 className="md:mx-0">
                Smash burgers crafted from locally-sourced ingredients, loaded fries,
                and thick shakes blended fresh every single day. No shortcuts, ever.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <PrimaryBtn t={t} onClick={() => navigate('menu', { resetCategory: true })}>
                  Explore the Menu
                </PrimaryBtn>
                <GhostBtn t={t} onClick={() => document.getElementById('track')
                    ?.scrollIntoView({ behavior: 'smooth' })}>
                  Track My Order
                </GhostBtn>
              </div>

              {/* Attribute tags */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
                <Tag t={t}>🌿 Fresh Daily</Tag>
                <Tag t={t}>🔥 Made to Order</Tag>
                <Tag t={t}>⚡ 30-Min Delivery</Tag>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 justify-center md:justify-start pt-3">
                {[['500+', 'Daily orders'], ['4.9★', 'Rating'], ['< 30 min', 'Delivery']].map(
                  ([val, lbl], i) => (
                    <div key={lbl} className="flex items-center gap-8">
                      <div>
                        <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px',
                                      fontWeight: 700, color: t.text }}>
                          {val}
                        </div>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
                          {lbl}
                        </div>
                      </div>
                      {i < 2 && (
                        <div style={{ width: '1px', height: '32px', background: t.border }} />
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 3D model */}
            <div className="relative w-full md:flex-1"
                 style={{ height: `clamp(${design.modelHeightMin}px, ${design.modelHeightVH}vh, ${design.modelHeightMax}px)` }}>
              <div className="absolute inset-0 pointer-events-none"
                   style={{ background: `radial-gradient(ellipse at center, rgba(193,92,46,0.12) 0%, transparent 65%)`,
                            filter: 'blur(30px)' }} />
              <div className="absolute inset-0">
                <Scene>
                  <RotatingGroup>
                    <FoodModel url="/models/scene_modern.glb"
                               scale={isMobile ? design.modelScaleMobile : design.modelScaleDesktop}
                               position={isMobile
                                 ? [0, design.modelPositionYMobile, 0]
                                 : [0, design.modelPositionYDesktop, 0]} />
                  </RotatingGroup>
                </Scene>
              </div>
            </div>
          </section>

          <div className="relative z-10 container mx-auto px-6"><Divider t={t} /></div>

          {/* ── Features ───────────────────────────────────────────────── */}
          <section className="relative z-10 container mx-auto px-6 py-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { num: '01', title: 'Swift Delivery',      body: 'Hot and fresh to your door in under 30 minutes, guaranteed, every time.' },
                { num: '02', title: 'Premium Ingredients', body: 'Only the freshest, locally sourced produce and meats in every single bite.' },
                { num: '03', title: 'Exclusive Shakes',    body: 'Handcrafted flavour combinations you will not find anywhere else in Calabar.' },
              ].map(f => (
                <div key={f.num} className="p-8 rounded-2xl transition-all duration-300"
                     style={{ background: t.bgCard, border: `1px solid ${t.border}`,
                              boxShadow: t.shadow }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '13px',
                                color: t.accent, marginBottom: '12px', fontWeight: 700 }}>
                    {f.num}
                  </div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700,
                               color: t.text, marginBottom: '10px' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.8 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Order Tracking ─────────────────────────────────────────── */}
          <section id="track" className="relative z-10 container mx-auto px-6 pb-20">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <SectionLabel t={t}>Real-time Status</SectionLabel>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem',
                             fontWeight: 700, color: t.text }}>
                  Track Your Order
                </h2>
              </div>

              <div className="p-8 rounded-2xl" style={{ background: t.bgCard,
                   border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
                <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-3 mb-6">
                  <input type="text" placeholder="Enter your Order ID…"
                    value={trackId} onChange={e => setTrackId(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.target.style.borderColor = t.accent}
                    onBlur={e => e.target.style.borderColor = t.border}
                  />
                  <PrimaryBtn t={t} type="submit">Track</PrimaryBtn>
                </form>

                {trackError && (
                  <p className="text-[13px] text-center py-3 px-4 rounded-xl"
                     style={{ color: '#C0392B', background: 'rgba(192,57,43,0.08)',
                              border: '1px solid rgba(192,57,43,0.15)', fontFamily: "'DM Sans', sans-serif" }}>
                    {trackError}
                  </p>
                )}

                {trackResult && trackResult.status !== 'Cancelled' && (
                  <div className="animate-fade-up">
                    <div className="flex justify-between items-baseline mb-5">
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '18px',
                                     fontWeight: 700, color: t.text }}>
                        Order #{trackResult.id}
                      </span>
                      <span style={{ fontSize: '13px', color: t.textMuted }}>{trackResult.customer_name}</span>
                    </div>
                    <div className="rounded-full overflow-hidden mb-4"
                         style={{ height: '6px', background: t.bgElev }}>
                      <div style={{
                        width: `${(statuses.indexOf(trackResult.status) + 1) * 25}%`,
                        height: '100%', background: t.accent, borderRadius: '9999px',
                        transition: 'width 0.8s ease-out'
                      }} />
                    </div>
                    <div className="flex justify-between">
                      {stepLabels.map((s, i) => (
                        <span key={s} style={{
                          fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
                          color: statuses.indexOf(trackResult.status) >= i ? t.accent : t.textSubtle,
                          fontFamily: "'DM Sans', sans-serif"
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {trackResult?.status === 'Cancelled' && (
                  <div className="text-center py-4 rounded-xl animate-fade-up"
                       style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.15)' }}>
                    <p style={{ color: '#C0392B', fontSize: '13px', fontWeight: 600 }}>
                      This order has been cancelled.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="relative z-10 container mx-auto px-6"><Divider t={t} /></div>

          {/* ── Our Story ──────────────────────────────────────────────── */}
          <section className="relative z-10 container mx-auto px-6 py-24">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <SectionLabel t={t}>Our Story</SectionLabel>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '2.2rem',
                             fontWeight: 900, color: t.text, lineHeight: 1.1,
                             letterSpacing: '-0.01em', marginBottom: '20px' }}>
                  Born from a<br />
                  <em style={{ fontStyle: 'italic', color: t.accent }}>late-night craving.</em>
                </h2>
                <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.9, marginBottom: '14px' }}>
                  Munchies &amp; Shakes was founded on one belief: comfort food in Calabar deserves
                  to be extraordinary. We source the freshest local ingredients, smash our burgers
                  to a perfect crust, and blend shakes that keep you coming back.
                </p>
                <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.9, marginBottom: '28px' }}>
                  Every item on our menu is a labour of love — refined through hundreds of test batches
                  until it meets our standard: nothing less than exceptional.
                </p>
                <GhostBtn t={t} onClick={() => navigate('menu', { resetCategory: true })}>
                  View the Full Menu →
                </GhostBtn>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  { icon: '🌿', title: 'Fresh Every Day',    body: 'All ingredients sourced and prepped fresh every morning before service.' },
                  { icon: '🔥', title: 'Made to Order',      body: 'Nothing sits under a lamp. Every order is cooked the moment you place it.' },
                  { icon: '⚡', title: '30-Minute Promise',  body: 'Running late? Your next order is on us, no questions asked.' },
                ].map(item => (
                  <div key={item.title} className="p-6 rounded-2xl flex gap-5 items-start transition-all"
                       style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
                    <div className="text-2xl shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: '16px',
                                   fontWeight: 700, color: t.text, marginBottom: '4px' }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: '13px', color: t.textMuted, lineHeight: 1.7 }}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <div className="relative z-10 container mx-auto px-6"><Divider t={t} /></div>

          <section className="relative z-10 container mx-auto px-6 py-24 pb-32">
            <div className="text-center mb-12">
              <SectionLabel t={t}>Visit Us</SectionLabel>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem',
                           fontWeight: 700, color: t.text }}>
                Come Say Hello
              </h2>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: '📍', label: 'Location', lines: ['123 Galactic Way', 'Calabar, Nigeria'] },
                { icon: '🕐', label: 'Hours',    lines: ['Monday – Sunday', '11:00 AM – 11:00 PM'] },
                { icon: '📞', label: 'Contact',  lines: ['+234 000 000 0000', 'hello@munchies.ng'] },
              ].map(info => (
                <div key={info.label} className="p-8 rounded-2xl text-center transition-all"
                     style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
                  <div className="text-3xl mb-3">{info.icon}</div>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
                              textTransform: 'uppercase', color: t.accent, marginBottom: '10px',
                              fontFamily: "'DM Sans', sans-serif" }}>
                    {info.label}
                  </p>
                  {info.lines.map(l => (
                    <p key={l} style={{ fontSize: '14px', color: t.text, lineHeight: 1.8 }}>{l}</p>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer style={{ borderTop: `1px solid ${t.border}` }}>
            <div className="container mx-auto px-6 py-7 flex flex-col sm:flex-row
                            justify-between items-center gap-3">
              <span style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                             color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                © 2025 Munchies &amp; Shakes
              </span>
              <span style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                             color: t.textSubtle, fontFamily: "'DM Sans', sans-serif" }}>
                Calabar, Nigeria
              </span>
            </div>
          </footer>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MENU
      ══════════════════════════════════════════════════════════════════════ */}
      {currentView === 'menu' && (
        <section className="container mx-auto px-4 sm:px-6 pt-[86px] md:pt-[100px] pb-20 min-h-screen">
          {!selectedCategory ? (
            <>
              <div className="mb-10">
                <SectionLabel t={t}>What We Serve</SectionLabel>
                <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.8rem,6vw,2.8rem)', fontWeight: 900,
                             color: t.text, marginBottom: '8px' }}>
                  Our Brands
                </h1>
                <p style={{ fontSize: '15px', color: t.textMuted }}>Select a brand to explore its full menu.</p>
              </div>

              {categories.length === 0 ? <Spinner t={t} /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                      className="group text-left rounded-2xl overflow-hidden transition-all duration-300
                                 hover:-translate-y-1"
                      style={{ background: t.bgCard, border: `1px solid ${t.border}`,
                               boxShadow: t.shadow }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderAcc;
                                          e.currentTarget.style.boxShadow = t.shadowHover; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border;
                                          e.currentTarget.style.boxShadow = t.shadow; }}>
                      <div className="h-52 overflow-hidden relative"
                           style={{ background: t.bgElev }}>
                        <img src={getMediaUrl(cat.image) || `https://placehold.co/600x400/F5EDE0/C8B8A8?text=${encodeURIComponent(cat.name)}`}
                             alt={cat.name}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0"
                             style={{ background: 'linear-gradient(to top, rgba(44,24,16,0.35), transparent)' }} />
                      </div>
                      <div className="px-6 py-5 flex items-center justify-between">
                        <span style={{ fontFamily: "'Fraunces', serif", fontSize: '18px',
                                       fontWeight: 700, color: t.text }}>
                          {cat.name}
                        </span>
                        <span style={{ color: t.accent, fontSize: '18px' }}>→</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-10">
                <button onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-2 mb-7 text-[13px] font-medium transition-opacity hover:opacity-70"
                  style={{ color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                  ← Back to Brands
                </button>
                <div className="flex items-center gap-5">
                  {selectedCategory.image && (
                    <img src={getMediaUrl(selectedCategory.image)} alt={selectedCategory.name}
                         className="w-14 h-14 rounded-xl object-cover"
                         style={{ border: `2px solid ${t.borderAcc}` }} />
                  )}
                  <div>
                    <h1 style={{ fontFamily: "'Fraunces', serif",
                                 fontSize: isMobile ? '1.4rem' : '2.4rem',
                                 fontWeight: 900, color: t.text }}>
                      {selectedCategory.name}
                    </h1>
                    <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '3px' }}>
                      {selectedCategory.menu_items?.length || 0} items available
                    </p>
                  </div>
                </div>
              </div>

              {(() => {
                const grouped = selectedCategory.menu_items.reduce((acc, item) => {
                  const sub = item.subcategory || 'Menu';
                  if (!acc[sub]) acc[sub] = [];
                  acc[sub].push(item);
                  return acc;
                }, {});

                return Object.entries(grouped).map(([subName, items]) => (
                  <div key={subName} className="mb-14">
                    {(subName !== 'Menu' || Object.keys(grouped).length > 1) && (
                      <div className="flex items-center gap-4 mb-7">
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
                                       textTransform: 'uppercase', color: t.accent,
                                       fontFamily: "'DM Sans', sans-serif" }}>
                          {subName}
                        </span>
                        <div style={{ flex: 1, height: '1px', background: t.border }} />
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                      {items.map(item => {
                        const hasOpts  = item.options?.length > 0;
                        const selOptId = selectedOptions[item.id] ?? (hasOpts ? item.options[0].id : null);
                        const selOpt   = hasOpts ? (item.options.find(o => o.id === selOptId) ?? item.options[0]) : null;
                        const price    = hasOpts ? selOpt.price : item.price;

                        return (
                          <div key={item.id}
                            className="group rounded-2xl overflow-hidden transition-all duration-300
                                       hover:-translate-y-1 flex flex-col relative"
                            style={{ background: t.bgCard, border: `1px solid ${t.border}`,
                                     boxShadow: t.shadow }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderAcc;
                                                e.currentTarget.style.boxShadow = t.shadowHover; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border;
                                                e.currentTarget.style.boxShadow = t.shadow; }}>

                            {item.recommended && (
                              <span className="absolute top-3 right-3 z-10 text-[9px] font-bold
                                               tracking-wider uppercase px-3 py-1 rounded-full"
                                    style={{ background: t.accent, color: '#fff',
                                             fontFamily: "'DM Sans', sans-serif" }}>
                                Chef's Pick
                              </span>
                            )}

                            <div className="h-36 sm:h-48 overflow-hidden relative"
                                 style={{ background: t.bgElev }}>
                              <img src={getMediaUrl(item.image) || `https://placehold.co/600x400/F5EDE0/C8B8A8?text=${encodeURIComponent(item.name)}`}
                                   alt={item.name}
                                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0"
                                   style={{ background: 'linear-gradient(to top, rgba(44,24,16,0.25), transparent)' }} />
                            </div>

                            <div className="p-3 sm:p-5 flex-1 flex flex-col">
                              <div className="flex justify-between items-start gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 style={{ fontFamily: "'Fraunces', serif",
                                               fontSize: isMobile ? '12px' : '16px',
                                               fontWeight: 700, color: t.text, marginBottom: '3px',
                                               lineHeight: 1.3 }}>
                                    {item.name}
                                  </h3>
                                  {item.description && !isMobile && (
                                    <p className="line-clamp-2"
                                       style={{ fontSize: '12px', color: t.textMuted, lineHeight: 1.6 }}>
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <span style={{ fontFamily: "'Fraunces', serif",
                                               fontSize: isMobile ? '13px' : '18px',
                                               fontWeight: 700, color: t.accent, flexShrink: 0 }}>
                                  ₦{fmtPrice(price)}
                                </span>
                              </div>

                              {hasOpts && (
                                <select value={selOptId}
                                  onChange={e => handleOptionChange(item.id, parseInt(e.target.value))}
                                  className="mb-2 cursor-pointer"
                                  style={{ ...inputStyle,
                                           padding: isMobile ? '6px 8px' : '10px 14px',
                                           fontSize: isMobile ? '11px' : '13px' }}
                                  onFocus={e => e.target.style.borderColor = t.accent}
                                  onBlur={e => e.target.style.borderColor = t.border}>
                                  {item.options.map(o => (
                                    <option key={o.id} value={o.id}>{o.name} — ₦{fmtPrice(o.price)}</option>
                                  ))}
                                </select>
                              )}

                              <button
                                onClick={() => addToCart({
                                  id:                 hasOpts ? `${item.id}-${selOpt.id}` : item.id,
                                  name:               hasOpts ? `${item.name} (${selOpt.name})` : item.name,
                                  price,
                                  menu_item_id:       item.id,
                                  selected_option_id: hasOpts ? selOpt.id : null,
                                })}
                                className="mt-auto w-full rounded-xl font-semibold
                                           tracking-wide transition-all duration-200 active:scale-95"
                                style={{ border: `1.5px solid ${t.borderAcc}`, color: t.accent,
                                         background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                                         fontSize: isMobile ? '11px' : '12px',
                                         padding: isMobile ? '7px 4px' : '10px' }}
                                onMouseEnter={e => { e.currentTarget.style.background = t.accent;
                                                     e.currentTarget.style.color = '#fff';
                                                     e.currentTarget.style.borderColor = t.accent; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent';
                                                     e.currentTarget.style.color = t.accent;
                                                     e.currentTarget.style.borderColor = t.borderAcc; }}>
                                Add to Order
                              </button>
                            </div>
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

      {/* ══════════════════════════════════════════════════════════════════════
          EVENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {currentView === 'events' && (
        <section className="container mx-auto px-4 sm:px-6 pt-[86px] md:pt-[100px] pb-20 min-h-screen">
          <div className="mb-10">
            <SectionLabel t={t}>What's On</SectionLabel>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.8rem,6vw,2.8rem)', fontWeight: 900,
                         color: t.text, marginBottom: '8px' }}>
              Events &amp; Promos
            </h1>
            <p style={{ fontSize: '15px', color: t.textMuted }}>
              The latest from Munchies &amp; Shakes.
            </p>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-28">
              <p style={{ fontSize: '13px', color: t.textMuted, letterSpacing: '0.08em' }}>
                No active events at this time. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map(ev => (
                <div key={ev.id} className="rounded-2xl overflow-hidden flex flex-col"
                     style={{ background: t.bgCard, border: `1px solid ${t.border}`,
                              boxShadow: t.shadow }}>
                  {ev.image && (
                    <img src={getMediaUrl(ev.image)} alt={ev.title}
                         className="w-full h-60 object-cover" />
                  )}
                  <div className="p-5 sm:p-8">
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px',
                                 fontWeight: 700, color: t.text, marginBottom: '10px' }}>
                      {ev.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.8,
                                whiteSpace: 'pre-line' }}>
                      {ev.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CAREERS
      ══════════════════════════════════════════════════════════════════════ */}
      {currentView === 'careers' && (
        <section className="container mx-auto px-4 sm:px-6 pt-[86px] md:pt-[100px] pb-20 min-h-screen">
          <div className="mb-10">
            <SectionLabel t={t}>Join the Team</SectionLabel>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.8rem,6vw,2.8rem)', fontWeight: 900,
                         color: t.text, marginBottom: '8px' }}>
              Work With Us
            </h1>
            <p style={{ fontSize: '15px', color: t.textMuted }}>
              Passionate about food and great service? We'd love to meet you.
            </p>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-28">
              <p style={{ fontSize: '14px', color: t.textMuted, marginBottom: '20px' }}>
                No open positions right now — but we're always accepting CVs.
              </p>
              <GhostBtn t={t} onClick={() => {}}>Send Your CV</GhostBtn>
            </div>
          ) : (
            <div className="max-w-3xl space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="p-7 rounded-2xl flex flex-col md:flex-row
                                             justify-between items-start md:items-center gap-5"
                     style={{ background: t.bgCard, border: `1px solid ${t.border}`,
                              boxShadow: t.shadow }}>
                  <div className="flex-1">
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '19px',
                                 fontWeight: 700, color: t.text, marginBottom: '6px' }}>
                      {job.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: t.textMuted, lineHeight: 1.8,
                                whiteSpace: 'pre-line' }}>
                      {job.description}
                    </p>
                  </div>
                  <PrimaryBtn t={t} onClick={() => {}}>Apply Now</PrimaryBtn>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CART SIDEBAR
      ══════════════════════════════════════════════════════════════════════ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 cursor-pointer"
               style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
               onClick={() => setIsCartOpen(false)} />

          <div className="relative w-full max-w-sm h-full flex flex-col animate-slide-right scrollbar-thin"
               style={{ background: t.cartBg, borderLeft: `1px solid ${t.border}` }}>

            {/* Header */}
            <div className="px-6 py-5 flex justify-between items-center shrink-0"
                 style={{ borderBottom: `1px solid ${t.border}` }}>
              <div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px',
                             fontWeight: 700, color: t.text }}>
                  Your Order
                </h2>
                {cartItemCount > 0 && (
                  <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px',
                              fontFamily: "'DM Sans', sans-serif" }}>
                    {cartItemCount} item{cartItemCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <CloseBtn t={t} onClick={() => setIsCartOpen(false)} />
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="text-5xl mb-4">🛒</div>
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: '18px',
                              fontWeight: 700, color: t.text, marginBottom: '8px' }}>
                    Cart is empty
                  </p>
                  <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px' }}>
                    Add something delicious.
                  </p>
                  <GhostBtn t={t} onClick={() => { setIsCartOpen(false); navigate('menu', { resetCategory: true }); }}>
                    Browse Menu
                  </GhostBtn>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl"
                       style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                    <div className="flex-1 min-w-0">
                      <h4 className="truncate"
                          style={{ fontSize: '13px', fontWeight: 600, color: t.text,
                                   marginBottom: '3px', fontFamily: "'DM Sans', sans-serif" }}>
                        {item.name}
                      </h4>
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '15px',
                                     fontWeight: 700, color: t.accent }}>
                        ₦{item.price}
                      </span>
                    </div>
                    <div className="flex items-center rounded-xl overflow-hidden"
                         style={{ border: `1px solid ${t.border}` }}>
                      <button onClick={() => updateQty(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center text-lg font-light
                                   transition-colors"
                        style={{ color: t.textMuted, background: t.bgElev }}
                        onMouseEnter={e => e.currentTarget.style.color = t.accent}
                        onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>−</button>
                      <span className="w-8 text-center text-[13px] font-bold"
                            style={{ color: t.text, fontFamily: "'DM Sans', sans-serif",
                                     background: t.bgCard }}>
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQty(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center font-bold transition-colors"
                        style={{ color: t.textMuted, background: t.bgElev }}
                        onMouseEnter={e => e.currentTarget.style.color = t.accent}
                        onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="px-6 py-5 shrink-0"
                   style={{ borderTop: `1px solid ${t.border}` }}>
                <div className="flex justify-between items-baseline mb-5">
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em',
                                 textTransform: 'uppercase', color: t.textMuted,
                                 fontFamily: "'DM Sans', sans-serif" }}>
                    Total
                  </span>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: '26px',
                                 fontWeight: 700, color: t.text }}>
                    ₦{cartTotal.toFixed(2)}
                  </span>
                </div>
                <PrimaryBtn t={t} onClick={() => setIsCheckoutOpen(true)} full>
                  Proceed to Checkout
                </PrimaryBtn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CHECKOUT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 cursor-pointer"
               style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}
               onClick={() => !isSubmitting && !orderSuccess && setIsCheckoutOpen(false)} />

          <div className="relative w-full max-w-md rounded-2xl p-5 sm:p-8 animate-pop-in overflow-y-auto"
               style={{ background: t.bgCard, border: `1px solid ${t.border}`,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '90dvh' }}>

            {orderSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                     style={{ background: `rgba(193,92,46,0.12)`,
                              border: `1.5px solid ${t.borderAcc}` }}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       style={{ color: t.accent }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <SectionLabel t={t}>Order Confirmed</SectionLabel>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '26px',
                             fontWeight: 900, color: t.text, marginBottom: '8px' }}>
                  Order #{orderSuccess.id}
                </h2>
                <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.8,
                            maxWidth: '280px', margin: '0 auto 28px' }}>
                  Your order is being prepared. Use your order number above to track its status.
                </p>
                <PrimaryBtn t={t} onClick={() => { setIsCheckoutOpen(false); setIsCartOpen(false); setOrderSuccess(null); }} full>
                  Done
                </PrimaryBtn>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-7">
                  <div>
                    <SectionLabel t={t}>Place Order</SectionLabel>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px',
                                 fontWeight: 700, color: t.text }}>
                      Checkout
                    </h2>
                  </div>
                  <CloseBtn t={t} onClick={() => !isSubmitting && setIsCheckoutOpen(false)} />
                </div>

                <form onSubmit={handleCheckout} className="space-y-4">
                  {[
                    { label: 'Full Name',    key: 'name',  type: 'text', ph: 'John Doe' },
                    { label: 'Phone Number', key: 'phone', type: 'tel',  ph: '08012345678' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700,
                                      letterSpacing: '0.18em', textTransform: 'uppercase',
                                      color: t.textMuted, marginBottom: '8px',
                                      fontFamily: "'DM Sans', sans-serif" }}>
                        {f.label}
                      </label>
                      <input required type={f.type} placeholder={f.ph}
                        value={checkoutData[f.key]}
                        onChange={e => setCheckoutData({ ...checkoutData, [f.key]: e.target.value })}
                        style={{ ...inputStyle, background: t.bgInput }}
                        onFocus={e => e.target.style.borderColor = t.accent}
                        onBlur={e => e.target.style.borderColor = t.border}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.18em', textTransform: 'uppercase',
                                    color: t.textMuted, marginBottom: '8px',
                                    fontFamily: "'DM Sans', sans-serif" }}>
                      Delivery Address
                    </label>
                    <textarea required placeholder="123 Galaxy Avenue, Calabar…"
                      value={checkoutData.address}
                      onChange={e => setCheckoutData({ ...checkoutData, address: e.target.value })}
                      style={{ ...inputStyle, height: '84px', resize: 'none',
                               background: t.bgInput }}
                      onFocus={e => e.target.style.borderColor = t.accent}
                      onBlur={e => e.target.style.borderColor = t.border}
                    />
                  </div>

                  <div className="flex justify-between items-center py-4"
                       style={{ borderTop: `1px solid ${t.border}`,
                                borderBottom: `1px solid ${t.border}` }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
                                   textTransform: 'uppercase', color: t.textMuted,
                                   fontFamily: "'DM Sans', sans-serif" }}>
                      Order Total
                    </span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '24px',
                                   fontWeight: 700, color: t.accent }}>
                      ₦{cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <PrimaryBtn t={t} type="submit" disabled={isSubmitting} full>
                    {isSubmitting ? 'Placing Order…' : 'Place Order'}
                  </PrimaryBtn>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TOAST
      ══════════════════════════════════════════════════════════════════════ */}
      {toastMessage && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[120] pointer-events-none
                        flex items-center gap-3 px-5 py-3.5 rounded-xl animate-fade-up"
             style={{ background: t.bgCard, border: `1px solid ${t.border}`,
                      color: t.text, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                      fontFamily: "'DM Sans', sans-serif" }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
               style={{ background: t.accent }}>
            <svg className="w-3 h-3" fill="none" stroke="#fff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
