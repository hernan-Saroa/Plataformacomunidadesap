/**
 * ============================================
 * KANBAN SIGL - ORQUESTADOR PRINCIPAL
 * ============================================
 * 
 * Componente principal que integra:
 * - Selector de módulo
 * - Tablero Kanban colaborativo
 * - Gestión de estado global
 */

import { useState, useEffect } from 'react';
import { SelectorModuloKanban } from './SelectorModuloKanban';
import { KanbanGestionLegal } from './KanbanGestionLegal';
import { ModuloDefensaJudicial } from './ModuloDefensaJudicial';
import { ToastProvider } from './design-system/ToastSIGL';
import { CASOS_MOCK, USUARIOS_MOCK } from './datosMockSIGL';
import { toast } from 'sonner';
import {
  Scale,
  Shield,
  FileQuestion,
  Gavel,
  DollarSign,
  Mail,
  MessageSquare,
  Target,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type EstadoCaso = 
  | 'inicial' 
  | 'en_revision' 
  | 'asignado' 
  | 'en_proceso' 
  | 'requiere_accion'
  | 'pendiente_aprobacion'
  | 'en_espera'
  | 'completado' 
  | 'archivado'
  | 'vencido';

interface ModuloConfig {
  id: string;
  nombre: string;
  color: string;
  icon: any;
}

// ============================================
// CONFIGURACIÓN
// ============================================

const MODULOS_CONFIG: Record<string, ModuloConfig> = {
  'mod-01': {
    id: 'mod-01',
    nombre: 'Defensa Judicial',
    color: '#003DA5',
    icon: Scale,
  },
  'mod-02': {
    id: 'mod-02',
    nombre: 'Órganos de Control',
    color: '#DC2626',
    icon: Shield,
  },
  'mod-03': {
    id: 'mod-03',
    nombre: 'Asesoría Jurídica',
    color: '#7C3AED',
    icon: FileQuestion,
  },
  'mod-04': {
    id: 'mod-04',
    nombre: 'Juzgamiento Disciplinario',
    color: '#EA580C',
    icon: Gavel,
  },
  'mod-05': {
    id: 'mod-05',
    nombre: 'Procesos Coactivos',
    color: '#059669',
    icon: DollarSign,
  },
  'mod-06': {
    id: 'mod-06',
    nombre: 'Buzón de Notificaciones',
    color: '#0891B2',
    icon: Mail,
  },
  'mod-07': {
    id: 'mod-07',
    nombre: 'Buzón Oficina Jurídica',
    color: '#0066CC',
    icon: MessageSquare,
  },
  'mod-08': {
    id: 'mod-08',
    nombre: 'Plan de Acción',
    color: '#8B5CF6',
    icon: Target,
  },
  'mod-09': {
    id: 'mod-09',
    nombre: 'Riesgos',
    color: '#DC2626',
    icon: AlertTriangle,
  },
  'mod-10': {
    id: 'mod-10',
    nombre: 'Planes de Mejoramiento',
    color: '#059669',
    icon: TrendingUp,
  },
  'mod-11': {
    id: 'mod-11',
    nombre: 'Términos para Informes',
    color: '#0066CC',
    icon: Calendar,
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function KanbanSIGL({ 
  onVolver,
  moduloInicial, // Nuevo prop para acceso directo
}: { 
  onVolver?: () => void;
  moduloInicial?: string; // Si viene desde sidebar, abre directo
}) {
  const [moduloSeleccionado, setModuloSeleccionado] = useState<string | null>(moduloInicial || null);
  const [casos, setCasos] = useState(CASOS_MOCK);
  const [vistaModuloCompleto, setVistaModuloCompleto] = useState(false); // Nueva: vista completa MOD-01

  // Actualizar el módulo seleccionado cuando cambie moduloInicial
  useEffect(() => {
    if (moduloInicial && moduloInicial !== moduloSeleccionado) {
      setModuloSeleccionado(moduloInicial);
      toast.success(`Módulo ${MODULOS_CONFIG[moduloInicial]?.nombre} cargado`, {
        description: 'Navegando al módulo seleccionado',
      });
    }
  }, [moduloInicial]);

  const handleSeleccionarModulo = (moduloId: string) => {
    setModuloSeleccionado(moduloId);
    toast.success(`Módulo ${MODULOS_CONFIG[moduloId]?.nombre} cargado`, {
      description: 'Puedes arrastrar casos entre columnas para cambiar su estado',
    });
  };

  const handleVolverSelector = () => {
    setModuloSeleccionado(null);
  };

  const handleActualizarCaso = (
    casoId: string,
    nuevoEstado: EstadoCaso,
    nuevoResponsable?: string
  ) => {
    setCasos((prev) =>
      prev.map((caso) => {
        if (caso.id !== casoId) return caso;

        const actualizado = { ...caso, estado: nuevoEstado };

        // Si se especificó un nuevo responsable, actualizar
        if (nuevoResponsable) {
          actualizado.asignadoA = nuevoResponsable;
        }

        return actualizado;
      })
    );

    // Mostrar notificación de éxito
    toast.success('Caso actualizado', {
      description: `Estado cambiado a ${nuevoEstado}`,
    });

    // En producción, aquí se haría la llamada al backend
    console.log('Caso actualizado:', { casoId, nuevoEstado, nuevoResponsable });
  };

  // Vista de Selector de Módulo (SOLO si no vino moduloInicial)
  if (!moduloSeleccionado) {
    return (
      <SelectorModuloKanban
        onSeleccionarModulo={handleSeleccionarModulo}
        onVolver={onVolver}
      />
    );
  }

  // ============================================
  // VISTA KANBAN (Default)
  // ============================================
  const moduloConfig = MODULOS_CONFIG[moduloSeleccionado];
  const casosDelModuloRaw = casos.filter((c) => c.moduloId === moduloSeleccionado);

  console.log('🔍 DEBUG KanbanSIGL:', {
    moduloSeleccionado,
    totalCasos: casos.length,
    casosDelModulo: casosDelModuloRaw.length,
    primeros3Casos: casosDelModuloRaw.slice(0, 3).map(c => ({ id: c.id, moduloId: c.moduloId, asunto: c.asunto }))
  });

  // Transformar casos al formato esperado por KanbanGestionLegal
  const casosDelModulo = casosDelModuloRaw.map((caso) => {
    // Responsable ya viene en el objeto del mock
    const responsable = caso.responsable;

    // Días restantes ya viene calculado en el mock
    const diasRestantes = caso.diasRestantes;

    return {
      id: caso.id,
      moduloId: caso.moduloId,
      moduloNombre: moduloConfig.nombre,
      radicado: caso.radicado,
      asunto: caso.asunto,
      estado: caso.estado,
      prioridad: caso.prioridad,
      responsable: responsable,
      colaboradores: caso.colaboradores || [],
      creador: caso.creador,
      fechaCreacion: caso.fechaCreacion,
      fechaVencimiento: caso.fechaVencimiento,
      diasRestantes: diasRestantes,
      progreso: caso.progreso || 0,
      proximaAccion: caso.proximaAccion,
      puedeActuar: caso.puedeActuar,
      requiereAtencion: caso.requiereAtencion,
      ultimaActividad: caso.ultimaActividad,
      descripcionCompleta: caso.descripcionCompleta,
      etiquetas: caso.etiquetas || [],
      comentarios: caso.comentarios,
      documentos: caso.documentos,
    };
  });

  return (
    <KanbanGestionLegal
      moduloId={moduloSeleccionado}
      moduloNombre={moduloConfig.nombre}
      moduloColor={moduloConfig.color}
      casos={casosDelModulo}
      onVolverSelector={handleVolverSelector}
      onActualizarCaso={handleActualizarCaso}
      // Prop adicional para MOD-01: botón para abrir vista completa
      onAbrirModuloCompleto={
        moduloSeleccionado === 'mod-01' 
          ? () => setVistaModuloCompleto(true)
          : undefined
      }
    />
  );
}