import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  height?: string;
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  delay?: number;
  onClick?: () => void;
}

export default function FlipCard({
  frontContent,
  backContent,
  className,
  height = "h-40",
  isFlipped: externalIsFlipped,
  onFlip,
  delay = 0,
  onClick,
}: FlipCardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const isFlipped = externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    
    const newFlipped = !isFlipped;
    if (externalIsFlipped === undefined) {
      setInternalIsFlipped(newFlipped);
    }
    onFlip?.(newFlipped);
  };

  // Spring physics configuration for more natural motion
  const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 0.8,
    delay: delay,
  };

  // Enhanced hover effects
  const hoverVariants = {
    initial: { 
      scale: 1, 
      rotateY: 0,
      rotateX: 0,
      z: 0,
    },
    hover: { 
      scale: 1.03,
      rotateY: isFlipped ? 180 : 5,
      rotateX: -2,
      z: 20,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      }
    }
  };

  // Advanced flip animation with enhanced 3D effects
  const cardVariants = {
    front: {
      rotateY: 0,
      scale: 1,
      z: 0,
      transition: springTransition,
    },
    back: {
      rotateY: 180,
      scale: 1.02,
      z: 10,
      transition: springTransition,
    }
  };

  // Glow effect during animation
  const glowEffect = isAnimating ? "drop-shadow-lg shadow-blue-500/25" : "";

  useEffect(() => {
    if (delay > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), (delay * 1000) + 600);
      return () => clearTimeout(timer);
    }
  }, [delay, isFlipped]);

  return (
    <div className="relative group">
      {/* Ambient glow effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 blur-md transform scale-110"
        )}
      />
      
      {/* Particle effects container */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/60 rounded-full"
                initial={{
                  x: Math.random() * 100 + "%",
                  y: Math.random() * 100 + "%",
                  scale: 0,
                }}
                animate={{
                  y: [null, -20, -40],
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "relative cursor-pointer",
          height,
          className,
          glowEffect
        )}
        style={{ 
          perspective: "1200px",
          transformStyle: "preserve-3d"
        }}
        variants={hoverVariants}
        initial="initial"
        animate={isHovered ? "hover" : "initial"}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleCardClick}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
          variants={cardVariants}
          animate={isFlipped ? "back" : "front"}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationComplete={() => setIsAnimating(false)}
        >
          {/* Enhanced Front Face */}
          <motion.div
            className="absolute inset-0 w-full h-full rounded-xl overflow-hidden"
            style={{ 
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d"
            }}
            initial={{ opacity: 1 }}
            animate={{ 
              opacity: isFlipped ? 0 : 1,
              filter: isAnimating ? "blur(1px)" : "blur(0px)"
            }}
            transition={{ 
              opacity: { duration: 0.1, delay: isFlipped ? 0 : 0.3 },
              filter: { duration: 0.3 }
            }}
          >
            {/* Dynamic edge lighting */}
            <div className={cn(
              "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0",
              "bg-gradient-to-r from-transparent via-white/5 to-transparent",
              "animate-pulse"
            )} />
            {frontContent}
          </motion.div>

          {/* Enhanced Back Face */}
          <motion.div
            className="absolute inset-0 w-full h-full rounded-xl overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              transformStyle: "preserve-3d"
            }}
            initial={{ opacity: 1 }}
            animate={{ 
              opacity: isFlipped ? 1 : 0,
              filter: isAnimating ? "blur(1px)" : "blur(0px)"
            }}
            transition={{ 
              opacity: { duration: 0.1, delay: isFlipped ? 0.3 : 0 },
              filter: { duration: 0.3 }
            }}
          >
            {/* Dynamic edge lighting */}
            <div className={cn(
              "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0",
              "bg-gradient-to-r from-transparent via-white/5 to-transparent",
              "animate-pulse"
            )} />
            {backContent}
          </motion.div>
        </motion.div>

        {/* Interactive hint indicator */}
        <AnimatePresence>
          {isHovered && !isFlipped && (
            <motion.div
              className="absolute top-2 right-2 pointer-events-none"
              initial={{ opacity: 0, scale: 0, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, rotate: 90 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                <svg 
                  className="w-2 h-2 text-white/80" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}