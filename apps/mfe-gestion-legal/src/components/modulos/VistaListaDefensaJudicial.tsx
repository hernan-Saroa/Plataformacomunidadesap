/**
 * VistaListaDefensaJudicial - Componente de vista de lista profesional
 * Vista alternativa al Kanban con tabla completa y funcionalidades avanzadas
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, User, Clock, Calendar, DollarSign, Filter, Settings,
  Eye, MoreVertical, ChevronsUp, ChevronsDown, Scale, List,
  Download, Paperclip, Send, MessageSquare, FileCheck, Edit, Search,
  AlertCircle, Trash2
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { toast } from 'sonner';
import type { ExpedienteJudicial } from '../core/types';
import { ModalExpediente } from './ModalExpediente';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { legalService } from '../../../../services/api/legal.service';
import { calcularProgreso } from '../core/expedienteShared';

interface VistaListaProps {
  expedientes: ExpedienteJudicial[];
  isMobile: boolean;
  isTablet: boolean;
  onMoverExpediente?: (id: string, etapa: string) => void;
  onRefresh?: () => void;
}

export function VistaListaDefensaJudicial({ expedientes, isMobile, isTablet, onMoverExpediente, onRefresh }: VistaListaProps) {
  const { estadosActivos } = useConfiguracionModulo('defensa-judicial');
  const [ordenarPor, setOrdenarPor] = useState<'fecha' | 'dias' | 'etapa' | 'demandante'>('dias');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = isMobile ? 10 : 20;

  // Función para cambiar orden
  const handleOrdenar = (campo: 'fecha' | 'dias' | 'etapa' | 'demandante') => {
    if (ordenarPor === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setDireccionOrden('asc');
    }
  };

  // Ordenar expedientes
  const expedientesOrdenados = [...expedientes].sort((a, b) => {
    let comparacion = 0;

    switch (ordenarPor) {
      case 'fecha':
        comparacion = a.fechaActualizacion.getTime() - b.fechaActualizacion.getTime();
        break;
      case 'dias':
        comparacion = a.diasRestantes - b.diasRestantes;
        break;
      case 'etapa':
        comparacion = a.etapa.localeCompare(b.etapa);
        break;
      case 'demandante':
        comparacion = a.demandante.localeCompare(b.demandante);
        break;
    }

    return direccionOrden === 'asc' ? comparacion : -comparacion;
  });

  // Paginación
  const totalPaginas = Math.ceil(expedientesOrdenados.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const expedientesPaginados = expedientesOrdenados.slice(indiceInicio, indiceFin);

  // Semáforo helper
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 5) return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
    if (diasRestantes <= 15) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
    return { bg: '#D1FAE5', border: '#10B981', text: '#065F46' };
  };

  // Etapa helper
  const getEtapaConfig = (etapa: string) => {
    switch (etapa) {
      case 'NOTIFICADA':
        return { bg: '#F3F4F6', border: '#6B7280', text: '#374151', icono: <FileCheck className="w-3 h-3" /> };
      case 'CONTESTACIÓN':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icono: <Edit className="w-3 h-3" /> };
      case 'PROBATORIA':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', icono: <Search className="w-3 h-3" /> };
      case 'ALEGATOS':
        return { bg: '#E0EDFF', border: '#003DA5', text: '#003DA5', icono: <Scale className="w-3 h-3" /> };
      default:
        return { bg: '#F3F4F6', border: '#6B7280', text: '#374151', icono: <FileText className="w-3 h-3" /> };
    }
  };

  if (isMobile) {
    // Vista Mobile - Tarjetas compactas
    return (
      <div className="space-y-3">
        {/* Controles de ordenamiento */}
        <Card className="p-3 bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">Ordenar por:</p>
            <Badge className="text-xs bg-blue-600 text-white">
              {expedientesOrdenados.length} expedientes
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={ordenarPor === 'dias' ? 'default' : 'outline'}
              onClick={() => handleOrdenar('dias')}
              className="text-xs justify-between"
            >
              <Clock className="w-3 h-3" />
              Días
              {ordenarPor === 'dias' && (
                direccionOrden === 'asc' ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant={ordenarPor === 'etapa' ? 'default' : 'outline'}
              onClick={() => handleOrdenar('etapa')}
              className="text-xs justify-between"
            >
              <Filter className="w-3 h-3" />
              Etapa
              {ordenarPor === 'etapa' && (
                direccionOrden === 'asc' ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />
              )}
            </Button>
          </div>
        </Card>

        {/* Lista de expedientes */}
        {expedientesPaginados.map((expediente) => {
          const semaforo = getSemaforoColor(expediente.diasRestantes);
          const etapaConfig = getEtapaConfig(expediente.etapa);

          return (
            <FilaExpedienteMobile
              key={expediente.id}
              expediente={expediente}
              semaforo={semaforo}
              etapaConfig={etapaConfig}
              estadosActivos={estadosActivos}
              onMoverExpediente={onMoverExpediente}
              onRefresh={onRefresh}
            />
          );
        })}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <Card className="p-3 bg-white border border-gray-200">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                disabled={paginaActual === 1}
                className="text-xs"
              >
                Anterior
              </Button>
              <p className="text-xs font-bold text-gray-600">
                Página {paginaActual} de {totalPaginas}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                disabled={paginaActual === totalPaginas}
                className="text-xs"
              >
                Siguiente
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Vista Desktop/Tablet - Tabla profesional
  return (
    <Card className="border border-gray-200 bg-white overflow-hidden shadow-sm rounded-xl relative">
      {/* Barra de acento */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#003DA5]" />
      
      {/* Header de la tabla */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between mt-1">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-black text-[#003DA5] flex items-center gap-2 text-base">
            <List className="w-5 h-5" />
            Vista de Lista - Expedientes Judiciales
          </h3>
          <Badge className="bg-[#E0EDFF] text-[#003DA5] border border-blue-200 font-bold px-2.5 py-1">
            {expedientesOrdenados.length} expedientes
          </Badge>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Número Expediente */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleOrdenar('demandante')}
                  className="flex items-center gap-1.5 text-xs font-black text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Expediente
                  {ordenarPor === 'demandante' && (
                    direccionOrden === 'asc' ?
                      <ChevronsUp className="w-3 h-3" /> :
                      <ChevronsDown className="w-3 h-3" />
                  )}
                </button>
              </th>

              {/* Demandante */}
              <th className="px-4 py-3 text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
                  <User className="w-3.5 h-3.5" />
                  Demandante
                </div>
              </th>

              {/* Etapa */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleOrdenar('etapa')}
                  className="flex items-center gap-1.5 text-xs font-black text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Etapa
                  {ordenarPor === 'etapa' && (
                    direccionOrden === 'asc' ?
                      <ChevronsUp className="w-3 h-3" /> :
                      <ChevronsDown className="w-3 h-3" />
                  )}
                </button>
              </th>

              {/* Profesional */}
              <th className="px-4 py-3 text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
                  <User className="w-3.5 h-3.5" />
                  Profesional
                </div>
              </th>

              {/* Días Restantes */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleOrdenar('dias')}
                  className="flex items-center gap-1.5 text-xs font-black text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Plazo
                  {ordenarPor === 'dias' && (
                    direccionOrden === 'asc' ?
                      <ChevronsUp className="w-3 h-3" /> :
                      <ChevronsDown className="w-3 h-3" />
                  )}
                </button>
              </th>

              {/* Cuantía */}
              <th className="px-4 py-3 text-left hidden lg:table-cell">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
                  <DollarSign className="w-3.5 h-3.5" />
                  Cuantía
                </div>
              </th>

              {/* Última Actualización */}
              <th className="px-4 py-3 text-left hidden xl:table-cell">
                <button
                  onClick={() => handleOrdenar('fecha')}
                  className="flex items-center gap-1.5 text-xs font-black text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Última Actualización
                  {ordenarPor === 'fecha' && (
                    direccionOrden === 'asc' ?
                      <ChevronsUp className="w-3 h-3" /> :
                      <ChevronsDown className="w-3 h-3" />
                  )}
                </button>
              </th>

              {/* Acciones */}
              <th className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-gray-700">
                  <Settings className="w-3.5 h-3.5" />
                  Acciones
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {expedientesPaginados.map((expediente, index) => {
              const semaforo = getSemaforoColor(expediente.diasRestantes);
              const etapaConfig = getEtapaConfig(expediente.etapa);

              return (
                <FilaExpedienteTabla
                  key={expediente.id}
                  expediente={expediente}
                  semaforo={semaforo}
                  etapaConfig={etapaConfig}
                  index={index}
                  estadosActivos={estadosActivos}
                  onMoverExpediente={onMoverExpediente}
                  onRefresh={onRefresh}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer con paginación */}
      {totalPaginas > 1 && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Mostrando <strong className="text-gray-900">{indiceInicio + 1}</strong> a{' '}
              <strong className="text-gray-900">{Math.min(indiceFin, expedientesOrdenados.length)}</strong> de{' '}
              <strong className="text-gray-900">{expedientesOrdenados.length}</strong> expedientes
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaginaActual(1)}
                disabled={paginaActual === 1}
                className="text-xs"
              >
                Primera
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                disabled={paginaActual === 1}
                className="text-xs"
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let pagina;
                  if (totalPaginas <= 5) {
                    pagina = i + 1;
                  } else if (paginaActual <= 3) {
                    pagina = i + 1;
                  } else if (paginaActual >= totalPaginas - 2) {
                    pagina = totalPaginas - 4 + i;
                  } else {
                    pagina = paginaActual - 2 + i;
                  }

                  return (
                    <Button
                      key={pagina}
                      size="sm"
                      variant={paginaActual === pagina ? 'default' : 'outline'}
                      onClick={() => setPaginaActual(pagina)}
                      className="text-xs w-8 h-8 p-0"
                    >
                      {pagina}
                    </Button>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                disabled={paginaActual === totalPaginas}
                className="text-xs"
              >
                Siguiente
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaActual === totalPaginas}
                className="text-xs"
              >
                Última
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ==================== COMPONENTE FILA EXPEDIENTE TABLA ====================
interface FilaExpedienteTablaProps {
  expediente: ExpedienteJudicial;
  semaforo: { bg: string; border: string; text: string };
  etapaConfig: { bg: string; border: string; text: string; icono: React.ReactNode };
  index: number;
  estadosActivos: { id: string; nombre: string }[];
  onMoverExpediente?: (id: string, etapa: string) => void;
  onRefresh?: () => void;
}

function FilaExpedienteTabla({ expediente, semaforo, etapaConfig, index, estadosActivos, onMoverExpediente, onRefresh }: FilaExpedienteTablaProps) {
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [menuAccionesOpen, setMenuAccionesOpen] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [motivoEliminar, setMotivoEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);

  const handleEliminarDemanda = async () => {
    if (!motivoEliminar.trim()) {
      toast.error('⚠️ El motivo es obligatorio');
      return;
    }
    try {
      setEliminando(true);
      const idToDelete = expediente.uuid || expediente.id;
      await legalService.eliminarExpedienteSoft(idToDelete, motivoEliminar, 'usuario');
      toast.success('🗑️ Demanda eliminada exitosamente', {
        description: `Radicado: ${expediente.id} — Movida a archivados`
      });
      setShowEliminarModal(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error eliminando demanda:', error);
      toast.error('❌ Error al eliminar la demanda');
    } finally {
      setEliminando(false);
    }
  };

  const { porcentajeGlobal: porcentajeTiempo, procesoVencido } = calcularProgreso(
    expediente.diasTotales,
    expediente.diasRestantes,
    expediente.etapa,
    estadosActivos,
    expediente.documentos,
    expediente.actuaciones
  );
  const ultimaActuacion = expediente.ultimaActuacion?.descripcion || `Expediente en etapa de ${expediente.etapa}`;

  const formatCuantia = (cuantia: number | undefined) => {
    if (!cuantia) return 'No determinada';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cuantia);
  };

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="hover:bg-gray-50 transition-colors"
      >
        {/* Número Expediente */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#E0EDFF' }}>
              <Scale className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#003DA5' }}>
                {expediente.id}
              </p>
              <p className="text-xs text-gray-500">{expediente.medioControl}</p>
            </div>
          </div>
        </td>

        {/* Demandante */}
        <td className="px-4 py-3">
          <div className="max-w-xs space-y-1.5">
            {/* Demandantes */}
            <div className="flex items-start gap-1.5">
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#003DA5] uppercase shrink-0">
                DTE
              </span>
              <div className="min-w-0 flex-1">
                {expediente.demandantes && expediente.demandantes.length > 0 ? (
                  expediente.demandantes.map((demandante, idx) => (
                    <p key={idx} className="font-bold text-xs text-gray-900 truncate" title={demandante.nombre}>
                      {demandante.nombre}
                    </p>
                  ))
                ) : (
                  <p className="font-bold text-xs text-gray-900 truncate" title={expediente.demandante}>
                    {expediente.demandante}
                  </p>
                )}
              </div>
            </div>

            {/* Demandados */}
            {expediente.demandados && expediente.demandados.length > 0 && (
              <div className="flex items-start gap-1.5 pt-1.5 border-t border-gray-100">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-600 uppercase shrink-0">
                  DDO
                </span>
                <div className="min-w-0 flex-1">
                  {expediente.demandados.map((demandado, idx) => (
                    <p key={idx} className="font-bold text-xs text-gray-900 truncate" title={demandado.nombre}>
                      {demandado.nombre}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Otros Actores */}
            {expediente.otrosActores && expediente.otrosActores.length > 0 && (
              <div className="flex items-start gap-1.5 pt-1.5 border-t border-gray-100">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 uppercase shrink-0">
                  OTRO
                </span>
                <div className="min-w-0 flex-1">
                  {expediente.otrosActores.map((actor, idx) => (
                    <p key={idx} className="font-bold text-xs text-gray-900 truncate" title={`${actor.nombre} (${actor.rol})`}>
                      {actor.nombre} <span className="text-[9px] text-gray-500 font-normal">({actor.rol})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </td>

        {/* Etapa */}
        <td className="px-4 py-3">
          {onMoverExpediente ? (
            <Select
              value={expediente.etapa}
              onValueChange={(value: string) => onMoverExpediente(expediente.id, value)}
            >
              <SelectTrigger
                className="h-auto py-1 px-2.5 border rounded-full font-semibold focus:ring-0 w-fit text-xs"
                style={{
                  backgroundColor: etapaConfig.bg,
                  borderColor: etapaConfig.border,
                  color: etapaConfig.text
                }}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                  {etapaConfig.icono}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="z-[100000]">
                {estadosActivos.map(estado => (
                  <SelectItem key={estado.id} value={estado.nombre}>{estado.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 py-1 px-2.5 border rounded-full font-semibold text-xs"
              style={{ backgroundColor: etapaConfig.bg, borderColor: etapaConfig.border, color: etapaConfig.text }}
            >
              {etapaConfig.icono}
              {expediente.etapa}
            </span>
          )}
        </td>

        {/* Profesional */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarFallback
                className="text-xs"
                style={{ background: '#E0EDFF', color: '#003DA5' }}
              >
                {expediente.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <p className="font-bold text-sm text-gray-900">
              {expediente.abogadoAsignado.split(' ').slice(0, 2).join(' ')}
            </p>
          </div>
        </td>

        {/* Días Restantes */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1.5">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border w-fit"
              style={{
                backgroundColor: semaforo.bg,
                borderColor: semaforo.border
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: semaforo.border }}
              />
              <p className="font-bold text-xs" style={{ color: semaforo.text }}>
                {(() => {
                  const unit = expediente.tipoConteoTermino === 'HORAS' ? 'h' : 'd';
                  return expediente.diasRestantes < 0 ? `${Math.abs(expediente.diasRestantes)}${unit}` : `${expediente.diasRestantes}${unit}`;
                })()}
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
              <span className="flex items-center gap-1" title="Documentos">
                <FileText className="w-3 h-3 text-gray-400" />
                {expediente.documentos?.length || 0} docs
              </span>
              <span className="flex items-center gap-1" style={{ color: procesoVencido ? '#DC2626' : undefined }} title="Progreso global">
                <AlertCircle className="w-3 h-3 text-gray-400" style={{ color: procesoVencido ? '#DC2626' : undefined }} />
                {porcentajeTiempo}%
              </span>
            </div>
          </div>
        </td>

        {/* Cuantía */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <p className="font-bold text-sm text-gray-900">
            {formatCuantia(Number(expediente.cuantia) || undefined)}
          </p>
        </td>

        {/* Última Actualización */}
        <td className="px-4 py-3 hidden xl:table-cell">
          <div className="space-y-1.5 max-w-[220px]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-sm text-gray-700 font-medium">
                {expediente.fechaActualizacion.toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="p-2 rounded-lg border bg-blue-50/50 border-blue-100">
              <p className="text-[9px] font-black text-blue-700 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                Última Actuación
              </p>
              <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug">
                {ultimaActuacion}
              </p>
            </div>
          </div>
        </td>

        {/* Acciones */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalExpedienteOpen(true)}
              className="text-xs"
              title="Ver expediente completo"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMenuAccionesOpen(!menuAccionesOpen)}
                className="text-xs"
                title="Más acciones"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>

              {menuAccionesOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuAccionesOpen(false)}
                  />
                  <Card className="absolute right-0 top-full mt-1 z-50 w-48 p-1 shadow-lg border border-gray-200">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        toast.info('📄 Ver Autos', { description: expediente.id });
                        setMenuAccionesOpen(false);
                      }}
                    >
                      <Scale className="w-3 h-3 mr-2" />
                      Ver Autos
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        toast.info('📎 Ver Evidencias', { description: expediente.id });
                        setMenuAccionesOpen(false);
                      }}
                    >
                      <Paperclip className="w-3 h-3 mr-2" />
                      Ver Evidencias
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        toast.info('📧 Ver Oficios', { description: expediente.id });
                        setMenuAccionesOpen(false);
                      }}
                    >
                      <Send className="w-3 h-3 mr-2" />
                      Ver Oficios
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        toast.info('💬 Comunicaciones', { description: expediente.id });
                        setMenuAccionesOpen(false);
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-2" />
                      Comunicaciones
                    </Button>
                    <div className="h-px bg-gray-200 my-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-xs text-blue-600"
                      onClick={() => {
                        toast.success('📥 Descargando expediente...', { description: expediente.id });
                        setMenuAccionesOpen(false);
                      }}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Descargar
                    </Button>
                    {authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT) && (
                      <>
                        <div className="h-px bg-gray-200 my-1" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setMotivoEliminar('');
                            setShowEliminarModal(true);
                            setMenuAccionesOpen(false);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Eliminar Demanda
                        </Button>
                      </>
                    )}
                  </Card>
                </>
              )}
            </div>
          </div>
        </td>
      </motion.tr>

      {/* Modal Expediente */}
      <ModalExpediente
        isOpen={modalExpedienteOpen}
        onClose={() => setModalExpedienteOpen(false)}
        expediente={expediente}
        onUpdate={onRefresh}
      />

      {/* Modal de confirmación eliminar */}
      <Dialog open={showEliminarModal} onOpenChange={setShowEliminarModal}>
        <DialogContent
          className="sm:max-w-[380px] w-[90vw] !max-w-[380px] !w-auto p-0 overflow-hidden"
          style={{ maxWidth: '380px', width: '100%' }}
        >
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-5 h-5 text-red-500" />
              Eliminar Demanda
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">¿Eliminar esta demanda?</p>
                <p className="text-xs mt-1 opacity-80">Radicado: <strong>{expediente.id}</strong>. Será movida a la papelera y podrá restaurarla desde Archivados.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Motivo de eliminación <span className="text-red-500">*</span></label>
              <textarea
                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={3}
                placeholder="Indique la razón de la eliminación..."
                value={motivoEliminar}
                onChange={(e) => setMotivoEliminar(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 pt-0 bg-gray-50/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEliminarModal(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEliminarDemanda}
              disabled={!motivoEliminar.trim() || eliminando}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== COMPONENTE FILA EXPEDIENTE MOBILE ====================
interface FilaExpedienteMobileProps {
  expediente: ExpedienteJudicial;
  semaforo: { bg: string; border: string; text: string };
  etapaConfig: { bg: string; border: string; text: string; icono: React.ReactNode };
  estadosActivos: { id: string; nombre: string }[];
  onMoverExpediente?: (id: string, etapa: string) => void;
  onRefresh?: () => void;
}

function FilaExpedienteMobile({ expediente, semaforo, etapaConfig, estadosActivos, onMoverExpediente, onRefresh }: FilaExpedienteMobileProps) {
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [motivoEliminar, setMotivoEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);

  const handleEliminarDemanda = async () => {
    if (!motivoEliminar.trim()) {
      toast.error('⚠️ El motivo es obligatorio');
      return;
    }
    try {
      setEliminando(true);
      const idToDelete = expediente.uuid || expediente.id;
      await legalService.eliminarExpedienteSoft(idToDelete, motivoEliminar, 'usuario');
      toast.success('🗑️ Demanda eliminada exitosamente', {
        description: `Radicado: ${expediente.id} — Movida a archivados`
      });
      setShowEliminarModal(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error eliminando demanda:', error);
      toast.error('❌ Error al eliminar la demanda');
    } finally {
      setEliminando(false);
    }
  };

  const { porcentajeGlobal: porcentajeTiempo, procesoVencido } = calcularProgreso(
    expediente.diasTotales,
    expediente.diasRestantes,
    expediente.etapa,
    estadosActivos,
    expediente.documentos,
    expediente.actuaciones
  );
  const ultimaActuacion = expediente.ultimaActuacion?.descripcion || `Expediente en etapa de ${expediente.etapa}`;

  const formatCuantia = (cuantia: number | undefined) => {
    if (!cuantia) return 'No determinada';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cuantia);
  };

  return (
    <>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#E0EDFF' }}>
                <Scale className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>
                  {expediente.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">{expediente.medioControl}</p>
              </div>
            </div>
            {onMoverExpediente ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Select
                  value={expediente.etapa}
                  onValueChange={(value: string) => onMoverExpediente(expediente.id, value)}
                >
                  <SelectTrigger
                    className="h-auto py-1 px-2.5 border rounded-full font-semibold focus:ring-0 flex-shrink-0 text-xs w-auto min-w-[120px]"
                    style={{
                      backgroundColor: etapaConfig.bg,
                      borderColor: etapaConfig.border,
                      color: etapaConfig.text
                    }}
                  >
                    <div className="flex items-center gap-1 flex-1 pr-1">
                      {etapaConfig.icono}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {estadosActivos.map(estado => (
                      <SelectItem key={estado.id} value={estado.nombre}>{estado.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMotivoEliminar(''); setShowEliminarModal(true); }}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                    title="Eliminar demanda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="inline-flex items-center gap-1 py-1 px-2.5 border rounded-full font-semibold flex-shrink-0 text-xs"
                  style={{ backgroundColor: etapaConfig.bg, borderColor: etapaConfig.border, color: etapaConfig.text }}
                >
                  {etapaConfig.icono}
                  {expediente.etapa}
                </span>
                {authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMotivoEliminar(''); setShowEliminarModal(true); }}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                    title="Eliminar demanda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Demandante */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Demandante:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-2">
              {expediente.demandante}
            </p>
          </div>

          {/* Profesional y Plazo */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">👨‍💼 Profesional:</p>
              <div className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarFallback
                    className="text-xs"
                    style={{ background: '#E0EDFF', color: '#003DA5' }}
                  >
                    {expediente.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <p className="font-bold text-xs text-gray-900 truncate">
                  {expediente.abogadoAsignado.split(' ')[0]}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">⏰ Plazo:</p>
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border"
                style={{
                  backgroundColor: semaforo.bg,
                  borderColor: semaforo.border
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: semaforo.border }}
                />
                <p className="font-bold text-xs" style={{ color: semaforo.text }}>
                  {(() => {
                    const unit = expediente.tipoConteoTermino === 'HORAS' ? 'h' : 'd';
                    return expediente.diasRestantes < 0 ? `${Math.abs(expediente.diasRestantes)}${unit}` : `${expediente.diasRestantes}${unit}`;
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Métricas Adicionales (Paridad con Kanban) */}
          <div className="flex items-center gap-3 my-2.5 pt-2 border-t border-gray-100 text-xs text-gray-500 font-semibold">
            <span className="flex items-center gap-1" title="Documentos">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              {expediente.documentos?.length || 0} docs
            </span>
            <span className="flex items-center gap-1" style={{ color: procesoVencido ? '#DC2626' : undefined }} title="Progreso global">
              <AlertCircle className="w-3.5 h-3.5 text-gray-400" style={{ color: procesoVencido ? '#DC2626' : undefined }} />
              {porcentajeTiempo}% progreso
            </span>
          </div>

          {/* Banner Última Actuación */}
          <div className="my-2.5 p-2 rounded-lg border bg-blue-50/50 border-blue-100">
            <p className="text-[9px] font-black text-blue-700 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Última Actuación
            </p>
            <p className="text-xs text-gray-600 line-clamp-2 leading-snug">
              {ultimaActuacion}
            </p>
          </div>

          {/* Expandible */}
          {expandido && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 space-y-2"
            >
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-0.5">💰 Cuantía:</p>
                <p className="font-bold text-sm text-gray-900">{formatCuantia(Number(expediente.cuantia) || undefined)}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-0.5">📅 Última Actualización:</p>
                <p className="font-bold text-sm text-gray-900">
                  {expediente.fechaActualizacion.toLocaleDateString('es-CO')}
                </p>
              </div>
            </motion.div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <Button
              size="sm"
              onClick={() => setModalExpedienteOpen(true)}
              className="flex-1 text-xs font-bold"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Eye className="w-3 h-3 mr-1" />
              Ver Expediente
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandido(!expandido)}
              className="text-xs"
            >
              {expandido ? <ChevronsUp className="w-3.5 h-3.5" /> : <ChevronsDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal Expediente */}
      <ModalExpediente
        isOpen={modalExpedienteOpen}
        onClose={() => setModalExpedienteOpen(false)}
        expediente={expediente}
        onUpdate={onRefresh}
      />

      {/* Modal de confirmación eliminar */}
      <Dialog open={showEliminarModal} onOpenChange={setShowEliminarModal}>
        <DialogContent
          className="sm:max-w-[380px] w-[90vw] !max-w-[380px] !w-auto p-0 overflow-hidden"
          style={{ maxWidth: '380px', width: '100%' }}
        >
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-5 h-5 text-red-500" />
              Eliminar Demanda
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">¿Eliminar esta demanda?</p>
                <p className="text-xs mt-1 opacity-80">Radicado: <strong>{expediente.id}</strong>. Será movida a la papelera y podrá restaurarla desde Archivados.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Motivo de eliminación <span className="text-red-500">*</span></label>
              <textarea
                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={3}
                placeholder="Indique la razón de la eliminación..."
                value={motivoEliminar}
                onChange={(e) => setMotivoEliminar(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 pt-0 bg-gray-50/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEliminarModal(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEliminarDemanda}
              disabled={!motivoEliminar.trim() || eliminando}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
