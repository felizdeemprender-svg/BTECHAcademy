'use client';

import { motion, type Variants } from 'framer-motion';
import React from 'react';

export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Float({ children, className, duration = 7, distance = 16, delay = 0 }: {
  children?: React.ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </motion.div>
  );
}

export function Tilt({ children, className, max = 10 }: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * max, y: px * max });
  };

  const onMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div ref={ref} className={className} style={{ perspective: 1000 }} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <motion.div
        style={{ rotateX: tilt.x, rotateY: tilt.y, transformStyle: 'preserve-3d' }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
