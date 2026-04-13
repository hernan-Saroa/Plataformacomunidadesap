/**
 * FLUJO INTERACTIVO: NOTICIAS DISCIPLINARIAS
 * Documentación visual del módulo RF001
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Bell,
  AlertTriangle,
  CheckCircle,
  X,
  Info,
  Eye,
  Play,
  Users,
  Archive,
  Target,
  User,
  Building2,
  Clock,
  MessageSquare,
  ArrowRight,
  CornerDownLeft,
  UserCheck
} from 'lucide-react';
import { Card } from '../../ui/card';

interface Etapa {
  numero: number;
  titulo: string;
  icono: React.ReactNode;
  color: string;
  descripcion: string;
  responsable: string;
  acciones: string[];
  siguiente: string;
}

const ETAPAS_FLUJO: Etapa[] = [
  {
    numero: 1,
    titulo: 'Recepción de Queja/Denuncia',
    icono: <Bell className="w-5 h-5" />,
    color: '#EF4444',
    descripcion: 'Se recibe información sobre posible falta disciplinaria',
    responsable: 'Secretaría OCID / Ciudadanía',
    acciones: [
      'Ciudadano o funcionario presenta queja',
      'Se recibe por: email, ventanilla, oficio',
      'Secretaría registra en sistema',
      'Se asigna número único: ND-XXX-YYYY'
    ],
    siguiente: 'Valoración Inicial'
  },
  {
    numero: 2,
    titulo: 'Registro de Noticia Disciplinaria',
    icono: <FileText className="w-5 h-5" />,
    color: '#F59E0B',
    descripcion: 'Se crea el registro formal en el sistema',
    responsable: 'Secretaría OCID',
    acciones: [
      'Ingresar datos del denunciante',
      'Describir los hechos',
      'Identificar al presunto responsable',
      'Adjuntar documentos de soporte',
      'Guardar noticia en estado "RECEPCIÓN"'
    ],
    siguiente: 'Valoración por Jefe OCID'
  },
  {
    numero: 3,
    titulo: 'Valoración Inicial (30 días)',
    icono: <Target className="w-5 h-5" />,
    color: '#8B5CF6',
    descripcion: 'Jefe OCID revisa y decide sobre la noticia',
    responsable: 'Jefe OCID',
    acciones: [
      'Revisar hechos y evidencias',
      'Verificar competencia institucional',
      'Determinar si hay mérito',
      'Decidir: INVESTIGAR / ARCHIVAR / DEVOLVER',
      'Plazo legal: 30 días hábiles'
    ],
    siguiente: 'Decisión'
  },
  {
    numero: 4,
    titulo: 'Decisión y Asignación',
    icono: <UserCheck className="w-5 h-5" />,
    color: '#10B981',
    descripcion: 'Se toma decisión sobre la noticia',
    responsable: 'Jefe OCID',
    acciones: [
      'SI INVESTIGA: Asignar profesional responsable',
      'Crear proceso disciplinario (P-XXX-YYYY)',
      'Noticia pasa a "VALORACIÓN"',
      'SI ARCHIVA: Generar auto de archivo',
      'SI DEVUELVE: Enviar a entidad competente'
    ],
    siguiente: 'RF002 - Proceso Disciplinario'
  }
];

const ORIGENES_NOTICIAS = [
  {
    id: 'ciudadano',
    nombre: 'Ciudadano',
    icono: <User className="w-5 h-5" />,
    color: '#3B82F6',
    descripcion: 'Cualquier ciudadano puede presentar queja',
    ejemplos: ['Presencial en oficina', 'Correo electrónico', 'Página web ESAP']
  },
  {
    id: 'funcionario',
    nombre: 'Funcionario ESAP',
    icono: <Building2 className="w-5 h-5" />,
    color: '#8B5CF6',
    descripcion: 'Funcionarios internos reportan irregularidades',
    ejemplos: ['Jefes de área', 'Compañeros de trabajo', 'Directivos']
  },
  {
    id: 'entidad',
    nombre: 'Entidad Externa',
    icono: <Archive className="w-5 h-5" />,
    color: '#F59E0B',
    descripcion: 'Entes de control envían casos',
    ejemplos: ['Procuraduría', 'Contraloría', 'Fiscalía', 'Personerías']
  },
  {
    id: 'oficio',
    nombre: 'De Oficio',
    icono: <AlertTriangle className="w-5 h-5" />,
    color: '#EF4444',
    descripcion: 'OCID inicia investigación por conocimiento directo',
    ejemplos: ['Medios de comunicación', 'Auditorías internas', 'Reportes institucionales']
  }
];

const ESTADOS_NOTICIA = [
  {
    estado: 'RECEPCIÓN',
    color: '#3B82F6',
    icono: <Bell className="w-4 h-4" />,
    descripcion: 'Recién ingresada al sistema',
    responsable: 'Secretaría OCID',
    acciones: ['Completar datos', 'Adjuntar documentos']
  },
  {
    estado: 'VALORACIÓN',
    color: '#F59E0B',
    icono: <Target className="w-4 h-4" />,
    descripcion: 'En revisión por Jefe OCID',
    responsable: 'Jefe OCID',
    acciones: ['Analizar hechos', 'Tomar decisión']
  },
  {
    estado: 'INVESTIGACIÓN',
    color: '#10B981',
    icono: <Eye className="w-4 h-4" />,
    descripcion: 'Se decidió abrir proceso',
    responsable: 'Profesional Asignado',
    acciones: ['Se creó proceso P-XXX-YYYY']
  },
  {
    estado: 'ARCHIVADO',
    color: '#6B7280',
    icono: <Archive className="w-4 h-4" />,
    descripcion: 'No amerita investigación',
    responsable: 'Jefe OCID',
    acciones: ['Auto de archivo generado']
  },
  {
    estado: 'DEVUELTO',
    color: '#EC4899',
    icono: <CornerDownLeft className="w-4 h-4" />,
    descripcion: 'Fuera de competencia ESAP',
    responsable: 'Jefe OCID',
    acciones: ['Enviado a entidad competente']
  }
];

export function FlujoNoticiasDisciplinarias() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 border-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Flujo de Noticias Disciplinarias
              </h2>
              <p className="text-blue-100">
                RF001 - Primer paso del proceso disciplinario
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Concepto Principal */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-2 border-blue-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">¿Qué es una Noticia Disciplinaria?</h3>
              <p className="text-sm text-gray-600">
                Es el <span className="font-bold text-blue-600">registro inicial</span> de una queja o denuncia 
                sobre presunta falta disciplinaria de un funcionario público.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">NO es un proceso disciplinario todavía</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Cualquier persona puede presentarla</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Requiere valoración antes de investigar</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Objetivo de RF001</h3>
              <p className="text-sm text-gray-600">
                Registrar y gestionar todas las quejas recibidas, permitiendo al Jefe OCID 
                valorarlas y decidir cuáles ameritan investigación.
              </p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-xs font-semibold text-orange-900 mb-2">
              PLAZO LEGAL:
            </p>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <p className="text-sm font-bold text-orange-900">
                30 días hábiles para valorar cada noticia
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Orígenes de las Noticias */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100">
            <Users className="w-5 h-5 text-gray-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            ¿De dónde vienen las Noticias Disciplinarias?
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {ORIGENES_NOTICIAS.map((origen, index) => (
            <motion.div
              key={origen.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-5 border-2 hover:shadow-lg transition-all" style={{ borderColor: origen.color + '40' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: origen.color + '20' }}>
                    {origen.icono}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{origen.nombre}</h4>
                    <p className="text-sm text-gray-600">{origen.descripcion}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 mb-2">EJEMPLOS:</p>
                  {origen.ejemplos.map((ejemplo, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: origen.color }}></div>
                      <span className="text-xs text-gray-700">{ejemplo}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Flujo Paso a Paso */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100">
            <Play className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Flujo Paso a Paso
          </h3>
        </div>

        <div className="relative">
          {/* Línea Conectora */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 hidden md:block"></div>

          <div className="space-y-6">
            {ETAPAS_FLUJO.map((etapa, index) => (
              <motion.div
                key={etapa.numero}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <Card className="p-6 border-2 hover:shadow-xl transition-all ml-0 md:ml-14" style={{ borderColor: etapa.color }}>
                  {/* Número de Etapa */}
                  <div 
                    className="absolute -left-0 md:-left-14 top-6 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ background: etapa.color }}
                  >
                    {etapa.numero}
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Ícono */}
                    <div className="p-3 rounded-xl" style={{ background: etapa.color + '20' }}>
                      {etapa.icono}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{etapa.titulo}</h4>
                      <p className="text-sm text-gray-600 mb-3">{etapa.descripcion}</p>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 mb-1">RESPONSABLE:</p>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold text-gray-900">{etapa.responsable}</p>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 mb-1">SIGUIENTE PASO:</p>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-semibold text-gray-900">{etapa.siguiente}</p>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">ACCIONES:</p>
                        <div className="space-y-2">
                          {etapa.acciones.map((accion, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-700">{accion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Estados de la Noticia */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Estados de una Noticia Disciplinaria
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {ESTADOS_NOTICIA.map((item, index) => (
            <motion.div
              key={item.estado}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-5 border-2" style={{ borderColor: item.color }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: item.color + '20' }}>
                    {item.icono}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: item.color }}>{item.estado}</h4>
                    <p className="text-xs text-gray-600">{item.descripcion}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-2 rounded bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Responsable:</p>
                    <p className="text-xs font-semibold text-gray-900">{item.responsable}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Acciones posibles:</p>
                    {item.acciones.map((accion, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full" style={{ background: item.color }}></div>
                        <span className="text-xs text-gray-700">{accion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Ejemplo Real */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-500 text-white">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Ejemplo Real: De Queja a Proceso
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ciudadano presenta queja</p>
                  <p className="text-xs text-gray-600">
                    "El funcionario Juan Pérez no atendió mi solicitud y fue grosero"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Secretaría registra en sistema</p>
                  <p className="text-xs text-gray-600">
                    → Se crea noticia <span className="font-bold text-blue-600">ND-150-2025</span> en estado "RECEPCIÓN"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Jefe OCID valora la noticia</p>
                  <p className="text-xs text-gray-600">
                    → Revisa hechos, evidencias y decide: "SÍ amerita investigación"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Se crea proceso disciplinario</p>
                  <p className="text-xs text-gray-600">
                    → Proceso <span className="font-bold text-green-600">P-120-2025</span> asignado a profesional Marta Torres
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    → Noticia cambia a estado "INVESTIGACIÓN"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Diferencia Clave */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 bg-blue-50 border-2 border-blue-200">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            NOTICIA Disciplinaria (ND-XXX)
          </h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Es una QUEJA o DENUNCIA inicial</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">NO es un proceso formal todavía</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Requiere valoración del Jefe OCID</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Puede archivarse sin investigar</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-green-50 border-2 border-green-200">
          <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
            <Archive className="w-5 h-5" />
            PROCESO Disciplinario (P-XXX)
          </h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Es la INVESTIGACIÓN FORMAL</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Surge DESPUÉS de valorar la noticia</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Tiene profesional asignado</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Genera autos, notificaciones, expediente</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <Card className="p-4 bg-gray-50 border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">
              Módulo Integrado con el Sistema Completo
            </p>
            <p>
              RF001 (Noticias Disciplinarias) es el primer paso del proceso. Una vez valorada, 
              la noticia puede convertirse en un Proceso (RF002) que luego se gestiona en Carpeta Digital (RF003), 
              se revisa y aprueba (RF004) y se archiva en el Expediente Electrónico (RF005).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
