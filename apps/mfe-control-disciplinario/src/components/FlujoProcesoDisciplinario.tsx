/**
 * COMPONENTE: Flujo Visual del Proceso Disciplinario
 * Muestra cómo se integran todos los módulos del Control Interno Disciplinario
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Users, FolderOpen, CheckCircle, Archive,
  Clock, UserCheck, ArrowRight, AlertCircle, Info,
  ChevronDown, ChevronUp, Lightbulb, BookOpen
} from 'lucide-react';
import { Card } from '../../ui/card';

interface EtapaFlujo {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  modulo: string;
  icono: React.ReactNode;
  color: string;
  usuarioPrincipal: string;
  acciones: string[];
  documentosGenerados: string[];
}

const ETAPAS_FLUJO: EtapaFlujo[] = [
  {
    id: 'noticia',
    numero: 1,
    titulo: 'Recepción de Noticia',
    descripcion: 'Se recibe una queja o denuncia contra un funcionario',
    modulo: 'RF001 - Noticias Disciplinarias',
    icono: <FileText className="w-6 h-6" />,
    color: '#EF4444',
    usuarioPrincipal: 'Sistema / Secretaría OCID',
    acciones: [
      'Registro de queja/denuncia',
      'Asignación de número único (ND-XXX)',
      'Captura de información básica',
      'Adjuntar documentos iniciales'
    ],
    documentosGenerados: ['Noticia Disciplinaria ND-XXX']
  },
  {
    id: 'valoracion',
    numero: 2,
    titulo: 'Valoración y Asignación',
    descripcion: 'El Jefe OCID revisa y decide qué hacer con la noticia',
    modulo: 'RF002 - Valoración y Asignación',
    icono: <Users className="w-6 h-6" />,
    color: '#F59E0B',
    usuarioPrincipal: 'Jefe OCID',
    acciones: [
      'Revisar noticia disciplinaria',
      'Decidir: Investigar / Archivar / Devolver',
      'Asignar profesional(es) responsable(s)',
      'Crear expediente con número (P-XXX-YYYY)'
    ],
    documentosGenerados: ['Proceso Disciplinario P-XXX-YYYY', 'Asignación de Profesional']
  },
  {
    id: 'carpeta',
    numero: 3,
    titulo: 'Trabajo en Carpeta Digital',
    descripcion: 'El profesional gestiona el caso día a día',
    modulo: 'RF003 - Carpeta Digital',
    icono: <FolderOpen className="w-6 h-6" />,
    color: '#10B981',
    usuarioPrincipal: 'Profesional OCID',
    acciones: [
      'Redactar autos (borradores)',
      'Subir evidencias y testimonios',
      'Gestionar oficios y comunicaciones',
      'Registro de actuaciones',
      'Avanzar etapas procesales'
    ],
    documentosGenerados: [
      'Borradores de autos',
      'Evidencias documentales',
      'Oficios',
      'Actas de diligencias',
      'Notificaciones'
    ]
  },
  {
    id: 'revision',
    numero: 4,
    titulo: 'Revisión y Firma de Autos',
    descripcion: 'El Jefe OCID revisa y firma los autos importantes',
    modulo: 'RF004 - Revisión y Aprobación',
    icono: <CheckCircle className="w-6 h-6" />,
    color: '#8B5CF6',
    usuarioPrincipal: 'Jefe OCID + Profesional',
    acciones: [
      'Profesional envía auto para revisión',
      'Jefe revisa y aprueba/devuelve',
      'Profesional corrige si hay observaciones',
      'Jefe firma digitalmente el auto',
      'Auto firmado queda certificado'
    ],
    documentosGenerados: [
      'Auto de Apertura (Firmado)',
      'Auto de Cierre (Firmado)',
      'Auto de Archivo (Firmado)',
      'Otros autos oficiales'
    ]
  },
  {
    id: 'expediente',
    numero: 5,
    titulo: 'Expediente Electrónico Oficial',
    descripcion: 'Archivo completo y certificado del proceso',
    modulo: 'RF005 - Expediente Electrónico',
    icono: <Archive className="w-6 h-6" />,
    color: '#003DA5',
    usuarioPrincipal: 'Jefe OCID / Auditores',
    acciones: [
      'Consultar documentos finales y firmados',
      'Ver índice electrónico foliado',
      'Revisar auditoría completa',
      'Exportar expediente a PDF oficial',
      'Entregar a entes de control'
    ],
    documentosGenerados: [
      'Índice Electrónico Oficial',
      'Expediente PDF Certificado',
      'Registro de Auditoría',
      'Metadatos de trazabilidad'
    ]
  }
];

export function FlujoProcesoDisciplinario() {
  const [etapaExpandida, setEtapaExpandida] = useState<string | null>(null);
  const [showComparacion, setShowComparacion] = useState(false);

  const toggleEtapa = (id: string) => {
    setEtapaExpandida(etapaExpandida === id ? null : id);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <BookOpen className="w-7 h-7" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Flujo del Proceso Disciplinario
            </h1>
            <p className="text-sm text-gray-600">
              Integración de los módulos del Control Interno Disciplinario
            </p>
          </div>
        </div>

        {/* Info Box */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-blue-900 mb-1">
                ¿Cómo funcionan los módulos juntos?
              </p>
              <p>
                Cada módulo cumple una función específica en el proceso disciplinario. 
                Los documentos fluyen desde su creación (RF003) hasta el archivo oficial (RF005).
                Click en cada etapa para ver más detalles.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Flujo de Etapas */}
      <div className="space-y-4 mb-8">
        {ETAPAS_FLUJO.map((etapa, index) => (
          <div key={etapa.id}>
            {/* Card de Etapa */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`p-5 cursor-pointer transition-all border-l-4 ${
                  etapaExpandida === etapa.id
                    ? 'shadow-lg'
                    : 'hover:shadow-md'
                }`}
                style={{ borderLeftColor: etapa.color }}
                onClick={() => toggleEtapa(etapa.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Número */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: etapa.color }}
                  >
                    {etapa.numero}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {etapa.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {etapa.descripcion}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ background: etapa.color }}
                          >
                            {etapa.modulo}
                          </span>
                          <span className="text-xs text-gray-500">
                            • {etapa.usuarioPrincipal}
                          </span>
                        </div>
                      </div>
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: etapa.color + '20', color: etapa.color }}
                      >
                        {etapa.icono}
                      </div>
                    </div>

                    {/* Contenido Expandible */}
                    {etapaExpandida === etapa.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t"
                      >
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Acciones */}
                          <div>
                            <p className="font-semibold text-gray-900 mb-2 text-sm">
                              Acciones Principales:
                            </p>
                            <ul className="space-y-1">
                              {etapa.acciones.map((accion, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className="text-green-600 mt-1">✓</span>
                                  {accion}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Documentos Generados */}
                          <div>
                            <p className="font-semibold text-gray-900 mb-2 text-sm">
                              Documentos Generados:
                            </p>
                            <ul className="space-y-1">
                              {etapa.documentosGenerados.map((doc, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                  <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: etapa.color }} />
                                  {doc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Icono de expandir */}
                  <div className="flex-shrink-0">
                    {etapaExpandida === etapa.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Flecha entre etapas */}
            {index < ETAPAS_FLUJO.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Módulos Transversales */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 mb-8">
        <div className="flex items-start gap-3 mb-4">
          <Clock className="w-6 h-6 text-purple-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Módulos Transversales (Activos durante todo el proceso)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-1">
                  RF006 - Términos y Alertas
                </p>
                <p className="text-sm text-gray-700">
                  Monitorea fechas límite, alerta vencimientos próximos y controla términos legales.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-1">
                  RF007 - Profesionales
                </p>
                <p className="text-sm text-gray-700">
                  Dashboard de casos asignados, métricas de desempeño y gestión de carga de trabajo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Botón de Comparación */}
      <div className="mb-8">
        <button
          onClick={() => setShowComparacion(!showComparacion)}
          className="w-full px-6 py-4 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
          style={{ background: '#003DA5' }}
        >
          <Lightbulb className="w-5 h-5" />
          {showComparacion ? 'Ocultar' : 'Ver'} Comparación: Carpeta Digital vs Expediente Electrónico
          {showComparacion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Comparación RF003 vs RF005 */}
      {showComparacion && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* RF003 - Carpeta Digital */}
            <Card className="p-6 bg-green-50 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">RF003 - Carpeta Digital</h3>
                  <p className="text-sm text-green-700">Herramienta de TRABAJO DIARIO</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Usuario:</p>
                  <p className="text-sm text-gray-700">Profesional asignado al caso</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Propósito:</p>
                  <p className="text-sm text-gray-700">Gestión activa y creación de documentos</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Características:</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      Subir documentos nuevos
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      Redactar autos (borradores)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      Cargar evidencias
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      Gestionar notificaciones
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      Trabajo en progreso
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      Documentos en diferentes estados
                    </li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-300">
                  <p className="text-xs font-semibold text-green-900 mb-1">📁 Analogía Física:</p>
                  <p className="text-xs text-gray-700">
                    Es como tu ESCRITORIO con documentos en progreso, borradores, post-its y evidencias sueltas.
                  </p>
                </div>
              </div>
            </Card>

            {/* RF005 - Expediente Electrónico */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Archive className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">RF005 - Expediente Electrónico</h3>
                  <p className="text-sm text-blue-700">ARCHIVO OFICIAL Y COMPLETO</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Usuario:</p>
                  <p className="text-sm text-gray-700">Jefe OCID, Auditores, Entidades Externas</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Propósito:</p>
                  <p className="text-sm text-gray-700">Expediente oficial certificado</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Características:</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      Solo documentos FIRMADOS y FINALES
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      Índice electrónico oficial (foliado)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      Trazabilidad y auditoría completa
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      Exportación oficial (PDF certificado)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      Archivo histórico del proceso
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      Cumplimiento normativo (Ley 594/2000)
                    </li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-300">
                  <p className="text-xs font-semibold text-blue-900 mb-1">📦 Analogía Física:</p>
                  <p className="text-xs text-gray-700">
                    Es el ARCHIVO OFICIAL foliado, empastado, sellado y guardado en la caja fuerte. Intocable y certificado.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Ejemplo de Flujo de Documento */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Ejemplo: Flujo de un Auto de Apertura
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-orange-600 min-w-[24px]">1.</span>
                <p><span className="font-semibold">Creación (RF003):</span> Profesional Juan Carlos redacta "Auto de Apertura" → Estado: BORRADOR</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-orange-600 min-w-[24px]">2.</span>
                <p><span className="font-semibold">Revisión (RF004):</span> Envía a Jefe OCID → Jefe revisa y devuelve con observaciones → Profesional corrige (v2, v3...)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-orange-600 min-w-[24px]">3.</span>
                <p><span className="font-semibold">Firma (RF004):</span> Jefe aprueba versión final y firma digitalmente → Estado: FIRMADO ✅</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-orange-600 min-w-[24px]">4.</span>
                <p><span className="font-semibold">Notificación (RF003):</span> Secretaría notifica al investigado → Estado: FIRMADO ✅ + NOTIFICADO ✅</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-orange-600 min-w-[24px]">5.</span>
                <p><span className="font-semibold">Archivo (RF005):</span> Documento FINAL se integra automáticamente al expediente → Aparece en índice con folio → Auditoría completa → Disponible para exportación oficial</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
