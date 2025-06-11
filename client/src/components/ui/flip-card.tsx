import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  height?: string;
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
}

export default function FlipCard({
  frontContent,
  backContent,
  className,
  height = "h-40",
  isFlipped: externalIsFlipped,
  onFlip,
}: FlipCardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);
  
  const isFlipped = externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;

  const handleCardClick = () => {
    const newFlipped = !isFlipped;
    if (externalIsFlipped === undefined) {
      setInternalIsFlipped(newFlipped);
    }
    onFlip?.(newFlipped);
  };

  return (
    <div
      className={cn(
        "relative cursor-pointer",
        height,
        className
      )}
      style={{ perspective: "1000px" }}
      onClick={handleCardClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front Face */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          {frontContent}
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {backContent}
        </div>
      </motion.div>
    </div>
  );
}