"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

interface DeviceMockupProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  delay?: number
}

export function DeviceMockup({ src, alt, width, height, className = "", delay = 0 }: DeviceMockupProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
      transition={{ duration: 0.8, delay }}
    >
      <div className="rounded-xl overflow-hidden shadow-2xl">
        <Image src={src || "/placeholder.svg"} alt={alt} width={width} height={height} className="w-full h-auto" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-orange-500/10 mix-blend-overlay rounded-xl"></div>

        {/* Reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-xl"></div>
      </div>

      {/* Shadow effect */}
      <div className="absolute -z-10 bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[20px] bg-black/20 blur-xl rounded-full"></div>
    </motion.div>
  )
} 