import React, { useCallback, useEffect, useState } from 'react';
import {
  HelpCircle,
  X,
  Book,
  Video,
  MessageCircle,
  FileText,
  Keyboard,
  Mail,
  Phone,
  ExternalLink,
  Search,
  Lightbulb,
  Headphones,
  GraduationCap,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig, type Variants } from 'motion/react';
import { toast } from 'sonner';
import {
  centroAyudaService,
  urlArchivoRecurso,
  type CategoriaCentroAyuda,
  type RecursoCentroAyuda,
} from '../../services/api/centroAyuda.service';
import { ListaRecursos } from './centro-ayuda/ListaRecursos';
import { VisorRecurso } from './centro-ayuda/VisorRecurso';
import { SIN_TRANSICION_CSS, SOLO_TRANSICION_DE_COLOR } from './centro-ayuda/estilosAnimacion';

interface HelpResource {
  id: CategoriaCentroAyuda;
  icon: JSX.Element;
  title: string;
  description: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: '¿Cómo creo un nuevo usuario?',
    answer: 'Ve a Gestión de Usuarios, haz clic en "Nuevo Usuario" y completa el formulario. El usuario recibirá automáticamente un correo con sus credenciales.',
  },
  {
    question: '¿Cómo asigno permisos a un rol?',
    answer: 'En Roles y Permisos, selecciona el rol que deseas modificar y activa los permisos necesarios en el panel derecho. Los cambios se guardan automáticamente.',
  },
  {
    question: '¿Puedo ver el historial de cambios?',
    answer: 'Sí, el módulo de Auditoría registra todos los cambios. Puedes filtrar por usuario, acción, fecha y módulo.',
  },
  {
    question: '¿Cómo exporto un reporte?',
    answer: 'En el módulo de Informes, selecciona el tipo de reporte, aplica los filtros necesarios y haz clic en "Exportar". Puedes elegir entre PDF, Excel o CSV.',
  },
];

