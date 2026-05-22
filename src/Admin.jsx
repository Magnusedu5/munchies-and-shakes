import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8000`;
const API = `${BACKEND}/api/admin`;

const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${BACKEND}${path}`;
  return path;
};

const DARK = {
  bg:'#17120D', bgCard:'#1F1812', bgElev:'#271E15', bgInput:'#2D2018',
  bgNav:'rgba(23,18,13,0.97)', navBorder:'rgba(193,92,46,0.12)',
  text:'#EDE0C8', textMuted:'#8A7060', textSubtle:'#5A4A3A',
  accent:'#C15C2E', accentHover:'#D46A38',
  border:'rgba(193,92,46,0.1)', borderAcc:'rgba(193,92,46,0.22)',
  shadow:'0 2px 20px rgba(0,0,0,0.25)', shadowHover:'0 8px 40px rgba(0,0,0,0.4)',
  tag:'rgba(193,92,46,0.08)', tagText:'#EDE0C8',
  danger:'#E87070', dangerBg:'rgba(232,112,112,0.1)',
  success:'#6FCF97', successBg:'rgba(111,207,151,0.1)',
};

const STATUS_COLORS = {
  'Pending':         { bg: 'rgba(245,158,11,0.12)', text: '#D97706' },
  'Processing':      { bg: 'rgba(59,130,246,0.12)',  text: '#2563EB' },
  'Out for Delivery':{ bg: 'rgba(139,92,246,0.12)',  text: '#7C3AED' },
  'Delivered':       { bg: 'rgba(34,197,94,0.12)',   text: '#16A34A' },
  'Cancelled':       { bg: 'rgba(239,68,68,0.1)',    text: '#DC2626' },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function fmtNaira(val) {
  const n = parseFloat(val) || 0;
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function Spinner({ t }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'80px 0', gap:'12px' }}>
      <div style={{
        width:'32px', height:'32px', borderRadius:'50%',
        border:`3px solid ${t.border}`, borderTopColor: t.accent,
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize:'11px', color:t.textMuted, letterSpacing:'0.15em', textTransform:'uppercase',
                     fontFamily:"'DM Sans', sans-serif" }}>Loading…</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg:'rgba(0,0,0,0.06)', text:'#666' };
  return (
    <span style={{
      display:'inline-block', padding:'3px 10px', borderRadius:'999px',
      fontSize:'11px', fontWeight:700, letterSpacing:'0.05em',
      background: c.bg, color: c.text, fontFamily:"'DM Sans', sans-serif",
      whiteSpace:'nowrap'
    }}>{status}</span>
  );
}

function Toast({ t, message, type }) {
  return (
    <div style={{
      position:'fixed', bottom:'28px', left:'50%', transform:'translateX(-50%)',
      zIndex:9999, display:'flex', alignItems:'center', gap:'10px',
      padding:'12px 20px', borderRadius:'12px',
      background: t.bgCard, border:`1px solid ${t.border}`,
      boxShadow:'0 8px 40px rgba(0,0,0,0.18)',
      fontFamily:"'DM Sans', sans-serif", pointerEvents:'none',
    }}>
      <div style={{
        width:'20px', height:'20px', borderRadius:'50%', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: type === 'error' ? t.danger : t.accent,
      }}>
        {type === 'error'
          ? <span style={{ color:'#fff', fontSize:'12px', fontWeight:700 }}>!</span>
          : <svg width="12" height="12" fill="none" stroke="#fff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
            </svg>
        }
      </div>
      <span style={{ fontSize:'13px', color: t.text, fontWeight:500 }}>{message}</span>
    </div>
  );
}

function ModalOverlay({ t, onClose, children }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'
    }}>
      <div onClick={onClose} style={{
        position:'absolute', inset:0,
        background:'rgba(0,0,0,0.55)', backdropFilter:'blur(10px)'
      }} />
      <div style={{
        position:'relative', width:'100%', maxWidth:'520px',
        maxHeight:'90vh', overflowY:'auto',
        background: t.bgCard, border:`1px solid ${t.border}`,
        borderRadius:'20px', padding:'32px',
        boxShadow:'0 24px 80px rgba(0,0,0,0.25)'
      }}>
        {children}
      </div>
    </div>
  );
}

const inputBase = (t) => ({
  background: t.bgInput, color: t.text,
  border: `1.5px solid ${t.border}`,
  borderRadius:'10px', padding:'11px 14px',
  fontSize:'14px', fontFamily:"'DM Sans', sans-serif",
  outline:'none', width:'100%', boxSizing:'border-box',
  transition:'border-color 0.2s',
});

function LabeledInput({ t, label, ...props }) {
  return (
    <div style={{ marginBottom:'14px' }}>
      <label style={{
        display:'block', fontSize:'11px', fontWeight:700,
        letterSpacing:'0.18em', textTransform:'uppercase',
        color: t.textMuted, marginBottom:'7px',
        fontFamily:"'DM Sans', sans-serif"
      }}>{label}</label>
      {props.textarea
        ? <textarea {...props} style={{ ...inputBase(t), height:'90px', resize:'vertical' }}
            onFocus={e => e.target.style.borderColor = t.accent}
            onBlur={e => e.target.style.borderColor = t.border} />
        : <input {...props} style={inputBase(t)}
            onFocus={e => e.target.style.borderColor = t.accent}
            onBlur={e => e.target.style.borderColor = t.border} />
      }
    </div>
  );
}

function Btn({ t, onClick, variant='primary', children, small, type='button' }) {
  const [hover, setHover] = useState(false);
  const base = {
    border:'none', cursor:'pointer', borderRadius:'10px',
    fontFamily:"'DM Sans', sans-serif", fontWeight:600,
    transition:'all 0.15s', fontSize: small ? '12px' : '13px',
    padding: small ? '6px 14px' : '10px 20px',
  };
  const styles = {
    primary:  { background: hover ? t.accentHover : t.accent, color:'#fff' },
    ghost:    { background: hover ? t.bgElev : 'transparent', color: t.text,
                border:`1.5px solid ${t.border}` },
    danger:   { background: hover ? 'rgba(220,38,38,0.15)' : t.dangerBg, color: t.danger,
                border:`1px solid ${hover ? t.danger : 'transparent'}` },
  };
  return (
    <button type={type} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...styles[variant], transform: hover ? 'translateY(-1px)' : 'none' }}>
      {children}
    </button>
  );
}

