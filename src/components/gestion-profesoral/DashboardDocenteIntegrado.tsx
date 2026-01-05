/**
 * DASHBOARD DOCENTE - INTEGRADO CON PERSONAS
 * 
 * ✅ Versión 2.0 - Completamente integrada
 * ✅ Datos automáticos desde Personas
 * ✅ Hook usePTAConPersonas
 * 
 * Fecha: 2026-01-03
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  AlertCircle,
  TrendingUp,
  BookOpen,
  FlaskConical,
  Users,
  Briefcase,
  User,
  Building2,
  Calendar,
  Loader2
} from 'lucide-react';
import { usePTAConPersonas } from '../../hooks/usePTAConPersonas';
import { periodParametersService } from '../../services/periodParametersService';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface DashboardDocenteIntegradoProps {
  onCrearNuevoPTA?: () => void;
  onVerDetalle?: (ptaId: string) => void;
}

export function DashboardDocenteIntegrado({
  onCrearNuevoPTA,
  onVerDetalle
}: DashboardDocenteIntegradoProps) {
  const {
    usuarioActual,
    docenteInfo,
    esDocente,
    pta,
    estadisticas,
    inicializarNuevoPTA,
    isLoading
  } = usePTAConPersonas();

  const [vistaPeriodo, setVistaPeriodo] = useState<string>('actual');
  const parametroActivo = periodParametersService.getParametroActivo();

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  if (isLoading) {
    return <LoadingState />;
  }

  if (!esDocente || !docenteInfo) {
    return <ErrorState mensaje="No tienes permisos de docente" />;
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCrearPTA = async () => {
    if (onCrearNuevoPTA) {
      onCrearNuevoPTA();
    } else {
      // Crear PTA automáticamente
      const periodo = parametroActivo?.periodoAcademico || '2025-1';
      await inicializarNuevoPTA(periodo);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderDocente docenteInfo={docenteInfo} estadisticas={estadisticas} />

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Principal - PTAs */}
          <div className="lg:col-span-2">
            {/* Botón Crear Nuevo PTA */}
            <div className="mb-6">
              <button
                onClick={handleCrearPTA}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl px-6 py-4 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Crear Nuevo PTA</span>
              </button>
            </div>

            {/* PTA Actual */}
            {pta ? (
              <PTACard
                pta={pta}
                estadisticas={estadisticas}
                onVerDetalle={() => onVerDetalle?.(pta.id)}
              />
            ) : (
              <EstadoVacio onCrear={handleCrearPTA} />
            )}
          </div>

          {/* Panel Lateral */}
          <div className="space-y-6">
            {/* Información del Docente */}
            <InformacionDocente docenteInfo={docenteInfo} />

            {/* Estadísticas Rápidas */}
            <EstadisticasRapidas estadisticas={estadisticas} />

            {/* Ayuda */}
            <PanelAyuda />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function HeaderDocente({ docenteInfo, estadisticas }: any) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              ¡Hola, {docenteInfo.nombreCompleto.split(' ')[0]}!
            </h1>
            <p className="text-blue-100">
              Gestiona tu Plan de Trabajo Académico
            </p>
          </div>

          {/* Badge de Estado */}
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur rounded-xl px-6 py-3">
              <p className="text-sm text-blue-100">Estado del PTA Actual</p>
              <p className="text-2xl font-bold">
                {estadisticas.porcentajeCompletado.toFixed(0)}%
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${estadisticas.porcentajeCompletado}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PTACard({ pta, estadisticas, onVerDetalle }: any) {
  const getEstadoBadge = (estado: string) => {
    const badges = {
      'Borrador': { color: 'bg-gray-100 text-gray-700', icon: Clock },
      'En Concertación': { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
      'En Aprobación': { color: 'bg-blue-100 text-blue-700', icon: Clock },
      'Aprobado': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'En Firme': { color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
      'Rechazado': { color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    return badges[estado as keyof typeof badges] || badges['Borrador'];
  };

  const badge = getEstadoBadge(pta.estado);
  const Icon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Header del Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              PTA - {pta.periodo}
            </h3>
            <p className="text-sm text-gray-600">
              Creado el {new Date(pta.fechaCreacion).toLocaleDateString()}
            </p>
          </div>

          <div className={`${badge.color} px-4 py-2 rounded-full flex items-center gap-2`}>
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{pta.estado}</span>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progreso de Horas</span>
            <span className="text-sm font-semibold text-gray-900">
              {estadisticas.horasUtilizadas} / {estadisticas.horasProgramables} hrs
            </span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                estadisticas.porcentajeCompletado >= 100
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(estadisticas.porcentajeCompletado, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Distribución de Horas */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Distribución de Actividades</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ComponenteHoras
            nombre="Docencia"
            horas={0} // TODO: Calcular desde pta
            color="bg-blue-500"
            icon={BookOpen}
          />
          <ComponenteHoras
            nombre="Investigación"
            horas={0}
            color="bg-purple-500"
            icon={FlaskConical}
          />
          <ComponenteHoras
            nombre="Extensión"
            horas={0}
            color="bg-teal-500"
            icon={Users}
          />
          <ComponenteHoras
            nombre="Complementarias"
            horas={0}
            color="bg-orange-500"
            icon={Briefcase}
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
          {pta.estado === 'Borrador' && (
            <button
              onClick={onVerDetalle}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Continuar Editando
            </button>
          )}
          
          <button
            onClick={onVerDetalle}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Ver Detalle
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ComponenteHoras({ nombre, horas, color, icon: Icon }: any) {
  return (
    <div className="text-center">
      <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{horas}</p>
      <p className="text-xs text-gray-600">{nombre}</p>
    </div>
  );
}

function EstadoVacio({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        No tienes PTAs creados
      </h3>
      <p className="text-gray-600 mb-6">
        Crea tu primer Plan de Trabajo Académico para comenzar
      </p>
      <button
        onClick={onCrear}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Crear mi Primer PTA
      </button>
    </div>
  );
}

function InformacionDocente({ docenteInfo }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" />
        Mi Información
      </h3>

      <div className="space-y-3">
        <InfoField label="Documento" value={docenteInfo.documentNumber} />
        <InfoField label="Email" value={docenteInfo.email} />
        <InfoField label="Sede" value={docenteInfo.sedeVinculacion} />
        <InfoField label="Territorial" value={docenteInfo.territorial || 'Nacional'} />
        <InfoField label="Vinculación" value={docenteInfo.tipoVinculacion} />
        <InfoField label="Dedicación" value={docenteInfo.tipoDedicacion === 'TC' ? 'Tiempo Completo' : 'Medio Tiempo'} />
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function EstadisticasRapidas({ estadisticas }: any) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl p-6">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Estadísticas
      </h3>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-blue-100">Horas Programables</p>
          <p className="text-3xl font-bold">{estadisticas.horasProgramables}</p>
        </div>

        <div>
          <p className="text-sm text-blue-100">Horas Utilizadas</p>
          <p className="text-3xl font-bold">{estadisticas.horasUtilizadas}</p>
        </div>

        <div>
          <p className="text-sm text-blue-100">Horas Restantes</p>
          <p className="text-3xl font-bold">{estadisticas.horasRestantes}</p>
        </div>

        {estadisticas.cumpleRequisitos ? (
          <div className="bg-white/20 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">¡PTA Completo!</span>
          </div>
        ) : (
          <div className="bg-white/20 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">PTA Incompleto</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelAyuda() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        ¿Necesitas Ayuda?
      </h3>

      <p className="text-sm text-blue-700 mb-4">
        Consulta la guía completa para crear tu PTA o contacta a Talento Humano.
      </p>

      <div className="space-y-2">
        <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 underline">
          📘 Ver Guía del PTA
        </button>
        <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 underline">
          📧 Contactar Soporte
        </button>
        <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 underline">
          ❓ Preguntas Frecuentes
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Cargando Dashboard...
        </h2>
        <p className="text-gray-600">
          Obteniendo tus PTAs y estadísticas
        </p>
      </div>
    </div>
  );
}

function ErrorState({ mensaje }: { mensaje: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border-2 border-red-200 p-8 text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Error de Acceso
        </h2>
        <p className="text-gray-600">
          {mensaje}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTACIÓN
// ============================================================================

export default DashboardDocenteIntegrado;
