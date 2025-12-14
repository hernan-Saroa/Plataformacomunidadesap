/**
 * VISTA GANTT - PROGRAMA ANUAL DE AUDITORÍAS
 * Visualización temporal de auditorías programadas con timeline
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, ZoomIn, ZoomOut, FileDown, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { AuditoriaProgramada, ClasificacionRiesgo } from './services/types';
import { exportGanttAsImage, exportGanttAsPDF, exportGanttAsExcel } from './utils/exportGantt';
import { toast } from 'sonner';

type VistaGantt = 'mensual' | 'trimestral' | 'anual';
type EtapaMostrada = 'planeacion' | 'ejecucion' | 'comunicacion' | 'todas';

interface GanttChartViewProps {
  auditorias: AuditoriaProgramada[];
  añoFiscal: number;
  onAuditoriaClick?: (auditoria: AuditoriaProgramada) => void;
  onReschedule?: (auditoriaId: string, nuevasFechas: any) => void;
}

// Colores por estado
const COLORES_ESTADO = {
  'Programada': 'bg-blue-500',
  'En Ejecución': 'bg-yellow-500',
  'Completada': 'bg-green-500',
  'Cancelada': 'bg-gray-400',
};

// Colores por etapa
const COLORES_ETAPA = {
  planeacion: 'bg-purple-500',
  ejecucion: 'bg-blue-600',
  comunicacion: 'bg-green-600',
};

// Colores por nivel de riesgo
const COLORES_RIESGO: Record<ClasificacionRiesgo, string> = {
  'CRÍTICO': 'border-red-600',
  'ALTO': 'border-orange-500',
  'MEDIO': 'border-yellow-500',
  'BAJO': 'border-green-500',
};

export function GanttChartView({ 
  auditorias, 
  añoFiscal, 
  onAuditoriaClick,
  onReschedule 
}: GanttChartViewProps) {
  const [vista, setVista] = useState<VistaGantt>('trimestral');
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [etapaMostrada, setEtapaMostrada] = useState<EtapaMostrada>('todas');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('todas');
  const [filtroRiesgo, setFiltroRiesgo] = useState<ClasificacionRiesgo | 'todos'>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Calcular columnas según la vista
  const columnas = useMemo(() => {
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    if (vista === 'anual') {
      return meses;
    } else if (vista === 'trimestral') {
      const inicio = Math.floor(mesActual / 3) * 3;
      return meses.slice(inicio, inicio + 3);
    } else {
      return [meses[mesActual]];
    }
  }, [vista, mesActual]);

  // Filtrar auditorías
  const auditoriasFiltradas = useMemo(() => {
    return auditorias.filter(a => {
      if (filtroTerritorial !== 'todas' && a.territorial !== filtroTerritorial) {
        return false;
      }
      if (filtroRiesgo !== 'todos' && a.nivelRiesgo !== filtroRiesgo) {
        return false;
      }
      return true;
    });
  }, [auditorias, filtroTerritorial, filtroRiesgo]);

  // Obtener territoriales únicos
  const territoriales = useMemo(() => {
    const unique = new Set(auditorias.map(a => a.territorial).filter(Boolean));
    return Array.from(unique);
  }, [auditorias]);

  // Calcular posición y ancho de barra en el timeline
  const calcularPosicionBarra = (fechaInicio: string, fechaFin: string) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    let primerDiaVista: Date;
    let ultimoDiaVista: Date;

    if (vista === 'anual') {
      primerDiaVista = new Date(añoFiscal, 0, 1);
      ultimoDiaVista = new Date(añoFiscal, 11, 31);
    } else if (vista === 'trimestral') {
      const inicioTrimestre = Math.floor(mesActual / 3) * 3;
      primerDiaVista = new Date(añoFiscal, inicioTrimestre, 1);
      ultimoDiaVista = new Date(añoFiscal, inicioTrimestre + 3, 0);
    } else {
      primerDiaVista = new Date(añoFiscal, mesActual, 1);
      ultimoDiaVista = new Date(añoFiscal, mesActual + 1, 0);
    }

    const totalDias = Math.ceil((ultimoDiaVista.getTime() - primerDiaVista.getTime()) / (1000 * 60 * 60 * 24));
    const diasDesdeInicio = Math.max(0, Math.ceil((inicio.getTime() - primerDiaVista.getTime()) / (1000 * 60 * 60 * 24)));
    const duracionDias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    const left = (diasDesdeInicio / totalDias) * 100;
    const width = Math.min((duracionDias / totalDias) * 100, 100 - left);

    return { left: `${left}%`, width: `${width}%` };
  };

  // Navegar timeline
  const navegarMes = (direccion: 'anterior' | 'siguiente') => {
    if (vista === 'mensual') {
      setMesActual((prev) => {
        if (direccion === 'anterior') {
          return prev === 0 ? 11 : prev - 1;
        } else {
          return prev === 11 ? 0 : prev + 1;
        }
      });
    } else if (vista === 'trimestral') {
      setMesActual((prev) => {
        if (direccion === 'anterior') {
          return Math.max(0, prev - 3);
        } else {
          return Math.min(9, prev + 3);
        }
      });
    }
  };

  // Exportar como imagen
  const exportarImagen = async () => {
    const success = await exportGanttAsImage('gantt-chart', `programa-anual-${añoFiscal}-gantt.png`);
    if (success) {
      toast.success('Gantt Chart exportado como imagen');
    } else {
      toast.error('Error al exportar imagen');
    }
  };

  // Exportar como PDF
  const exportarPDF = async () => {
    const success = await exportGanttAsPDF('gantt-chart', `programa-anual-${añoFiscal}-gantt.pdf`);
    if (success) {
      toast.success('Gantt Chart exportado como PDF');
    } else {
      toast.error('Error al exportar PDF');
    }
  };

  // Exportar como Excel
  const exportarExcel = async () => {
    const success = await exportGanttAsExcel(auditoriasFiltradas, `programa-anual-${añoFiscal}-gantt.xlsx`);
    if (success) {
      toast.success('Datos exportados a Excel');
    } else {
      toast.error('Error al exportar Excel');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#003DA5]" />
          <h3 className="font-semibold">Vista Gantt - Programa Anual {añoFiscal}</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de vista */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setVista('mensual')}
              className={`px-3 py-1.5 text-sm ${
                vista === 'mensual' 
                  ? 'bg-[#003DA5] text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setVista('trimestral')}
              className={`px-3 py-1.5 text-sm border-x border-gray-300 ${
                vista === 'trimestral' 
                  ? 'bg-[#003DA5] text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Trimestral
            </button>
            <button
              onClick={() => setVista('anual')}
              className={`px-3 py-1.5 text-sm ${
                vista === 'anual' 
                  ? 'bg-[#003DA5] text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Anual
            </button>
          </div>

          {/* Navegación temporal */}
          {vista !== 'anual' && (
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navegarMes('anterior')}
                disabled={vista === 'trimestral' && mesActual === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2 text-sm font-medium min-w-[100px] text-center">
                {columnas.join(' - ')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navegarMes('siguiente')}
                disabled={vista === 'trimestral' && mesActual === 9}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Botón filtros */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={mostrarFiltros ? 'bg-gray-100' : ''}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtros
          </Button>

          {/* Botones exportar */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportarImagen}
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              Imagen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarPDF}
            >
              <FileDown className="w-4 h-4 mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarExcel}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro territorial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Territorial
              </label>
              <select
                value={filtroTerritorial}
                onChange={(e) => setFiltroTerritorial(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todas">Todas</option>
                {territoriales.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filtro nivel de riesgo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel de Riesgo
              </label>
              <select
                value={filtroRiesgo}
                onChange={(e) => setFiltroRiesgo(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="CRÍTICO">Crítico</option>
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Medio</option>
                <option value="BAJO">Bajo</option>
              </select>
            </div>

            {/* Filtro etapa mostrada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etapa
              </label>
              <select
                value={etapaMostrada}
                onChange={(e) => setEtapaMostrada(e.target.value as EtapaMostrada)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todas">Todas las etapas</option>
                <option value="planeacion">Solo Planeación</option>
                <option value="ejecucion">Solo Ejecución</option>
                <option value="comunicacion">Solo Comunicación</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {auditoriasFiltradas.length} de {auditorias.length} auditorías
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroTerritorial('todas');
                setFiltroRiesgo('todos');
                setEtapaMostrada('todas');
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-6 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Etapas:</span>
            <div className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${COLORES_ETAPA.planeacion}`} />
              <span>Planeación</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${COLORES_ETAPA.ejecucion}`} />
              <span>Ejecución</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${COLORES_ETAPA.comunicacion}`} />
              <span>Comunicación</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Riesgo:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-red-600 rounded" />
              <span>Crítico</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-orange-500 rounded" />
              <span>Alto</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-yellow-500 rounded" />
              <span>Medio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-green-500 rounded" />
              <span>Bajo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Gantt */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" id="gantt-chart">
        {/* Encabezado de meses */}
        <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: '250px 1fr' }}>
          <div className="p-3 border-r border-gray-200 font-semibold text-sm">
            Auditoría
          </div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${columnas.length}, 1fr)` }}>
            {columnas.map((mes, idx) => (
              <div
                key={idx}
                className={`p-3 text-center font-semibold text-sm ${
                  idx < columnas.length - 1 ? 'border-r border-gray-200' : ''
                }`}
              >
                {mes}
              </div>
            ))}
          </div>
        </div>

        {/* Filas de auditorías */}
        <div className="max-h-[600px] overflow-y-auto">
          {auditoriasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay auditorías para mostrar con los filtros seleccionados
            </div>
          ) : (
            auditoriasFiltradas.map((auditoria, idx) => (
              <AuditoriaGanttRow
                key={auditoria.id}
                auditoria={auditoria}
                isEven={idx % 2 === 0}
                etapaMostrada={etapaMostrada}
                onClick={() => onAuditoriaClick?.(auditoria)}
                calcularPosicion={calcularPosicionBarra}
              />
            ))
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="text-xs text-gray-500 text-center">
        💡 Haz clic en una auditoría para ver más detalles
      </div>
    </div>
  );
}

// Componente fila individual del Gantt
interface AuditoriaGanttRowProps {
  auditoria: AuditoriaProgramada;
  isEven: boolean;
  etapaMostrada: EtapaMostrada;
  onClick: () => void;
  calcularPosicion: (inicio: string, fin: string) => { left: string; width: string };
}

function AuditoriaGanttRow({ 
  auditoria, 
  isEven, 
  etapaMostrada, 
  onClick,
  calcularPosicion 
}: AuditoriaGanttRowProps) {
  const mostrarEtapa = (etapa: 'planeacion' | 'ejecucion' | 'comunicacion') => {
    return etapaMostrada === 'todas' || etapaMostrada === etapa;
  };

  return (
    <div 
      className={`grid border-b border-gray-200 hover:bg-blue-50 transition-colors ${
        isEven ? 'bg-white' : 'bg-gray-50'
      }`}
      style={{ gridTemplateColumns: '250px 1fr' }}
    >
      {/* Columna de información */}
      <div className="p-3 border-r border-gray-200">
        <div 
          className="cursor-pointer"
          onClick={onClick}
        >
          <p className="font-medium text-sm line-clamp-1" title={auditoria.procesoAuditable}>
            {auditoria.procesoAuditable}
          </p>
          <p className="text-xs text-gray-500">
            {auditoria.codigo}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              auditoria.estado === 'Programada' ? 'bg-blue-100 text-blue-700' :
              auditoria.estado === 'En Ejecución' ? 'bg-yellow-100 text-yellow-700' :
              auditoria.estado === 'Completada' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {auditoria.estado}
            </span>
            {auditoria.territorial && (
              <span className="text-[10px] text-gray-500">
                {auditoria.territorial}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Columna de timeline */}
      <div className="p-3 relative" style={{ minHeight: '80px' }}>
        {/* Etapa de Planeación */}
        {mostrarEtapa('planeacion') && (
          <BarraEtapa
            etapa="planeacion"
            fechas={auditoria.fechas.planeacion}
            nivelRiesgo={auditoria.nivelRiesgo}
            calcularPosicion={calcularPosicion}
            top="5px"
          />
        )}

        {/* Etapa de Ejecución */}
        {mostrarEtapa('ejecucion') && (
          <BarraEtapa
            etapa="ejecucion"
            fechas={auditoria.fechas.ejecucion}
            nivelRiesgo={auditoria.nivelRiesgo}
            calcularPosicion={calcularPosicion}
            top="30px"
          />
        )}

        {/* Etapa de Comunicación */}
        {mostrarEtapa('comunicacion') && (
          <BarraEtapa
            etapa="comunicacion"
            fechas={auditoria.fechas.comunicacion}
            nivelRiesgo={auditoria.nivelRiesgo}
            calcularPosicion={calcularPosicion}
            top="55px"
          />
        )}
      </div>
    </div>
  );
}

// Componente barra de etapa
interface BarraEtapaProps {
  etapa: 'planeacion' | 'ejecucion' | 'comunicacion';
  fechas: { inicio: string; fin: string; duracionDias: number };
  nivelRiesgo: ClasificacionRiesgo;
  calcularPosicion: (inicio: string, fin: string) => { left: string; width: string };
  top: string;
}

function BarraEtapa({ etapa, fechas, nivelRiesgo, calcularPosicion, top }: BarraEtapaProps) {
  const posicion = calcularPosicion(fechas.inicio, fechas.fin);
  
  const etapaLabels = {
    planeacion: 'P',
    ejecucion: 'E',
    comunicacion: 'C',
  };

  return (
    <div
      className={`absolute h-5 rounded ${COLORES_ETAPA[etapa]} ${COLORES_RIESGO[nivelRiesgo]} border-2 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center text-[10px] text-white font-medium shadow-sm`}
      style={{
        left: posicion.left,
        width: posicion.width,
        top: top,
      }}
      title={`${etapa.toUpperCase()}: ${fechas.inicio} → ${fechas.fin} (${fechas.duracionDias} días)`}
    >
      <span className="opacity-90">{etapaLabels[etapa]}</span>
    </div>
  );
}