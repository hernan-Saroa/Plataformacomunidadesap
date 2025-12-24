/**
 * COMPONENTE: APROBACIÓN GRANULAR DE ACTIVIDADES PTA
 * 
 * Permite aprobar/rechazar actividades individuales del PTA
 * Muestra estado de cada actividad y permite revisión granular
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Send,
  FileText,
  TrendingUp
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { 
  PTAAprobacionGranularService,
  type EstadoActividadPTA,
  type ResumenAprobacionPTA,
  COLORES_ESTADO_ACTIVIDAD,
  LABELS_ESTADO_ACTIVIDAD
} from '../../services/pta/ptaAprobacionGranularService';
import type { NivelAprobacion } from '../../data/ptaEstadosYFlujo';

interface PTAAprobacionActividadesProps {
  pta: any;
  nivel: NivelAprobacion;
  aprobador: {
    id: string;
    nombre: string;
    cargo: string;
  };
  onActividadAprobada?: (actividadId: string) => void;
  onActividadDevuelta?: (actividadId: string) => void;
  onTodasAprobadas?: () => void;
}

export function PTAAprobacionActividades({
  pta,
  nivel,
  aprobador,
  onActividadAprobada,
  onActividadDevuelta,
  onTodasAprobadas
}: PTAAprobacionActividadesProps) {
  
  const [actividadExpandida, setActividadExpandida] = useState<string | null>(null);
  const [mostrarResumen, setMostrarResumen] = useState(true);
  
  // Obtener todas las actividades del PTA
  const todasActividades = [
    ...(pta.componente_docencia?.actividades || []).map((a: any) => ({ ...a, componente: 'Docencia' })),
    ...(pta.componente_investigacion?.actividades || []).map((a: any) => ({ ...a, componente: 'Investigación' })),
    ...(pta.componente_extension?.actividades || []).map((a: any) => ({ ...a, componente: 'Extensión' })),
    ...(pta.componente_complementarias?.actividades || []).map((a: any) => ({ ...a, componente: 'Complementarias' })),
    ...(pta.componente_administrativas?.actividades || []).map((a: any) => ({ ...a, componente: 'Administrativas' }))
  ];
  
  const actividadesIds = todasActividades.map((a: any) => a.id);
  
  // Obtener resumen de aprobación
  const resumen = PTAAprobacionGranularService.obtenerResumenPTA(pta.id, actividadesIds);
  
  // Obtener actividades pendientes y devueltas
  const actividadesPendientes = PTAAprobacionGranularService.obtenerActividadesPendientes(
    pta.id,
    actividadesIds,
    nivel
  );
  
  const actividadesDevueltas = PTAAprobacionGranularService.obtenerActividadesDevueltas(
    pta.id,
    actividadesIds,
    nivel
  );
  
  return (
    <div className="space-y-6">
      {/* Resumen de Aprobación */}
      {mostrarResumen && (
        <ResumenAprobacionCard
          resumen={resumen}
          nivel={nivel}
          onClose={() => setMostrarResumen(false)}
        />
      )}
      
      {/* Acciones Rápidas */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 mb-1">
              Revisión Nivel {nivel} - {aprobador.cargo}
            </h3>
            <p className="text-sm text-gray-600">
              {actividadesPendientes.length} actividades pendientes de revisión
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarResumen(!mostrarResumen)}
            >
              {mostrarResumen ? 'Ocultar' : 'Ver'} Resumen
            </Button>
            
            {actividadesPendientes.length === 0 && actividadesDevueltas.length === 0 && (
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={onTodasAprobadas}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Finalizar Revisión
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {/* Lista de Actividades por Componente */}
      <div className="space-y-4">
        {['Docencia', 'Investigación', 'Extensión', 'Complementarias', 'Administrativas'].map(componente => {
          const actividadesComponente = todasActividades.filter(
            (a: any) => a.componente === componente
          );
          
          if (actividadesComponente.length === 0) return null;
          
          return (
            <ComponenteActividadesCard
              key={componente}
              componente={componente}
              actividades={actividadesComponente}
              ptaId={pta.id}
              nivel={nivel}
              aprobador={aprobador}
              actividadExpandida={actividadExpandida}
              onExpandir={setActividadExpandida}
              onActividadAprobada={onActividadAprobada}
              onActividadDevuelta={onActividadDevuelta}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Tarjeta de resumen de aprobación
 */
interface ResumenAprobacionCardProps {
  resumen: ResumenAprobacionPTA;
  nivel: NivelAprobacion;
  onClose: () => void;
}

function ResumenAprobacionCard({ resumen, nivel, onClose }: ResumenAprobacionCardProps) {
  
  const nivelData = nivel === 1 ? resumen.nivel_1 : nivel === 2 ? resumen.nivel_2 : resumen.nivel_3;
  
  return (
    <Card className="p-6 border-l-4 border-blue-500">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-xl text-gray-900 mb-1">
            📊 Resumen de Aprobación - Nivel {nivel}
          </h3>
          <p className="text-sm text-gray-600">
            {resumen.siguiente_accion}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ChevronUp className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Progreso del nivel actual */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progreso Nivel {nivel}
          </span>
          <span className="text-sm font-bold text-blue-600">
            {nivelData.porcentaje_avance}%
          </span>
        </div>
        <Progress value={nivelData.porcentaje_avance} className="h-3" />
        <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
          <span>✅ {nivelData.aprobadas} aprobadas</span>
          <span>⏳ {nivelData.pendientes} pendientes</span>
          <span>❌ {nivelData.devueltas} devueltas</span>
        </div>
      </div>
      
      {/* Estadísticas por nivel */}
      <div className="grid grid-cols-3 gap-4">
        {/* Nivel 1 */}
        <div className={`p-4 rounded-lg ${nivel === 1 ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              resumen.nivel_1.porcentaje_avance === 100 ? 'bg-green-500' :
              resumen.nivel_1.porcentaje_avance > 0 ? 'bg-blue-500' :
              'bg-gray-400'
            }`} />
            <span className="text-xs font-bold text-gray-700">Nivel 1</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {resumen.nivel_1.porcentaje_avance}%
          </div>
          <div className="text-xs text-gray-600">
            {resumen.nivel_1.aprobadas}/{resumen.total_actividades}
          </div>
        </div>
        
        {/* Nivel 2 */}
        <div className={`p-4 rounded-lg ${nivel === 2 ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              resumen.nivel_2.porcentaje_avance === 100 ? 'bg-green-500' :
              resumen.nivel_2.porcentaje_avance > 0 ? 'bg-blue-500' :
              'bg-gray-400'
            }`} />
            <span className="text-xs font-bold text-gray-700">Nivel 2</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {resumen.nivel_2.porcentaje_avance}%
          </div>
          <div className="text-xs text-gray-600">
            {resumen.nivel_2.aprobadas}/{resumen.total_actividades}
          </div>
        </div>
        
        {/* Nivel 3 */}
        <div className={`p-4 rounded-lg ${nivel === 3 ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              resumen.nivel_3.porcentaje_avance === 100 ? 'bg-green-500' :
              resumen.nivel_3.porcentaje_avance > 0 ? 'bg-blue-500' :
              'bg-gray-400'
            }`} />
            <span className="text-xs font-bold text-gray-700">Nivel 3</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {resumen.nivel_3.porcentaje_avance}%
          </div>
          <div className="text-xs text-gray-600">
            {resumen.nivel_3.aprobadas}/{resumen.total_actividades}
          </div>
        </div>
      </div>
      
      {/* Estado general */}
      {resumen.completamente_aprobado && (
        <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-bold text-green-900 text-sm">
                ✅ PTA Completamente Aprobado
              </p>
              <p className="text-xs text-green-700">
                Todas las actividades han sido aprobadas por los 3 niveles
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Tarjeta de componente con sus actividades
 */
interface ComponenteActividadesCardProps {
  componente: string;
  actividades: any[];
  ptaId: string;
  nivel: NivelAprobacion;
  aprobador: {
    id: string;
    nombre: string;
    cargo: string;
  };
  actividadExpandida: string | null;
  onExpandir: (id: string | null) => void;
  onActividadAprobada?: (actividadId: string) => void;
  onActividadDevuelta?: (actividadId: string) => void;
}

function ComponenteActividadesCard({
  componente,
  actividades,
  ptaId,
  nivel,
  aprobador,
  actividadExpandida,
  onExpandir,
  onActividadAprobada,
  onActividadDevuelta
}: ComponenteActividadesCardProps) {
  
  const [expandido, setExpandido] = useState(true);
  
  // Calcular estadísticas del componente
  const estados = actividades.map(a => 
    PTAAprobacionGranularService.obtenerEstadoActividad(ptaId, a.id)
  );
  
  const aprobadas = estados.filter(e => {
    if (!e) return false;
    if (nivel === 1) return e.estado_nivel_1 === 'APROBADA';
    if (nivel === 2) return e.estado_nivel_2 === 'APROBADA';
    if (nivel === 3) return e.estado_nivel_3 === 'APROBADA';
    return false;
  }).length;
  
  const devueltas = estados.filter(e => {
    if (!e) return false;
    if (nivel === 1) return e.estado_nivel_1 === 'DEVUELTA';
    if (nivel === 2) return e.estado_nivel_2 === 'DEVUELTA';
    if (nivel === 3) return e.estado_nivel_3 === 'DEVUELTA';
    return false;
  }).length;
  
  const pendientes = actividades.length - aprobadas - devueltas;
  const porcentaje = Math.round((aprobadas / actividades.length) * 100);
  
  // Aprobar todas las actividades del componente
  const handleAprobarTodas = () => {
    const actividadesIds = actividades.map(a => a.id);
    PTAAprobacionGranularService.aprobarComponenteCompleto(
      ptaId,
      componente,
      actividadesIds,
      nivel,
      aprobador
    );
    
    toast.success(`Todas las actividades de ${componente} aprobadas`);
    actividadesIds.forEach(id => onActividadAprobada?.(id));
  };
  
  return (
    <Card className="overflow-hidden">
      {/* Header del componente */}
      <div 
        className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-bold text-gray-900">{componente}</h4>
              <Badge variant="outline" className="text-xs">
                {actividades.length} actividades
              </Badge>
              <Badge className={
                porcentaje === 100 ? 'bg-green-600' :
                porcentaje > 0 ? 'bg-blue-600' :
                'bg-gray-500'
              }>
                {porcentaje}% aprobadas
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                {aprobadas} aprobadas
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-500" />
                {pendientes} pendientes
              </span>
              {devueltas > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-600" />
                  {devueltas} devueltas
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {pendientes > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAprobarTodas();
                }}
                className="text-xs"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Aprobar Todas
              </Button>
            )}
            
            {expandido ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </div>
        </div>
      </div>
      
      {/* Lista de actividades */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="divide-y">
              {actividades.map(actividad => (
                <ActividadCard
                  key={actividad.id}
                  actividad={actividad}
                  componente={componente}
                  ptaId={ptaId}
                  nivel={nivel}
                  aprobador={aprobador}
                  expandida={actividadExpandida === actividad.id}
                  onExpandir={() => onExpandir(
                    actividadExpandida === actividad.id ? null : actividad.id
                  )}
                  onAprobada={onActividadAprobada}
                  onDevuelta={onActividadDevuelta}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**
 * Tarjeta de actividad individual
 */
interface ActividadCardProps {
  actividad: any;
  componente: string;
  ptaId: string;
  nivel: NivelAprobacion;
  aprobador: {
    id: string;
    nombre: string;
    cargo: string;
  };
  expandida: boolean;
  onExpandir: () => void;
  onAprobada?: (actividadId: string) => void;
  onDevuelta?: (actividadId: string) => void;
}

function ActividadCard({
  actividad,
  componente,
  ptaId,
  nivel,
  aprobador,
  expandida,
  onExpandir,
  onAprobada,
  onDevuelta
}: ActividadCardProps) {
  
  const [observaciones, setObservaciones] = useState('');
  const [mostrandoFormDevolver, setMostrandoFormDevolver] = useState(false);
  
  // Obtener estado de la actividad
  const estado = PTAAprobacionGranularService.obtenerEstadoActividad(ptaId, actividad.id);
  
  // Determinar estado en el nivel actual
  let estadoNivel: 'PENDIENTE' | 'APROBADA' | 'DEVUELTA' = 'PENDIENTE';
  if (estado) {
    if (nivel === 1) estadoNivel = estado.estado_nivel_1;
    if (nivel === 2) estadoNivel = estado.estado_nivel_2;
    if (nivel === 3) estadoNivel = estado.estado_nivel_3;
  }
  
  const colores = estadoNivel === 'APROBADA' ? COLORES_ESTADO_ACTIVIDAD.APROBADA_NIVEL_1 :
                  estadoNivel === 'DEVUELTA' ? COLORES_ESTADO_ACTIVIDAD.DEVUELTA_NIVEL_1 :
                  COLORES_ESTADO_ACTIVIDAD.PENDIENTE;
  
  // Aprobar actividad
  const handleAprobar = () => {
    PTAAprobacionGranularService.aprobarActividad(
      ptaId,
      actividad.id,
      componente,
      nivel,
      aprobador,
      observaciones || undefined
    );
    
    toast.success(`Actividad "${actividad.nombre}" aprobada`);
    setObservaciones('');
    onAprobada?.(actividad.id);
  };
  
  // Devolver actividad
  const handleDevolver = () => {
    if (!observaciones.trim()) {
      toast.error('Debes agregar observaciones para devolver la actividad');
      return;
    }
    
    PTAAprobacionGranularService.devolverActividad(
      ptaId,
      actividad.id,
      componente,
      nivel,
      aprobador,
      observaciones
    );
    
    toast.success(`Actividad "${actividad.nombre}" devuelta con observaciones`);
    setObservaciones('');
    setMostrandoFormDevolver(false);
    onDevuelta?.(actividad.id);
  };
  
  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors ${colores.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-medium text-gray-900">
              {actividad.nombre}
            </h5>
            <Badge className={colores.badge}>
              {estadoNivel === 'APROBADA' && '✓'}
              {estadoNivel === 'DEVUELTA' && '✗'}
              {estadoNivel === 'PENDIENTE' && '⏳'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span>{actividad.horas}h</span>
            {actividad.creditos && <span>{actividad.creditos} créditos</span>}
            {actividad.estudiantes && <span>{actividad.estudiantes} estudiantes</span>}
          </div>
          
          {/* Observaciones previas */}
          {estado && estado.tiene_observaciones && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-bold text-yellow-900 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Observaciones Previas:
              </p>
              {estado.observaciones_totales.map((obs, idx) => (
                <p key={idx} className="text-yellow-800 mb-1">• {obs}</p>
              ))}
            </div>
          )}
          
          {/* Botones de acción */}
          {estadoNivel === 'PENDIENTE' && (
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleAprobar}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrandoFormDevolver(!mostrandoFormDevolver)}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Devolver
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onExpandir}
              >
                <Eye className="w-4 h-4 mr-1" />
                {expandida ? 'Ocultar' : 'Ver'} Detalles
              </Button>
            </div>
          )}
          
          {estadoNivel === 'APROBADA' && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Aprobada en Nivel {nivel}</span>
            </div>
          )}
          
          {estadoNivel === 'DEVUELTA' && (
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Devuelta - Requiere corrección</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Formulario para devolver */}
      <AnimatePresence>
        {mostrandoFormDevolver && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded"
          >
            <label className="block text-sm font-bold text-red-900 mb-2">
              Observaciones (Obligatorio):
            </label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Especifica qué debe corregir el docente..."
              className="mb-2"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleDevolver}
                className="bg-red-600 hover:bg-red-700"
              >
                <Send className="w-4 h-4 mr-1" />
                Enviar Devolución
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMostrandoFormDevolver(false);
                  setObservaciones('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Detalles expandidos */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-white border rounded"
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Descripción:</p>
                <p className="text-gray-600">{actividad.descripcion || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Evidencias esperadas:</p>
                <p className="text-gray-600">{actividad.evidencias || 'N/A'}</p>
              </div>
            </div>
            
            {/* Campo de observaciones opcional al aprobar */}
            {estadoNivel === 'PENDIENTE' && !mostrandoFormDevolver && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones opcionales:
                </label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Comentarios adicionales (opcional)..."
                  rows={2}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