// ─── PIN Screen ───────────────────────────────────────────────────────────────
function PinScreen({ t, onAuth }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === 'admin123') { onAuth(); }
    else { setError('Incorrect PIN. Please try again.'); setPin(''); }
  };
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background: t.bg, display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background: t.bgCard, border:`1px solid ${t.border}`,
        borderRadius:'20px', padding:'48px 40px', width:'100%', maxWidth:'360px',
        boxShadow: t.shadow, textAlign:'center'
      }}>
        <div style={{
          width:'56px', height:'56px', borderRadius:'16px', margin:'0 auto 20px',
          background: t.bgElev, display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <svg width="24" height="24" fill="none" stroke={t.accent} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase',
                    color: t.accent, marginBottom:'8px', fontFamily:"'DM Sans', sans-serif" }}>
          Admin Access
        </p>
        <h2 style={{ fontFamily:"'Fraunces', serif", fontSize:'26px', fontWeight:700,
                     color: t.text, marginBottom:'28px' }}>
          Enter PIN
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password" placeholder="••••••••" value={pin}
            onChange={e => { setPin(e.target.value); setError(''); }}
            style={{ ...inputBase(t), textAlign:'center', fontSize:'18px',
                     letterSpacing:'0.3em', marginBottom:'14px' }}
            onFocus={e => e.target.style.borderColor = t.accent}
            onBlur={e => e.target.style.borderColor = t.border}
            autoFocus
          />
          {error && (
            <p style={{ fontSize:'13px', color: t.danger, marginBottom:'12px',
                        background: t.dangerBg, padding:'10px', borderRadius:'8px',
                        fontFamily:"'DM Sans', sans-serif" }}>
              {error}
            </p>
          )}
          <Btn t={t} type="submit" variant="primary" style={{ width:'100%' }}>
            Unlock Admin Panel
          </Btn>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
