import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

const flavors = [
  { color: '#ff00ff', position: [2.5, 0, 0], name: 'Neon Berry' },
  { color: '#00e5ff', position: [-2.5, 0, 0], name: 'Cyber Mint' },
  { color: '#b026ff', position: [0, 0, 2.5], name: 'Galactic Grape' },
  { color: '#fbff00', position: [0, 0, -2.5], name: 'Solar Lemon' },
]

export default function OrbitingIcons({ onSelectFlavor, currentFlavor }) {
  const groupRef = useRef()

  // Rotate the entire orbit group continuously
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {flavors.map((flavor, index) => (
        <FlavorIcon 
          key={index} 
          flavor={flavor} 
          isActive={currentFlavor === flavor.color} 
          onSelectFlavor={onSelectFlavor} 
        />
      ))}
    </group>
  )
}

function FlavorIcon({ flavor, isActive, onSelectFlavor }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    // Smoothly scale up the icon if it is the currently selected flavor
    const targetScale = isActive ? 1.5 : 1.0
    if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    }
  })

  return (
    <Float speed={2} rotationIntensity={2} floatIntensity={1}>
      <mesh
        ref={meshRef}
        position={flavor.position}
        onClick={(e) => {
          e.stopPropagation()
          onSelectFlavor(flavor.color)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial 
          color={flavor.color} 
          emissive={flavor.color} 
          emissiveIntensity={isActive ? 1.5 : 0.8} 
          wireframe 
        />
      </mesh>
    </Float>
  )
}