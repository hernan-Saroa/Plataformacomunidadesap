/**
 * VistaListaJuzgamiento - Vista de lista para Juzgamiento Disciplinario
 * ✅ Diseño idéntico a VistaListaDefensaJudicial
 * ✅ Tabla completa con ordenamiento y paginación
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, User, Clock, Calendar, Filter,
  Eye, MoreVertical, ChevronsUp, ChevronsDown, Gavel,
  Download, Paperclip, Send, MessageSquare, FileCheck, Edit, Search,
  AlertTriangle, Archive
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import type { ProcesoDisciplinario } from '../core/types';
import { ModalProcesoDisciplinario } from './ModalProcesoDisciplinario';
import { ModalAutos } from './ModalAutos';
import { ModalEvidencias } from './ModalEvidencias';
import { ModalOficios } from './ModalOficios';
import { ModalActas } from './ModalActas';

interface VistaListaProps {
  procesos: ProcesoDisciplinario[];
  isMobile: boolean;
  isTablet: boolean;
  readOnly?: boolean;
}

export function VistaListaJuzgamiento({ procesos, isMobile, isTablet, readOnly = false }: VistaListaProps) {
  const [ordenarPor, setOrdenarPor] = useState<'fecha' | 'dias' | 'etapa' | 'investigado'>('dias');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = isMobile ? 10 : 20;

  // Guard: si no hay procesos, mostrar estado vacío
  if (!procesos || !Array.isArray(procesos)) {
    return (
      <Card className="p-8 text-center">
        <Gavel className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No se pudieron cargar los procesos</p>
        <p className="text-sm text-gray-400 mt-1">Intente recargar la página</p>
      </Card>
    );
  }

  if (procesos.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Gavel className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No hay procesos disciplinarios registrados</p>
        <p className="text-sm text-gray-400 mt-1">Los procesos aparecerán aquí cuando se creen</p>
      </Card>
    );
  }

  // Función para cambiar orden
  const handleOrdenar = (campo: 'fecha' | 'dias' | 'etapa' | 'investigado') => {
    if (ordenarPor === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setDireccionOrden('asc');
    }
  };

  // Ordenar procesos
  // Helper to safely get time from a date field
  const safeGetTime = (d: any) => {
    if (!d) return 0;
    if (d instanceof Date) return d.getTime();
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const procesosOrdenados = [...procesos].sort((a, b) => {
    let comparacion = 0;
    
    switch (ordenarPor) {
      case 'fecha':
        comparacion = safeGetTime(a.fechaActualizacion) - safeGetTime(b.fechaActualizacion);
        break;
      case 'dias':
        comparacion = (a.diasRestantes || 0) - (b.diasRestantes || 0);
        break;
      case 'etapa':
        comparacion = (a.etapa || '').localeCompare(b.etapa || '');
        break;
      case 'investigado':
        comparacion = (a.investigado || '').localeCompare(b.investigado || '');
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
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 5) return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
    if (diasRestantes <= 15) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
    return { bg: '#D1FAE5', border: '#10B981', text: '#065F46' };
  };

  // Etapa helper
  const getEtapaConfig = (etapa: string) => {
    switch (etapa) {
      case 'E1_AVOCAMIENTO':
        return { label: 'Avocamiento', color: 'bg-orange-100 text-orange-700 border-orange-300' };
      case 'E2_DESCARGOS':
        return { label: 'Descargos', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
      case 'E3_PRUEBAS':
        return { label: 'Pruebas', color: 'bg-blue-100 text-blue-700 border-blue-300' };
      case 'E4_ALEGATOS':
        return { label: 'Alegatos', color: 'bg-green-100 text-green-700 border-green-300' };
      default:
        return { label: etapa, color: 'bg-gray-100 text-gray-700 border-gray-300' };
    }
  };

  // Tipo de falta helper
  const getTipoFaltaConfig = (tipo?: string) => {
    switch ((tipo || '').toUpperCase()) {
      case 'LEVE':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'GRAVE':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'GRAVÍSIMA':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Header de columna con ordenamiento
  const ColumnHeader = ({ 
    label, 
    campo, 
    className = '' 
  }: { 
    label: string; 
    campo: 'fecha' | 'dias' | 'etapa' | 'investigado'; 
    className?: string;
  }) => (
    <th className={`px-4 py-3 text-left ${className}`}>
      <button
        onClick={() => handleOrdenar(campo)}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors group"
      >
        <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600">
          {label}
        </span>
        {ordenarPor === campo && (
          direccionOrden === 'asc' 
            ? <ChevronsUp className="w-4 h-4 text-blue-600" />
            : <ChevronsDown className="w-4 h-4 text-blue-600" />
        )}
      </button>
    </th>
  );

  // Componente para fila con acciones
  const FilaProceso = ({ proceso }: { proceso: ProcesoDisciplinario }) => {
    const [modalProcesoOpen, setModalProcesoOpen] = useState(false);
    const [modalAutosOpen, setModalAutosOpen] = useState(false);
    const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
    const [modalOficiosOpen, setModalOficiosOpen] = useState(false);
    const [modalActasOpen, setModalActasOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const semaforo = getSemaforoColor(proceso.diasRestantes);
    const etapaConfig = getEtapaConfig(proceso.etapa);
    const faltaClass = getTipoFaltaConfig(proceso.tipoFalta);

    // Convertir para compatibilidad con modales
    const expedienteParaModales = {
      ...proceso,
      medioControl: proceso.tipoFalta,
      demandante: proceso.disciplinado,
      juzgado: 'Control Interno Disciplinario',
      etapa: proceso.etapa
    };

    return (
      <>
        <motion.tr
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hover:bg-gray-50 transition-colors"
        >
          {/* Proceso ID */}
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Gavel className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-bold text-gray-900">{proceso.id}</span>
            </div>
          </td>

          {/* Investigado */}
          <td className="px-4 py-3">
            <div>
              <p className="font-semibold text-gray-900">{proceso.investigado}</p>
              <p className="text-xs text-gray-500">{proceso.cargo}</p>
            </div>
          </td>

          {/* Etapa */}
          <td className="px-4 py-3">
            <Badge className={`${etapaConfig.color} border font-semibold`}>
              {etapaConfig.label}
            </Badge>
          </td>

          {/* Tipo de Falta */}
          <td className="px-4 py-3">
            <Badge className={`${faltaClass} border font-semibold`}>
              {proceso.tipoFalta || 'Sin clasificar'}
            </Badge>
          </td>

          {/* Término */}
          <td className="px-4 py-3">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2"
              style={{
                backgroundColor: semaforo.bg,
                borderColor: semaforo.border,
                color: semaforo.text
              }}
            >
              <Clock className="w-4 h-4" />
              <span className="font-bold text-sm">{proceso.diasRestantes}d</span>
            </div>
          </td>

          {/* Última Actuación */}
          <td className="px-4 py-3">
            <div className="max-w-xs">
              <p className="text-sm text-gray-900 truncate">
                {proceso.ultimaActuacion || 'Sin actuaciones'}
              </p>
              <p className="text-xs text-gray-500">
                {proceso.fechaUltimaActuacion ? (proceso.fechaUltimaActuacion instanceof Date ? proceso.fechaUltimaActuacion.toLocaleDateString('es-CO') : new Date(proceso.fechaUltimaActuacion).toLocaleDateString('es-CO')) : 'N/A'}
              </p>
            </div>
          </td>

          {/* Acciones */}
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1 relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setModalProcesoOpen(true)}
                title="Ver expediente"
              >
                <Archive className="w-4 h-4" />
              </Button>
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMenuOpen(!menuOpen)}
                  title="Más acciones"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
                {menuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[180px]">
                      <button
                        onClick={() => {
                          setModalAutosOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <Gavel className="w-4 h-4" />
                        Autos
                      </button>
                      <button
                        onClick={() => {
                          setModalEvidenciasOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <Paperclip className="w-4 h-4" />
                        Evidencias
                      </button>
                      <button
                        onClick={() => {
                          setModalOficiosOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <Send className="w-4 h-4" />
                        Oficios
                      </button>
                      <button
                        onClick={() => {
                          setModalActasOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <FileCheck className="w-4 h-4" />
                        Actas
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </td>
        </motion.tr>

        {/* Modales */}
        {modalProcesoOpen && (
          <ModalProcesoDisciplinario
            isOpen={modalProcesoOpen}
            onClose={() => setModalProcesoOpen(false)}
            proceso={proceso}
            readOnly={readOnly}
          />
        )}
        <ModalAutos
          isOpen={modalAutosOpen}
          onClose={() => setModalAutosOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalEvidencias
          isOpen={modalEvidenciasOpen}
          onClose={() => setModalEvidenciasOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalOficios
          isOpen={modalOficiosOpen}
          onClose={() => setModalOficiosOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalActas
          isOpen={modalActasOpen}
          onClose={() => setModalActasOpen(false)}
          expediente={expedienteParaModales as any}
        />
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tabla Desktop/Tablet */}
      {!isMobile && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <ColumnHeader label="PROCESO" campo="investigado" />
                  <ColumnHeader label="INVESTIGADO" campo="investigado" />
                  <ColumnHeader label="ETAPA" campo="etapa" />
                  <ColumnHeader label="TIPO FALTA" campo="etapa" />
                  <ColumnHeader label="TÉRMINO" campo="dias" />
                  <ColumnHeader label="ÚLTIMA ACT." campo="fecha" />
                  <th className="px-4 py-3 text-right">
                    <span className="text-xs font-bold text-gray-700">ACCIONES</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {procesosPaginados.map((proceso) => (
                  <FilaProceso key={proceso.id} proceso={proceso} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vista Mobile */}
      {isMobile && (
        <div className="space-y-3">
          {procesosPaginados.map((proceso) => {
            return <TarjetaProcesoMobile key={proceso.id} proceso={proceso} />;
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {indiceInicio + 1}-{Math.min(indiceFin, procesosOrdenados.length)} de {procesosOrdenados.length} procesos
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual(prev => prev - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPaginaActual(prev => prev + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Componente de tarjeta mobile con acciones
  function TarjetaProcesoMobile({ proceso }: { proceso: ProcesoDisciplinario }) {
    const [modalProcesoOpen, setModalProcesoOpen] = useState(false);
    const [modalAutosOpen, setModalAutosOpen] = useState(false);
    const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
    const [modalOficiosOpen, setModalOficiosOpen] = useState(false);
    const [modalActasOpen, setModalActasOpen] = useState(false);

    const semaforo = getSemaforoColor(proceso.diasRestantes);
    const etapaConfig = getEtapaConfig(proceso.etapa);
    const faltaClass = getTipoFaltaConfig(proceso.tipoFalta);

    // Convertir para compatibilidad con modales
    const expedienteParaModales = {
      ...proceso,
      medioControl: proceso.tipoFalta,
      demandante: proceso.disciplinado,
      juzgado: 'Control Interno Disciplinario',
      etapa: proceso.etapa
    };

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Gavel className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{proceso.id}</p>
                  <p className="text-xs text-gray-500">{proceso.cargo}</p>
                </div>
              </div>
              <div
                className="px-2 py-1 rounded-full border-2"
                style={{
                  backgroundColor: semaforo.bg,
                  borderColor: semaforo.border,
                  color: semaforo.text
                }}
              >
                <span className="text-xs font-bold">{proceso.diasRestantes}d</span>
              </div>
            </div>

            {/* Investigado */}
            <p className="font-semibold text-gray-900 mb-2">{proceso.investigado}</p>

            {/* Badges */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge className={`${etapaConfig.color} border text-xs`}>
                {etapaConfig.label}
              </Badge>
              <Badge className={`${faltaClass} border text-xs`}>
                {proceso.tipoFalta || 'Sin clasificar'}
              </Badge>
            </div>

            {/* Última Actuación */}
            <div className="bg-blue-50 rounded-lg p-2 mb-3">
              <p className="text-xs text-blue-900 font-medium line-clamp-1">
                {proceso.ultimaActuacion}
              </p>
            </div>

            {/* Acciones */}
            <div className="space-y-1 pt-2 border-t">
              <Button
                onClick={() => setModalProcesoOpen(true)}
                size="sm"
                className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Archive className="w-3 h-3 mr-1" />
                Expediente
              </Button>

              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => setModalAutosOpen(true)}
                  size="sm"
                  variant="outline"
                  className="text-[10px] py-1 px-1 justify-start"
                >
                  <Gavel className="w-2.5 h-2.5 mr-0.5" />
                  Autos
                </Button>
                <Button
                  onClick={() => setModalEvidenciasOpen(true)}
                  size="sm"
                  variant="outline"
                  className="text-[10px] py-1 px-1 justify-start"
                >
                  <Paperclip className="w-2.5 h-2.5 mr-0.5" />
                  Evidencias
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => setModalOficiosOpen(true)}
                  size="sm"
                  variant="outline"
                  className="text-[10px] py-1 px-1 justify-start"
                >
                  <Send className="w-2.5 h-2.5 mr-0.5" />
                  Oficios
                </Button>
                <Button
                  onClick={() => setModalActasOpen(true)}
                  size="sm"
                  variant="outline"
                  className="text-[10px] py-1 px-1 justify-start"
                >
                  <FileCheck className="w-2.5 h-2.5 mr-0.5" />
                  Actas
                </Button>
              </div>

            </div>
          </Card>
        </motion.div>

        {/* Modales */}
        {modalProcesoOpen && (
          <ModalProcesoDisciplinario
            isOpen={modalProcesoOpen}
            onClose={() => setModalProcesoOpen(false)}
            proceso={proceso}
            readOnly={readOnly}
          />
        )}
        <ModalAutos
          isOpen={modalAutosOpen}
          onClose={() => setModalAutosOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalEvidencias
          isOpen={modalEvidenciasOpen}
          onClose={() => setModalEvidenciasOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalOficios
          isOpen={modalOficiosOpen}
          onClose={() => setModalOficiosOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalActas
          isOpen={modalActasOpen}
          onClose={() => setModalActasOpen(false)}
          expediente={expedienteParaModales as any}
        />
      </>
    );
  }
}
