/**
 * 📚 GUÍA RÁPIDA DE PLANTILLAS - SIGL
 * 
 * Componente de ayuda contextual para el editor de plantillas
 */

import { motion } from 'motion/react';
import {
  Info, CheckCircle, AlertTriangle, XCircle, Code,
  Type, Zap, Mail, MessageSquare, Smartphone, Bell
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface GuiaPlantillasProps {
  canal: 'EMAIL' | 'TEAMS' | 'SMS' | 'IN_APP';
}

const LIMITES_CANAL = {
  EMAIL: {
    nombre: 'Email',
    icono: Mail,
    color: '#EA4335',
    limites: {
      asunto: { max: 'Sin límite', recomendado: '50-70 caracteres' },
      cuerpo: { max: 'Sin límite', recomendado: '500-1000 caracteres' },
    },
    caracteristicas: [
      'Soporta formato HTML básico',
      'Permite emojis y caracteres especiales',
      'Asunto obligatorio',
      'Saludo y despedida recomendados',
    ],
    buenasPracticas: [
      'Usa un asunto claro y descriptivo',
      'Incluye saludo personalizado con {responsable}',
      'Estructura el mensaje en párrafos cortos',
      'Finaliza con firma institucional',
    ],
  },
  TEAMS: {
    nombre: 'Microsoft Teams',
    icono: MessageSquare,
    color: '#5B5FC7',
    limites: {
      cuerpo: { max: '500 caracteres', recomendado: '200-300 caracteres' },
    },
    caracteristicas: [
      'Soporta Markdown básico (**negrita**, *cursiva*)',
      'Permite emojis',
      'Sin asunto',
      'Formato de mensaje instantáneo',
    ],
    buenasPracticas: [
      'Usa **negrita** para información crítica',
      'Estructura con bullet points (- Item)',
      'Mantén mensajes concisos',
      'Incluye call-to-action claro',
    ],
  },
  SMS: {
    nombre: 'SMS',
    icono: Smartphone,
    color: '#10B981',
    limites: {
      cuerpo: { max: '160 caracteres (1 SMS)', recomendado: '120-140 caracteres' },
    },
    caracteristicas: [
      'Sin formato',
      'Emojis cuentan como múltiples caracteres',
      'Máximo 3 SMS concatenados (480 chars)',
      'Solo información esencial',
    ],
    buenasPracticas: [
      'Usa abreviaturas claras (Exp = Expediente)',
      'Evita emojis para ahorrar caracteres',
      'Incluye solo datos críticos',
      'Firma con abreviatura: SIGL-ESAP',
    ],
  },
  IN_APP: {
    nombre: 'Notificación In-App',
    icono: Bell,
    color: '#FF6B35',
    limites: {
      cuerpo: { max: '200 caracteres', recomendado: '100-150 caracteres' },
    },
    caracteristicas: [
      'Sin formato especial',
      'Permite emojis',
      'Sin asunto',
      'Aparece como toast/notification',
    ],
    buenasPracticas: [
      'Mensajes cortos y directos',
      'No incluyas saludo ni despedida',
      'Usa tono informativo',
      'Menciona el expediente para contexto',
    ],
  },
};

const VARIABLES_COMUNES = [
  { var: '{modulo}', uso: 'Identificar el módulo SIGL', critico: true },
  { var: '{expediente}', uso: 'Número de radicado único', critico: true },
  { var: '{responsable}', uso: 'Personalizar mensaje', critico: false },
  { var: '{dias_restantes}', uso: 'Urgencia del proceso', critico: true },
  { var: '{fecha_vencimiento}', uso: 'Fecha límite específica', critico: true },
];

export function GuiaPlantillas({ canal }: GuiaPlantillasProps) {
  const guia = LIMITES_CANAL[canal];
  const Icono = guia.icono;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="p-2 rounded-lg bg-white shadow"
            style={{ borderLeft: `3px solid ${guia.color}` }}
          >
            <Icono className="w-5 h-5" style={{ color: guia.color }} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">
              Guía de Buenas Prácticas - {guia.nombre}
            </h4>
            <p className="text-xs text-gray-600">
              Recomendaciones para crear plantillas efectivas
            </p>
          </div>
        </div>
      </Card>

      {/* Límites */}
      <Card className="bg-white border-gray-200 p-4">
        <h5 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <Type className="w-4 h-4 text-orange-600" />
          Límites de Caracteres
        </h5>
        <div className="space-y-2">
          {Object.entries(guia.limites).map(([campo, limite]) => (
            <div key={campo} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 capitalize">{campo}:</span>
              <div className="flex flex-col items-end">
                <Badge className="bg-red-100 text-red-800 text-xs">
                  Max: {limite.max}
                </Badge>
                <span className="text-xs text-green-700 mt-1">
                  Recomendado: {limite.recomendado}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Características */}
      <Card className="bg-white border-gray-200 p-4">
        <h5 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-600" />
          Características del Canal
        </h5>
        <ul className="space-y-2">
          {guia.caracteristicas.map((caract, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>{caract}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Buenas Prácticas */}
      <Card className="bg-green-50 border-green-200 p-4">
        <h5 className="font-bold text-sm text-green-900 mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-700" />
          Buenas Prácticas
        </h5>
        <ul className="space-y-2">
          {guia.buenasPracticas.map((practica, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
              <div className="w-5 h-5 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-green-900">{idx + 1}</span>
              </div>
              <span>{practica}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Variables Recomendadas */}
      <Card className="bg-orange-50 border-orange-200 p-4">
        <h5 className="font-bold text-sm text-orange-900 mb-3 flex items-center gap-2">
          <Code className="w-4 h-4 text-orange-700" />
          Variables Recomendadas
        </h5>
        <div className="space-y-2">
          {VARIABLES_COMUNES.map((variable) => (
            <div 
              key={variable.var}
              className="flex items-center justify-between p-2 bg-white rounded border border-orange-200"
            >
              <div className="flex items-center gap-2">
                <code className="text-xs font-bold text-orange-900 bg-orange-100 px-2 py-1 rounded">
                  {variable.var}
                </code>
                <span className="text-xs text-gray-700">{variable.uso}</span>
              </div>
              {variable.critico && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  Crítico
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Advertencias */}
      <Card className="bg-yellow-50 border-yellow-200 p-4">
        <h5 className="font-bold text-sm text-yellow-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700" />
          Advertencias
        </h5>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <XCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <span>No usar variables inexistentes - causará errores al enviar</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <XCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <span>Probar siempre la vista previa antes de guardar</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <XCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <span>Evitar lenguaje técnico - mantener mensaje claro para todos</span>
          </li>
        </ul>
      </Card>

      {/* Tips Adicionales */}
      <Card className="bg-blue-50 border-blue-200 p-4">
        <h5 className="font-bold text-sm text-blue-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-700" />
          💡 Tip Pro
        </h5>
        <p className="text-sm text-blue-800">
          Usa la función de <strong>Duplicar</strong> para crear variantes de una plantilla
          y experimentar con diferentes tonos sin perder la original.
        </p>
      </Card>
    </motion.div>
  );
}