export function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'recursos' | 'faqs' | 'contacto'>('recursos');
  const [searchQuery, setSearchQuery] = useState('');
  const [recursos, setRecursos] = useState<RecursoCentroAyuda[] | null>(null);
  const [errorRecursos, setErrorRecursos] = useState(false);
  const [categoriaAbierta, setCategoriaAbierta] = useState<CategoriaCentroAyuda | null>(null);
  const [recursoEnVisor, setRecursoEnVisor] = useState<RecursoCentroAyuda | null>(null);

  const cargarRecursos = useCallback(async () => {
    setErrorRecursos(false);
    try {
      setRecursos(await centroAyudaService.listar());
    } catch {
      setErrorRecursos(true);
    }
  }, []);

  // Se consulta cada vez que se abre el panel para mostrar lo último que se cargó.
  useEffect(() => {
    if (isOpen) {
      cargarRecursos();
    } else {
      setCategoriaAbierta(null);
      setRecursoEnVisor(null);
    }
  }, [isOpen, cargarRecursos]);

  // Esc cierra el panel; si hay un recurso abierto, el visor se cierra primero.
  useEffect(() => {
    if (!isOpen || recursoEnVisor) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [isOpen, recursoEnVisor]);

  const recursosDe = (categoria: CategoriaCentroAyuda) =>
    (recursos || []).filter((r) => r.categoria === categoria);

  const manualVigente = recursosDe('manual').find((r) => r.archivo);

  const abrirCategoria = (categoria: CategoriaCentroAyuda) => {
    if (categoria === 'manual' && manualVigente) {
      const enlace = document.createElement('a');
      enlace.href = urlArchivoRecurso(manualVigente.id, true);
      enlace.download = manualVigente.archivo?.nombre || 'manual.pdf';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      toast.success('Descargando el manual de usuario', {
        description: manualVigente.version ? `Versión ${manualVigente.version} · PDF` : 'PDF',
      });
      return;
    }
    setCategoriaAbierta(categoria);
  };

  /** Lo que se ve en la esquina de cada opción antes de abrirla. */
  const estadoDe = (categoria: CategoriaCentroAyuda) => {
    if (!recursos) return null;
    if (categoria === 'manual') {
      return manualVigente ? { texto: manualVigente.version ? `v${manualVigente.version}` : 'PDF', vacio: false } : { texto: 'Sin contenido', vacio: true };
    }
    const total = recursosDe(categoria).length;
    return total > 0 ? { texto: String(total), vacio: false } : { texto: 'Sin contenido', vacio: true };
  };

  const helpResources: HelpResource[] = [
    {
      id: 'documentacion',
      icon: <Book className="w-5 h-5" />,
      title: 'Documentación completa',
      description: 'Guías detalladas de todos los módulos del sistema',
    },
    {
      id: 'videos',
      icon: <Video className="w-5 h-5" />,
      title: 'Video tutoriales',
      description: 'Aprende con videos paso a paso',
    },
    {
      id: 'atajos',
      icon: <Keyboard className="w-5 h-5" />,
      title: 'Atajos de teclado',
      description: 'Trabaja más rápido con estos atajos',
    },
    {
      id: 'manual',
      icon: <FileText className="w-5 h-5" />,
      title: 'Manual de usuario',
      description: manualVigente?.version
        ? `Descarga el manual en PDF (versión ${manualVigente.version})`
        : 'Descarga el manual completo en PDF',
    },
    {
      id: 'cursos',
      icon: <GraduationCap className="w-5 h-5" />,
      title: 'Cursos de capacitación',
      description: 'Programas de entrenamiento para administradores',
    },
    {
      id: 'practicas',
      icon: <Lightbulb className="w-5 h-5" />,
      title: 'Mejores prácticas',
      description: 'Consejos y recomendaciones de uso',
    },
  ];

  const recursoAbierto = helpResources.find((r) => r.id === categoriaAbierta);

  const entradaTarjeta: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.03, duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
    }),
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MotionConfig reducedMotion="user">
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-slate-50 hover:border-gray-400 hover:-translate-y-0.5 transition-all active:scale-95"
        aria-label="Centro de ayuda"
      >
        <HelpCircle className="w-5 h-5 lg:w-4 lg:h-4 text-slate-700" strokeWidth={2} />
      </button>

      {/* Help Drawer Premium */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end md:items-stretch justify-end">
            {/* Backdrop Premium con Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              style={SIN_TRANSICION_CSS}
            />

            {/* Drawer/Slide-over Container - Desde la derecha */}
            <motion.div
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full sm:w-[95vw] md:w-[85vw] lg:w-[500px] xl:w-[550px] bg-white shadow-2xl overflow-hidden flex flex-col h-full rounded-none sm:rounded-l-2xl"
              style={SIN_TRANSICION_CSS}
            >
              {/* Handle Visual (Mobile) */}
              <div className="md:hidden flex justify-center pt-2 pb-1 bg-white">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header Premium */}
              <div className="relative bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] p-5 border-b border-white/10">
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all active:scale-95"
                  aria-label="Cerrar centro de ayuda"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-3 pr-10">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-lg">Centro de Ayuda</h2>
                    <p className="text-sm text-white/80">
                      Estamos aquí para ayudarte
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs - Compacto */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex gap-1">
                <button
                  onClick={() => setActiveTab('recursos')}
                  className={`px-3 py-2 h-9 rounded-lg text-xs transition-all duration-150 cursor-pointer flex-1 ${
                    activeTab === 'recursos'
                      ? 'bg-white text-[#1e5da8] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-gray-300'
                  }`}
                >
                  Recursos
                </button>
                <button
                  onClick={() => setActiveTab('faqs')}
                  className={`px-3 py-2 h-9 rounded-lg text-xs transition-all duration-150 cursor-pointer flex-1 ${
                    activeTab === 'faqs'
                      ? 'bg-white text-[#1e5da8] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-gray-300'
                  }`}
                >
                  FAQs
                </button>
                <button
                  onClick={() => setActiveTab('contacto')}
                  className={`px-3 py-2 h-9 rounded-lg text-xs transition-all duration-150 cursor-pointer flex-1 ${
                    activeTab === 'contacto'
                      ? 'bg-white text-[#1e5da8] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-gray-300'
                  }`}
                >
                  Contacto
                </button>
              </div>

              {/* Content - Scroll Area */}
              <div className="flex-1 overflow-y-auto">
                {/* Recursos Tab: la cuadrícula y el contenido de una opción se deslizan entre sí */}
                {activeTab === 'recursos' && (
                  <AnimatePresence mode="wait" initial={false}>
                    {recursoAbierto ? (
                      <motion.div
                        key={`lista-${recursoAbierto.id}`}
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 28 }}
                        transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                        style={SIN_TRANSICION_CSS}
                      >
                        {recursos ? (
                          <ListaRecursos
                            titulo={recursoAbierto.title}
                            categoria={recursoAbierto.id}
                            recursos={recursosDe(recursoAbierto.id)}
                            onVolver={() => setCategoriaAbierta(null)}
                            onVer={setRecursoEnVisor}
                          />
                        ) : errorRecursos ? (
                          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                            <p className="text-sm text-slate-700">No se pudieron cargar los recursos de ayuda.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setCategoriaAbierta(null)}
                                className="px-3 py-2 rounded-lg text-xs border border-slate-200 hover:bg-slate-50"
                              >
                                Volver
                              </button>
                              <button
                                onClick={cargarRecursos}
                                className="px-3 py-2 rounded-lg text-xs bg-[#1e5da8] text-white hover:bg-[#174a87]"
                              >
                                Reintentar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
                            <Loader2 className="w-6 h-6 animate-spin text-[#1e5da8]" />
                            <p className="text-xs">Cargando recursos...</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="cuadricula"
                        initial={{ opacity: 0, x: -28 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -28 }}
                        transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                        className="p-4"
                        style={SIN_TRANSICION_CSS}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {helpResources.map((resource, i) => {
                            const estado = estadoDe(resource.id);
                            return (
                              <motion.button
                                key={resource.id}
                                custom={i}
                                variants={entradaTarjeta}
                                initial="hidden"
                                animate="visible"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => abrirCategoria(resource.id)}
                                className="relative flex flex-col items-stretch justify-start p-4 min-h-[120px] rounded-xl border-2 border-slate-200 bg-white hover:border-[#1e5da8] hover:bg-blue-50 hover:shadow-md transition-colors duration-150 text-left group cursor-pointer"
                                style={SOLO_TRANSICION_DE_COLOR}
                              >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                      estado?.vacio
                                        ? 'bg-slate-100 text-slate-400'
                                        : 'bg-blue-50 text-[#1e5da8] group-hover:bg-blue-100'
                                    }`}
                                  >
                                    {resource.icon}
                                  </div>
                                  {estado === null ? (
                                    <span className="h-5 w-12 rounded-full bg-slate-100 animate-pulse" aria-hidden />
                                  ) : (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                        estado.vacio
                                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                                          : 'bg-blue-50 text-[#1e5da8] border-blue-100'
                                      }`}
                                    >
                                      {estado.texto}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm text-slate-900 mb-1 font-medium">
                                  {resource.title}
                                </h4>
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {resource.description}
                                </p>
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Quick Access */}
                        <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#1e5da8] text-white flex items-center justify-center flex-shrink-0">
                              <Headphones className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm text-slate-900 mb-1 font-medium">
                                ¿Necesitas ayuda inmediata?
                              </h4>
                              <p className="text-xs text-slate-600">
                                Nuestro equipo de soporte está disponible de lunes a viernes de 8:00 AM a 6:00 PM.
                                Escríbenos desde la pestaña Contacto.
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* FAQs Tab */}
                {activeTab === 'faqs' && (
                  <div className="p-4">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar en preguntas frecuentes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 h-10 rounded-lg border-2 border-slate-200 text-sm focus:border-[#1e5da8] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* FAQ List */}
                    <div className="space-y-3">
                      {filteredFaqs.map((faq, index) => (
                        <details
                          key={index}
                          className="group rounded-xl border-2 border-slate-200 hover:border-[#1e5da8] transition-colors overflow-hidden"
                        >
                          <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between bg-white hover:bg-blue-50/50 transition-colors">
                            <span className="text-sm text-slate-900 font-medium">
                              {faq.question}
                            </span>
                            <svg
                              className="w-4 h-4 text-slate-600 group-open:rotate-180 transition-transform"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </details>
                      ))}
                    </div>

                    {filteredFaqs.length === 0 && (
                      <div className="py-12 text-center">
                        <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-600">
                          No se encontraron resultados
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contacto Tab */}
                {activeTab === 'contacto' && (
                  <div className="p-4 space-y-4">
                    {/* Soporte Técnico */}
                    <div className="p-4 rounded-xl border-2 border-slate-200 hover:border-[#1e5da8] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#1e5da8] flex items-center justify-center flex-shrink-0">
                          <Headphones className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-slate-900 mb-1 font-medium">
                            Soporte Técnico
                          </h4>
                          <p className="text-xs text-slate-600 mb-3">
                            Para problemas técnicos o errores del sistema
                          </p>
                          <div className="space-y-2">
                            <a
                              href="mailto:soporte@esap.edu.co"
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              soporte@esap.edu.co
                            </a>
                            <a
                              href="tel:+576013536464"
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              +57 (601) 353 6464 Ext. 1234
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mesa de Ayuda */}
                    <div className="p-4 rounded-xl border-2 border-slate-200 hover:border-[#1e5da8] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-slate-900 mb-1 font-medium">
                            Mesa de Ayuda
                          </h4>
                          <p className="text-xs text-slate-600 mb-3">
                            Consultas generales y solicitudes
                          </p>
                          <div className="space-y-2">
                            <a
                              href="mailto:mesadeayuda@esap.edu.co"
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              mesadeayuda@esap.edu.co
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Horarios */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                      <h4 className="text-sm text-slate-900 mb-2 font-medium">
                        Horario de Atención
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span>Lunes a Viernes:</span>
                          <span className="font-medium">8:00 AM - 6:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sábados:</span>
                          <span className="font-medium">9:00 AM - 1:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Domingos:</span>
                          <span className="text-slate-500">Cerrado</span>
                        </div>
                      </div>
                    </div>

                    {/* Portal de Ayuda */}
                    <button className="w-full p-4 rounded-xl bg-[#1e5da8] text-white hover:bg-[#174a87] transition-colors flex items-center justify-between group">
                      <div className="text-left">
                        <h4 className="text-sm mb-0.5 font-medium">Portal de Ayuda ESAP</h4>
                        <p className="text-xs text-white/80">
                          Visita nuestro portal completo de soporte
                        </p>
                      </div>
                      <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>

              {/* Footer - Compacto */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  Versión 2.0.0
                </span>
                <button className="text-xs text-[#1e5da8] hover:text-[#174a8a] flex items-center gap-1 transition-colors font-medium">
                  ¿Sugerir mejora?
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recursoEnVisor && (
          <VisorRecurso recurso={recursoEnVisor} onCerrar={() => setRecursoEnVisor(null)} />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}