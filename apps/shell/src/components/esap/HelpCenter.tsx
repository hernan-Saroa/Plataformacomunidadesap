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
import { motion, AnimatePresence } from 'motion/react';
import {
  centroAyudaService,
  urlArchivoRecurso,
  type CategoriaCentroAyuda,
  type RecursoCentroAyuda,
} from '../../services/api/centroAyuda.service';
import { ListaRecursos } from './centro-ayuda/ListaRecursos';
import { VisorRecurso } from './centro-ayuda/VisorRecurso';

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
      return;
    }
    setCategoriaAbierta(categoria);
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

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-lg border-2 border-[--esap-gray-400] bg-white flex items-center justify-center hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] hover:-translate-y-0.5 transition-all active:scale-95"
        aria-label="Centro de ayuda"
      >
        <HelpCircle className="w-5 h-5 lg:w-4 lg:h-4 text-[--esap-gray-700]" strokeWidth={2} />
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
            />

            {/* Drawer/Slide-over Container - Desde la derecha */}
            <motion.div
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full sm:w-[95vw] md:w-[85vw] lg:w-[500px] xl:w-[550px] bg-white shadow-2xl overflow-hidden flex flex-col h-full rounded-none sm:rounded-l-2xl"
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
              <div className="px-4 py-3 bg-[--esap-gray-50] border-b border-[--esap-gray-200] flex gap-1">
                <button
                  onClick={() => setActiveTab('recursos')}
                  className={`px-3 py-2 h-9 rounded-lg text-xs transition-all duration-150 cursor-pointer flex-1 ${
                    activeTab === 'recursos'
                      ? 'bg-white text-[--esap-primary] shadow-sm font-semibold'
                      : 'text-[--esap-gray-600] hover:text-[--esap-gray-900] hover:bg-white/70 border border-transparent hover:border-gray-200'
                  }`}
                >
                  Recursos
                </button>
                <button
                  onClick={() => setActiveTab('faqs')}
                  className={`px-3 py-2 h-9 rounded-lg text-xs transition-all duration-150 cursor-pointer flex-1 ${
                    activeTab === 'faqs'
                      ? 'bg-white text-[--esap-primary] shadow-sm font-semibold'
                      : 'text-[--esap-gray-600] hover:text-[--esap-gray-900] hover:bg-white/70 border border-transparent hover:border-gray-200'
                  }`}
                >
                  FAQs
                </button>
                <button
                  onClick={() => setActiveTab('contacto')}
                  className={`px-3 py-2 h-9 rounded-lg text-xs transition-all duration-150 cursor-pointer flex-1 ${
                    activeTab === 'contacto'
                      ? 'bg-white text-[--esap-primary] shadow-sm font-semibold'
                      : 'text-[--esap-gray-600] hover:text-[--esap-gray-900] hover:bg-white/70 border border-transparent hover:border-gray-200'
                  }`}
                >
                  Contacto
                </button>
              </div>

              {/* Content - Scroll Area */}
              <div className="flex-1 overflow-y-auto">
                {/* Recursos Tab: contenido de una opción */}
                {activeTab === 'recursos' && recursoAbierto && (
                  recursos ? (
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
                      <p className="text-sm text-[--esap-gray-700]">No se pudieron cargar los recursos de ayuda.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCategoriaAbierta(null)}
                          className="px-3 py-2 rounded-lg text-xs border border-[--esap-gray-200] hover:bg-[--esap-gray-50]"
                        >
                          Volver
                        </button>
                        <button
                          onClick={cargarRecursos}
                          className="px-3 py-2 rounded-lg text-xs bg-[--esap-primary] text-white hover:bg-[--esap-primary-dark]"
                        >
                          Reintentar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-12 text-[--esap-gray-600]">
                      <Loader2 className="w-6 h-6 animate-spin text-[--esap-primary]" />
                      <p className="text-xs">Cargando recursos...</p>
                    </div>
                  )
                )}

                {/* Recursos Tab */}
                {activeTab === 'recursos' && !recursoAbierto && (
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {helpResources.map((resource) => (
                        <button
                          key={resource.id}
                          onClick={() => abrirCategoria(resource.id)}
                          className="relative p-4 min-h-[110px] rounded-xl border-2 border-[--esap-gray-200] hover:border-[--esap-primary] hover:bg-blue-50/50 hover:shadow-sm transition-all duration-150 text-left group cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 text-[--esap-primary] flex items-center justify-center mb-3 group-hover:bg-[--esap-primary] group-hover:text-white transition-colors">
                            {resource.icon}
                          </div>
                          <h4 className="text-sm text-[--esap-gray-900] mb-1 font-medium">
                            {resource.title}
                          </h4>
                          <p className="text-xs text-[--esap-gray-600] line-clamp-2">
                            {resource.description}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Quick Access */}
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[--esap-primary] text-white flex items-center justify-center flex-shrink-0">
                          <Headphones className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-[--esap-gray-900] mb-1 font-medium">
                            ¿Necesitas ayuda inmediata?
                          </h4>
                          <p className="text-xs text-[--esap-gray-600] mb-3">
                            Nuestro equipo de soporte está disponible de lunes a viernes de 8:00 AM a 6:00 PM
                          </p>
                          <button className="w-full px-4 py-2.5 h-10 bg-[--esap-primary] text-white rounded-lg text-xs hover:bg-[--esap-primary-dark] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md font-medium">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Iniciar chat en vivo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* FAQs Tab */}
                {activeTab === 'faqs' && (
                  <div className="p-4">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
                      <input
                        type="text"
                        placeholder="Buscar en preguntas frecuentes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 h-10 rounded-lg border-2 border-[--esap-gray-200] text-sm focus:border-[--esap-primary] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* FAQ List */}
                    <div className="space-y-3">
                      {filteredFaqs.map((faq, index) => (
                        <details
                          key={index}
                          className="group rounded-xl border-2 border-[--esap-gray-200] hover:border-[--esap-primary] transition-colors overflow-hidden"
                        >
                          <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between bg-white hover:bg-blue-50/50 transition-colors">
                            <span className="text-sm text-[--esap-gray-900] font-medium">
                              {faq.question}
                            </span>
                            <svg
                              className="w-4 h-4 text-[--esap-gray-600] group-open:rotate-180 transition-transform"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="px-4 py-3 bg-[--esap-gray-50] border-t border-[--esap-gray-200]">
                            <p className="text-xs text-[--esap-gray-700] leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </details>
                      ))}
                    </div>

                    {filteredFaqs.length === 0 && (
                      <div className="py-12 text-center">
                        <Search className="w-12 h-12 text-[--esap-gray-300] mx-auto mb-3" />
                        <p className="text-sm text-[--esap-gray-600]">
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
                    <div className="p-4 rounded-xl border-2 border-[--esap-gray-200] hover:border-[--esap-primary] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-[--esap-primary] flex items-center justify-center flex-shrink-0">
                          <Headphones className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-[--esap-gray-900] mb-1 font-medium">
                            Soporte Técnico
                          </h4>
                          <p className="text-xs text-[--esap-gray-600] mb-3">
                            Para problemas técnicos o errores del sistema
                          </p>
                          <div className="space-y-2">
                            <a
                              href="mailto:soporte@esap.edu.co"
                              className="flex items-center gap-2 text-xs text-[--esap-primary] hover:text-[--esap-primary-dark] transition-colors font-medium"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              soporte@esap.edu.co
                            </a>
                            <a
                              href="tel:+576013536464"
                              className="flex items-center gap-2 text-xs text-[--esap-primary] hover:text-[--esap-primary-dark] transition-colors font-medium"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              +57 (601) 353 6464 Ext. 1234
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mesa de Ayuda */}
                    <div className="p-4 rounded-xl border-2 border-[--esap-gray-200] hover:border-[--esap-primary] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-[--esap-gray-900] mb-1 font-medium">
                            Mesa de Ayuda
                          </h4>
                          <p className="text-xs text-[--esap-gray-600] mb-3">
                            Consultas generales y solicitudes
                          </p>
                          <div className="space-y-2">
                            <a
                              href="mailto:mesadeayuda@esap.edu.co"
                              className="flex items-center gap-2 text-xs text-[--esap-primary] hover:text-[--esap-primary-dark] transition-colors font-medium"
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
                      <h4 className="text-sm text-[--esap-gray-900] mb-2 font-medium">
                        Horario de Atención
                      </h4>
                      <div className="space-y-1.5 text-xs text-[--esap-gray-700]">
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
                          <span className="text-[--esap-gray-500]">Cerrado</span>
                        </div>
                      </div>
                    </div>

                    {/* Portal de Ayuda */}
                    <button className="w-full p-4 rounded-xl bg-[--esap-primary] text-white hover:bg-[--esap-primary-dark] transition-colors flex items-center justify-between group">
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
              <div className="px-4 py-3 bg-[--esap-gray-50] border-t border-[--esap-gray-200] flex items-center justify-between">
                <span className="text-xs text-[--esap-gray-600]">
                  Versión 2.0.0
                </span>
                <button className="text-xs text-[--esap-primary] hover:text-[--esap-primary-dark] flex items-center gap-1 transition-colors font-medium">
                  ¿Sugerir mejora?
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {recursoEnVisor && (
        <VisorRecurso recurso={recursoEnVisor} onCerrar={() => setRecursoEnVisor(null)} />
      )}
    </>
  );
}