import { X, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InlineTipProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  variant?: 'info' | 'success' | 'warning';
}

const variantStyles = {
  info: {
    container: 'from-blue-50 to-indigo-50 border-blue-400',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    textColor: 'text-blue-700'
  },
  success: {
    container: 'from-green-50 to-emerald-50 border-green-400',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
    textColor: 'text-green-700'
  },
  warning: {
    container: 'from-yellow-50 to-orange-50 border-yellow-400',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
    textColor: 'text-yellow-700'
  }
};

export function InlineTip({ 
  title, 
  message, 
  icon = <Lightbulb className="w-5 h-5" />,
  dismissible = true,
  onDismiss,
  variant = 'info'
}: InlineTipProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="overflow-hidden mb-6"
    >
      <div className={`p-4 bg-gradient-to-r ${styles.container} border-l-4 rounded-lg shadow-sm`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${styles.iconColor}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold mb-1 ${styles.titleColor}`}>{title}</h4>
            <p className={`text-sm leading-relaxed ${styles.textColor}`}>{message}</p>
          </div>
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 
                       transition-colors p-1 rounded hover:bg-white/50"
              aria-label="Cerrar tip"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
