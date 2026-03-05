/**
 * TabActuacionesExpediente - Tab de Actuaciones COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 * ✅ Timeline unificado con línea vertical y puntos
 * ✅ Soporta acciones configurables (Audiencias en DJ, Decisiones en JD)
 * ✅ Header con botones parametrizables
 */

import { Calendar, User, Activity, Plus, Clock, MapPin } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import type { ActuacionExpediente } from './expedienteShared';

// ==================== TIPOS ====================

interface BotonAccion {
  label: string;
  icono: React.ReactNode;
  onClick: () => void;
  color: string; // hex color for bg
}

interface AudienciaProgramada {
  id: number | string;
  tipo: string;
  fecha: string;
  hora: string;
  lugar?: string;
  modalidad?: string;
  abogadoResponsable?: string;
  estado: string;
}

interface DecisionRegistrada {
  tipoDecision: string;
  tipoFallo: string;
  fecha: string;
  responsable: string;
  sancion?: string;
}

interface TabActuacionesExpedienteProps {
  actuaciones: ActuacionExpediente[];
  botonesAccion: BotonAccion[];
  /** Audiencias programadas (Defensa Judicial) */
  audienciasProgramadas?: AudienciaProgramada[];
  onReasignarAudiencia?: (audiencia: AudienciaProgramada) => void;
  /** Decisiones registradas (Juzgamiento Disciplinario) */
  decisiones?: DecisionRegistrada[];
  /** Label para botón vacío */
  labelRegistrar?: string;
  onRegistrarPrimera?: () => void;
}

export function TabActuacionesExpediente({
  actuaciones,
  botonesAccion,
  audienciasProgramadas,
  onReasignarAudiencia,
  decisiones,
  labelRegistrar = 'Registrar Primera Actuación',
  onRegistrarPrimera
}: TabActuacionesExpedienteProps) {
  return (
    <div className="space-y-3">
      {/* ==================== HEADER ==================== */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-white border-blue-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Historial Cronológico de Actuaciones Procesales
            <Badge className="bg-blue-600 text-white font-bold">
              {actuaciones.length} registros
            </Badge>
          </h4>
          <div className="flex items-center gap-2">
            {botonesAccion.map((btn, idx) => (
              <Button
                key={idx}
                size="sm"
                className="text-white font-bold"
                style={{ background: btn.color }}
                onClick={btn.onClick}
              >
                {btn.icono}
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* ==================== AUDIENCIAS PROGRAMADAS (DJ) ==================== */}
      {audienciasProgramadas && audienciasProgramadas.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-white border-purple-200">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-purple-600" />
            Audiencias Programadas
            <Badge className="bg-purple-600 text-white font-bold">
              {audienciasProgramadas.length}
            </Badge>
          </h4>
          <div className="space-y-2">
            {audienciasProgramadas.map((audiencia) => (
              <Card key={audiencia.id} className="p-3 bg-white border-purple-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="text-xs font-bold bg-purple-100 text-purple-700">
                        {audiencia.tipo}
                      </Badge>
                      <Badge className="text-xs font-bold bg-green-100 text-green-700">
                        {audiencia.estado}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p className="flex items-center gap-1.5 text-gray-700">
                        <Calendar className="w-3 h-3" />
                        <strong>{audiencia.fecha}</strong> a las {audiencia.hora}
                      </p>
                      <p className="flex items-center gap-1.5 text-gray-700">
                        {audiencia.modalidad === 'Presencial' ? (
                          <>
                            <MapPin className="w-3 h-3" />
                            {audiencia.lugar}
                          </>
                        ) : (
                          <>💻 Audiencia Virtual</>
                        )}
                      </p>
                      {audiencia.abogadoResponsable && (
                        <p className="flex items-center gap-1.5 text-gray-700 col-span-2">
                          <User className="w-3 h-3" />
                          {audiencia.abogadoResponsable}
                        </p>
                      )}
                    </div>
                  </div>
                  {onReasignarAudiencia && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReasignarAudiencia(audiencia)}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 font-bold"
                    >
                      🔄 Reasignar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* ==================== DECISIONES REGISTRADAS (JD) ==================== */}
      {decisiones && decisiones.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-white border-2 border-green-200">
          <h4 className="font-bold text-sm text-green-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Decisiones Registradas ({decisiones.length})
          </h4>
          <div className="space-y-2">
            {decisiones.map((decision, index) => (
              <Card key={index} className="p-3 border border-green-200 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-900">{decision.tipoDecision}</span>
                  <Badge
                    className="font-bold text-xs"
                    style={{
                      background: decision.tipoFallo === 'Absolutoria' ? '#10B981' : '#EF4444',
                      color: '#FFFFFF'
                    }}
                  >
                    {decision.tipoFallo}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{decision.fecha} • {decision.responsable}</p>
                {decision.sancion && (
                  <p className="text-xs text-orange-700 mt-1 font-semibold">⚖️ {decision.sancion}</p>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* ==================== TIMELINE DE ACTUACIONES ==================== */}
      {actuaciones.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h4 className="font-bold text-lg text-gray-600 mb-2">
            Sin actuaciones registradas
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Aún no se han registrado actuaciones procesales en este expediente
          </p>
          {onRegistrarPrimera && (
            <Button
              onClick={onRegistrarPrimera}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {labelRegistrar}
            </Button>
          )}
        </Card>
      ) : (
        <div className="relative">
          {/* Línea temporal vertical */}
          <div className="absolute left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-300" />

          {actuaciones.map((actuacion, idx) => (
            <div key={actuacion.id} className="relative pl-10 pb-6 last:pb-0">
              {/* Punto en la línea */}
              <div
                className="absolute left-0 top-0 w-7 h-7 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
                style={{ background: idx === 0 ? '#003DA5' : (idx === 1 ? '#3B82F6' : '#CBD5E0') }}
              >
                {idx === 0 && <Activity className="w-3 h-3 text-white" />}
              </div>

              <Card className={`p-4 ${idx === 0 ? 'border-2 border-blue-500 shadow-md' : 'border border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className="text-xs font-bold"
                      style={{
                        background: idx === 0 ? '#003DA5' : (idx === 1 ? '#3B82F6' : '#E5E7EB'),
                        color: idx <= 1 ? '#FFFFFF' : '#6B7280'
                      }}
                    >
                      {actuacion.fecha}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {actuacion.tipo}
                    </Badge>
                  </div>
                  {idx === 0 && (
                    <Badge className="text-xs bg-green-100 text-green-700 font-bold animate-pulse">
                      ⚡ Más Reciente
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 mb-2">
                  {actuacion.descripcion}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    {actuacion.responsable}
                  </p>
                  <Badge
                    className="text-xs font-semibold"
                    style={{
                      background: actuacion.estado === 'Completado' || actuacion.estado === 'COMPLETADA'
                        ? '#D1FAE5'
                        : actuacion.estado === 'Programado'
                        ? '#EDE9FE'
                        : '#FEF3C7',
                      color: actuacion.estado === 'Completado' || actuacion.estado === 'COMPLETADA'
                        ? '#065F46'
                        : actuacion.estado === 'Programado'
                        ? '#5B21B6'
                        : '#92400E'
                    }}
                  >
                    {actuacion.estado === 'COMPLETADA' ? 'Completado' : actuacion.estado}
                  </Badge>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
