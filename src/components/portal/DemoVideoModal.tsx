import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Briefcase, FileCheck, GraduationCap, Users, Calendar, Award, BookOpen, TrendingUp, CheckCircle, Sparkles, Zap, Play, Pause } from 'lucide-react';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [viewCount, setViewCount] = useState(3247);
  const [floatingEmojis, setFloatingEmojis] = useState<{id: number, emoji: string, x: number}[]>([]);

  // Escenas del video (30 segundos total, ~5 segundos por escena)
  const scenes = [
    {
      id: 0,
      duration: 5000,
      title: "¡Bienvenido a La Comunidad ESAP! 🎓",
      subtitle: "Tu portal universitario todo-en-uno",
      gradient: "from-blue-600 via-blue-500 to-cyan-500",
      icon: <Sparkles className="w-16 h-16" />,
      features: ["Portal Estudiantil", "Servicios 24/7", "100% Digital"],
      animation: "float",
      backgroundImage: "https://images.unsplash.com/photo-1759299615947-bc798076b479?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwY2FtcHVzJTIwc3R1ZGVudHMlMjBtb2Rlcm58ZW58MXx8fHwxNzYzMDk1NDc0fDA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 1,
      duration: 5000,
      title: "Encuentra tu trabajo ideal 💼",
      subtitle: "Bolsa de empleo exclusiva para estudiantes ESAP",
      gradient: "from-emerald-600 via-emerald-500 to-teal-500",
      icon: <Briefcase className="w-16 h-16" />,
      features: ["Ofertas laborales", "Empresas verificadas", "Postulación rápida"],
      animation: "scale",
      backgroundImage: "https://images.unsplash.com/photo-1758270705290-62b6294dd044?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBsYXB0b3AlMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc2MzA5NTQ1NXww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 2,
      duration: 5000,
      title: "Solicita certificados al instante 📄",
      subtitle: "Certificados digitales con firma electrónica ONAC",
      gradient: "from-purple-600 via-purple-500 to-pink-500",
      icon: <FileCheck className="w-16 h-16" />,
      features: ["Generación automática", "Firma digital ONAC", "Código QR único"],
      animation: "rotate",
      backgroundImage: "https://images.unsplash.com/photo-1560452891-a28b0484827c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudCUyMG1vYmlsZSUyMGFwcHxlbnwxfHx8fDE3NjMwOTU0Njd8MA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 3,
      duration: 5000,
      title: "Verifica títulos con QR 🎖️",
      subtitle: "Validación instantánea de títulos universitarios",
      gradient: "from-orange-600 via-orange-500 to-amber-500",
      icon: <Award className="w-16 h-16" />,
      features: ["Escanea QR", "Validación inmediata", "100% seguro"],
      animation: "pulse",
      backgroundImage: "https://images.unsplash.com/photo-1758270704534-fd9715bffc0e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwc3R1ZGVudHMlMjBzbWFydHBob25lJTIwY2FtcHVzfGVufDF8fHx8MTc2MzA5NTQ2N3ww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 4,
      duration: 5000,
      title: "Lee blogs académicos 📚",
      subtitle: "Artículos de investigación y conocimiento universitario",
      gradient: "from-indigo-600 via-indigo-500 to-blue-500",
      icon: <BookOpen className="w-16 h-16" />,
      features: ["Investigaciones", "Papers académicos", "Contenido exclusivo"],
      animation: "float",
      backgroundImage: "https://images.unsplash.com/photo-1758270705172-07b53627dfcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHN0dWRlbnRzJTIwY29sbGFib3JhdGlvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzYzMDk1NDY3fDA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 5,
      duration: 5000,
      title: "Convocatorias docentes 👥",
      subtitle: "Oportunidades académicas y eventos universitarios",
      gradient: "from-rose-600 via-rose-500 to-pink-500",
      icon: <Users className="w-16 h-16" />,
      features: ["Convocatorias", "Eventos académicos", "Calendario integrado"],
      animation: "scale",
      backgroundImage: "https://images.unsplash.com/photo-1728023881214-1d71a7a30a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMHdvcmtpbmclMjB0b2dldGhlciUyMGxhcHRvcHxlbnwxfHx8fDE3NjMwOTU0NzV8MA&ixlib=rb-4.1.0&q=80&w=1080"
    }
  ];

  // Auto-avance de escenas
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const currentSceneDuration = scenes[currentScene].duration;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = (100 / currentSceneDuration) * 50; // Update every 50ms
        if (prev >= 100) {
          return 0;
        }
        return prev + increment;
      });
    }, 50);

    const timer = setTimeout(() => {
      if (currentScene < scenes.length - 1) {
        setCurrentScene(currentScene + 1);
        setProgress(0);
      } else {
        // Reiniciar al final
        setCurrentScene(0);
        setProgress(0);
      }
    }, currentSceneDuration);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [currentScene, isOpen, isPlaying]);

  // Reset cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setCurrentScene(0);
      setProgress(0);
      setIsPlaying(true);
    }
  }, [isOpen]);

  // Simular incremento de vistas
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setViewCount(prev => prev + Math.floor(Math.random() * 3));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Generar emojis flotantes aleatorios
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const emojis = ['🔥', '💯', '🚀', '⚡', '✨', '💪', '👏', '🎯', '💼', '📱', '🎓', '📚'];
    
    const interval = setInterval(() => {
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const randomX = Math.random() * 80 + 10; // 10% to 90%
      const id = Date.now();
      
      setFloatingEmojis(prev => [...prev, { id, emoji: randomEmoji, x: randomX }]);
      
      // Remover después de la animación
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
      }, 3000);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const goToScene = (sceneId: number) => {
    setCurrentScene(sceneId);
    setProgress(0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextScene = currentScene < scenes.length - 1 ? currentScene + 1 : 0;
        goToScene(nextScene);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevScene = currentScene > 0 ? currentScene - 1 : scenes.length - 1;
        goToScene(prevScene);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentScene, isPlaying]);

  const scene = scenes[currentScene];

  // Animaciones por tipo
  const getAnimation = (type: string) => {
    switch (type) {
      case 'float':
        return {
          animate: { y: [0, -20, 0] },
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        };
      case 'scale':
        return {
          animate: { scale: [1, 1.1, 1] },
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        };
      case 'rotate':
        return {
          animate: { rotate: [0, 5, -5, 0] },
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        };
      case 'pulse':
        return {
          animate: { scale: [1, 1.05, 1] },
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[96vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-4xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/10">
              {/* Header */}
              <div className="relative px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-white/10 bg-black/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 animate-pulse"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="ml-2 sm:ml-4 text-white/70 text-xs sm:text-sm font-medium hidden md:inline truncate">Demo - La Comunidad ESAP</span>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="ml-auto mr-2 sm:mr-4 flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-white/10 rounded-full backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-white/90 text-[10px] sm:text-xs font-semibold">{viewCount.toLocaleString()}</span>
                      </div>
                      <span className="text-white/60 text-[10px] sm:text-xs hidden sm:inline">vistas</span>
                    </motion.div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors group flex-shrink-0"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 group-hover:text-white" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Video Content */}
              <div className="relative aspect-video overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentScene}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0">
                      <motion.div
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 5 }}
                        className="w-full h-full"
                      >
                        <ImageWithFallback
                          src={scene.backgroundImage}
                          alt={scene.title}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                      {/* Gradient Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${scene.gradient} opacity-85`} />
                      {/* Vignette Effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
                      {/* Scan Line Effect */}
                      <motion.div
                        animate={{ y: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                      {/* Particles */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ 
                            x: Math.random() * 100 + '%',
                            y: '100%',
                            opacity: 0
                          }}
                          animate={{ 
                            y: '-10%',
                            opacity: [0, 0.6, 0]
                          }}
                          transition={{ 
                            duration: Math.random() * 5 + 3,
                            delay: Math.random() * 2,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="absolute w-1 h-1 bg-white rounded-full"
                        />
                      ))}
                    </div>

                    {/* Badge "LIVE" / Scene Number */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-6 md:left-6 z-20"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-red-500/90 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse"></div>
                        <span className="text-white text-[10px] sm:text-xs font-bold uppercase">Demo en Vivo</span>
                      </div>
                    </motion.div>

                    {/* Content */}
                    <div className="relative z-10 text-center px-4 sm:px-6 md:px-8 max-w-3xl">
                      {/* Icon with animation */}
                      <motion.div
                        className="mb-4 sm:mb-6 md:mb-8 inline-block text-white scale-75 sm:scale-90 md:scale-100"
                        {...getAnimation(scene.animation)}
                      >
                        {scene.icon}
                      </motion.div>

                      {/* Title */}
                      <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight px-2"
                      >
                        {scene.title}
                      </motion.h2>

                      {/* Subtitle */}
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white/90 mb-4 sm:mb-6 md:mb-8 px-2"
                      >
                        {scene.subtitle}
                      </motion.p>

                      {/* Features */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-wrap gap-2 sm:gap-3 justify-center"
                      >
                        {scene.features.map((feature, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + idx * 0.1 }}
                            className="px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30"
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white flex-shrink-0" />
                              <span className="text-white font-medium text-xs sm:text-sm md:text-base">{feature}</span>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {/* Floating Orbs */}
                      <motion.div
                        animate={{ 
                          y: [0, -30, 0],
                          x: [0, 20, 0],
                          rotate: 360 
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
                      />
                      <motion.div
                        animate={{ 
                          y: [0, 30, 0],
                          x: [0, -20, 0],
                          rotate: -360 
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
                      />
                      <motion.div
                        animate={{ 
                          y: [0, 20, 0],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl"
                      />
                      
                      {/* Floating Icons */}
                      <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 0.1, y: [100, -10, 100] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-10 left-10 text-white"
                      >
                        <Zap className="w-12 h-12" />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 0.1, y: [100, -10, 100] }}
                        transition={{ duration: 10, delay: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-20 right-20 text-white"
                      >
                        <Sparkles className="w-10 h-10" />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 0.1, y: [100, -10, 100] }}
                        transition={{ duration: 12, delay: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-20 right-32 text-white"
                      >
                        <TrendingUp className="w-10 h-10" />
                      </motion.div>
                    </div>

                    {/* Floating Emojis Reactions */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <AnimatePresence>
                        {floatingEmojis.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ y: '100%', opacity: 0, scale: 0 }}
                            animate={{ y: '-20%', opacity: [0, 1, 1, 0], scale: [0, 1.2, 1] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 3, ease: "easeOut" }}
                            className="absolute bottom-0 text-2xl sm:text-3xl md:text-4xl"
                            style={{ left: `${item.x}%` }}
                          >
                            {item.emoji}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-black/20 border-t border-white/10">
                <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
                  {/* Scene Dots */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {scenes.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => goToScene(idx)}
                        title={s.title}
                        className={`group relative w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                          idx === currentScene 
                            ? 'bg-white w-6 sm:w-8' 
                            : 'bg-white/30 hover:bg-white/50'
                        }`}
                      >
                        {/* Tooltip on hover - solo desktop */}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden lg:block">
                          {s.title.split(' ').slice(0, 3).join(' ')}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Play/Pause */}
                  <button
                    onClick={togglePlayPause}
                    className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 group-hover:text-white" />
                    ) : (
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 group-hover:text-white" />
                    )}
                  </button>

                  {/* Timer & Shortcuts Hint */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-white/70 text-xs sm:text-sm font-medium">
                      {currentScene + 1}/{scenes.length}
                    </div>
                    <div className="hidden lg:flex items-center gap-1 text-white/40 text-xs">
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">←</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">→</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Space</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Footer */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border-t border-white/10 backdrop-blur-sm relative overflow-hidden"
              >
                {/* Animated Background */}
                <div className="absolute inset-0 opacity-20">
                  <motion.div
                    animate={{ x: ['0%', '100%'] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                </div>
                
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="text-center sm:text-left w-full sm:w-auto">
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="text-white font-bold text-sm sm:text-base mb-1 flex items-center justify-center sm:justify-start gap-2"
                    >
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 flex-shrink-0" />
                      <span className="leading-tight">¡Súmate a la revolución digital!</span>
                    </motion.p>
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="text-white/80 text-xs sm:text-sm"
                    >
                      Miles de estudiantes ya están usando el portal
                    </motion.p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      onClick={onClose}
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-6 py-4 sm:px-8 sm:py-6 text-sm sm:text-base shadow-xl shadow-blue-500/30"
                    >
                      <span>Empezar ahora</span>
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 ml-2 animate-pulse" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