function Dashboard({ t }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/stats/`).then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner t={t} />;
  if (!stats) return <p style={{ color: t.danger }}>Failed to load stats.</p>;

  const statCards = [
    { label:'Total Orders',    value: stats.total_orders,  sub:'all time' },
    { label:'Total Revenue',   value: fmtNaira(stats.total_revenue), sub:'excl. cancelled' },
    { label:"Today's Orders",  value: stats.today_orders,  sub:'placed today' },
    { label:"Today's Revenue", value: fmtNaira(stats.today_revenue), sub:'today excl. cancelled' },
    { label:'Pending Orders',  value: stats.pending_count, sub:'awaiting action',
      highlight: stats.pending_count > 0 },
    { label:'Out for Delivery',value: stats.delivery_count, sub:'on the road' },
  ];

  return (
    <div>
      <div style={{ marginBottom:'32px' }}>
        <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase',
                    color: t.accent, marginBottom:'6px', fontFamily:"'DM Sans', sans-serif" }}>
          Overview
        </p>
        <h2 style={{ fontFamily:"'Fraunces', serif", fontSize:'28px', fontWeight:700, color: t.text }}>
          Dashboard
        </h2>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px', marginBottom:'40px' }}>
        {statCards.map(c => (
          <div key={c.label} style={{
            background: t.bgCard, border:`1px solid ${c.highlight ? t.accent : t.border}`,
            borderRadius:'16px', padding:'24px', boxShadow: t.shadow,
          }}>
            <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase',
                        color: c.highlight ? t.accent : t.textMuted, marginBottom:'10px',
                        fontFamily:"'DM Sans', sans-serif" }}>
              {c.label}
            </p>
            <p style={{ fontFamily:"'Fraunces', serif", fontSize:'32px', fontWeight:700,
                        color: c.highlight ? t.accent : t.text, lineHeight:1 }}>
              {c.value}
            </p>
            <p style={{ fontSize:'11px', color: t.textSubtle, marginTop:'6px',
                        fontFamily:"'DM Sans', sans-serif" }}>
              {c.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Recent orders table */}
      <div style={{ background: t.bgCard, border:`1px solid ${t.border}`, borderRadius:'16px', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${t.border}` }}>
          <h3 style={{ fontFamily:"'Fraunces', serif", fontSize:'18px', fontWeight:700, color: t.text }}>
            Recent Orders
          </h3>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${t.border}` }}>
                {['Order #', 'Customer', 'Items', 'Total', 'Status', 'Time'].map(h => (
                  <th key={h} style={{
                    textAlign:'left', padding:'12px 16px',
                    fontSize:'11px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                    color: t.textMuted, fontFamily:"'DM Sans', sans-serif"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recent_orders.map(o => (
                <tr key={o.id} style={{ borderBottom:`1px solid ${t.border}` }}>
                  <td style={{ padding:'14px 16px', fontFamily:"'Fraunces', serif", fontSize:'15px',
                               fontWeight:700, color: t.accent }}>#{o.id}</td>
                  <td style={{ padding:'14px 16px', fontSize:'13px', color: t.text,
                               fontFamily:"'DM Sans', sans-serif" }}>{o.customer_name}</td>
                  <td style={{ padding:'14px 16px', fontSize:'12px', color: t.textMuted,
                               fontFamily:"'DM Sans', sans-serif", maxWidth:'200px' }}>
                    {o.order_items.map(i => `${i.quantity}x ${i.menu_item_name}`).join(', ')}
                  </td>
                  <td style={{ padding:'14px 16px', fontFamily:"'Fraunces', serif", fontSize:'14px',
                               fontWeight:700, color: t.text }}>{fmtNaira(o.total_amount)}</td>
                  <td style={{ padding:'14px 16px' }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding:'14px 16px', fontSize:'12px', color: t.textSubtle,
                               fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap' }}>
                    {timeAgo(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Section ───────────────────────────────────────────────────────────
const STATUS_FLOW = ['Pending', 'Processing', 'Out for Delivery', 'Delivered'];

function OrderCard({ t, o, expanded, onToggle, onStatusChange, updating }) {
  const sc = STATUS_COLORS[o.status] || { bg:'rgba(0,0,0,0.06)', text:'#666' };
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1] || null;

  return (
    <div style={{
      background: t.bgCard, border:`1px solid ${expanded ? t.borderAcc : t.border}`,
      borderRadius:'14px', overflow:'hidden',
      transition:'border-color 0.2s, box-shadow 0.2s',
      boxShadow: expanded ? t.shadowHover : t.shadow,
    }}>
      {/* Card header — always visible */}
      <div onClick={onToggle} style={{ padding:'16px 18px', cursor:'pointer' }}>
        {/* Row 1: ID + status + time */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
          <span style={{ fontFamily:"'Fraunces', serif", fontSize:'16px', fontWeight:700,
                         color: t.accent, flexShrink:0 }}>
            #{o.id}
          </span>
          <span style={{ ...sc, padding:'3px 10px', borderRadius:'999px',
                         fontSize:'11px', fontWeight:700, fontFamily:"'DM Sans', sans-serif",
                         background: sc.bg, color: sc.text, letterSpacing:'0.04em' }}>
            {o.status}
          </span>
          <span style={{ marginLeft:'auto', fontSize:'11px', color: t.textSubtle,
                         fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap' }}>
            {timeAgo(o.created_at)}
          </span>
          {/* Chevron */}
          <svg width="14" height="14" fill="none" stroke={t.textSubtle} viewBox="0 0 24 24"
            style={{ flexShrink:0, transition:'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>

        {/* Row 2: customer info + total */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:'14px', fontWeight:600, color: t.text,
                          fontFamily:"'DM Sans', sans-serif", marginBottom:'2px' }}>
              {o.customer_name}
            </div>
            <div style={{ fontSize:'12px', color: t.textMuted, fontFamily:"'DM Sans', sans-serif" }}>
              {o.phone_number}
            </div>
          </div>
          <div style={{ fontFamily:"'Fraunces', serif", fontSize:'18px', fontWeight:700,
                        color: t.text, flexShrink:0 }}>
            {fmtNaira(o.total_amount)}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${t.border}`, background: t.bgElev }}>

          {/* Order items */}
          <div style={{ padding:'16px 18px', borderBottom:`1px solid ${t.border}` }}>
            <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase',
                        color: t.textMuted, marginBottom:'12px', fontFamily:"'DM Sans', sans-serif" }}>
              Items Ordered
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {o.order_items.map(item => (
                <div key={item.id} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 14px', borderRadius:'10px',
                  background: t.bgCard, border:`1px solid ${t.border}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                    <span style={{
                      width:'26px', height:'26px', borderRadius:'8px', flexShrink:0,
                      background: t.accent, color:'#fff', fontSize:'11px', fontWeight:700,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:"'DM Sans', sans-serif"
                    }}>{item.quantity}</span>
                    <span style={{ fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif",
                                   overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.menu_item_name}{item.option_name ? ` · ${item.option_name}` : ''}
                    </span>
                  </div>
                  <span style={{ fontFamily:"'Fraunces', serif", fontSize:'14px', fontWeight:700,
                                 color: t.accent, flexShrink:0, marginLeft:'12px' }}>
                    {fmtNaira(parseFloat(item.price_at_purchase) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                          marginTop:'14px', paddingTop:'12px', borderTop:`1px solid ${t.border}` }}>
              <span style={{ fontSize:'12px', fontWeight:600, color: t.textMuted,
                             fontFamily:"'DM Sans', sans-serif", textTransform:'uppercase',
                             letterSpacing:'0.1em' }}>
                Order Total
              </span>
              <span style={{ fontFamily:"'Fraunces', serif", fontSize:'20px', fontWeight:700, color: t.text }}>
                {fmtNaira(o.total_amount)}
              </span>
            </div>
          </div>

          {/* Delivery info */}
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${t.border}` }}>
            <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase',
                        color: t.textMuted, marginBottom:'10px', fontFamily:"'DM Sans', sans-serif" }}>
              Delivery Details
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <div style={{ display:'flex', gap:'8px' }}>
                <span style={{ fontSize:'12px', color: t.textMuted, fontFamily:"'DM Sans', sans-serif",
                               minWidth:'60px' }}>Name</span>
                <span style={{ fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif",
                               fontWeight:600 }}>{o.customer_name}</span>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <span style={{ fontSize:'12px', color: t.textMuted, fontFamily:"'DM Sans', sans-serif",
                               minWidth:'60px' }}>Phone</span>
                <a href={`tel:${o.phone_number}`} style={{ fontSize:'13px', color: t.accent,
                   fontFamily:"'DM Sans', sans-serif", fontWeight:600, textDecoration:'none' }}>
                  {o.phone_number}
                </a>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
                <span style={{ fontSize:'12px', color: t.textMuted, fontFamily:"'DM Sans', sans-serif",
                               minWidth:'60px' }}>Address</span>
                <span style={{ fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif",
                               lineHeight:1.5 }}>{o.delivery_address}</span>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <span style={{ fontSize:'12px', color: t.textMuted, fontFamily:"'DM Sans', sans-serif",
                               minWidth:'60px' }}>Placed</span>
                <span style={{ fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif" }}>
                  {new Date(o.created_at).toLocaleString('en-NG', {
                    weekday:'short', month:'short', day:'numeric',
                    hour:'2-digit', minute:'2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div style={{ padding:'14px 18px' }}>
            <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase',
                        color: t.textMuted, marginBottom:'12px', fontFamily:"'DM Sans', sans-serif" }}>
              Update Status
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {['Pending','Processing','Out for Delivery','Delivered','Cancelled'].map(s => {
                const isActive = o.status === s;
                const isDanger = s === 'Cancelled';
                return (
                  <button key={s}
                    onClick={() => !isActive && onStatusChange(o.id, s)}
                    disabled={isActive || updating}
                    style={{
                      padding:'8px 14px', borderRadius:'10px', fontSize:'12px', fontWeight:600,
                      cursor: isActive ? 'default' : 'pointer',
                      fontFamily:"'DM Sans', sans-serif", transition:'all 0.15s',
                      border: isActive
                        ? `2px solid ${STATUS_COLORS[s]?.text || t.accent}`
                        : `1.5px solid ${isDanger ? t.danger : t.border}`,
                      background: isActive
                        ? (STATUS_COLORS[s]?.bg || 'transparent')
                        : 'transparent',
                      color: isActive
                        ? (STATUS_COLORS[s]?.text || t.accent)
                        : isDanger ? t.danger : t.textMuted,
                      opacity: updating ? 0.5 : 1,
                    }}>
                    {isActive && '✓ '}{s}
                  </button>
                );
              })}
            </div>

            {/* Quick advance button */}
            {nextStatus && o.status !== 'Cancelled' && (
              <button
                onClick={() => onStatusChange(o.id, nextStatus)}
                disabled={updating}
                style={{
                  marginTop:'12px', width:'100%', padding:'11px',
                  borderRadius:'10px', fontSize:'13px', fontWeight:700,
                  cursor:'pointer', fontFamily:"'DM Sans', sans-serif",
                  background: t.accent, color:'#fff', border:'none',
                  opacity: updating ? 0.6 : 1, transition:'opacity 0.15s',
                }}>
                {updating ? 'Updating…' : `→ Mark as ${nextStatus}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Orders({ t, showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const statusTabs = ['All', 'Pending', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];

  const load = useCallback(() => {
    setLoading(true);
    const url = filter !== 'All'
      ? `${API}/orders/?status=${encodeURIComponent(filter)}`
      : `${API}/orders/`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setOrders(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API}/orders/${id}/status/`, {
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      showToast(`Order #${id} → ${status}`);
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.customer_name.toLowerCase().includes(q) ||
      String(o.id).includes(q) ||
      o.phone_number?.includes(q)
    );
  });

  const pendingCount = orders.filter(o => o.status === 'Pending').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                    gap:'12px', marginBottom:'24px', flexWrap:'wrap' }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase',
                      color: t.accent, marginBottom:'4px', fontFamily:"'DM Sans', sans-serif" }}>
            Manage
          </p>
          <h2 style={{ fontFamily:"'Fraunces', serif", fontSize:'26px', fontWeight:700, color: t.text,
                       display:'flex', alignItems:'center', gap:'12px' }}>
            Orders
            {pendingCount > 0 && (
              <span style={{ background:'#DC2626', color:'#fff', fontSize:'12px', fontWeight:700,
                             padding:'2px 10px', borderRadius:'999px', fontFamily:"'DM Sans', sans-serif" }}>
                {pendingCount} pending
              </span>
            )}
          </h2>
        </div>
        <button onClick={load}
          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px',
                   background: t.bgElev, border:`1px solid ${t.border}`, borderRadius:'10px',
                   cursor:'pointer', color: t.textMuted, fontSize:'12px', fontWeight:600,
                   fontFamily:"'DM Sans', sans-serif" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Search */}
      <input placeholder="Search by name, phone, or order ID…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ ...inputBase(t), marginBottom:'14px' }}
        onFocus={e => e.target.style.borderColor = t.accent}
        onBlur={e => e.target.style.borderColor = t.border}
      />

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'20px' }}>
        {statusTabs.map(tab => {
          const count = tab === 'All' ? orders.length : orders.filter(o => o.status === tab).length;
          const active = filter === tab;
          return (
            <button key={tab} onClick={() => setFilter(tab)}
              style={{
                padding:'6px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:600,
                cursor:'pointer', fontFamily:"'DM Sans', sans-serif", transition:'all 0.15s',
                border:`1.5px solid ${active ? t.accent : t.border}`,
                background: active ? t.accent : 'transparent',
                color: active ? '#fff' : t.textMuted,
              }}>
              {tab}{count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {loading ? <Spinner t={t} /> : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color: t.textMuted,
                      fontFamily:"'DM Sans', sans-serif" }}>
          <div style={{ fontSize:'32px', marginBottom:'12px' }}>📋</div>
          <p style={{ fontSize:'14px' }}>No orders found.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {filtered.map(o => (
            <OrderCard
              key={o.id}
              t={t}
              o={o}
              expanded={expandedId === o.id}
              onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)}
              onStatusChange={updateStatus}
              updating={updatingId === o.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Menu Section ─────────────────────────────────────────────────────────────
function MenuSection({ t, showToast }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name:'', description:'', price:'', category:'', subcategory:'', is_available:true, recommended:false });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newOpt, setNewOpt] = useState({ name:'', price:'' });
  const [showSubcatPanel, setShowSubcatPanel] = useState(false);
  const [newSubcat, setNewSubcat] = useState({ name:'', category:'' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/menu-items/`).then(r => r.json()),
      fetch(`${API}/categories/`).then(r => r.json()),
      fetch(`${API}/subcategories/`).then(r => r.json()),
    ]).then(([its, cats, subcats]) => {
      setItems(its); setCategories(cats); setSubcategories(subcats); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    const firstCat = categories[0]?.id || '';
    setForm({ name:'', description:'', price:'', category: firstCat, subcategory:'', is_available:true, recommended:false });
    setImageFile(null);
    setModal({ mode:'add' });
  };

  const openEdit = (item) => {
    setForm({
      name: item.name, description: item.description, price: item.price,
      category: item.category, subcategory: item.subcategory || '',
      is_available: item.is_available, recommended: item.recommended,
    });
    setImageFile(null);
    setModal({ mode:'edit', item });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = modal.mode === 'add' ? 'POST' : 'PATCH';
      const url = modal.mode === 'add' ? `${API}/menu-items/` : `${API}/menu-items/${modal.item.id}/`;
      const payload = { ...form, subcategory: form.subcategory || null };

      let res;
      if (imageFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => { if (v !== null) fd.append(k, v); else fd.append(k, ''); });
        fd.append('image', imageFile);
        res = await fetch(url, { method, body: fd });
      } else {
        res = await fetch(url, {
          method, headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) throw new Error();
      showToast(modal.mode === 'add' ? 'Item added' : 'Item updated');
      setModal(null); load();
    } catch {
      showToast('Failed to save item', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      const res = await fetch(`${API}/menu-items/${id}/`, { method:'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error();
      showToast('Item deleted');
      load();
    } catch { showToast('Failed to delete item', 'error'); }
  };

  const handleToggleAvailable = async (item) => {
    try {
      await fetch(`${API}/menu-items/${item.id}/`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ is_available: !item.is_available })
      });
      load();
    } catch { showToast('Failed to update availability', 'error'); }
  };

  const handleAddOption = async (itemId) => {
    if (!newOpt.name || !newOpt.price) return;
    try {
      const res = await fetch(`${API}/menu-items/${itemId}/options/`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: newOpt.name, price: parseFloat(newOpt.price) })
      });
      if (!res.ok) throw new Error();
      setNewOpt({ name:'', price:'' });
      showToast('Option added');
      load();
      const updated = await fetch(`${API}/menu-items/${itemId}/`).then(r => r.json());
      setModal(m => m ? { ...m, item: updated } : m);
    } catch { showToast('Failed to add option', 'error'); }
  };

  const handleDeleteOption = async (optId, itemId) => {
    try {
      await fetch(`${API}/options/${optId}/`, { method:'DELETE' });
      const updated = await fetch(`${API}/menu-items/${itemId}/`).then(r => r.json());
      setModal(m => m ? { ...m, item: updated } : m);
      load();
    } catch { showToast('Failed to delete option', 'error'); }
  };

  const handleAddSubcat = async () => {
    if (!newSubcat.name.trim() || !newSubcat.category) return;
    try {
      const res = await fetch(`${API}/subcategories/`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: newSubcat.name.trim(), category: parseInt(newSubcat.category) })
      });
      if (!res.ok) throw new Error();
      setNewSubcat(s => ({ name:'', category: s.category }));
      showToast('Subcategory added');
      load();
    } catch { showToast('Failed to add subcategory', 'error'); }
  };

  const handleDeleteSubcat = async (id) => {
    if (!window.confirm('Delete this subcategory? Items using it will be unassigned.')) return;
    try {
      await fetch(`${API}/subcategories/${id}/`, { method:'DELETE' });
      showToast('Subcategory deleted');
      load();
    } catch { showToast('Failed to delete subcategory', 'error'); }
  };

  const displayed = catFilter === 'All' ? items : items.filter(i => i.category_name === catFilter);
  const catNames = ['All', ...categories.map(c => c.name)];
  const editItem = modal?.item;
  const modalSubcats = subcategories.filter(sc => !form.category || sc.category === parseInt(form.category));

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase',
                      color: t.accent, marginBottom:'6px', fontFamily:"'DM Sans', sans-serif" }}>Manage</p>
          <h2 style={{ fontFamily:"'Fraunces', serif", fontSize:'28px', fontWeight:700, color: t.text }}>Menu Items</h2>
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <Btn t={t} onClick={() => setShowSubcatPanel(v => !v)} variant="ghost">
            {showSubcatPanel ? 'Hide' : 'Manage'} Subgroups
          </Btn>
          <Btn t={t} onClick={openAdd} variant="primary">+ Add Item</Btn>
        </div>
      </div>

      {/* Subcategory management panel */}
      {showSubcatPanel && (
        <div style={{
          background: t.bgCard, border:`1px solid ${t.borderAcc}`,
          borderRadius:'16px', padding:'20px', marginBottom:'24px'
        }}>
          <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase',
                      color: t.accent, marginBottom:'16px', fontFamily:"'DM Sans', sans-serif" }}>
            Subgroups
          </p>

          {/* List subcategories grouped by category */}
          {categories.map(cat => {
            const subs = subcategories.filter(sc => sc.category === cat.id);
            return (
              <div key={cat.id} style={{ marginBottom:'16px' }}>
                <p style={{ fontSize:'12px', fontWeight:700, color: t.textMuted, marginBottom:'8px',
                            fontFamily:"'DM Sans', sans-serif", letterSpacing:'0.05em' }}>
                  {cat.name}
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {subs.length === 0 && (
                    <span style={{ fontSize:'12px', color: t.textSubtle, fontFamily:"'DM Sans', sans-serif" }}>
                      No subgroups
                    </span>
                  )}
                  {subs.map(sc => (
                    <span key={sc.id} style={{
                      display:'inline-flex', alignItems:'center', gap:'6px',
                      padding:'5px 12px', borderRadius:'999px', fontSize:'12px',
                      background: t.tag, color: t.text, fontFamily:"'DM Sans', sans-serif"
                    }}>
                      {sc.name}
                      <button onClick={() => handleDeleteSubcat(sc.id)}
                        style={{ background:'none', border:'none', cursor:'pointer',
                                 color: t.danger, fontSize:'14px', lineHeight:1, padding:'0 2px' }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Add new subcategory */}
          <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:'16px', marginTop:'8px' }}>
            <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                        color: t.textMuted, marginBottom:'10px', fontFamily:"'DM Sans', sans-serif" }}>
              Add Subgroup
            </p>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              <select value={newSubcat.category}
                onChange={e => setNewSubcat(s => ({ ...s, category: e.target.value }))}
                style={{ ...inputBase(t), width:'160px', flex:'0 0 auto' }}
                onFocus={e => e.target.style.borderColor = t.accent}
                onBlur={e => e.target.style.borderColor = t.border}>
                <option value="">Category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Subgroup name" value={newSubcat.name}
                onChange={e => setNewSubcat(s => ({ ...s, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddSubcat()}
                style={{ ...inputBase(t), flex:1, minWidth:'140px' }}
                onFocus={e => e.target.style.borderColor = t.accent}
                onBlur={e => e.target.style.borderColor = t.border} />
              <Btn t={t} onClick={handleAddSubcat} variant="primary" small>Add</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'24px' }}>
        {catNames.map(cn => (
          <button key={cn} onClick={() => setCatFilter(cn)}
            onMouseEnter={e => { if (catFilter !== cn) e.currentTarget.style.background = t.bgElev; }}
            onMouseLeave={e => { if (catFilter !== cn) e.currentTarget.style.background = 'transparent'; }}
            style={{
              padding:'6px 16px', borderRadius:'999px', fontSize:'12px', fontWeight:600,
              cursor:'pointer', border:`1.5px solid ${catFilter === cn ? t.accent : t.border}`,
              background: catFilter === cn ? t.accent : 'transparent',
              color: catFilter === cn ? '#fff' : t.textMuted,
              fontFamily:"'DM Sans', sans-serif", transition:'all 0.15s'
            }}>
            {cn}
          </button>
        ))}
      </div>

      {loading ? <Spinner t={t} /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px' }}>
          {displayed.map(item => (
            <div key={item.id} style={{
              background: t.bgCard, border:`1px solid ${t.border}`,
              borderRadius:'16px', overflow:'hidden', boxShadow: t.shadow,
              display:'flex', flexDirection:'column'
            }}>
              {/* Image */}
              <div style={{ height:'140px', background: t.bgElev, position:'relative', overflow:'hidden' }}>
                <img
                  src={getMediaUrl(item.image) || `https://placehold.co/400x280/F5EDE0/C8B8A8?text=${encodeURIComponent(item.name)}`}
                  alt={item.name}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                />
                {item.recommended && (
                  <span style={{
                    position:'absolute', top:'8px', right:'8px',
                    background: t.accent, color:'#fff', fontSize:'9px',
                    fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                    padding:'3px 8px', borderRadius:'999px', fontFamily:"'DM Sans', sans-serif"
                  }}>Chef's Pick</span>
                )}
              </div>

              <div style={{ padding:'16px', flex:1, display:'flex', flexDirection:'column', gap:'10px' }}>
                <div>
                  <h4 style={{ fontFamily:"'Fraunces', serif", fontSize:'15px', fontWeight:700,
                               color: t.text, marginBottom:'4px' }}>{item.name}</h4>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                    <span style={{ fontFamily:"'Fraunces', serif", fontSize:'15px',
                                   fontWeight:700, color: t.accent }}>
                      {fmtNaira(item.price)}
                    </span>
                    <span style={{
                      fontSize:'10px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                      background: t.tag, color: t.textMuted, padding:'2px 8px', borderRadius:'999px',
                      fontFamily:"'DM Sans', sans-serif"
                    }}>{item.category_name}</span>
                    {item.subcategory_name && (
                      <span style={{
                        fontSize:'10px', fontWeight:600,
                        background:'rgba(193,92,46,0.15)', color: t.accent,
                        padding:'2px 8px', borderRadius:'999px',
                        fontFamily:"'DM Sans', sans-serif"
                      }}>{item.subcategory_name}</span>
                    )}
                  </div>
                </div>

                {/* Available toggle */}
                <button onClick={() => handleToggleAvailable(item)}
                  style={{
                    padding:'5px 12px', borderRadius:'999px', fontSize:'11px', fontWeight:700,
                    cursor:'pointer', border:'none', fontFamily:"'DM Sans', sans-serif",
                    background: item.is_available ? t.successBg : t.dangerBg,
                    color: item.is_available ? t.success : t.danger,
                    alignSelf:'flex-start'
                  }}>
                  {item.is_available ? 'Available' : 'Unavailable'}
                </button>

                {/* Actions */}
                <div style={{ display:'flex', gap:'8px', marginTop:'auto' }}>
                  <Btn t={t} onClick={() => openEdit(item)} variant="ghost" small>Edit</Btn>
                  <Btn t={t} onClick={() => handleDelete(item.id)} variant="danger" small>Delete</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalOverlay t={t} onClose={() => !saving && setModal(null)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
            <h3 style={{ fontFamily:"'Fraunces', serif", fontSize:'22px', fontWeight:700, color: t.text }}>
              {modal.mode === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}
            </h3>
            <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer',
              color: t.textMuted, fontSize:'20px', lineHeight:1 }}>×</button>
          </div>

          <LabeledInput t={t} label="Name" value={form.name}
            onChange={e => setForm({...form, name:e.target.value})} placeholder="Item name" />
          <LabeledInput t={t} label="Description" value={form.description}
            onChange={e => setForm({...form, description:e.target.value})} placeholder="Description" textarea />
          <LabeledInput t={t} label="Price (₦)" value={form.price} type="number"
            onChange={e => setForm({...form, price:e.target.value})} placeholder="0.00" />

          <div style={{ marginBottom:'14px' }}>
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, letterSpacing:'0.18em',
                            textTransform:'uppercase', color: t.textMuted, marginBottom:'7px',
                            fontFamily:"'DM Sans', sans-serif" }}>Category</label>
            <select value={form.category}
              onChange={e => setForm({...form, category:e.target.value, subcategory:''})}
              style={inputBase(t)}
              onFocus={e => e.target.style.borderColor = t.accent}
              onBlur={e => e.target.style.borderColor = t.border}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom:'14px' }}>
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, letterSpacing:'0.18em',
                            textTransform:'uppercase', color: t.textMuted, marginBottom:'7px',
                            fontFamily:"'DM Sans', sans-serif" }}>Subgroup (optional)</label>
            <select value={form.subcategory}
              onChange={e => setForm({...form, subcategory:e.target.value})}
              style={inputBase(t)}
              onFocus={e => e.target.style.borderColor = t.accent}
              onBlur={e => e.target.style.borderColor = t.border}>
              <option value="">— None —</option>
              {modalSubcats.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
            {modalSubcats.length === 0 && form.category && (
              <p style={{ fontSize:'11px', color: t.textSubtle, marginTop:'5px',
                          fontFamily:"'DM Sans', sans-serif" }}>
                No subgroups for this category yet. Use "Manage Subgroups" to add some.
              </p>
            )}
          </div>

          <div style={{ display:'flex', gap:'24px', marginBottom:'14px' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer',
                            fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif" }}>
              <input type="checkbox" checked={form.is_available}
                onChange={e => setForm({...form, is_available:e.target.checked})} />
              Available
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer',
                            fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif" }}>
              <input type="checkbox" checked={form.recommended}
                onChange={e => setForm({...form, recommended:e.target.checked})} />
              Chef's Pick (Recommended)
            </label>
          </div>

          <div style={{ marginBottom:'20px' }}>
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, letterSpacing:'0.18em',
                            textTransform:'uppercase', color: t.textMuted, marginBottom:'7px',
                            fontFamily:"'DM Sans', sans-serif" }}>Image</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])}
              style={{ fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif" }} />
            {modal.mode === 'edit' && editItem?.image && !imageFile && (
              <img src={getMediaUrl(editItem.image)} alt="current"
                style={{ marginTop:'8px', height:'60px', borderRadius:'8px', objectFit:'cover' }} />
            )}
          </div>

          {/* Options — only shown in edit mode */}
          {modal.mode === 'edit' && editItem && (
            <div style={{ marginBottom:'20px' }}>
              <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase',
                          color: t.textMuted, marginBottom:'10px', fontFamily:"'DM Sans', sans-serif" }}>Options</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'12px' }}>
                {editItem.options?.map(opt => (
                  <span key={opt.id} style={{
                    display:'inline-flex', alignItems:'center', gap:'6px',
                    padding:'5px 12px', borderRadius:'999px', fontSize:'12px',
                    background: t.tag, color: t.text, fontFamily:"'DM Sans', sans-serif"
                  }}>
                    {opt.name} — {fmtNaira(opt.price)}
                    <button onClick={() => handleDeleteOption(opt.id, editItem.id)}
                      style={{ background:'none', border:'none', cursor:'pointer',
                               color: t.danger, fontSize:'14px', lineHeight:1, padding:'0 2px' }}>×</button>
                  </span>
                ))}
                {(!editItem.options || editItem.options.length === 0) && (
                  <span style={{ fontSize:'12px', color: t.textSubtle, fontFamily:"'DM Sans', sans-serif" }}>
                    No options yet
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <input placeholder="Name (e.g. Large)" value={newOpt.name}
                  onChange={e => setNewOpt({...newOpt, name:e.target.value})}
                  style={{ ...inputBase(t), flex:1 }}
                  onFocus={e => e.target.style.borderColor = t.accent}
                  onBlur={e => e.target.style.borderColor = t.border} />
                <input placeholder="Price" type="number" value={newOpt.price}
                  onChange={e => setNewOpt({...newOpt, price:e.target.value})}
                  style={{ ...inputBase(t), width:'100px' }}
                  onFocus={e => e.target.style.borderColor = t.accent}
                  onBlur={e => e.target.style.borderColor = t.border} />
                <Btn t={t} onClick={() => handleAddOption(editItem.id)} variant="ghost" small>Add</Btn>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
            <Btn t={t} onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
            <Btn t={t} onClick={handleSave} variant="primary">{saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Events Section ───────────────────────────────────────────────────────────
function EventsSection({ t, showToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', is_active:true });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/events/`).then(r => r.json()).then(d => { setEvents(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ title:'', description:'', is_active:true }); setImageFile(null); setModal({ mode:'add' }); };
  const openEdit = (ev) => { setForm({ title:ev.title, description:ev.description, is_active:ev.is_active }); setImageFile(null); setModal({ mode:'edit', ev }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = modal.mode === 'add' ? 'POST' : 'PATCH';
      const url = modal.mode === 'add' ? `${API}/events/` : `${API}/events/${modal.ev.id}/`;
      let res;
      if (imageFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k,v]) => fd.append(k, v));
        fd.append('image', imageFile);
        res = await fetch(url, { method, body: fd });
      } else {
        res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      }
      if (!res.ok) throw new Error();
      showToast(modal.mode === 'add' ? 'Event added' : 'Event updated');
      setModal(null); load();
    } catch { showToast('Failed to save event', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await fetch(`${API}/events/${id}/`, { method:'DELETE' });
      showToast('Event deleted'); load();
    } catch { showToast('Failed to delete event', 'error'); }
  };

  const handleToggle = async (ev) => {
    try {
      await fetch(`${API}/events/${ev.id}/`, { method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ is_active: !ev.is_active }) });
      load();
    } catch { showToast('Failed to update', 'error'); }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase',
                      color: t.accent, marginBottom:'6px', fontFamily:"'DM Sans', sans-serif" }}>Manage</p>
          <h2 style={{ fontFamily:"'Fraunces', serif", fontSize:'28px', fontWeight:700, color: t.text }}>Events & Promos</h2>
        </div>
        <Btn t={t} onClick={openAdd} variant="primary">+ Add Event</Btn>
      </div>

      {loading ? <Spinner t={t} /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'16px' }}>
          {events.map(ev => (
            <div key={ev.id} style={{
              background: t.bgCard, border:`1px solid ${t.border}`,
              borderRadius:'16px', overflow:'hidden', boxShadow: t.shadow
            }}>
              {ev.image && (
                <img src={getMediaUrl(ev.image)} alt={ev.title}
                  style={{ width:'100%', height:'160px', objectFit:'cover' }} />
              )}
              <div style={{ padding:'20px' }}>
                <h4 style={{ fontFamily:"'Fraunces', serif", fontSize:'17px', fontWeight:700,
                             color: t.text, marginBottom:'8px' }}>{ev.title}</h4>
                <p style={{ fontSize:'13px', color: t.textMuted, lineHeight:1.7, marginBottom:'16px',
                            fontFamily:"'DM Sans', sans-serif" }}>
                  {ev.description?.substring(0, 100)}{ev.description?.length > 100 ? '…' : ''}
                </p>
                <div style={{ display:'flex', gap:'10px', alignItems:'center', justifyContent:'space-between' }}>
                  <button onClick={() => handleToggle(ev)} style={{
                    padding:'5px 14px', borderRadius:'999px', fontSize:'11px', fontWeight:700,
                    cursor:'pointer', border:'none', fontFamily:"'DM Sans', sans-serif",
                    background: ev.is_active ? t.successBg : t.dangerBg,
                    color: ev.is_active ? t.success : t.danger
                  }}>{ev.is_active ? 'Active' : 'Inactive'}</button>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <Btn t={t} onClick={() => openEdit(ev)} variant="ghost" small>Edit</Btn>
                    <Btn t={t} onClick={() => handleDelete(ev.id)} variant="danger" small>Delete</Btn>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p style={{ color: t.textMuted, fontFamily:"'DM Sans', sans-serif", fontSize:'14px' }}>No events yet.</p>
          )}
        </div>
      )}

      {modal && (
        <ModalOverlay t={t} onClose={() => !saving && setModal(null)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
            <h3 style={{ fontFamily:"'Fraunces', serif", fontSize:'22px', fontWeight:700, color: t.text }}>
              {modal.mode === 'add' ? 'Add Event' : 'Edit Event'}
            </h3>
            <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer',
              color: t.textMuted, fontSize:'20px' }}>×</button>
          </div>
          <LabeledInput t={t} label="Title" value={form.title}
            onChange={e => setForm({...form, title:e.target.value})} placeholder="Event title" />
          <LabeledInput t={t} label="Description" value={form.description}
            onChange={e => setForm({...form, description:e.target.value})} placeholder="Description" textarea />
          <div style={{ marginBottom:'14px' }}>
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, letterSpacing:'0.18em',
                            textTransform:'uppercase', color: t.textMuted, marginBottom:'7px',
                            fontFamily:"'DM Sans', sans-serif" }}>Image</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])}
              style={{ fontSize:'13px', color: t.text }} />
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', marginBottom:'24px',
                          fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif" }}>
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm({...form, is_active:e.target.checked})} />
            Active (visible to customers)
          </label>
          <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
            <Btn t={t} onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
            <Btn t={t} onClick={handleSave} variant="primary">{saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Jobs Section ─────────────────────────────────────────────────────────────
function JobsSection({ t, showToast }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', is_active:true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/jobs/`).then(r => r.json()).then(d => { setJobs(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ title:'', description:'', is_active:true }); setModal({ mode:'add' }); };
  const openEdit = (job) => { setForm({ title:job.title, description:job.description, is_active:job.is_active }); setModal({ mode:'edit', job }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = modal.mode === 'add' ? 'POST' : 'PATCH';
      const url = modal.mode === 'add' ? `${API}/jobs/` : `${API}/jobs/${modal.job.id}/`;
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      if (!res.ok) throw new Error();
      showToast(modal.mode === 'add' ? 'Job added' : 'Job updated');
      setModal(null); load();
    } catch { showToast('Failed to save job', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job posting?')) return;
    try {
      await fetch(`${API}/jobs/${id}/`, { method:'DELETE' });
      showToast('Job deleted'); load();
    } catch { showToast('Failed to delete job', 'error'); }
  };

  const handleToggle = async (job) => {
    try {
      await fetch(`${API}/jobs/${job.id}/`, { method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ is_active: !job.is_active }) });
      load();
    } catch { showToast('Failed to update', 'error'); }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase',
                      color: t.accent, marginBottom:'6px', fontFamily:"'DM Sans', sans-serif" }}>Manage</p>
          <h2 style={{ fontFamily:"'Fraunces', serif", fontSize:'28px', fontWeight:700, color: t.text }}>Job Postings</h2>
        </div>
        <Btn t={t} onClick={openAdd} variant="primary">+ Add Job</Btn>
      </div>

      {loading ? <Spinner t={t} /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {jobs.map(job => (
            <div key={job.id} style={{
              background: t.bgCard, border:`1px solid ${t.border}`,
              borderRadius:'14px', padding:'20px 24px', boxShadow: t.shadow,
              display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px', flexWrap:'wrap'
            }}>
              <div style={{ flex:1, minWidth:'200px' }}>
                <h4 style={{ fontFamily:"'Fraunces', serif", fontSize:'17px', fontWeight:700,
                             color: t.text, marginBottom:'6px' }}>{job.title}</h4>
                <p style={{ fontSize:'13px', color: t.textMuted, lineHeight:1.7,
                            fontFamily:"'DM Sans', sans-serif" }}>
                  {job.description?.substring(0, 120)}{job.description?.length > 120 ? '…' : ''}
                </p>
              </div>
              <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
                <button onClick={() => handleToggle(job)} style={{
                  padding:'5px 14px', borderRadius:'999px', fontSize:'11px', fontWeight:700,
                  cursor:'pointer', border:'none', fontFamily:"'DM Sans', sans-serif",
                  background: job.is_active ? t.successBg : t.dangerBg,
                  color: job.is_active ? t.success : t.danger
                }}>{job.is_active ? 'Active' : 'Inactive'}</button>
                <Btn t={t} onClick={() => openEdit(job)} variant="ghost" small>Edit</Btn>
                <Btn t={t} onClick={() => handleDelete(job.id)} variant="danger" small>Delete</Btn>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <p style={{ color: t.textMuted, fontFamily:"'DM Sans', sans-serif", fontSize:'14px' }}>No job postings yet.</p>
          )}
        </div>
      )}

      {modal && (
        <ModalOverlay t={t} onClose={() => !saving && setModal(null)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
            <h3 style={{ fontFamily:"'Fraunces', serif", fontSize:'22px', fontWeight:700, color: t.text }}>
              {modal.mode === 'add' ? 'Add Job Posting' : 'Edit Job Posting'}
            </h3>
            <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer',
              color: t.textMuted, fontSize:'20px' }}>×</button>
          </div>
          <LabeledInput t={t} label="Title" value={form.title}
            onChange={e => setForm({...form, title:e.target.value})} placeholder="Job title" />
          <LabeledInput t={t} label="Description" value={form.description}
            onChange={e => setForm({...form, description:e.target.value})} placeholder="Role description…" textarea />
          <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', marginBottom:'24px',
                          fontSize:'13px', color: t.text, fontFamily:"'DM Sans', sans-serif" }}>
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm({...form, is_active:e.target.checked})} />
            Active (visible to job seekers)
          </label>
          <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
            <Btn t={t} onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
            <Btn t={t} onClick={handleSave} variant="primary">{saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────
export default function Admin({ onExit }) {
  const t = DARK;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [section, setSection] = useState('dashboard');
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Poll pending count every 30s once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchPending = () =>
      fetch(`${API}/stats/`).then(r => r.json()).then(d => setPendingCount(d.pending_count || 0)).catch(() => {});
    fetchPending();
    const iv = setInterval(fetchPending, 30000);
    return () => clearInterval(iv);
  }, [isAuthenticated]);

  if (!isAuthenticated) return <PinScreen t={t} onAuth={() => setIsAuthenticated(true)} />;

  const navItems = [
    { id:'dashboard', label:'Dashboard', icon:(
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M3 7a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V7zm0 9a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zm10-9a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1h-6a1 1 0 01-1-1V7zm0 5a1 1 0 011-1h6a1 1 0 011 1v5a1 1 0 01-1 1h-6a1 1 0 01-1-1v-5z"/>
      </svg>
    )},
    { id:'orders', label:'Orders', badge: pendingCount > 0 ? pendingCount : null, icon:(
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    )},
    { id:'menu', label:'Menu', icon:(
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
    )},
    { id:'events', label:'Events', icon:(
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
    )},
    { id:'jobs', label:'Jobs', icon:(
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    )},
  ];

  const sectionLabel = { dashboard:'Dashboard', orders:'Orders', menu:'Menu', events:'Events', jobs:'Jobs' };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      display:'flex', flexDirection:'column',
      background: t.bg, fontFamily:"'DM Sans', sans-serif",
      overflow:'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        height:'56px', flexShrink:0,
        display:'flex', alignItems:'center', gap:'12px',
        padding:'0 16px',
        background: t.bgCard, borderBottom:`1px solid ${t.border}`,
        position:'relative', zIndex:30,
      }}>
        {/* Hamburger */}
        <button onClick={() => setSidebarOpen(v => !v)}
          style={{ background:'transparent', border:'none', cursor:'pointer',
                   color: t.textMuted, padding:'6px', borderRadius:'8px', display:'flex' }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* Brand + section breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:1, minWidth:0 }}>
          <span style={{ fontFamily:"'Fraunces', serif", fontSize:'15px', fontWeight:700,
                         color: t.text, whiteSpace:'nowrap' }}>
            Admin
          </span>
          <span style={{ color: t.textSubtle, fontSize:'13px' }}>/</span>
          <span style={{ fontSize:'13px', fontWeight:600, color: t.textMuted, textTransform:'capitalize',
                         overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {sectionLabel[section]}
          </span>
          {pendingCount > 0 && section !== 'orders' && (
            <span style={{ marginLeft:'4px', background:'#DC2626', color:'#fff',
                           fontSize:'10px', fontWeight:700, minWidth:'18px', height:'18px',
                           borderRadius:'999px', display:'inline-flex', alignItems:'center',
                           justifyContent:'center', padding:'0 4px' }}>
              {pendingCount}
            </span>
          )}
        </div>

        {/* Back to site */}
        <button onClick={onExit}
          style={{ display:'flex', alignItems:'center', gap:'6px', background:'transparent',
                   border:`1px solid ${t.border}`, cursor:'pointer', color: t.textMuted,
                   padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600,
                   fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          <span className="hidden sm:inline">Back to Site</span>
        </button>
      </div>

      {/* ── Body (sidebar + content) ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>

        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)',
                     zIndex:20, backdropFilter:'blur(2px)' }} />
        )}

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            position: isMobile ? 'absolute' : 'relative',
            top:0, left:0, bottom:0,
            width:'240px', flexShrink:0, height:'100%',
            background: t.bgCard, borderRight:`1px solid ${t.navBorder}`,
            display:'flex', flexDirection:'column',
            zIndex:25,
            boxShadow: isMobile ? '4px 0 32px rgba(0,0,0,0.3)' : '2px 0 20px rgba(0,0,0,0.06)',
            animation: isMobile ? 'slideIn 0.22s ease-out' : 'none',
          }}>
            {/* Brand + close on mobile */}
            <div style={{ padding:'20px 18px 16px', borderBottom:`1px solid ${t.border}`,
                          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.2em',
                            textTransform:'uppercase', color: t.accent, marginBottom:'3px' }}>
                  Munchies & Shakes
                </p>
                <h1 style={{ fontFamily:"'Fraunces', serif", fontSize:'17px', fontWeight:700, color: t.text }}>
                  Admin Panel
                </h1>
              </div>
              {isMobile && (
                <button onClick={() => setSidebarOpen(false)}
                  style={{ background:'transparent', border:'none', cursor:'pointer',
                           color: t.textMuted, padding:'4px', display:'flex' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Nav items */}
            <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto' }}>
              {navItems.map(item => {
                const active = section === item.id;
                return (
                  <button key={item.id}
                    onClick={() => { setSection(item.id); if (isMobile) setSidebarOpen(false); }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.bgElev; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    style={{
                      width:'100%', display:'flex', alignItems:'center', gap:'10px',
                      padding:'11px 14px', borderRadius:'10px', border:'none', cursor:'pointer',
                      marginBottom:'2px', textAlign:'left',
                      background: active ? t.accent : 'transparent',
                      color: active ? '#fff' : t.textMuted,
                      fontFamily:"'DM Sans', sans-serif", fontSize:'13px', fontWeight:600,
                      transition:'all 0.15s',
                    }}>
                    <span style={{ opacity: active ? 1 : 0.7, flexShrink:0 }}>{item.icon}</span>
                    <span style={{ flex:1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        background:'#DC2626', color:'#fff', fontSize:'10px', fontWeight:700,
                        minWidth:'18px', height:'18px', borderRadius:'999px',
                        display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px'
                      }}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Bottom: exit */}
            <div style={{ padding:'10px 8px 18px', borderTop:`1px solid ${t.border}` }}>
              <button onClick={onExit}
                onMouseEnter={e => e.currentTarget.style.background = t.bgElev}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:'10px',
                  padding:'11px 14px', borderRadius:'10px', border:'none', cursor:'pointer',
                  background:'transparent', color: t.textMuted,
                  fontFamily:"'DM Sans', sans-serif", fontSize:'13px', fontWeight:600,
                }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                <span>Back to Site</span>
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '20px 16px' : '36px 40px', minWidth:0 }}>
          {section === 'dashboard' && <Dashboard t={t} />}
          {section === 'orders'    && <Orders t={t} showToast={showToast} />}
          {section === 'menu'      && <MenuSection t={t} showToast={showToast} />}
          {section === 'events'    && <EventsSection t={t} showToast={showToast} />}
          {section === 'jobs'      && <JobsSection t={t} showToast={showToast} />}
        </div>
      </div>

      {toast && <Toast t={t} message={toast.message} type={toast.type} />}
    </div>
  );
}
