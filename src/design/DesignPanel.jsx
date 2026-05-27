import { useState } from 'react'
import { useDesign, DESIGN_DEFAULTS } from './DesignContext'

// ─── Slider row ──────────────────────────────────────────────────────────────
function Slider({ label, id, min, max, step = 1, value, onChange }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    marginBottom: '4px', fontSize: '11px' }}>
        <span style={{ color: '#8A7060', fontWeight: 600, letterSpacing: '0.06em',
                       textTransform: 'uppercase' }}>{label}</span>
        <span style={{ color: '#EDE0C8', fontWeight: 700, minWidth: '36px',
                       textAlign: 'right' }}>{value}</span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#C15C2E', cursor: 'pointer' }}
      />
    </div>
  )
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHead({ children }) {
  return (
    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: '#C15C2E',
                margin: '16px 0 10px', paddingTop: '10px',
                borderTop: '1px solid rgba(193,92,46,0.15)' }}>
      {children}
    </p>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function DesignPanel() {
  const { design, setDesign } = useDesign()
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const set = (key, val) => setDesign(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('http://localhost:3001/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(design),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      alert('Design server not running.\nStart it with: npm run dev:design')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDesign(DESIGN_DEFAULTS)
  }

  return (
    <>
      {/* ── Toggle button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position:     'fixed',
          bottom:       '20px',
          right:        '20px',
          zIndex:       9999,
          width:        '44px',
          height:       '44px',
          borderRadius: '50%',
          background:   open ? '#C15C2E' : '#1F1812',
          border:       '1.5px solid rgba(193,92,46,0.5)',
          color:        '#EDE0C8',
          fontSize:     '20px',
          cursor:       'pointer',
          boxShadow:    '0 4px 20px rgba(0,0,0,0.4)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          transition:   'all 0.2s',
        }}
        title="Design Editor"
      >
        {open ? '✕' : '🎨'}
      </button>

      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position:    'fixed',
            bottom:      '76px',
            right:       '20px',
            zIndex:      9998,
            width:       '280px',
            maxHeight:   'calc(100vh - 100px)',
            overflowY:   'auto',
            background:  '#17120D',
            border:      '1px solid rgba(193,92,46,0.2)',
            borderRadius: '16px',
            padding:     '16px',
            boxShadow:   '0 20px 60px rgba(0,0,0,0.6)',
            fontFamily:  "'DM Sans', sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '4px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#EDE0C8',
                        margin: 0, letterSpacing: '0.02em' }}>
              🎨 Design Editor
            </p>
            <p style={{ fontSize: '11px', color: '#5A4A3A', margin: '3px 0 0',
                        lineHeight: 1.4 }}>
              Adjust → preview live → Save → I'll apply the code
            </p>
          </div>

          {/* ── Navbar ── */}
          <SectionHead>Navbar</SectionHead>
          <Slider label="Height" id="navH" min={50} max={100}
            value={design.navbarHeight}
            onChange={v => set('navbarHeight', v)} />

          {/* ── Logo ── */}
          <SectionHead>Logo — Mobile</SectionHead>
          <Slider label="Height" id="logoHm" min={36} max={90}
            value={design.logoHeightMobile}
            onChange={v => set('logoHeightMobile', v)} />
          <Slider label="Width" id="logoWm" min={120} max={320}
            value={design.logoWidthMobile}
            onChange={v => set('logoWidthMobile', v)} />

          <SectionHead>Logo — Desktop</SectionHead>
          <Slider label="Height" id="logoHd" min={36} max={100}
            value={design.logoHeightDesktop}
            onChange={v => set('logoHeightDesktop', v)} />
          <Slider label="Width" id="logoWd" min={150} max={400}
            value={design.logoWidthDesktop}
            onChange={v => set('logoWidthDesktop', v)} />

          {/* ── Hero ── */}
          <SectionHead>Hero Layout</SectionHead>
          <Slider label="Padding top (mobile)" id="heroPt" min={60} max={140}
            value={design.heroPaddingTop}
            onChange={v => set('heroPaddingTop', v)} />
          <Slider label="Gap mobile" id="heroGm" min={16} max={96}
            value={design.heroGapMobile}
            onChange={v => set('heroGapMobile', v)} />
          <Slider label="Gap desktop" id="heroGd" min={16} max={128}
            value={design.heroGapDesktop}
            onChange={v => set('heroGapDesktop', v)} />

          {/* ── Hero heading ── */}
          <SectionHead>Heading Font Size</SectionHead>
          <Slider label="Min (rem)" id="h1Min" min={1} max={4} step={0.1}
            value={design.heroH1SizeMinRem}
            onChange={v => set('heroH1SizeMinRem', v)} />
          <Slider label="Fluid (vw)" id="h1Vw" min={3} max={16}
            value={design.heroH1SizeVW}
            onChange={v => set('heroH1SizeVW', v)} />
          <Slider label="Max (rem)" id="h1Max" min={2} max={8} step={0.1}
            value={design.heroH1SizeMaxRem}
            onChange={v => set('heroH1SizeMaxRem', v)} />

          {/* ── 3D Container ── */}
          <SectionHead>3D Model Container</SectionHead>
          <Slider label="Height min (px)" id="mhMin" min={200} max={600}
            value={design.modelHeightMin}
            onChange={v => set('modelHeightMin', v)} />
          <Slider label="Height fluid (vh)" id="mhVH" min={20} max={100}
            value={design.modelHeightVH}
            onChange={v => set('modelHeightVH', v)} />
          <Slider label="Height max (px)" id="mhMax" min={400} max={900}
            value={design.modelHeightMax}
            onChange={v => set('modelHeightMax', v)} />

          {/* ── 3D Model ── */}
          <SectionHead>3D Model Scale</SectionHead>
          <Slider label="Mobile scale" id="mSm" min={0.5} max={8} step={0.1}
            value={design.modelScaleMobile}
            onChange={v => set('modelScaleMobile', v)} />
          <Slider label="Desktop scale" id="mSd" min={0.5} max={8} step={0.1}
            value={design.modelScaleDesktop}
            onChange={v => set('modelScaleDesktop', v)} />
          <Slider label="Y-pos mobile" id="mYm" min={-2} max={2} step={0.05}
            value={design.modelPositionYMobile}
            onChange={v => set('modelPositionYMobile', v)} />
          <Slider label="Y-pos desktop" id="mYd" min={-2} max={2} step={0.05}
            value={design.modelPositionYDesktop}
            onChange={v => set('modelPositionYDesktop', v)} />

          {/* ── Actions ── */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleReset}
              style={{
                flex: 1, padding: '9px', borderRadius: '10px',
                border: '1.5px solid rgba(193,92,46,0.2)',
                background: 'transparent', color: '#8A7060',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: '9px', borderRadius: '10px',
                border: 'none',
                background: saved ? '#2d6a2d' : '#C15C2E',
                color: '#fff',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.3s',
              }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : '💾 Save Changes'}
            </button>
          </div>

          <p style={{ fontSize: '10px', color: '#3A2E26', textAlign: 'center',
                      marginTop: '10px', lineHeight: 1.5 }}>
            After saving, tell me "apply design changes" and I'll update the code
          </p>
        </div>
      )}
    </>
  )
}
