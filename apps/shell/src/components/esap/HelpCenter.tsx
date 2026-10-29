import React, { useCallback, useEffect, useState } from 'react';
import {
  HelpCircle,
  X,
  MessageCircle,
  Mail,
  Phone,
  ExternalLink,
  Search,
  Headphones,
  Loader2,
  AlertCircle,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig, type Variants } from 'motion/react';
import { toast } from 'sonner';
import {
  centroAyudaService,
  urlArchivoRecurso,
  type RecursoCentroAyuda,
  type SeccionPublicada,
} from '../../services/api/centroAyuda.service';
import { ListaRecursos, ResultadosBusqueda } from './centro-ayuda/ListaRecursos';
import { IconoSeccion } from './centro-ayuda/IconoSeccion';
import { buscarRecursos } from './centro-ayuda/busqueda';
import { VisorRecurso } from './centro-ayuda/VisorRecurso';
import { SIN_TRANSICION_CSS, SOLO_TRANSICION_DE_COLOR } from './centro-ayuda/estilosAnimacion';

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
    answer: 'En Roles y Permisos, abre el menú ⋮ del rol y elige «Gestionar Permisos». Marca los permisos que necesites (puedes buscarlos por módulo o nombre) y toca «Guardar Permisos». Quienes tengan ese rol verán los cambios la próxima vez que inicien sesión.',
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

/**
 * Canales oficiales de la ESAP, tomados de esap.edu.co el 27/10/2026: Dirección de
 * Atención al Ciudadano, su directorio telefónico, la página de PQRSD y la de la OTIC.
 * La ESAP no tiene un "portal de ayuda" propio; el soporte de sistemas es la Mesa de
 * Servicios de la OTIC y las sugerencias se radican por PQRSD.
 */
const CANALES_ESAP = {
  mesaDeServicios: 'https://forms.office.com/r/AerGNpXbAL',
  correoMesaDeAyuda: 'mesadeayuda@esap.edu.co',
  lineaNacional: '018000 423713',
  lineaBogota: '(+57) 601 7956110',
  lineaBogotaMarcacion: '+576017956110',
  correoVentanilla: 'ventanillaunica@esap.edu.co',
  sedeCentral: 'Calle 44 # 53-37, CAN, Bogotá D.C.',
  atencionAlCiudadano:
    'https://www.esap.edu.co/esap/organigrama/subdireccion-nacional-de-gestion-corporativa/direccion-de-atencion-al-ciudadano/',
  pqrsd:
    'https://www.esap.edu.co/esap/organigrama/subdireccion-nacional-de-gestion-corporativa/direccion-de-atencion-al-ciudadano/pqrsd/',
  horarios: [
    { canal: 'Línea telefónica, lunes a viernes', horario: '7:00 a.m. a 9:00 p.m.' },
    { canal: 'Línea telefónica, sábados', horario: '7:00 a.m. a 2:00 p.m.' },
    { canal: 'Presencial, lunes a viernes', horario: '8:00 a.m. a 5:00 p.m.' },
    { canal: 'Agente virtual', horario: 'Todos los días, 24 horas' },
  ],
} as const;

