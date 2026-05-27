import React from 'react';
import { motion } from 'motion/react';

// ============ TYPES ============

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse';

export interface LoadingSpinnerProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  color?: string;
  message?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}

// ─── ESAP Logo Circle Positions (pyramid: 1-2-3-4 rows) ─────────────────
const ESAP_BLUE = '#1B6FB5';
const ESAP_BLUE_LIGHT = '#1B6FB515';

const CIRCLES = [
  // Row 0 — top
  { cx: 50, cy: 15, r: 10, row: 0, letter: null },
  // Row 1
  { cx: 38, cy: 36, r: 10, row: 1, letter: null },
  { cx: 62, cy: 36, r: 10, row: 2, letter: null },
  // Row 2
  { cx: 26, cy: 57, r: 10, row: 2, letter: null },
  { cx: 50, cy: 57, r: 10, row: 2, letter: null },
  { cx: 74, cy: 57, r: 10, row: 2, letter: null },
  // Row 3 — bottom (E S A P)
  { cx: 14, cy: 78, r: 10, row: 3, letter: 'E' },
  { cx: 38, cy: 78, r: 10, row: 3, letter: 'S' },
  { cx: 62, cy: 78, r: 10, row: 3, letter: 'A' },
  { cx: 86, cy: 78, r: 10, row: 3, letter: 'P' },
];

const CYCLE_DURATION = 2.4;
const FILL_DURATION = 0.35;

// ============ PRINCIPAL COMPONENT ============

export function LoadingSpinner({
  size = 'md',
  variant = 'spinner',
  color = '#1B6FB5',
  message,
  overlay = false,
  fullScreen = false
}: LoadingSpinnerProps) {

  // If size is 'xs', render the simple inline spinner (typically for buttons)
  if (size === 'xs') {
    return (
      <div className="flex items-center justify-center">
        <motion.div
          className="w-4 h-4 border-2 border-t-transparent rounded-full"
          style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        {message && <span className="ml-2 text-xs">{message}</span>}
      </div>
    );
  }

  // Otherwise, render the animated ESAP Logo Loader
  const pixelSize = {
    sm: 40,
    md: 64,
    lg: 96
  }[size] || 64;

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* SVG Logo with Fill Animation */}
      <div style={{ width: pixelSize, height: pixelSize, position: 'relative' }}>
        <svg
          viewBox="0 0 100 95"
          width={pixelSize}
          height={pixelSize}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          {/* Ghost circles */}
          {CIRCLES.map((c, i) => (
            <circle
              key={`bg-${i}`}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={ESAP_BLUE_LIGHT}
              stroke={`${ESAP_BLUE}30`}
              strokeWidth={0.8}
            />
          ))}

          {/* Animated fill circles */}
          {CIRCLES.map((c, i) => {
            const delay = (i / CIRCLES.length) * (CYCLE_DURATION - FILL_DURATION);
            return (
              <motion.circle
                key={`fill-${i}`}
                cx={c.cx}
                cy={c.cy}
                r={c.r}
                fill={ESAP_BLUE}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.3, 1, 1, 0.3],
                }}
                transition={{
                  duration: CYCLE_DURATION,
                  delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  times: [0, 0.15, 0.7, 1],
                }}
                style={{ transformOrigin: `${c.cx}px ${c.cy}px` }}
              />
            );
          })}

          {/* Letters in bottom row */}
          {CIRCLES.filter(c => c.letter).map((c, i) => (
            <motion.text
              key={`letter-${i}`}
              x={c.cx}
              y={c.cy + 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontWeight={800}
              fontSize={10.5}
              fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: CYCLE_DURATION,
                delay: (CIRCLES.indexOf(c) / CIRCLES.length) * (CYCLE_DURATION - FILL_DURATION),
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.15, 0.7, 1],
              }}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {c.letter}
            </motion.text>
          ))}
        </svg>
      </div>

      {/* Loading text */}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-semibold text-gray-700 margin-0"
          style={{
            fontSize: size === 'sm' ? '0.72rem' : '0.85rem',
            color: color || '#1B6FB5',
            letterSpacing: '0.02em',
          }}
        >
          {message}
        </motion.p>
      )}

      {/* Pulsing dots under text */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            style={{
              width: size === 'sm' ? 4 : 5,
              height: size === 'sm' ? 4 : 5,
              borderRadius: '50%',
              background: ESAP_BLUE,
            }}
          />
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/95 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[150px]">
      {content}
    </div>
  );
}

// ============ SPECIFIC VARIANTS ============

export function ButtonLoading({ size = 'xs' }: { size?: LoadingSize }) {
  return <LoadingSpinner size={size} variant="spinner" color="currentColor" />;
}

export function CardLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="md" variant="spinner" message={message} />
    </div>
  );
}

export function FullPageLoading({ message = 'Cargando...' }: { message?: string }) {
  return <LoadingSpinner size="lg" variant="spinner" message={message} fullScreen />;
}