import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Command, Keyboard } from 'lucide-react';

interface ShortcutHintProps {
  show?: boolean;
  delay?: number;
}

export function ShortcutHint({ show = true, delay = 3000 }: ShortcutHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('shortcutHintDismissed') === 'true';
  });

  useEffect(() => {
    if (!show || isDismissed) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    // Auto-hide después de 8 segundos
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, delay + 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [show, delay, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('shortcutHintDismissed', 'true');
  };

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-40 max-w-sm"
        >
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl overflow-hidden">


            {/* Animated progress bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className="h-1 bg-white opacity-30"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
