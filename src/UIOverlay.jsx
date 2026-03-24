import { motion } from 'framer-motion'

export default function UIOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      
      {/* Glassmorphism Navigation Bar */}
      <nav className="w-full px-8 py-6 flex justify-between items-center bg-white/5 backdrop-blur-md border-b border-white/10 pointer-events-auto">
        <div className="text-2xl font-futuristic font-bold text-white tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
          MUNCHIES <span className="text-neon-pink">&</span> SHAKES
        </div>
        <ul className="flex space-x-8 text-sm font-futuristic tracking-wider text-gray-300 hidden md:flex">
          <li className="hover:text-neon-blue transition-colors duration-300 cursor-pointer drop-shadow-md">MENU</li>
          <li className="hover:text-neon-pink transition-colors duration-300 cursor-pointer drop-shadow-md">ABOUT</li>
          <li className="hover:text-neon-blue transition-colors duration-300 cursor-pointer drop-shadow-md">CONTACT</li>
        </ul>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-5xl md:text-8xl font-futuristic font-bold mb-6 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
        >
          The Future of Flavor.
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="text-lg md:text-2xl text-gray-300 max-w-2xl mb-10 font-light drop-shadow-md"
        >
          Experience a new dimension of taste across the galaxy.
        </motion.p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="pointer-events-auto px-10 py-4 bg-deep-800/80 backdrop-blur-md border border-neon-pink text-neon-pink font-futuristic font-bold text-xl rounded-full transition-all duration-300 hover:bg-neon-pink hover:text-white hover:shadow-[0_0_20px_#ff00ff]"
        >
          EXPLORE MENU
        </motion.button>
      </div>
    </div>
  )
}