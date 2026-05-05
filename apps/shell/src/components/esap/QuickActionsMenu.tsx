import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Edit2, Copy, Trash2, Users, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color?: string;
  onClick: () => void;
  divider?: boolean;
}

interface QuickActionsMenuProps {
  actions: QuickAction[];
  size?: 'sm' | 'md' | 'lg';
}

export function QuickActionsMenu({ actions, size = 'md' }: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`${sizeClasses[size]} rounded-lg border border-[--esap-gray-200] flex items-center justify-center hover:bg-[--esap-gray-100] hover:border-[--esap-gray-300] transition-all ${
          isOpen ? 'bg-[--esap-gray-100] border-[--esap-gray-300]' : ''
        }`}
        aria-label="Más opciones"
      >
        <MoreVertical className={`${iconSizes[size]} text-[--esap-gray-600]`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-56 bg-white border border-[--esap-gray-200] rounded-xl shadow-xl overflow-hidden z-50"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="py-2">
              {actions.map((action, index) => {
                const Icon = action.icon;
                const showDivider = action.divider && index < actions.length - 1;

                return (
                  <div key={action.id}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[--esap-gray-50] transition-colors text-left group"
                      style={{ color: action.color || 'inherit' }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                      <span className="text-sm font-medium">{action.label}</span>
                    </button>
                    {showDivider && (
                      <div className="my-2 border-t border-[--esap-gray-200]" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Predefined action sets - Will be provided with actual functions from App.tsx
export const roleActions = (roleId: string, handlers?: {
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onViewUsers?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => [
  {
    id: 'view',
    label: 'Ver detalles',
    icon: Eye,
    onClick: () => handlers?.onView?.(roleId) || console.log('Ver detalles', roleId),
  },
  {
    id: 'edit',
    label: 'Editar rol',
    icon: Edit2,
    onClick: () => handlers?.onEdit?.(roleId) || console.log('Editar rol', roleId),
  },
  {
    id: 'duplicate',
    label: 'Duplicar rol',
    icon: Copy,
    onClick: () => handlers?.onDuplicate?.(roleId) || console.log('Duplicar rol', roleId),
  },
  {
    id: 'users',
    label: 'Ver usuarios',
    icon: Users,
    onClick: () => handlers?.onViewUsers?.(roleId) || console.log('Ver usuarios', roleId),
    divider: true,
  },
  {
    id: 'delete',
    label: 'Eliminar rol',
    icon: Trash2,
    color: 'var(--esap-danger)',
    onClick: () => handlers?.onDelete?.(roleId) || console.log('Eliminar rol', roleId),
  },
];

export const statsActions = (type: string) => [
  {
    id: 'view',
    label: 'Ver detalles',
    icon: Eye,
    onClick: () => console.log('Ver detalles', type),
  },
  {
    id: 'export',
    label: 'Exportar datos',
    icon: Shield,
    onClick: () => console.log('Exportar datos', type),
  },
];
