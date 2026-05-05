/**
 * MOD-10: RIESGOS
 * DISEÑO MATRIZ DE RIESGOS 2x2 PROFESIONAL + TABLA DETALLE
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import {
  AlertTriangle,
  Shield,
  Activity,
  CheckCircle2,
  Grid3x3,
  List,
  Plus,
  Search,
  Filter,
  XCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  Circle,
  Download,
  Archive
} from 'lucide-react';
import type { Riesgo, EtapaRiesgo } from '../core/types';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalNuevoRiesgo } from './ModalNuevoRiesgo';
import { ModalDetalleRiesgo } from './ModalDetalleRiesgo';
import { riesgosService, RiesgoAPI } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

type VistaModulo = 'matriz' | 'tabla' | 'archivados';

const ZONA_RIESGO_CONFIG = {
  EXTREMO: { color: '#DC2626', label: '🔴 Extremo', bg: '#FEE2E2', border: '#DC2626' },
  ALTO: { color: '#EA580C', label: '🟠 Alto', bg: '#FFEDD5', border: '#EA580C' },
  MODERADO: { color: '#F59E0B', label: '🟡 Moderado', bg: '#FEF3C7', border: '#F59E0B' },
  BAJO: { color: '#10B981', label: '🟢 Bajo', bg: '#D1FAE5', border: '#10B981' }
};

const TIPO_RIESGO_MAP: Record<string, string> = {
  GESTION: '📊 Gestión',
  CORRUPCION: '⚠️ Corrupción',
  SEGURIDAD_DIGITAL: '🔒 Seguridad Digital',
  FISCAL: '💰 Fiscal'
};

// Función para convertir RiesgoAPI a Riesgo (tipo local)
function apiToLocalRiesgo(api: RiesgoAPI): Riesgo {
  return {
    id: api.id, // UUID real para llamadas API
    codigo: api.codigo, // Código para mostrar en UI
    etapa: api.etapa as EtapaRiesgo,
    proceso: api.proceso,
    tipo: api.tipoRiesgo,
    tipoRiesgo: api.tipoRiesgo,
    nombre: api.nombre,
    descripcion: api.descripcion,
    moduloOrigen: api.moduloOrigen,
    procesoId: api.procesoId,
    procesoRadicado: api.procesoRadicado,
    causas: api.causas || [],
    consecuencias: api.consecuencias || [],
    probabilidadInherente: api.probabilidadInherente,
    impactoInherente: api.impactoInherente,
    zonaInherente: api.zonaInherente,
    probabilidadResidual: api.probabilidadResidual,
    impactoResidual: api.impactoResidual,
    zonaResidual: api.zonaResidual,
    controlesExistentes: api.controlesExistentes || [],
    planTratamiento: (api.planTratamiento || []).map(p => ({
      ...p,
      fechaLimite: new Date(p.fechaLimite),
      estado: p.estado as 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'
    })),
    responsable: api.responsable,
    documentos: [],
    timeline: [],
    fechaCreacion: new Date(api.createdAt),
    fechaActualizacion: new Date(api.updatedAt),
    estado: api.estado,
    // Nuevos campos de provisión
    cuantiaEstimada: api.cuantiaEstimada,
    provisionContable: api.provisionContable,
    porcentajeProvision: api.porcentajeProvision,
    fechaCalculoProvision: api.fechaCalculoProvision ? new Date(api.fechaCalculoProvision) : undefined
  };
}

export function Riesgos() {
  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();

  const [vistaActual, setVistaActual] = useState<VistaModulo>('matriz');
  const [busqueda, setBusqueda] = useState('');
  const [filtroZona, setFiltroZona] = useState<string>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Estado para lista de riesgos (solo API, sin mocks)
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [loading, setLoading] = useState(true);
  // ✅ Estado para items archivados (cargados desde API)
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([]);

  // ✅ Función para cargar riesgos archivados desde la API
  const fetchArchivados = async () => {
    try {
      const archivados = await riesgosService.getArchived();
      const items: ItemArchivado[] = archivados.map(r => ({
        id: r.id,
        codigo: r.codigo,
        nombre: `${r.nombre} - ${r.proceso}`,
        tipo: 'Riesgo',
        estado: (r.estado === 'ELIMINADO' ? 'ELIMINADO' : 'ARCHIVADO') as EstadoArchivado,
        fechaArchivado: new Date(r.updatedAt),
        usuarioArchivo: r.responsable || 'Sistema',
        motivoArchivo: r.motivoArchivo || `Riesgo ${r.estado === 'ELIMINADO' ? 'eliminado' : 'archivado'} desde el módulo de Gestión de Riesgos`,
        metadatos: {
          'Proceso': r.proceso,
          'Tipo Riesgo': r.tipoRiesgo,
          'Zona Residual': r.zonaResidual,
          'Responsable': r.responsable || 'Sin asignar'
        }
      }));
      setItemsArchivados(items);
    } catch (error) {
      console.log('Error cargando archivados:', error);
    }
  };

  // ✅ Función para archivar un riesgo
  const handleArchivarRiesgo = async (riesgo: Riesgo & { motivoArchivo?: string }) => {
    const toastId = toast.loading('Archivando riesgo...');
    try {
      await riesgosService.archivar(riesgo.id, riesgo.motivoArchivo);

      // Actualizar estado local: mover de activos a archivados
      setRiesgos(prev => prev.filter(r => r.id !== riesgo.id));

      // Recargar archivados
      await fetchArchivados();

      toast.success('Riesgo archivado exitosamente', {
        id: toastId,
        description: `${riesgo.codigo || riesgo.id} ha sido archivado`
      });
    } catch (error) {
      console.error('Error archivando riesgo:', error);
      toast.error('Error al archivar el riesgo', { id: toastId });
    }
  };

  // ✅ Función para restaurar un riesgo archivado
  const handleRestaurar = async (itemId: string) => {
    const toastId = toast.loading('Restaurando riesgo...');
    try {
      const restored = await riesgosService.restaurar(itemId);

      // Agregar a la lista de activos
      const riesgoRestaurado = apiToLocalRiesgo(restored);
      setRiesgos(prev => [riesgoRestaurado, ...prev]);

      // Remover de archivados
      setItemsArchivados(prev => prev.filter(item => item.id !== itemId));

      toast.success('Riesgo restaurado exitosamente', { id: toastId });
    } catch (error) {
      console.error('Error restaurando riesgo:', error);
      toast.error('Error al restaurar el riesgo', { id: toastId });
    }
  };

  // ✅ Función para eliminar permanentemente un riesgo
  const handleEliminarPermanente = async (itemId: string) => {
    const toastId = toast.loading('Eliminando riesgo permanentemente...');
    try {
      await riesgosService.eliminarPermanente(itemId);

      // Remover de archivados
      setItemsArchivados(prev => prev.filter(item => item.id !== itemId));

      toast.success('Riesgo eliminado permanentemente', { id: toastId });
    } catch (error) {
      console.error('Error eliminando riesgo:', error);
      toast.error('Error al eliminar el riesgo', { id: toastId });
    }
  };

  // Handlers
  const handleNuevoRiesgo = () => {
    setModalNuevoOpen(true);
  };

  // Estado para el modal de nuevo riesgo (también usado para edición)
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [riesgoEditando, setRiesgoEditando] = useState<Riesgo | null>(null);

  // Estado para el modal de detalle
  const [riesgoSeleccionado, setRiesgoSeleccionado] = useState<Riesgo | null>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);

  // Cargar riesgos del API al montar
  React.useEffect(() => {
    const fetchRiesgos = async () => {
      try {
        const data = await riesgosService.getAll();
        if (data && data.length > 0) {
          const riesgosConvertidos = data.map(apiToLocalRiesgo);
          setRiesgos(riesgosConvertidos);
        }
      } catch (error) {
        console.log('API de riesgos no disponible');
        toast.error('No se pudieron cargar los riesgos');
      } finally {
        setLoading(false);
      }
    };
    fetchRiesgos();
    fetchArchivados(); // También cargar archivados
  }, []);

  const riesgosFiltrados = useMemo(() => {
    let resultado = [...riesgos].filter(r => r.estado === 'ACTIVO');

    if (busqueda) {
      resultado = resultado.filter(r =>
        r.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.proceso.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroZona !== 'TODAS') {
      resultado = resultado.filter(r => r.zonaResidual === filtroZona);
    }

    if (filtroTipo !== 'TODOS') {
      resultado = resultado.filter(r => r.tipoRiesgo === filtroTipo);
    }

    return resultado;
  }, [riesgos, busqueda, filtroZona, filtroTipo]);

  // Métricas
  const totalRiesgos = riesgos.filter(r => r.estado === 'ACTIVO').length;
  const extremos = riesgos.filter(r => r.zonaResidual === 'EXTREMO').length;
  const altos = riesgos.filter(r => r.zonaResidual === 'ALTO').length;
  const moderados = riesgos.filter(r => r.zonaResidual === 'MODERADO').length;

  // Handler para agregar nuevo riesgo - LLAMA AL BACKEND
  const handleRiesgoCreado = async (formData: any) => {
    const toastId = toast.loading('Creando riesgo...');
    try {
      // Enviar al backend
      const created = await riesgosService.create(formData);

      // Convertir respuesta y agregar a la lista
      const nuevoRiesgo = apiToLocalRiesgo(created);
      setRiesgos(prev => [nuevoRiesgo, ...prev]);

      // Cerrar modal y notificar éxito
      setModalNuevoOpen(false);
      toast.success('Riesgo creado exitosamente', {
        id: toastId,
        description: `Código: ${created.codigo}`
      });
    } catch (error) {
      console.error('Error creando riesgo:', error);
      toast.error('Error al crear el riesgo', { id: toastId });
    }
  };

  // Handler para ver detalle de riesgo
  const handleVerDetalle = (riesgo: Riesgo) => {
    setRiesgoSeleccionado(riesgo);
    setModalDetalleOpen(true);
  };

  // Handler para iniciar edición de riesgo
  const handleEditarRiesgo = (riesgo: Riesgo) => {
    setRiesgoEditando(riesgo);
    setModalNuevoOpen(true);
  };

  // Handler para guardar riesgo actualizado
  const handleRiesgoActualizado = async (formData: any) => {
    if (!riesgoEditando) return;

    const toastId = toast.loading('Actualizando riesgo...');
    try {
      const updated = await riesgosService.update(riesgoEditando.id, formData);
      const riesgoActualizado = apiToLocalRiesgo(updated);

      // Actualizar en la lista local
      setRiesgos(prev => prev.map(r => r.id === riesgoActualizado.id ? riesgoActualizado : r));

      // Actualizar riesgo seleccionado si es el mismo que se está editando
      if (riesgoSeleccionado && riesgoSeleccionado.id === riesgoActualizado.id) {
        setRiesgoSeleccionado(riesgoActualizado);
      }

      setModalNuevoOpen(false);
      setRiesgoEditando(null);
      toast.success('Riesgo actualizado exitosamente', { id: toastId });
    } catch (error) {
      console.error('Error actualizando riesgo:', error);
      toast.error('Error al actualizar el riesgo', { id: toastId });
    }
  };

  // Handler para eliminar riesgo (soft-delete → va a archivados con estado ELIMINADO)
  const handleEliminarRiesgo = async (riesgo: Riesgo) => {
    const toastId = toast.loading('Eliminando riesgo...');
    try {
      await riesgosService.marcarEliminado(riesgo.id, 'Eliminado por el usuario');

      // Actualizar estado local: quitar de activos
      setRiesgos(prev => prev.filter(r => r.id !== riesgo.id));

      // Recargar archivados para que aparezca allí
      await fetchArchivados();

      toast.success('Riesgo eliminado', {
        id: toastId,
        description: `${riesgo.codigo || riesgo.id} ha sido eliminado. Puedes restaurarlo o eliminarlo permanentemente desde Archivados.`
      });
      setModalDetalleOpen(false);
    } catch (error) {
      console.error('Error eliminando riesgo:', error);
      toast.error('Error al eliminar el riesgo', { id: toastId });
    }
  };

  const addBtnsPermission = () => {
    const arrayBtns: any[] = [];
    if (authService.hasPermission(Permissions.GESTION_LEGAL_RIESGOS_CREATE)) {
      arrayBtns.push({
        label: 'Nuevo Riesgo',
        labelMobile: 'Nuevo',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setModalNuevoOpen(true),
        variant: 'primary'
      })
    }
    return arrayBtns
  };

  return (
    <div className="space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title="Matriz de Riesgos"
        subtitle="Gestión y seguimiento de riesgos institucionales"
        toggleView={{
          current: vistaActual,
          onChange: (view) => setVistaActual(view as VistaModulo),
          options: [
            { label: 'Matriz', icon: <Grid3x3 className="w-4 h-4" />, value: 'matriz' },
            { label: 'Tabla', icon: <List className="w-4 h-4" />, value: 'tabla' },
            { label: 'Archivados', icon: <Archive className="w-4 h-4" />, value: 'archivados' }
          ]
        }}
        buttons={addBtnsPermission()}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Gestión de Riesgos"
            variant="icon"
            sections={[
              {
                label: "🛡️ Propósito del Módulo",
                content: "Identificación, evaluación y seguimiento de riesgos institucionales que puedan afectar la gestión jurídica de ESAP. Permite priorizar controles y acciones preventivas mediante una matriz de probabilidad × impacto según metodología DAFP (Departamento Administrativo de la Función Pública).",
                type: "default"
              },
              {
                label: "📊 Matriz de Riesgos 5x5",
                content: "La matriz cruza PROBABILIDAD (Raro, Improbable, Posible, Probable, Casi Seguro) con IMPACTO (Insignificante, Menor, Moderado, Mayor, Catastrófico) para clasificar riesgos en 4 zonas: 🟢 Bajo, 🟡 Moderado, 🟠 Alto, 🔴 Extremo.",
                type: "premium"
              },
              {
                label: "🗂️ Tipos de Riesgos (4 Categorías)",
                content: "📊 GESTIÓN: Procesos, recursos, planeación | ⚠️ CORRUPCIÓN: Fraude, soborno, conflicto de interés | 🔒 SEGURIDAD DIGITAL: Ciberseguridad, pérdida de datos | 💰 FISCAL: Sanciones, multas, pérdidas económicas.",
                type: "info"
              },
              {
                label: "🚦 Zonas de Riesgo y Acciones",
                content: "🔴 EXTREMO (20-25): Acción inmediata obligatoria, escalamiento a Alta Dirección | 🟠 ALTO (12-19): Plan de tratamiento prioritario | 🟡 MODERADO (5-11): Monitoreo mensual, controles preventivos | 🟢 BAJO (1-4): Seguimiento trimestral.",
                type: "warning"
              },
              {
                label: "📋 Etapas del Ciclo de Gestión",
                content: "1️⃣ IDENTIFICADO: Riesgo detectado y documentado | 2️⃣ EVALUADO: Probabilidad e impacto cuantificados | 3️⃣ EN TRATAMIENTO: Controles implementándose | 4️⃣ MONITOREADO: Seguimiento activo de controles | 5️⃣ CERRADO: Riesgo mitigado o materializado.",
                type: "default"
              },
              {
                label: "🎯 Metodología DAFP",
                content: "Este módulo implementa la Guía de Administración del Riesgo del DAFP. Los riesgos se identifican por proceso, se evalúan con probabilidad × impacto, se diseñan controles y se monitorean trimestralmente. Requerido por el MECI (Modelo Estándar de Control Interno).",
                type: "success"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Los riesgos se vinculan con: • Planes de Mejoramiento (acciones correctivas) • Órganos de Control (hallazgos de auditorías) • Defensa Judicial (riesgos de procesos judiciales) • Juzgamiento (riesgos de conductas irregulares).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Vista 'Matriz': Visualiza distribución de riesgos por probabilidad e impacto → 2️⃣ Vista 'Tabla': Lista completa con filtros → 3️⃣ Filtra por zona (Extremo, Alto, etc.) o tipo → 4️⃣ Click 'Ver Detalle' para análisis completo y controles → 5️⃣ Actualiza probabilidades e impactos según cambios en contexto.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Los riesgos Extremos y Altos se escalan automáticamente al módulo 'Planes de Mejoramiento' para gestión de acciones correctivas. Los informes de riesgos se presentan trimestralmente al Comité de Riesgos y a Órganos de Control.",
                type: "info"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      {vistaActual !== 'archivados' && (
        <>
          <ModuleMetrics
        metrics={[
          {
            label: 'Riesgos Activos',
            value: totalRiesgos,
            icon: <Shield className="w-5 h-5 text-blue-600" />,
            color: 'blue'
          },
          {
            label: 'Extremos',
            value: extremos,
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            color: 'red'
          },
          {
            label: 'Altos',
            value: altos,
            icon: <Activity className="w-5 h-5 text-orange-600" />,
            color: 'orange'
          },
          {
            label: 'Moderados',
            value: moderados,
            icon: <CheckCircle2 className="w-5 h-5 text-yellow-600" />,
            color: 'yellow'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={(value: string) => setBusqueda(value)}
        searchPlaceholder="Buscar por ID, descripción, proceso..."
        filters={[
          {
            type: 'select',
            value: filtroZona,
            onChange: (value: string) => setFiltroZona(value),
            options: [
              { value: 'TODAS', label: 'Todas las zonas' },
              { value: 'EXTREMO', label: '🔴 Extremo' },
              { value: 'ALTO', label: '🟠 Alto' },
              { value: 'MODERADO', label: '🟡 Moderado' },
              { value: 'BAJO', label: '🟢 Bajo' }
            ],
            placeholder: 'Zona de Riesgo'
          },
          {
            type: 'select',
            value: filtroTipo,
            onChange: (value: string) => setFiltroTipo(value),
            options: [
              { value: 'TODOS', label: 'Todos los tipos' },
              { value: 'GESTION', label: '📊 Gestión' },
              { value: 'CORRUPCION', label: '⚠️ Corrupción' },
              { value: 'SEGURIDAD_DIGITAL', label: '🔒 Seguridad Digital' },
              { value: 'FISCAL', label: '💰 Fiscal' }
            ],
            placeholder: 'Tipo de Riesgo'
          }
        ]}
        filteredItems={riesgosFiltrados.length}
        totalItems={totalRiesgos}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroZona('TODAS');
          setFiltroTipo('TODOS');
        }}
      />
        </>
      )}

      {vistaActual === 'matriz' && (
        <MatrizRiesgos riesgos={riesgosFiltrados} onVerDetalle={handleVerDetalle} />
      )}
      {vistaActual === 'tabla' && (
        <TablaRiesgos riesgos={riesgosFiltrados} onVerDetalle={handleVerDetalle} />
      )}
      {vistaActual === 'archivados' && (
        <VistaArchivados
          moduloNombre="Gestión de Riesgos"
          items={itemsArchivados}
          onRestaurar={authService.hasPermission(Permissions.GESTION_LEGAL_RIESGOS_DELETE) ? handleRestaurar : undefined}
          onEliminarPermanente={authService.hasPermission(Permissions.GESTION_LEGAL_RIESGOS_DELETE) ? handleEliminarPermanente : undefined}
        />
      )}

      {/* Modal Nuevo/Editar Riesgo */}
      <ModalNuevoRiesgo
        open={modalNuevoOpen}
        onClose={() => {
          setModalNuevoOpen(false);
          setRiesgoEditando(null);
        }}
        onRiesgoCreado={riesgoEditando ? handleRiesgoActualizado : handleRiesgoCreado}
        riesgoEditar={riesgoEditando}
      />

      {/* Modal Detalle Riesgo */}
      <ModalDetalleRiesgo
        open={modalDetalleOpen}
        onClose={() => setModalDetalleOpen(false)}
        riesgo={riesgoSeleccionado}
        onEdit={handleEditarRiesgo}
        onDelete={handleEliminarRiesgo}
        onArchive={handleArchivarRiesgo}
      />


    </div>
  );
}

