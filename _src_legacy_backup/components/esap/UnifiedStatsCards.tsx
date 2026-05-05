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
  const gridColsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  return (
    <div className={`grid ${gridColsMap[columns]} gap-4 sm:gap-5 md:gap-6`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const statId = stat.id || index;
        
        return (
          <motion.div
            key={statId}
            className={`bg-white rounded-2xl p-5 md:p-6 border-2 border-transparent hover:border-[--esap-primary]/20 transition-all duration-300 cursor-pointer group relative overflow-hidden ${
              stat.urgent ? 'ring-2 ring-red-400 ring-offset-2' : ''
            }`}
            style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ 
              y: -6, 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              borderColor: 'rgba(30, 93, 168, 0.3)',
              transition: { duration: 0.2 }
            }}
          >
            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-blue-50/20 transition-all duration-300 rounded-2xl" />
            
            <div className="relative z-10">
              {/* Header con ícono y título */}
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
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
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[--esap-gray-700] group-hover:text-[--esap-primary] transition-colors">
                    {stat.title}
                  </p>
                  <p className="text-xs text-[--esap-gray-500] mt-0.5">
                    {stat.description}
                  </p>
                </div>
              </div>
              
              {/* Valor principal */}
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[--esap-gray-900] tabular-nums leading-none">
                    <CountUpAnimation end={stat.value} duration={2} />
                    {stat.suffix && <span className="text-2xl md:text-3xl ml-1">{stat.suffix}</span>}
                  </h3>
                </div>
                
                {/* Badge de cambio */}
                {stat.change && stat.trend && (
                  <motion.div
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                      stat.trend === 'up'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : stat.trend === 'down'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.08, type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    {stat.trend !== 'neutral' && (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ transform: stat.trend === 'down' ? 'rotate(180deg)' : 'none' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    {stat.change}
                  </motion.div>
                )}
              </div>

              {stat.urgent && (
                <motion.div
                  className="mt-4 px-3 py-2.5 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg flex items-center gap-2 border border-red-200"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.3 + index * 0.08, duration: 0.3 }}
                >
                  <motion.span 
                    className="text-xl"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    ⚠️
                  </motion.span>
                  <span className="text-xs font-bold text-red-700">Atención requerida</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}