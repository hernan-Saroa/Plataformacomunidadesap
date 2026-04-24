import React from 'react';
import { motion } from 'motion/react';

/**
 * ESAPLogoLoader
 * 
 * Animated ESAP logo loader — the 10 circles of the ESAP triangle
 * fill sequentially from top to bottom, creating a "water filling" effect.
 * Used as the primary loading indicator across the platform.
 */

interface ESAPLogoLoaderProps {
  size?: number;
  text?: string;
  fullScreen?: boolean;
}

// ─── ESAP Logo Circle Positions (pyramid: 1-2-3-4 rows) ─────────────────
// Original layout of ESAP circles:
//       row 0:   ●                 (1 circle)
//       row 1:  ● ●                (2 circles)
//       row 2: ● ● ●              (3 circles)
//       row 3: E S A P            (4 circles with letters)

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

// Total animation cycle duration in seconds
const CYCLE_DURATION = 2.4;
const FILL_DURATION = 0.35;

export function ESAPLogoLoader({
  size = 80,
  text = 'Cargando...',
  fullScreen = false,
}: ESAPLogoLoaderProps) {
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    }}>
      {/* ─── SVG Logo with Fill Animation ───────────────────────────────── */}
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg
          viewBox="0 0 100 95"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          {/* Ghost circles (background outline) */}
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
            // Each circle animates: empty → filled → empty, staggered
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

          {/* Letters in the bottom row */}
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

      {/* Loading text with subtle fade */}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: size <= 48 ? '0.72rem' : '0.85rem',
            color: '#6B7280',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          {text}
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
              width: size <= 48 ? 4 : 5,
              height: size <= 48 ? 4 : 5,
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
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      width: '100%',
    }}>
      {content}
    </div>
  );
}

export default ESAPLogoLoader;