export function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'recursos' | 'faqs' | 'contacto'>('recursos');
  const [searchQuery, setSearchQuery] = useState('');
  const [secciones, setSecciones] = useState<SeccionPublicada[] | null>(null);
  const [errorRecursos, setErrorRecursos] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState<number | null>(null);
  const [recursoEnVisor, setRecursoEnVisor] = useState<RecursoCentroAyuda | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargarRecursos = useCallback(async () => {
    setErrorRecursos(false);
    try {
      setSecciones(await centroAyudaService.listarPublicado());
    } catch {
      setErrorRecursos(true);
    }
  }, []);

  // Se consulta cada vez que se abre el panel para mostrar lo último que se cargó.
  useEffect(() => {
    if (isOpen) {
      cargarRecursos();
    } else {
      setSeccionAbierta(null);
      setRecursoEnVisor(null);
      setBusqueda('');
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

  const recursos: RecursoCentroAyuda[] | null = secciones ? secciones.flatMap((s) => s.recursos) : null;
  const nombreDeSeccion = (idSeccion: number) => secciones?.find((s) => s.id === idSeccion)?.nombre ?? '';

  /** En una sección de manual, el PDF vigente que se descarga al tocarla. */
  const manualDe = (seccion: SeccionPublicada) =>
    seccion.tipo === 'manual' ? seccion.recursos.find((r) => r.archivo) : undefined;

  const consultaActiva = busqueda.trim().length > 0;
  const resultadosBusqueda = consultaActiva ? buscarRecursos(recursos || [], busqueda, nombreDeSeccion) : [];

  const abrirSeccion = (seccion: SeccionPublicada) => {
    const manual = manualDe(seccion);
    if (manual) {
      const enlace = document.createElement('a');
      enlace.href = urlArchivoRecurso(manual.id, true);
      enlace.download = manual.archivo?.nombre || 'manual.pdf';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      toast.success(`Descargando: ${seccion.nombre}`, {
        description: manual.version ? `Versión ${manual.version} · PDF` : 'PDF',
      });
      return;
    }
    setSeccionAbierta(seccion.id);
  };

  /** Lo que se ve en la esquina de cada sección antes de abrirla. */
  const estadoDe = (seccion: SeccionPublicada) => {
    if (seccion.tipo === 'manual') {
      const manual = manualDe(seccion);
      return manual ? { texto: manual.version ? `v${manual.version}` : 'PDF', vacio: false } : { texto: 'Sin contenido', vacio: true };
    }
    const total = seccion.recursos.length;
    return total > 0 ? { texto: String(total), vacio: false } : { texto: 'Sin contenido', vacio: true };
  };

  /** La descripción del manual dice qué versión se va a descargar. */
  const descripcionDe = (seccion: SeccionPublicada) => {
    const manual = manualDe(seccion);
    if (manual?.version) return `${seccion.descripcion || 'Manual en PDF'} (versión ${manual.version})`;
    return seccion.descripcion || '';
  };

  const seccionEnLista = secciones?.find((s) => s.id === seccionAbierta);

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
                    {seccionAbierta !== null ? (
                      <motion.div
                        key={`lista-${seccionAbierta}`}
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 28 }}
                        transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                        style={SIN_TRANSICION_CSS}
                      >
                        {seccionEnLista ? (
                          <ListaRecursos
                            seccion={seccionEnLista}
                            recursos={seccionEnLista.recursos}
                            onVolver={() => setSeccionAbierta(null)}
                            onVer={setRecursoEnVisor}
                          />
                        ) : errorRecursos ? (
                          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                            <p className="text-sm text-slate-700">No se pudieron cargar los recursos de ayuda.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSeccionAbierta(null)}
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
                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            inputMode="search"
                            placeholder="Buscar manuales, videos, guías..."
                            aria-label="Buscar recursos de ayuda"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => {
                              // Esc primero limpia la búsqueda; con el campo vacío cierra el panel
                              if (e.key === 'Escape' && busqueda) {
                                e.stopPropagation();
                                setBusqueda('');
                              }
                            }}
                            className="w-full pl-10 pr-10 py-2 h-10 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-900 placeholder:text-gray-400 focus:border-[#1e5da8] focus:outline-none transition-colors"
                          />
                          {busqueda && (
                            <button
                              onClick={() => setBusqueda('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-gray-700"
                              aria-label="Limpiar búsqueda"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {consultaActiva ? (
                          secciones ? (
                            <ResultadosBusqueda consulta={busqueda} secciones={secciones} resultados={resultadosBusqueda} onVer={setRecursoEnVisor} />
                          ) : (
                            <div className="flex justify-center py-10">
                              <Loader2 className="w-6 h-6 animate-spin text-[#1e5da8]" />
                            </div>
                          )
                        ) : (
                          <>
                          {secciones === null ? (
                            errorRecursos ? (
                              <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 px-4 py-10 text-center">
                                <AlertCircle className="w-8 h-8 text-amber-500" />
                                <p className="text-sm text-slate-700">No se pudieron cargar los recursos de ayuda.</p>
                                <button
                                  onClick={cargarRecursos}
                                  className="px-3 py-2 rounded-lg text-xs bg-[#1e5da8] text-white hover:bg-[#174a87]"
                                >
                                  Reintentar
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Cargando recursos">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <div key={i} className="min-h-[120px] rounded-xl border-2 border-slate-200 bg-slate-50 animate-pulse" />
                                ))}
                              </div>
                            )
                          ) : secciones.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200">
                                <Inbox className="h-6 w-6 text-slate-400" />
                              </span>
                              <p className="text-sm font-medium text-slate-800">Contenido no disponible por el momento</p>
                            </div>
                          ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {secciones.map((seccion, i) => {
                              const estado = estadoDe(seccion);
                              return (
                                <motion.button
                                  key={seccion.id}
                                  custom={i}
                                  variants={entradaTarjeta}
                                  initial="hidden"
                                  animate="visible"
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => abrirSeccion(seccion)}
                                  className="relative flex flex-col items-stretch justify-start p-4 min-h-[120px] rounded-xl border-2 border-slate-200 bg-white hover:border-[#1e5da8] hover:bg-blue-50 hover:shadow-md transition-colors duration-150 text-left group cursor-pointer"
                                  style={SOLO_TRANSICION_DE_COLOR}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-3">
                                    <div
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                        estado.vacio
                                          ? 'bg-slate-100 text-slate-400'
                                          : 'bg-blue-50 text-[#1e5da8] group-hover:bg-blue-100'
                                      }`}
                                    >
                                      <IconoSeccion nombre={seccion.icono} className="w-5 h-5" />
                                    </div>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                        estado.vacio
                                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                                          : 'bg-blue-50 text-[#1e5da8] border-blue-100'
                                      }`}
                                    >
                                      {estado.texto}
                                    </span>
                                  </div>
                                  <h4 className="text-sm text-slate-900 mb-1 font-medium">
                                    {seccion.nombre}
                                  </h4>
                                  <p className="text-xs text-slate-600 line-clamp-2">
                                    {descripcionDe(seccion)}
                                  </p>
                                </motion.button>
                              );
                            })}
                          </div>
                          )}

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
                                  Las fallas de la plataforma las atiende la Mesa de Servicios de la OTIC. La línea
                                  {' '}{CANALES_ESAP.lineaNacional} atiende de lunes a viernes de 7:00 a.m. a 9:00 p.m.
                                  y los sábados de 7:00 a.m. a 2:00 p.m. Todos los canales están en la pestaña Contacto.
                                </p>
                              </div>
                            </div>
                          </div>
                          </>
                        )}
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
                        className="w-full pl-10 pr-4 py-2 h-10 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-900 placeholder:text-gray-400 focus:border-[#1e5da8] focus:outline-none transition-colors"
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

                {/* Contacto Tab: canales oficiales de la ESAP (ver CANALES_ESAP) */}
                {activeTab === 'contacto' && (
                  <div className="p-4 space-y-4">
                    {/* Soporte de la plataforma: Mesa de Servicios de la OTIC */}
                    <div className="p-4 rounded-xl border-2 border-slate-200 hover:border-[#1e5da8] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#1e5da8] flex items-center justify-center flex-shrink-0">
                          <Headphones className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-slate-900 mb-1 font-medium">
                            Soporte técnico de la plataforma
                          </h4>
                          <p className="text-xs text-slate-600 mb-3">
                            Fallas, errores o problemas de acceso. Lo atiende la Mesa de Servicios de la Oficina de Tecnologías (OTIC).
                          </p>
                          <div className="space-y-2">
                            <a
                              href={CANALES_ESAP.mesaDeServicios}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Abrir una solicitud en la Mesa de Servicios
                            </a>
                            <a
                              href={`mailto:${CANALES_ESAP.correoMesaDeAyuda}`}
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {CANALES_ESAP.correoMesaDeAyuda}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Atención al ciudadano */}
                    <div className="p-4 rounded-xl border-2 border-slate-200 hover:border-[#1e5da8] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-slate-900 mb-1 font-medium">
                            Atención al ciudadano
                          </h4>
                          <p className="text-xs text-slate-600 mb-3">
                            Información general sobre la ESAP, trámites y correspondencia
                          </p>
                          <div className="space-y-2">
                            <a
                              href={`tel:${CANALES_ESAP.lineaNacional.replace(/\s/g, '')}`}
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {CANALES_ESAP.lineaNacional} · línea nacional gratuita
                            </a>
                            <a
                              href={`tel:${CANALES_ESAP.lineaBogotaMarcacion}`}
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {CANALES_ESAP.lineaBogota} · Bogotá
                            </a>
                            <a
                              href={`mailto:${CANALES_ESAP.correoVentanilla}`}
                              className="flex items-center gap-2 text-xs text-[#1e5da8] hover:text-[#174a8a] transition-colors font-medium"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {CANALES_ESAP.correoVentanilla}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Horarios */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                      <h4 className="text-sm text-slate-900 mb-2 font-medium">
                        Horarios de atención
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {CANALES_ESAP.horarios.map((h) => (
                          <div key={h.canal} className="flex justify-between gap-3">
                            <span>{h.canal}</span>
                            <span className="font-medium text-right">{h.horario}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500">
                        Sede central: {CANALES_ESAP.sedeCentral}
                      </p>
                    </div>

                    {/* Todos los canales oficiales */}
                    <a
                      href={CANALES_ESAP.atencionAlCiudadano}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full p-4 rounded-xl bg-[#1e5da8] text-white hover:bg-[#174a87] transition-colors flex items-center justify-between group"
                    >
                      <div className="text-left">
                        <h4 className="text-sm mb-0.5 font-medium">Atención al Ciudadano ESAP</h4>
                        <p className="text-xs text-white/80">
                          Todos los canales oficiales y el agente virtual en esap.edu.co
                        </p>
                      </div>
                      <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer - Compacto */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  Versión 2.0.0
                </span>
                <a
                  href={CANALES_ESAP.pqrsd}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Las sugerencias se radican en el formulario oficial de PQRSD de la ESAP"
                  className="text-xs text-[#1e5da8] hover:text-[#174a8a] flex items-center gap-1 transition-colors font-medium"
                >
                  ¿Sugerir mejora?
                  <ExternalLink className="w-3 h-3" />
                </a>
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