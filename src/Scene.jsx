import { useState, Suspense, Component } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, ContactShadows, PerformanceMonitor, Html, Environment } from '@react-three/drei'

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("3D model error:", error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function CanvasLoader() {
  return (
    <Html center>
      <div style={{ color: '#C15C2E', fontSize: '13px', fontFamily: 'sans-serif', opacity: 0.7 }}>
        Loading…
      </div>
    </Html>
  )
}

export default function Scene({ children }) {
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const [dpr, setDpr] = useState(isMobileDevice ? 1 : (window.devicePixelRatio > 2 ? 1 : 1.5))

  return (
    <Canvas
      dpr={dpr}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
    >
      <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />

      <PerspectiveCamera makeDefault position={[0, 2, 6]} fov={50} />

      {/* enablePan=false + enableZoom=false lets vertical touch scroll pass through */}
      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={0}
        enableZoom={false}
        enablePan={false}
      />

      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-10, -10, -10]} intensity={0.6} color="#ffffff" />

      {/* Wrap Environment in its own error boundary so a CDN failure doesn't kill the model */}
      <ModelErrorBoundary>
        <Environment preset="city" />
      </ModelErrorBoundary>

      <ContactShadows
        position={[0, -0.99, 0]}
        opacity={0.6}
        scale={10}
        blur={2}
        far={4}
        color="#090014"
      />

      <ModelErrorBoundary>
        <Suspense fallback={<CanvasLoader />}>
          {children}
        </Suspense>
      </ModelErrorBoundary>
    </Canvas>
  )
}
