import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center, Clone } from '@react-three/drei'

export default function FoodModel({ url, radius = 0, angleOffset = 0, scale = 0.05 }) {
  const groupRef = useRef()
  // Load the 3D model from the public directory
  const { scene } = useGLTF(url)
  
  // Animate the model on every frame
  useFrame((state, delta) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Static position in a circle (Rotation is now handled by the parent group)
      groupRef.current.position.x = Math.cos(angleOffset) * radius
      groupRef.current.position.z = Math.sin(angleOffset) * radius
      
      // Levitate up and down using a sine wave offset by its angle
      groupRef.current.position.y = Math.sin(time * 2 + angleOffset) * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {/* Center ensures the model's pivot point is perfectly centered in the view */}
      <Center>
        {/* Clone safely creates a new instance of the cached model for StrictMode compatibility */}
        <Clone object={scene} scale={scale} />
      </Center>
    </group>
  )
}

// Preload the model so it caches in the background for better performance
useGLTF.preload('/models/scene_modern.glb')