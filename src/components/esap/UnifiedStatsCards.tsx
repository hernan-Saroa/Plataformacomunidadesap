import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { CountUpAnimation } from './CountUpAnimation';

export interface StatCardData {
  id?: string | number;
  title: string;
  value: number;
  suffix?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  gradient: string;
  lightBg: string;
  iconColor: string;
  description: string;
  urgent?: boolean;
}

interface UnifiedStatsCardsProps {
  stats: StatCardData[];
  columns?: 1 | 2 | 3 | 4 | 6;
}

export function UnifiedStatsCards({ stats, columns = 3 }: UnifiedStatsCardsProps) {
  // ✅ MOBILE FIRST: Grid columns adaptativas
  const gridColsMap = {
    1: 'grid-cols-1',                                           // 1 col en todas las pantallas
    2: 'grid-cols-1 sm:grid-cols-2',                          // Mobile: 1, Tablet: 2
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',          // Mobile: 1, Tablet: 2, Desktop: 3
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', // Mobile: 1, Tablet: 2, Laptop: 3, Desktop: 4
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'  // Mobile: 1, Tablet: 2, Laptop: 3, Wide: 6
  };

  return (
    <div className={`
      grid ${gridColsMap[columns]} 
      gap-3 sm:gap-4 md:gap-5 lg:gap-6
      w-full
    `}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const statId = stat.id || index;
        
        return (
          <motion.div
            key={statId}
            className={`
              bg-white rounded-xl sm:rounded-2xl 
              p-4 sm:p-5 md:p-6 
              border-2 border-transparent 
              hover:border-[--esap-primary]/20 
              transition-all duration-300 
              cursor-pointer group 
              relative overflow-hidden
              touch-target
              ${stat.urgent ? 'ring-2 ring-red-400 ring-offset-2' : ''}
            `}
            style={{ 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              minHeight: '140px' // ✅ Altura mínima para touch-friendly
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ 
              y: -6, 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              borderColor: 'rgba(30, 93, 168, 0.3)',
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }} // ✅ Feedback táctil mobile
          >
            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-blue-50/20 transition-all duration-300 rounded-xl sm:rounded-2xl" />
            
            <div className="relative z-10">
              {/* ✅ HEADER - Responsive Icon + Title */}
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <motion.div
                  className="
                    w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 
                    rounded-lg sm:rounded-xl 
                    flex items-center justify-center 
                    flex-shrink-0
                  "
                  style={{ 
                    background: stat.gradient,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 5,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    transition: { duration: 0.2 }
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <p className="
                    text-xs sm:text-sm 
                    font-bold 
                    text-[--esap-gray-700] 
                    group-hover:text-[--esap-primary] 
                    transition-colors
                    leading-tight
                  ">
                    {stat.title}
                  </p>
                  <p className="
                    text-[10px] sm:text-xs 
                    text-[--esap-gray-500] 
                    mt-0.5
                    line-clamp-1
                  ">
                    {stat.description}
                  </p>
                </div>
              </div>
              
              {/* ✅ VALUE - Responsive Typography */}
              <div className="flex items-end justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="
                    text-2xl sm:text-3xl md:text-4xl lg:text-5xl 
                    font-extrabold 
                    text-[--esap-gray-900] 
                    tabular-nums 
                    leading-none
                    tracking-tight
                  ">
                    <CountUpAnimation end={stat.value} duration={2} />
                    {stat.suffix && <span className="text-lg sm:text-2xl md:text-3xl ml-1">{stat.suffix}</span>}
                  </h3>
                </div>
                
                {/* ✅ BADGE - Responsive Size */}
                {stat.change && stat.trend && (
                  <motion.div
                    className={`
                      inline-flex items-center 
                      gap-0.5 sm:gap-1 
                      px-2 sm:px-3 
                      py-1 sm:py-1.5 
                      rounded-full 
                      text-[10px] sm:text-xs md:text-sm 
                      font-bold 
                      shadow-sm 
                      flex-shrink-0
                      ${
                        stat.trend === 'up'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : stat.trend === 'down'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }
                    `}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.08, type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    {stat.trend !== 'neutral' && (
                      <svg
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ transform: stat.trend === 'down' ? 'rotate(180deg)' : 'none' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    <span className="whitespace-nowrap">{stat.change}</span>
                  </motion.div>
                )}
              </div>

              {/* ✅ URGENT ALERT - Mobile Optimized */}
              {stat.urgent && (
                <motion.div
                  className="
                    mt-3 sm:mt-4 
                    px-2.5 sm:px-3 
                    py-2 sm:py-2.5 
                    bg-gradient-to-r from-red-50 to-orange-50 
                    rounded-lg 
                    flex items-center gap-2 
                    border border-red-200
                  "
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.3 + index * 0.08, duration: 0.3 }}
                >
                  <motion.span 
                    className="text-base sm:text-xl"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    ⚠️
                  </motion.span>
                  <span className="text-[10px] sm:text-xs font-bold text-red-700">
                    Atención requerida
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}