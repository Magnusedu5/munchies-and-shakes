import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Image, ScrollControls, Scroll, useScroll } from '@react-three/drei'
import * as THREE from 'three'

// 1. Simulated Fetch Hook
export function useInstagramFeed() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    // Simulate network delay for fetching from an API
    const fetchPosts = async () => {
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      // Mock data using picsum to simulate Instagram's square aspect ratio
      const mockData = Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        url: `https://picsum.photos/seed/${i + 10}/800/800`,
        caption: `Galactic flavor #${i + 1} 🌌`
      }))
      
      setPosts(mockData)
    }
    fetchPosts()
  }, [])

  return posts
}

// 2. Individual 3D Image Card
function GalleryCard({ url, index, total, gap }) {
  const ref = useRef()
  const scroll = useScroll()

  useFrame(() => {
    if (!ref.current) return
    
    // The scroll offset goes from 0.0 (start) to 1.0 (end)
    const itemPosition = index * gap
    const currentScrollPosition = scroll.offset * ((total - 1) * gap)
    const distance = itemPosition - currentScrollPosition

    // Subtle rotation based on distance from the current focal point
    const targetRotation = Math.max(-0.4, Math.min(0.4, distance * 0.1))
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRotation, 0.1)

    // Scale up slightly when the image is centered
    const scaleDist = Math.abs(distance)
    const targetScale = scaleDist < gap ? 1.2 : 1.0
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.1))
  })

  return (
    <Image
      ref={ref}
      url={url}
      position={[index * gap, 0, 0]}
      scale={[2.5, 2.5]} // Setting a 1:1 scale constraint to mimic Instagram squares
      transparent
      opacity={0.9}
    />
  )
}

// 3. Main Gallery Container
export default function ImageGallery() {
  const posts = useInstagramFeed()
  const { viewport } = useThree()

  if (posts.length === 0) return null

  const gap = 3 // Distance between cards
  const totalPages = Math.max(1, (posts.length * gap) / viewport.width)

  return (
    <ScrollControls horizontal pages={totalPages} damping={0.2}>
      <Scroll>
        {/* Shift the entire gallery so the first image starts on the left side */}
        <group position={[-viewport.width / 2 + 2, 0, -2]}>
          {posts.map((post, index) => (
            <GalleryCard
              key={post.id}
              url={post.url}
              index={index}
              total={posts.length}
              gap={gap}
            />
          ))}
        </group>
      </Scroll>
    </ScrollControls>
  )
}