/**
 * FLUJO INTERACTIVO: REVISIÓN Y APROBACIÓN DE AUTOS
 * Documentación visual del módulo de Revisión y Aprobación
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle,
  Play,
  FileSignature,
  Send,
  Edit2,
  ArrowRight,
  User,
  Clock,
  Shield
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';

interface Etapa {
  numero: number;
  titulo: string;
  icono: React.ReactNode;
  color: string;
  descripcion: string;
  responsable: string;
  acciones: string[];
}

const ETAPAS_FLUJO: Etapa[] = [
  {
    numero: 1,
    titulo: 'Noticia Disciplinaria (ND-XXXX)',
    icono: <FileText className="w-5 h-5" />,
    color: '#3B82F6',
    descripcion: 'Secretaria/Jefe OCID registra la queja o denuncia',
    responsable: 'Secretaría OCID',
    acciones: ['Recibir queja', 'Registrar en sistema', 'Asignar número ND-XXX']
  },
  {
    numero: 2,
    titulo: 'Valoración Inicial',
    icono: <AlertCircle className="w-5 h-5" />,
    color: '#F59E0B',
    descripcion: 'Jefe OCID determina si amerita investigación',
    responsable: 'Jefe OCID',
    acciones: ['Revisar hechos', 'Analizar mérito', 'Decidir: Investigar/Archivar']
  },
  {
    numero: 3,
    titulo: 'Asignación a Profesional',
    icono: <User className="w-5 h-5" />,
    color: '#8B5CF6',
    descripcion: 'Se convierte en Proceso (P-XXX) y se asigna profesional',
    responsable: 'Jefe OCID',
    acciones: ['Crear proceso P-XXX', 'Asignar profesional', 'Notificar asignación']
  },
  {
    numero: 4,
    titulo: 'Redacción de Auto',
    icono: <Edit2 className="w-5 h-5" />,
    color: '#06B6D4',
    descripcion: 'Profesional investiga y redacta borrador del auto jurídico',
    responsable: 'Profesional Asignado',
    acciones: ['Investigar hechos', 'Revisar normativa', 'Redactar borrador', 'Enviar a Jefe OCID']
  },
  {
    numero: 5,
    titulo: 'Revisión y Aprobación (AQUÍ)',
    icono: <Shield className="w-5 h-5" />,
    color: '#10B981',
    descripcion: 'Jefe OCID revisa → Aprueba o Devuelve el borrador',
    responsable: 'Jefe OCID',
    acciones: ['Revisar contenido jurídico', 'Verificar normas', 'Aprobar o Devolver con observaciones']
  },
  {
    numero: 6,
    titulo: 'Firma del Auto',
    icono: <FileSignature className="w-5 h-5" />,
    color: '#6366F1',
    descripcion: 'Auto aprobado se firma (mecánica/digital/electrónica)',
    responsable: 'Jefe OCID',
    acciones: ['Firmar documento', 'Generar auto oficial', 'Archivar en expediente']
  },
  {
    numero: 7,
    titulo: 'Notificación',
    icono: <Send className="w-5 h-5" />,
    color: '#EC4899',
    descripcion: 'Se notifica al denunciado y se archiva en expediente electrónico',
    responsable: 'Secretaría OCID',
    acciones: ['Notificar al investigado', 'Publicar en cartelera', 'Actualizar expediente']
  }
];

const TIPOS_AUTOS = [
  {
    nombre: 'Auto de Apertura',
    color: '#3B82F6',
    descripcion: 'Inicia formalmente la investigación disciplinaria'
  },
  {
    nombre: 'Auto de Cargos',
    color: '#EF4444',
    descripcion: 'Formula los cargos contra el investigado'
  },
  {
    nombre: 'Auto de Pruebas',
    color: '#8B5CF6',
    descripcion: 'Ordena práctica de pruebas solicitadas'
  },
  {
    nombre: 'Auto de Cierre',
    color: '#F59E0B',
    descripcion: 'Cierra la etapa de instrucción del proceso'
  },
  {
    nombre: 'Auto de Archivo',
    color: '#6B7280',
    descripcion: 'Archiva el proceso por falta de mérito'
  }
];

export function FlujoRevisionAprobacion() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Revisión y Aprobación de Autos
              </h2>
              <p className="text-green-100">
                Control de calidad jurídica
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Concepto Principal */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-2 border-green-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <Info className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">¿Qué es la Revisión y Aprobación?</h3>
              <p className="text-sm text-gray-600">
                Es el módulo donde el <span className="font-bold text-green-600">Jefe OCID revisa y aprueba</span> los 
                borradores de autos redactados por los profesionales antes de firmarlos.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Control de calidad jurídica</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Revisión antes de la firma oficial</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Garantiza coherencia normativa</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-blue-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">¿Qué es un "Auto"?</h3>
              <p className="text-sm text-gray-600">
                Es un <span className="font-bold text-blue-600">documento jurídico oficial</span> que emite 
                el Jefe de OCID en cada etapa del proceso disciplinario.
              </p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              REQUISITOS:
            </p>
            <div className="space-y-1 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                <span>Fundamentos jurídicos sólidos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                <span>Cita correcta de normas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                <span>Firma del Jefe OCID</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Flujo Completo */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-100">
            <Play className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Flujo Completo del Proceso
          </h3>
        </div>

        <div className="relative">
          {/* Línea Conectora */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-green-500 to-pink-500 hidden md:block"></div>

          <div className="space-y-6">
            {ETAPAS_FLUJO.map((etapa, index) => (
              <motion.div
                key={etapa.numero}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <Card 
                  className={`p-6 border-2 hover:shadow-xl transition-all ml-0 md:ml-14 ${
                    etapa.numero === 5 ? 'ring-2 ring-green-400 ring-offset-2' : ''
                  }`}
                  style={{ borderColor: etapa.color }}
                >
                  {/* Número de Etapa */}
                  <div 
                    className="absolute -left-0 md:-left-14 top-6 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ background: etapa.color }}
                  >
                    {etapa.numero}
                  </div>

                  {etapa.numero === 5 && (
                    <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      ESTÁS AQUÍ
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Ícono */}
                    <div className="p-3 rounded-xl" style={{ background: etapa.color + '20' }}>
                      {etapa.icono}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{etapa.titulo}</h4>
                      <p className="text-sm text-gray-600 mb-3">{etapa.descripcion}</p>

                      <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-1">RESPONSABLE:</p>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-semibold text-gray-900">{etapa.responsable}</p>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">ACCIONES:</p>
                        <div className="space-y-2">
                          {etapa.acciones.map((accion, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
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

      {/* Tipos de Autos */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Tipos de Autos que se Revisan
          </h3>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPOS_AUTOS.map((auto, index) => (
            <motion.div
              key={auto.nombre}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-5 border-2 hover:shadow-lg transition-all" style={{ borderColor: auto.color }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: auto.color }}></div>
                  <h4 className="font-bold text-sm" style={{ color: auto.color }}>
                    {auto.nombre}
                  </h4>
                </div>
                <p className="text-xs text-gray-600">{auto.descripcion}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decisiones del Jefe OCID */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-500 text-white">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 mb-2">
                APROBAR
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                El borrador está correcto jurídicamente
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Pasa a firma (mecánica/digital/electrónica)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Se genera documento oficial</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Se notifica al investigado</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-3 rounded-xl bg-red-500 text-white">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                DEVOLVER
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                El borrador requiere ajustes o correcciones
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Regresa al profesional con observaciones</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Profesional corrige y reenvía</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Se inicia nuevo ciclo de revisión</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Ejemplo Real */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Ejemplo: Flujo de un Auto de Apertura
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Profesional redacta borrador</p>
                  <p className="text-xs text-gray-600">
                    Juan Pérez investiga el caso P-120-2025 y redacta el Auto de Apertura
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Envía a Revisión y Aprobación</p>
                  <p className="text-xs text-gray-600">
                    → Aparece en la bandeja del Jefe OCID como "Pendiente de Revisión"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Jefe OCID revisa</p>
                  <p className="text-xs text-gray-600">
                    → Lee el borrador, verifica normas citadas y redacción jurídica
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Toma decisión</p>
                  <p className="text-xs text-gray-600 mb-1">
                    ✅ <span className="font-bold text-green-600">APRUEBA:</span> Pasa a firma
                  </p>
                  <p className="text-xs text-gray-600">
                    ❌ <span className="font-bold text-red-600">DEVUELVE:</span> "Corregir artículo 3, falta citar Ley 734"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Footer Info */}
      <Card className="p-4 bg-gray-50 border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">
              Módulo Clave del Control de Calidad
            </p>
            <p>
              La Revisión y Aprobación garantiza que todos los documentos jurídicos que emite la OCID sean correctos antes de 
              firmarlos oficialmente. Sin esta revisión, un error podría invalidar todo un proceso disciplinario.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}