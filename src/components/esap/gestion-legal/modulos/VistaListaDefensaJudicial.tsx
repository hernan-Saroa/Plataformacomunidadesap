/**
 * VistaListaDefensaJudicial - Componente de vista de lista profesional
 * Vista alternativa al Kanban con tabla completa y funcionalidades avanzadas
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, User, Clock, Calendar, DollarSign, Filter, Settings,
  Eye, MoreVertical, ChevronsUp, ChevronsDown, Scale, List,
  Download, Paperclip, Send, MessageSquare, FileCheck, Edit, Search
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { toast } from 'sonner@2.0.3';
import type { ExpedienteJudicial } from '../core/types';
import { ModalExpediente } from './ModalExpediente';

interface VistaListaProps {
  expedientes: ExpedienteJudicial[];
  isMobile: boolean;
  isTablet: boolean;
  onMoverExpediente?: (id: string, etapa: string) => void;
}

export function VistaListaDefensaJudicial({ expedientes, isMobile, isTablet, onMoverExpediente }: VistaListaProps) {
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
    <Card className="border border-gray-200 bg-white overflow-hidden">
      {/* Header de la tabla */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white flex items-center gap-2">
            <List className="w-5 h-5" />
            Vista de Lista - Expedientes Judiciales
          </h3>
          <Badge className="bg-white text-blue-700 font-bold">
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
              <th className="px-4 py-3 text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
                  <DollarSign className="w-3.5 h-3.5" />
                  Cuantía
                </div>
              </th>

              {/* Última Actualización */}
              <th className="px-4 py-3 text-left">
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
}

function FilaExpedienteTabla({ expediente, semaforo, etapaConfig, index, estadosActivos, onMoverExpediente }: FilaExpedienteTablaProps) {
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [menuAccionesOpen, setMenuAccionesOpen] = useState(false);

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
          <div className="max-w-xs space-y-1">
            {/* Demandantes */}
            {expediente.demandantes && expediente.demandantes.length > 0 ? (
              <>
                <p className="text-[10px] font-semibold text-orange-700 uppercase">Demandante(s):</p>
                {expediente.demandantes.map((demandante, idx) => (
                  <p key={idx} className="font-bold text-xs text-gray-900 line-clamp-1">
                    • {demandante.nombre}
                  </p>
                ))}
              </>
            ) : (
              <p className="font-bold text-sm text-gray-900 line-clamp-2">
                {expediente.demandante}
              </p>
            )}

            {/* Demandados */}
            {expediente.demandados && expediente.demandados.length > 0 && (
              <div className="mt-1 pt-1 border-t border-gray-200">
                <p className="text-[10px] font-semibold text-red-700 uppercase">Demandado(s):</p>
                {expediente.demandados.map((demandado, idx) => (
                  <p key={idx} className="font-bold text-xs text-gray-900 line-clamp-1">
                    • {demandado.nombre}
                  </p>
                ))}
              </div>
            )}

            {/* Otros Actores */}
            {expediente.otrosActores && expediente.otrosActores.length > 0 && (
              <div className="mt-1 pt-1 border-t border-gray-200">
                <p className="text-[10px] font-semibold text-blue-700 uppercase">Otros Actores:</p>
                {expediente.otrosActores.map((actor, idx) => (
                  <p key={idx} className="font-bold text-xs text-gray-900 line-clamp-1">
                    • {actor.nombre} <span className="text-[9px] text-gray-600">({actor.rol})</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </td>

        {/* Etapa */}
        <td className="px-4 py-3">
          <Select
            value={expediente.etapa}
            onValueChange={(value) => onMoverExpediente && onMoverExpediente(expediente.id, value)}
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
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
            style={{
              backgroundColor: semaforo.bg,
              borderColor: semaforo.border
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: semaforo.border }}
            />
            <p className="font-bold text-sm" style={{ color: semaforo.text }}>
              {expediente.diasRestantes} días
            </p>
          </div>
        </td>

        {/* Cuantía */}
        <td className="px-4 py-3">
          <p className="font-bold text-sm text-gray-900">
            {formatCuantia(expediente.cuantia)}
          </p>
        </td>

        {/* Última Actualización */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-sm text-gray-700">
              {expediente.fechaActualizacion.toLocaleDateString('es-CO')}
            </p>
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
      />
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
}

function FilaExpedienteMobile({ expediente, semaforo, etapaConfig, estadosActivos, onMoverExpediente }: FilaExpedienteMobileProps) {
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [expandido, setExpandido] = useState(false);

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
            <Select
              value={expediente.etapa}
              onValueChange={(value) => onMoverExpediente && onMoverExpediente(expediente.id, value)}
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
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border"
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
                  {expediente.diasRestantes}d
                </p>
              </div>
            </div>
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
                <p className="font-bold text-sm text-gray-900">{formatCuantia(expediente.cuantia)}</p>
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
      />
    </>
  );
}