interface MatrizRiesgosProps {
  riesgos: Riesgo[];
  onVerDetalle: (riesgo: Riesgo) => void;
}

function MatrizRiesgos({ riesgos, onVerDetalle }: MatrizRiesgosProps) {
  // Matriz 5x5 (Probabilidad x Impacto)
  const probabilidades = ['Raro', 'Improbable', 'Posible', 'Probable', 'Casi Seguro'];
  const impactos = ['Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico'];

  // Mapeo de nivel de riesgo por celda (Probabilidad, Impacto)
  const getNivelRiesgo = (prob: number, imp: number): 'BAJO' | 'MODERADO' | 'ALTO' | 'EXTREMO' => {
    const valor = prob * imp;
    if (valor >= 20) return 'EXTREMO';
    if (valor >= 12) return 'ALTO';
    if (valor >= 5) return 'MODERADO';
    return 'BAJO';
  };

  return (
    <Card className="bg-white border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="font-bold text-lg" style={{ color: '#003DA5' }}>
          Matriz de Riesgos (Probabilidad × Impacto)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Distribución de riesgos según probabilidad e impacto
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Tabla de la matriz */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-50 text-xs font-bold text-gray-600 w-24">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Prob. / Imp.
                  </div>
                </th>
                {impactos.map((impacto, idx) => (
                  <th key={impacto} className="border border-gray-300 p-2 bg-gray-50 text-xs font-bold text-gray-600">
                    {impacto}
                    <div className="text-[10px] text-gray-400">({idx + 1})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {probabilidades.map((prob, probIdx) => (
                <tr key={prob}>
                  <td className="border border-gray-300 p-2 bg-gray-50 text-xs font-bold text-gray-600">
                    {prob}
                    <div className="text-[10px] text-gray-400">({5 - probIdx})</div>
                  </td>
                  {impactos.map((imp, impIdx) => {
                    const probValor = 5 - probIdx; // 5 arriba, 1 abajo
                    const impValor = impIdx + 1;    // 1 izq, 5 der
                    const nivelRiesgo = getNivelRiesgo(probValor, impValor);
                    const config = ZONA_RIESGO_CONFIG[nivelRiesgo];
                    // Filtrar riesgos que coincidan exactamente con esta celda
                    const riesgosEnCelda = riesgos.filter(r =>
                      (r.probabilidadInherente || 3) === probValor &&
                      (r.impactoInherente || 3) === impValor
                    );

                    return (
                      <td
                        key={`${prob}-${imp}`}
                        className="border border-gray-300 p-2 text-center relative"
                        style={{
                          backgroundColor: config.bg,
                          minHeight: '60px',
                          minWidth: '100px'
                        }}
                      >
                        {riesgosEnCelda.length > 0 && (
                          <div className="space-y-1">
                            <Badge
                              className="text-xs font-bold"
                              style={{
                                backgroundColor: config.color,
                                color: '#FFFFFF'
                              }}
                            >
                              {riesgosEnCelda.length} riesgo{riesgosEnCelda.length > 1 ? 's' : ''}
                            </Badge>
                            <div className="text-[10px] text-gray-600">
                              {riesgosEnCelda.slice(0, 2).map(r => (
                                <div key={r.id} className="truncate">{r.codigo || r.nombre || r.id}</div>
                              ))}
                              {riesgosEnCelda.length > 2 && (
                                <div>+{riesgosEnCelda.length - 2} más</div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
        {Object.entries(ZONA_RIESGO_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-xs font-semibold text-gray-700">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Lista de riesgos debajo de la matriz */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-bold text-sm text-gray-900 mb-3">
          Detalle de Riesgos ({riesgos.length} total)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {riesgos.map(riesgo => (
            <TarjetaRiesgoCompacta key={riesgo.id} riesgo={riesgo} onVerDetalle={onVerDetalle} />
          ))}
        </div>
      </div>
    </Card>
  );
}

interface TablaRiesgosProps {
  riesgos: Riesgo[];
  onVerDetalle: (riesgo: Riesgo) => void;
}

function TablaRiesgos({ riesgos, onVerDetalle }: TablaRiesgosProps) {
  return (
    <Card className="bg-white border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Código</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Descripción</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Proceso</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Nivel</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Etapa</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {riesgos.map((riesgo) => {
              const config = ZONA_RIESGO_CONFIG[riesgo.zonaInherente || 'BAJO'] || ZONA_RIESGO_CONFIG.BAJO;
              return (
                <tr key={riesgo.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{riesgo.codigo || riesgo.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{riesgo.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="line-clamp-2">{riesgo.descripcion}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{riesgo.proceso}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {TIPO_RIESGO_MAP[riesgo.tipoRiesgo || riesgo.tipo || 'GESTION'] || 'Gestión'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className="text-xs font-bold"
                      style={{
                        backgroundColor: config.color,
                        color: '#FFFFFF'
                      }}
                    >
                      {config.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{riesgo.etapa}</td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => onVerDetalle(riesgo)}
                      size="sm"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface TarjetaRiesgoCompactaProps {
  riesgo: Riesgo;
  onVerDetalle: (riesgo: Riesgo) => void;
}

function TarjetaRiesgoCompacta({ riesgo, onVerDetalle }: TarjetaRiesgoCompactaProps) {
  const config = ZONA_RIESGO_CONFIG[riesgo.zonaInherente || 'BAJO'] || ZONA_RIESGO_CONFIG.BAJO;
  const tipoLabel = TIPO_RIESGO_MAP[riesgo.tipoRiesgo || riesgo.tipo || 'GESTION'] || 'Gestión';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
      style={{ borderColor: config.border, borderWidth: '2px' }}
      onClick={() => onVerDetalle(riesgo)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h5 className="font-bold text-sm" style={{ color: '#003DA5' }}>
            {riesgo.codigo || riesgo.id}
          </h5>
          <p className="text-xs text-gray-800 font-medium line-clamp-1">{riesgo.nombre}</p>
          <p className="text-xs text-gray-600 line-clamp-2">{riesgo.descripcion}</p>
        </div>
        <Badge
          className="text-xs font-bold flex-shrink-0"
          style={{
            backgroundColor: config.color,
            color: '#FFFFFF'
          }}
        >
          {config.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Proceso:</span>
          <p className="font-semibold text-gray-900 truncate">{riesgo.proceso}</p>
        </div>
        <div>
          <span className="text-gray-500">Tipo:</span>
          <p className="font-semibold text-gray-900">{tipoLabel}</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-200">
        <Button
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onVerDetalle(riesgo); }}
          size="sm"
          className="w-full"
          style={{ background: '#003DA5', color: '#FFFFFF' }}
        >
          <Eye className="w-3 h-3 mr-1" />
          Ver Detalle
        </Button>
      </div>
    </motion.div>
  );
}
