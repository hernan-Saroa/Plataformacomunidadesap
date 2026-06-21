/**
 * ═════════════════════════════════════════════════════════════════════════
 * TABLERO KANBAN OCI - PANTALLA PRINCIPAL
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Vista principal de gestión de auditorías con drag & drop
 * Basado en especificaciones de PROMPT_FIGMA_OCI_COMPLETO.md
 * 
 * Columnas: Backlog → Planeación → Ejecución → Comunicación → Cerrado
 * 
 * @version 2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, LayoutGrid, List, Download, FileText, Loader2 } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { type AuditoriaCardData } from './AuditoriaCard';
import { type EstadoKanban } from '../utils/esapThemeOCI';
import { ESAP_CLASSES } from '../utils/esapThemeOCI';
import { toast } from 'sonner';
import { useConfiguracionKanban } from '../services/useConfiguracionKanban';
import { notificationsService } from '../../services/api/notificationsService';
import { controlInternoService } from '../services/api/controlInternoService';

// ═════════════════════════════════════════════════════════════════════════
// DATOS DE EJEMPLO
// ═════════════════════════════════════════════════════════════════════════

const AUDITORIAS_EJEMPLO: AuditoriaCardData[] = [
  {
    id: 'aud-001',
    codigo: 'AUD-2025-001',
    nombre: 'Auditoría de Gestión Administrativa',
    tipo: 'SEDE',
    responsable: {
      nombre: 'Fernando Ávila',
      cargo: 'Auditor Líder',
    },
    fechaInicio: '2025-02-01',
    fechaFin: '2025-03-15',
    progreso: 0,
    equipoCount: 2,
    estado: 'backlog',
  },
  {
    id: 'aud-004',
    codigo: 'AUD-2025-004',
    nombre: 'Auditoría de Talento Humano',
    tipo: 'SEDE',
    responsable: {
      nombre: 'Laura Villa',
      cargo: 'Auditor Senior',
    },
    fechaInicio: '2025-02-05',
    fechaFin: '2025-02-28',
    progreso: 25,
    equipoCount: 3,
    estado: 'planeacion',
  },
  {
    id: 'aud-007',
    codigo: 'AUD-2025-007',
    nombre: 'Auditoría Gestión Financiera',
    tipo: 'SEDE',
    responsable: {
      nombre: 'Catalina Rubio',
      cargo: 'Auditor Líder',
    },
    fechaInicio: '2025-01-15',
    fechaFin: '2025-02-20',
    progreso: 65,
    equipoCount: 3,
    estado: 'ejecucion',
  },
  {
    id: 'aud-008',
    codigo: 'AUD-2025-008',
    nombre: 'Auditoría Territorial Meta',
    tipo: 'TERRITORIAL',
    responsable: {
      nombre: 'Wilson Alonso',
      cargo: 'Auditor Territorial',
    },
    fechaInicio: '2025-01-10',
    fechaFin: '2025-02-15',
    progreso: 35,
    equipoCount: 2,
    estado: 'ejecucion',
  },
  {
    id: 'aud-011',
    codigo: 'AUD-2024-011',
    nombre: 'Auditoría Gestión Administrativa Q4',
    tipo: 'SEDE',
    responsable: {
      nombre: 'Fernando Ávila',
      cargo: 'Auditor Líder',
    },
    fechaInicio: '2024-12-01',
    fechaFin: '2025-01-15',
    progreso: 95,
    equipoCount: 2,
    estado: 'comunicacion',
  },
];

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function TableroKanbanOCI() {
  const [auditorias, setAuditorias] = useState<AuditoriaCardData[]>(AUDITORIAS_EJEMPLO);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [vista, setVista] = useState<'kanban' | 'lista'>('kanban');
  
  // ✅ Cargar etapas dinámicamente del backend
  const { etapas, loading: loadingEtapas, cargarDatos } = useConfiguracionKanban();
  
  // Recargar etapas al montar el componente
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);
  
  // Filtrar y ordenar etapas visibles
  const etapasVisibles = useMemo(() => {
    return etapas
      .filter(etapa => etapa.visible !== false)
      .sort((a, b) => a.orden - b.orden);
  }, [etapas]);

  // Agrupar auditorías por estado dinámicamente
  const auditoriasPorEstado = useMemo(() => {
    let filtradas = auditorias;

    // Aplicar búsqueda
    if (busqueda) {
      const search = busqueda.toLowerCase();
      filtradas = filtradas.filter(
        (aud) =>
          aud.codigo.toLowerCase().includes(search) ||
          aud.nombre.toLowerCase().includes(search) ||
          aud.responsable.nombre.toLowerCase().includes(search)
      );
    }

    // Aplicar filtro de tipo
    if (filtroTipo !== 'todos') {
      filtradas = filtradas.filter((aud) => aud.tipo === filtroTipo);
    }

    // Agrupar por estado dinámicamente según etapas del backend
    const agrupacion: Record<string, AuditoriaCardData[]> = {};
    
    etapasVisibles.forEach(etapa => {
      // Normalizar el nombre de la etapa para matchear con el estado de las auditorías
      const estadoNormalizado = etapa.nombre.toLowerCase().replace(/\s+/g, '');
      agrupacion[etapa.nombre] = filtradas.filter(
        (aud) => aud.estado.toLowerCase().replace(/\s+/g, '') === estadoNormalizado
      );
    });
    
    return agrupacion;
  }, [auditorias, busqueda, filtroTipo, etapasVisibles]);

  // Handlers
  const handleNuevaAuditoria = () => {
    toast.info('Abrir formulario de nueva auditoría', {
      description: 'Modal de creación de auditoría',
      duration: 2000,
    });
    console.log('🆕 Nueva Auditoría');
  };

  const handleOpenAuditoria = (id: string) => {
    toast.info('Abrir detalle de auditoría', {
      description: `ID: ${id}`,
      duration: 2000,
    });
    console.log('📋 Abrir auditoría:', id);
  };

  const handleExportar = (formato: 'excel' | 'pdf') => {
    const fechaActual = new Date().toISOString().split('T')[0];
    const totalAuditorias = auditorias.length;
    
    toast.success(`Exportando a ${formato.toUpperCase()}`, {
      description: `${totalAuditorias} auditorías - ${fechaActual}`,
      duration: 3000,
    });
    console.log('📥 Exportar:', { formato, totalAuditorias });
  };

  const handleDrop = async (auditoriaId: string, nuevoEstado: EstadoKanban) => {
    // 1. Encontrar la auditoría antes de actualizar para tener sus datos
    const auditoriaMovida = auditorias.find(a => a.id === auditoriaId);
    
    setAuditorias((prev) =>
      prev.map((aud) =>
        aud.id === auditoriaId ? { ...aud, estado: nuevoEstado } : aud
      )
    );

    toast.success('Auditoría movida', {
      description: `Estado actualizado a: ${nuevoEstado}`,
      duration: 2000,
    });

    console.log('🔄 Auditoría movida:', { auditoriaId, nuevoEstado });

    // 🚀 DISPARAR EVENTO AL BACKEND (El backend resuelve destinatarios y canales)
    try {
      if (auditoriaMovida) {
        await notificationsService.triggerEvent('EVT-KANBAN-001', {
          auditoriaId: auditoriaId,
          auditoriaCodigo: auditoriaMovida.codigo,
          nuevoEstado: nuevoEstado,
          tituloCustom: 'Auditoría Movida',
          mensajeCustom: `La auditoría ${auditoriaMovida.codigo} ha sido movida a la etapa: ${nuevoEstado}.`,
          url_accion: `/control-interno/auditorias/${auditoriaId}`,
        });
        console.log(`✅ Evento KANBAN_MOVE disparado al backend.`);
      }
    } catch (err) {
      console.error('❌ Error al disparar evento al Shell:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-8 py-4">
          {/* Título */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={ESAP_CLASSES.text.h1}>Auditorías 2025</h1>
              <p className={ESAP_CLASSES.text.small}>
                Gestión del proceso de auditoría interna
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Dropdown Exportar */}
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Exportar
                </button>
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExportar('excel')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExportar('pdf')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Botón Nueva Auditoría */}
              <button
                onClick={handleNuevaAuditoria}
                className={`${ESAP_CLASSES.button.primary} flex items-center gap-2`}
              >
                <Plus className="w-5 h-5" />
                Nueva Auditoría
              </button>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div className="flex items-center gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Buscar por código, nombre o responsable..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2874A6] focus:border-transparent text-sm"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filtro Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2874A6] focus:border-transparent text-sm bg-white"
            >
              <option value="todos">Todos los tipos</option>
              <option value="SEDE">SEDE CENTRAL</option>
              <option value="TERRITORIAL">TERRITORIAL</option>
            </select>

            {/* Toggle Vista */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVista('kanban')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  vista === 'kanban'
                    ? 'bg-white text-[#1B4F72] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVista('lista')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  vista === 'lista'
                    ? 'bg-white text-[#1B4F72] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLERO KANBAN */}
      {vista === 'kanban' && (
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          {loadingEtapas ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#2874A6]" />
              <span className="ml-3 text-gray-600">Cargando etapas del tablero...</span>
            </div>
          ) : etapasVisibles.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No hay etapas configuradas en el tablero Kanban.</p>
              <p className="text-sm text-gray-500 mt-2">Configure las etapas desde el módulo de Configuración.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {etapasVisibles.map((etapa, index) => {
                const auditoriasetapa = auditoriasPorEstado[etapa.nombre] || [];
                const estadoNormalizado = etapa.nombre.toLowerCase().replace(/\s+/g, '') as EstadoKanban;
                
                return (
                  <KanbanColumn
                    key={etapa.id}
                    estado={estadoNormalizado}
                    titulo={etapa.nombre.toUpperCase()}
                    count={auditoriasetapa.length}
                    auditorias={auditoriasetapa}
                    onAgregarNueva={index === 0 ? handleNuevaAuditoria : undefined}
                    onOpenAuditoria={handleOpenAuditoria}
                    onDrop={handleDrop}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA LISTA (Placeholder) */}
      {vista === 'lista' && (
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <List className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Vista de Lista
            </h3>
            <p className="text-sm text-gray-600">
              Implementar tabla con todas las auditorías
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default TableroKanbanOCI;
