import { useState, Suspense, Component } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, ContactShadows, PerformanceMonitor, Html, Environment } from '@react-three/drei'

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error loading 3D model:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function CanvasLoader() {
  return (
    <Html center>
      <div className="text-neon-pink font-futuristic text-2xl animate-pulse tracking-widest drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">LOADING...</div>
    </Html>
  )
}

export default function Scene({ children }) {
  const [dpr, setDpr] = useState(1.5)

  return (
    <Canvas dpr={dpr}>
      {/* Automatically adjusts Pixel Ratio based on the user's frame rate */}
      <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />
      
      {/* Camera setup */}
      <PerspectiveCamera makeDefault position={[0, 2, 6]} fov={50} />

      {/* Controls: restricted so the user can't look from underneath the floor */}
      <OrbitControls 
        makeDefault 
        maxPolarAngle={Math.PI / 2} 
        minPolarAngle={0} 
        enableZoom={false}
      />

      {/* Scene Lighting: Environment maps are required for PBR materials, otherwise they look "ash" gray. */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#ffffff" />
      
      {/* This environment map provides the realistic reflections needed to bring out the colors in your model */}
      <Environment preset="city" />

      {/* Ground shadows to anchor floating objects */}
      <ContactShadows 
        position={[0, -0.99, 0]} 
        opacity={0.8} 
        scale={10} 
        blur={2} 
        far={4} 
        color="#090014"
      />

      {/* Render any 3D objects passed into this component */}
      <ModelErrorBoundary>
        <Suspense fallback={<CanvasLoader />}>
          {children}
        </Suspense>
      </ModelErrorBoundary>
    </Canvas>
  )
}