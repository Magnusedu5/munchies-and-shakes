import { createContext, useContext, useState } from 'react'

// ─── Default design tokens ──────────────────────────────────────────────────
// These mirror the current hardcoded values in App.jsx so live editing starts
// from the current look with zero visual change.
export const DESIGN_DEFAULTS = {
  // Navbar
  navbarHeight:       70,    // px

  // Logo — mobile
  logoHeightMobile:   52,    // px
  logoWidthMobile:    200,   // px

  // Logo — desktop (md+)
  logoHeightDesktop:  58,    // px
  logoWidthDesktop:   280,   // px

  // Hero layout
  heroPaddingTop:     86,    // px — top padding on mobile (below fixed nav)
  heroGapMobile:      48,    // px — gap between copy and 3D column on mobile (gap-12)
  heroGapDesktop:     64,    // px — gap on desktop (gap-16)

  // 3D model container height
  modelHeightMin:     360,   // px (clamp min)
  modelHeightVH:      55,    // vh (clamp middle)
  modelHeightMax:     582,   // px (clamp max)

  // 3D model scale
  modelScaleMobile:   3.0,
  modelScaleDesktop:  3.0,

  // 3D model vertical position
  modelPositionYMobile:   -0.4,
  modelPositionYDesktop:   0.0,

  // Hero heading size
  heroH1SizeMinRem:   2.0,   // rem
  heroH1SizeVW:       8,     // vw
  heroH1SizeMaxRem:   4.5,   // rem
}

const DesignContext = createContext({
  design: DESIGN_DEFAULTS,
  setDesign: () => {},
})

export const useDesign = () => useContext(DesignContext)

export function DesignProvider({ children }) {
  const [design, setDesign] = useState(DESIGN_DEFAULTS)

  return (
    <DesignContext.Provider value={{ design, setDesign }}>
      {children}
    </DesignContext.Provider>
  )
}
