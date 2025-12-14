import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FilterChip {
  id: string;
  label: string;
  value: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const colorClasses = {
  blue: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3B82F6', text: '#1E40AF' },
  green: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10B981', text: '#047857' },
  purple: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8B5CF6', text: '#6D28D9' },
  orange: { bg: 'rgba(251, 146, 60, 0.1)', border: '#FB923C', text: '#C2410C' },
  red: { bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444', text: '#B91C1C' },
};

export function FilterChips({ chips, onRemove, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <motion.div
      className="flex flex-wrap items-center gap-2 py-3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <span className="text-xs font-semibold text-[--esap-gray-600]">Filtros activos:</span>
      
      <AnimatePresence mode="popLayout">
        {chips.map((chip) => {
          const colors = colorClasses[chip.color || 'blue'];
          
          return (
            <motion.div
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-md"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <span>{chip.label}: {chip.value}</span>
              <button
                onClick={() => onRemove(chip.id)}
                className="hover:bg-white/50 rounded-full p-0.5 transition-colors"
                aria-label={`Eliminar filtro ${chip.label}`}
              >
                <X className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs font-semibold text-[--esap-danger] hover:underline transition-all"
        >
          Limpiar todo
        </button>
      )}
    </motion.div>
  );
}
