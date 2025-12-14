/**
 * MODAL DE IMPORTACIÓN - UNIVERSO → PROGRAMA ANUAL
 * Permite seleccionar procesos del Universo de Auditorías para crear
 * auditorías programadas en el Programa Anual del año fiscal
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Calendar,
  AlertCircle,
  MapPin,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  X,
  Import
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface ProcesoUniverso {
  id: string;
  codigo: string;
  nombre: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string;
  descripcion?: string;
  responsable?: string;
  yaEnPrograma?: boolean; // Para marcar si ya fue importado
}

interface AuditoriaPreview {
  proceso: ProcesoUniverso;
  codigo: string; // Código generado automáticamente
  fechaInicioSugerida: string;
  duraciones: {
    planeacion: number;
    ejecucion: number;
    comunicacion: number;
  };
  auditorSugerido?: string;
}

interface ModalImportarUniversoProps {
  isOpen: boolean;
  onClose: () => void;
  añoFiscal: number;
  procesosDisponibles: ProcesoUniverso[];
  onImportar: (auditorias: AuditoriaPreview[]) => void;
  ultimoCodigoGenerado?: number; // Para continuar numeración
}

// ============ CONSTANTES ============

const AUDITORES_DISPONIBLES = [
  'Mario Oswaldo Bernal Rodriguez',
  'Catalina Rubio',
  'Nubia Pimiento',
  'Sandra Montero',
  'Fernando Ávila',
  'William Ramírez',
  'Lucila Villamil',
  'Alexandra Triviño',
  'Natalia Cañon',
  'Flor Mireya Murcia'
];

const DURACIONES_DEFAULT = {
  sedesPrincipal: {
    planeacion: 15,
    ejecucion: 30,
    comunicacion: 15
  },
  territorial: {
    planeacion: 10,
    ejecucion: 4, // 4 días según requerimientos
    comunicacion: 10
  }
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalImportarUniverso({
  isOpen,
  onClose,
  añoFiscal,
  procesosDisponibles,
  onImportar,
  ultimoCodigoGenerado = 0
}: ModalImportarUniversoProps) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroSede, setFiltroSede] = useState<string>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [vistaPreview, setVistaPreview] = useState(false);
  const [fechaInicioProgramacion, setFechaInicioProgramacion] = useState<string>(
    `${añoFiscal}-01-15` // Por defecto: 15 de enero
  );

  // ============ FILTRADO ============

  const procesosFiltrados = useMemo(() => {
    return procesosDisponibles.filter(proceso => {
      // Busqueda
      if (busqueda) {
        const searchLower = busqueda.toLowerCase();
        if (
          !proceso.nombre.toLowerCase().includes(searchLower) &&
          !proceso.codigo.toLowerCase().includes(searchLower) &&
          !proceso.responsable?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Filtro riesgo
      if (filtroRiesgo !== 'todos' && proceso.nivelRiesgo !== filtroRiesgo) {
        return false;
      }

      // Filtro tipo
      if (filtroTipo !== 'todos' && proceso.tipoProceso !== filtroTipo) {
        return false;
      }

      // Filtro sede
      if (filtroSede !== 'todos') {
        if (filtroSede === 'principal' && proceso.tipoSede !== 'Sede Principal') {
          return false;
        }
        if (filtroSede === 'territorial' && proceso.tipoSede !== 'Territorial') {
          return false;
        }
      }

      return true;
    });
  }, [procesosDisponibles, busqueda, filtroRiesgo, filtroTipo, filtroSede]);

  // ============ GENERACIÓN DE PREVIEW ============

  const auditoriasPrevisualizadas = useMemo((): AuditoriaPreview[] => {
    const procesosSeleccionados = procesosDisponibles.filter(p => 
      seleccionados.has(p.id)
    );

    // Ordenar por prioridad: CRÍTICO > ALTO > MEDIO > BAJO
    const ordenPrioridad = { 'CRÍTICO': 0, 'ALTO': 1, 'MEDIO': 2, 'BAJO': 3 };
    procesosSeleccionados.sort((a, b) => 
      ordenPrioridad[a.nivelRiesgo] - ordenPrioridad[b.nivelRiesgo]
    );

    let fechaActual = new Date(fechaInicioProgramacion);
    let numeroConsecutivo = ultimoCodigoGenerado + 1;
    const previews: AuditoriaPreview[] = [];

    procesosSeleccionados.forEach((proceso, index) => {
      const duraciones = proceso.tipoSede === 'Territorial' 
        ? DURACIONES_DEFAULT.territorial 
        : DURACIONES_DEFAULT.sedesPrincipal;

      const codigo = `AUD-${añoFiscal}-${String(numeroConsecutivo).padStart(3, '0')}`;
      
      // Asignar auditor de forma rotativa
      const auditorSugerido = AUDITORES_DISPONIBLES[index % AUDITORES_DISPONIBLES.length];

      previews.push({
        proceso,
        codigo,
        fechaInicioSugerida: fechaActual.toISOString().split('T')[0],
        duraciones,
        auditorSugerido
      });

      // Calcular próxima fecha disponible (suma de todas las etapas + 5 días de buffer)
      const diasTotales = duraciones.planeacion + duraciones.ejecucion + duraciones.comunicacion + 5;
      fechaActual = new Date(fechaActual.getTime() + diasTotales * 24 * 60 * 60 * 1000);
      numeroConsecutivo++;
    });

    return previews;
  }, [seleccionados, procesosDisponibles, fechaInicioProgramacion, añoFiscal, ultimoCodigoGenerado]);

  // ============ HANDLERS ============

  const toggleSeleccion = (id: string) => {
    const nuevaSeleccion = new Set(seleccionados);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setSeleccionados(nuevaSeleccion);
  };

  const seleccionarTodos = () => {
    const disponibles = procesosFiltrados.filter(p => !p.yaEnPrograma);
    if (seleccionados.size === disponibles.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(disponibles.map(p => p.id)));
    }
  };

  const handleImportar = () => {
    if (auditoriasPrevisualizadas.length === 0) {
      toast.error('Debes seleccionar al menos un proceso');
      return;
    }

    onImportar(auditoriasPrevisualizadas);
    toast.success(`${auditoriasPrevisualizadas.length} auditorías importadas al programa`);
    
    // Reset
    setSeleccionados(new Set());
    setBusqueda('');
    setVistaPreview(false);
    onClose();
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroRiesgo('todos');
    setFiltroTipo('todos');
    setFiltroSede('todos');
  };

  // ============ ESTADÍSTICAS ============

  const stats = {
    total: procesosDisponibles.length,
    disponibles: procesosDisponibles.filter(p => !p.yaEnPrograma).length,
    yaEnPrograma: procesosDisponibles.filter(p => p.yaEnPrograma).length,
    seleccionados: seleccionados.size,
    criticos: procesosDisponibles.filter(p => seleccionados.has(p.id) && p.nivelRiesgo === 'CRÍTICO').length,
    altos: procesosDisponibles.filter(p => seleccionados.has(p.id) && p.nivelRiesgo === 'ALTO').length,
  };

  // ============ RENDER ============

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar desde Universo de Auditorías"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#003DA5]">{stats.disponibles}</p>
            <p className="text-xs text-gray-600">Disponibles</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.seleccionados}</p>
            <p className="text-xs text-gray-600">Seleccionados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.criticos}</p>
            <p className="text-xs text-gray-600">Críticos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.altos}</p>
            <p className="text-xs text-gray-600">Alto Riesgo</p>
          </div>
        </div>

        {/* Toggle Vista */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={!vistaPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVistaPreview(false)}
            >
              Seleccionar Procesos
            </Button>
            <Button
              variant={vistaPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVistaPreview(true)}
              disabled={seleccionados.size === 0}
            >
              Vista Previa ({seleccionados.size})
            </Button>
          </div>

          {!vistaPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filtros
              {mostrarFiltros ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          )}
        </div>

        {/* VISTA: SELECCIÓN DE PROCESOS */}
        {!vistaPreview && (
          <>
            {/* Barra de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proceso por nombre, código o responsable..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
              />
            </div>

            {/* Panel de filtros */}
            {mostrarFiltros && (
              <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nivel de Riesgo
                    </label>
                    <select
                      value={filtroRiesgo}
                      onChange={(e) => setFiltroRiesgo(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="todos">Todos</option>
                      <option value="CRÍTICO">Crítico</option>
                      <option value="ALTO">Alto</option>
                      <option value="MEDIO">Medio</option>
                      <option value="BAJO">Bajo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Proceso
                    </label>
                    <select
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="todos">Todos</option>
                      <option value="Misional">Misional</option>
                      <option value="Apoyo">Apoyo</option>
                      <option value="Estratégico">Estratégico</option>
                      <option value="Evaluación">Evaluación</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sede
                    </label>
                    <select
                      value={filtroSede}
                      onChange={(e) => setFiltroSede(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="todos">Todas</option>
                      <option value="principal">Sede Principal</option>
                      <option value="territorial">Territoriales</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Mostrando {procesosFiltrados.length} de {stats.total} procesos
                  </p>
                  <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            )}

            {/* Botón seleccionar todos */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <button
                onClick={seleccionarTodos}
                className="flex items-center gap-2 text-sm font-medium text-[#003DA5] hover:underline"
              >
                {seleccionados.size === procesosFiltrados.filter(p => !p.yaEnPrograma).length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {seleccionados.size === procesosFiltrados.filter(p => !p.yaEnPrograma).length 
                  ? 'Deseleccionar todos' 
                  : 'Seleccionar todos los disponibles'}
              </button>
              <span className="text-sm text-gray-600">
                {seleccionados.size} seleccionados
              </span>
            </div>

            {/* Lista de procesos */}
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              {procesosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No se encontraron procesos con los filtros seleccionados
                </div>
              ) : (
                procesosFiltrados.map(proceso => (
                  <ProcesoCard
                    key={proceso.id}
                    proceso={proceso}
                    isSeleccionado={seleccionados.has(proceso.id)}
                    onToggle={() => toggleSeleccion(proceso.id)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* VISTA: PREVIEW DE AUDITORÍAS */}
        {vistaPreview && (
          <>
            {/* Configuración de fechas */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Configuración de Programación
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de inicio de programación
                  </label>
                  <input
                    type="date"
                    value={fechaInicioProgramacion}
                    onChange={(e) => setFechaInicioProgramacion(e.target.value)}
                    min={`${añoFiscal}-01-01`}
                    max={`${añoFiscal}-12-31`}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Las auditorías se programarán secuencialmente desde esta fecha
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-medium">Orden de programación:</p>
                    <p className="text-xs">CRÍTICO → ALTO → MEDIO → BAJO</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de previews */}
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              {auditoriasPrevisualizadas.map((preview, index) => (
                <PreviewCard key={preview.proceso.id} preview={preview} index={index} />
              ))}
            </div>

            {/* Resumen */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Se crearán {auditoriasPrevisualizadas.length} auditorías en el Programa Anual {añoFiscal}
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Se asignarán códigos automáticamente</li>
                    <li>• Las fechas se calculan según tipo de sede</li>
                    <li>• Se sugiere un auditor líder para cada auditoría</li>
                    <li>• Podrás editar todos los detalles después de importar</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <div className="flex gap-2">
            {vistaPreview && (
              <Button
                variant="outline"
                onClick={() => setVistaPreview(false)}
              >
                Volver a Selección
              </Button>
            )}
            <Button
              onClick={vistaPreview ? handleImportar : () => setVistaPreview(true)}
              disabled={seleccionados.size === 0}
              className="gap-2"
              style={{ backgroundColor: '#003DA5' }}
            >
              <Import className="w-4 h-4" />
              {vistaPreview 
                ? `Importar ${seleccionados.size} Auditorías` 
                : `Continuar (${seleccionados.size})`}
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}

// ============ COMPONENTES AUXILIARES ============

interface ProcesoCardProps {
  proceso: ProcesoUniverso;
  isSeleccionado: boolean;
  onToggle: () => void;
}

function ProcesoCard({ proceso, isSeleccionado, onToggle }: ProcesoCardProps) {
  return (
    <div
      className={`p-4 border-b hover:bg-gray-50 transition-colors ${
        proceso.yaEnPrograma ? 'opacity-50 bg-gray-100' : 'cursor-pointer'
      } ${isSeleccionado ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
      onClick={() => !proceso.yaEnPrograma && onToggle()}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-1">
          {proceso.yaEnPrograma ? (
            <CheckSquare className="w-5 h-5 text-gray-400" />
          ) : isSeleccionado ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 line-clamp-1">
                {proceso.nombre}
              </h4>
              <p className="text-xs text-gray-500">{proceso.codigo}</p>
            </div>
            <Badge
              className={
                proceso.nivelRiesgo === 'CRÍTICO'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : proceso.nivelRiesgo === 'ALTO'
                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                  : proceso.nivelRiesgo === 'MEDIO'
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-green-100 text-green-800 border-green-200'
              }
            >
              {proceso.nivelRiesgo}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {proceso.tipoProceso}
            </span>
            <span className="flex items-center gap-1">
              {proceso.tipoSede === 'Territorial' ? (
                <>
                  <MapPin className="w-3 h-3" />
                  {proceso.territorial}
                </>
              ) : (
                <>
                  <Building2 className="w-3 h-3" />
                  Sede Principal
                </>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {proceso.añoPriorizacion}
            </span>
            {proceso.responsable && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {proceso.responsable}
              </span>
            )}
          </div>

          {proceso.yaEnPrograma && (
            <p className="text-xs text-gray-500 mt-2 italic">
              ✓ Ya incluido en el Programa Anual
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface PreviewCardProps {
  preview: AuditoriaPreview;
  index: number;
}

function PreviewCard({ preview, index }: PreviewCardProps) {
  const { proceso, codigo, fechaInicioSugerida, duraciones, auditorSugerido } = preview;

  // Calcular fechas de cada etapa
  const calcularFechas = () => {
    const inicioPlaneacion = new Date(fechaInicioSugerida);
    const finPlaneacion = new Date(inicioPlaneacion.getTime() + duraciones.planeacion * 24 * 60 * 60 * 1000);
    
    const inicioEjecucion = new Date(finPlaneacion.getTime() + 24 * 60 * 60 * 1000); // +1 día
    const finEjecucion = new Date(inicioEjecucion.getTime() + duraciones.ejecucion * 24 * 60 * 60 * 1000);
    
    const inicioComunicacion = new Date(finEjecucion.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 días
    const finComunicacion = new Date(inicioComunicacion.getTime() + duraciones.comunicacion * 24 * 60 * 60 * 1000);

    return {
      planeacion: `${inicioPlaneacion.toISOString().split('T')[0]} → ${finPlaneacion.toISOString().split('T')[0]}`,
      ejecucion: `${inicioEjecucion.toISOString().split('T')[0]} → ${finEjecucion.toISOString().split('T')[0]}`,
      comunicacion: `${inicioComunicacion.toISOString().split('T')[0]} → ${finComunicacion.toISOString().split('T')[0]}`
    };
  };

  const fechas = calcularFechas();

  return (
    <div className="p-4 border-b hover:bg-gray-50">
      <div className="flex items-start gap-3">
        {/* Número de orden */}
        <div className="w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-gray-900">{proceso.nombre}</h4>
              <p className="text-xs text-gray-500">
                Código generado: <span className="font-mono font-medium">{codigo}</span>
              </p>
            </div>
            <Badge
              className={
                proceso.nivelRiesgo === 'CRÍTICO'
                  ? 'bg-red-100 text-red-800'
                  : proceso.nivelRiesgo === 'ALTO'
                  ? 'bg-orange-100 text-orange-800'
                  : proceso.nivelRiesgo === 'MEDIO'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }
            >
              {proceso.nivelRiesgo}
            </Badge>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-purple-50 rounded border border-purple-200">
              <p className="font-medium text-purple-900 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                Planeación ({duraciones.planeacion} días)
              </p>
              <p className="text-purple-700 font-mono">{fechas.planeacion}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <p className="font-medium text-blue-900 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                Ejecución ({duraciones.ejecucion} días)
              </p>
              <p className="text-blue-700 font-mono">{fechas.ejecucion}</p>
            </div>
            <div className="p-2 bg-green-50 rounded border border-green-200">
              <p className="font-medium text-green-900 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                Comunicación ({duraciones.comunicacion} días)
              </p>
              <p className="text-green-700 font-mono">{fechas.comunicacion}</p>
            </div>
          </div>

          {/* Auditor sugerido */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-6 h-6 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-xs">
                {auditorSugerido?.charAt(0)}
              </div>
              <span className="text-xs">Auditor sugerido: <strong>{auditorSugerido}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
