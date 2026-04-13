/**
 * VistaListaProcesosCoactivos - Vista de lista profesional para Procesos Coactivos
 * Vista alternativa al Kanban con tabla completa y funcionalidades avanzadas
 */

import { useState } from 'react';
import {
  DollarSign, User, Clock, Filter,
  Eye, ChevronsUp, ChevronsDown, Scale,
  Download, Paperclip, MessageSquare, FileCheck, AlertCircle,
  MoreVertical, CreditCard, RefreshCw, FileText, Folder
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { toast } from 'sonner';
import type { ProcesoCoactivo } from '../core/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@esap-mfe/shared-ui/dropdown-menu';

interface VistaListaProps {
  procesos: Array<ProcesoCoactivo & { diasHastaPrescripcion: number }>;
  isMobile: boolean;
  isTablet: boolean;
}

export function VistaListaProcesosCoactivos({ procesos, isMobile, isTablet }: VistaListaProps) {
  const [ordenarPor, setOrdenarPor] = useState<'fecha' | 'dias' | 'etapa' | 'monto'>('dias');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = isMobile ? 10 : 20;

  // Función para cambiar orden
  const handleOrdenar = (campo: 'fecha' | 'dias' | 'etapa' | 'monto') => {
    if (ordenarPor === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setDireccionOrden('asc');
    }
  };

  // Ordenar procesos
  const procesosOrdenados = [...procesos].sort((a, b) => {
    let comparacion = 0;
    
    switch (ordenarPor) {
      case 'fecha':
        comparacion = a.fechaActualizacion.getTime() - b.fechaActualizacion.getTime();
        break;
      case 'dias':
        comparacion = a.diasHastaPrescripcion - b.diasHastaPrescripcion;
        break;
      case 'etapa':
        comparacion = a.etapa.localeCompare(b.etapa);
        break;
      case 'monto':
        comparacion = a.montoTotal - b.montoTotal;
        break;
    }
    
    return direccionOrden === 'asc' ? comparacion : -comparacion;
  });

  // Paginación
  const totalPaginas = Math.ceil(procesosOrdenados.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const procesosPaginados = procesosOrdenados.slice(indiceInicio, indiceFin);

  // Semáforo helper
  const getSemaforoColor = (diasPrescripcion: number) => {
    if (diasPrescripcion <= 180) return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
    if (diasPrescripcion <= 365) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
    return { bg: '#D1FAE5', border: '#10B981', text: '#065F46' };
  };

  // Etapa helper
  const getEtapaConfig = (etapa: string) => {
    switch (etapa) {
      case 'IDENTIFICADO':
        return { bg: '#F3F4F6', border: '#6B7280', text: '#374151', icono: <FileCheck className="w-3 h-3" /> };
      case 'PERSUASIVO':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icono: <AlertCircle className="w-3 h-3" /> };
      case 'PREJURIDICO':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', icono: <Paperclip className="w-3 h-3" /> };
      case 'MANDAMIENTO':
        return { bg: '#E0EDFF', border: '#003DA5', text: '#003DA5', icono: <Scale className="w-3 h-3" /> };
      default:
        return { bg: '#F3F4F6', border: '#6B7280', text: '#374151', icono: <DollarSign className="w-3 h-3" /> };
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
            <Badge className="text-xs bg-orange-600 text-white">
              {procesosOrdenados.length} procesos
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
              variant={ordenarPor === 'monto' ? 'default' : 'outline'}
              onClick={() => handleOrdenar('monto')}
              className="text-xs justify-between"
            >
              <DollarSign className="w-3 h-3" />
              Monto
              {ordenarPor === 'monto' && (
                direccionOrden === 'asc' ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />
              )}
            </Button>
          </div>
        </Card>

        {/* Lista de procesos */}
        {procesosPaginados.map((proceso) => {
          const semaforo = getSemaforoColor(proceso.diasHastaPrescripcion);
          const etapaConfig = getEtapaConfig(proceso.etapa);
          
          return (
            <FilaProcesoMobile 
              key={proceso.id} 
              proceso={proceso}
              semaforo={semaforo}
              etapaConfig={etapaConfig}
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
              <p className="text-xs text-gray-600">
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

  // Vista Desktop - Tabla completa
  return (
    <Card className="border border-gray-200 bg-white overflow-hidden">
      {/* Controles superiores */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="text-xs font-bold bg-orange-600 text-white px-3 py-1">
            {procesosOrdenados.length} procesos
          </Badge>
          <p className="text-xs text-gray-600">
            Mostrando {indiceInicio + 1}-{Math.min(indiceFin, procesosOrdenados.length)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs">
            <Download className="w-3 h-3 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleOrdenar('fecha')}
              >
                <div className="flex items-center gap-2">
                  ID Proceso
                  {ordenarPor === 'fecha' && (
                    direccionOrden === 'asc' ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                Deudor
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleOrdenar('etapa')}
              >
                <div className="flex items-center gap-2">
                  Etapa
                  {ordenarPor === 'etapa' && (
                    direccionOrden === 'asc' ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleOrdenar('monto')}
              >
                <div className="flex items-center gap-2">
                  Monto Total
                  {ordenarPor === 'monto' && (
                    direccionOrden === 'asc' ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                Capital
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                Intereses
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                Responsable
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleOrdenar('dias')}
              >
                <div className="flex items-center gap-2">
                  Prescripción
                  {ordenarPor === 'dias' && (
                    direccionOrden === 'asc' ? <ChevronsUp className="w-3 h-3" /> : <ChevronsDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {procesosPaginados.map((proceso) => {
              const semaforo = getSemaforoColor(proceso.diasHastaPrescripcion);
              const etapaConfig = getEtapaConfig(proceso.etapa);

              return (
                <tr
                  key={proceso.id}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg" style={{ background: '#E0EDFF' }}>
                        <DollarSign className="w-3 h-3" style={{ color: '#003DA5' }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#003DA5' }}>
                        {proceso.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">
                      {proceso.deudor}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge 
                      className="text-xs font-semibold flex items-center gap-1.5 w-fit"
                      style={{
                        backgroundColor: etapaConfig.bg,
                        color: etapaConfig.text,
                        border: `1px solid ${etapaConfig.border}`
                      }}
                    >
                      {etapaConfig.icono}
                      {proceso.etapa}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-900">
                      {proceso.montoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {proceso.montoCapital.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {proceso.montoIntereses.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback 
                          className="text-xs"
                          style={{ background: '#E0EDFF', color: '#003DA5' }}
                        >
                          {proceso.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700 max-w-[120px] truncate">
                        {proceso.responsable}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div 
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg"
                      style={{
                        backgroundColor: semaforo.bg,
                        border: `1px solid ${semaforo.border}`
                      }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: semaforo.border }}
                      />
                      <span className="text-xs font-semibold" style={{ color: semaforo.text }}>
                        {proceso.diasHastaPrescripcion} días
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => toast.info('Ver Expediente', { description: proceso.id })}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Expediente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info(`📁 Documentos del proceso ${proceso.id}`)}>
                            <Folder className="w-4 h-4 mr-2" />
                            Documentos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.info('Gestionar Pagos')}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Registrar Pago
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info('Cambiar Etapa')}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Cambiar Etapa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info('Generar Acto')}>
                            <FileText className="w-4 h-4 mr-2" />
                            Generar Acto
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.info('Comentarios')}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Comentarios
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación inferior */}
      {totalPaginas > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-semibold">{indiceInicio + 1}</span> a{' '}
              <span className="font-semibold">{Math.min(indiceFin, procesosOrdenados.length)}</span> de{' '}
              <span className="font-semibold">{procesosOrdenados.length}</span> procesos
            </p>
            <div className="flex items-center gap-2">
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
                  const pagina = i + 1;
                  return (
                    <Button
                      key={pagina}
                      size="sm"
                      variant={paginaActual === pagina ? 'default' : 'outline'}
                      onClick={() => setPaginaActual(pagina)}
                      className="text-xs w-8 h-8"
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
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ==================== COMPONENTE FILA MOBILE ====================
interface FilaProcesoMobileProps {
  proceso: ProcesoCoactivo & { diasHastaPrescripcion: number };
  semaforo: { bg: string; border: string; text: string };
  etapaConfig: { bg: string; border: string; text: string; icono: React.ReactNode };
}

function FilaProcesoMobile({ proceso, semaforo, etapaConfig }: FilaProcesoMobileProps) {
  return (
    <Card className="border border-gray-200 bg-white hover:shadow-md transition-all">
      {/* Barra superior */}
      <div className="h-1" style={{ background: '#003DA5' }} />
      
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="p-1.5 rounded-lg" style={{ background: '#E0EDFF' }}>
              <DollarSign className="w-4 h-4" style={{ color: '#003DA5' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#003DA5' }}>{proceso.id}</p>
              <p className="text-xs text-gray-600">
                {proceso.montoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <Badge 
            className="text-xs font-semibold"
            style={{
              backgroundColor: etapaConfig.bg,
              color: etapaConfig.text,
              border: `1px solid ${etapaConfig.border}`
            }}
          >
            {proceso.etapa}
          </Badge>
        </div>

        {/* Deudor */}
        <div className="border-t pt-2">
          <p className="text-xs text-gray-500 mb-1">Deudor:</p>
          <p className="text-sm font-bold text-gray-900">{proceso.deudor}</p>
        </div>

        {/* Responsable */}
        <div className="flex items-center gap-2">
          <Avatar className="w-5 h-5">
            <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
              {proceso.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs text-gray-700">{proceso.responsable}</p>
        </div>

        {/* Semáforo */}
        <div 
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{
            backgroundColor: semaforo.bg,
            border: `1px solid ${semaforo.border}`
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: semaforo.border }} />
          <span className="text-xs font-semibold" style={{ color: semaforo.text }}>
            {proceso.diasHastaPrescripcion} días prescripción
          </span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            onClick={() => toast.info('Ver Expediente')}
            size="sm"
            className="flex-1 text-xs font-bold"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Eye className="w-3 h-3 mr-1" />
            Ver
          </Button>
          <Button
            onClick={() => toast.info('Pagos')}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            <DollarSign className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
