/**
 * ============================================
 * WIZARD INICIO AUDITORÍA - WORLD CLASS
 * ============================================
 * 
 * Wizard de 5 pasos para inicio formal de auditorías
 * Usa ModalWorldClass como base
 * 
 * PASOS:
 * 0. Listas de Chequeo - Planeación - Verificación preliminar
 * 1. Auditoría Seleccionada - Revisión de datos
 * 2. Proceso Auditado - Detalles del área
 * 3. Equipo Auditor - Auditor líder y equipo
 * 4. Cronograma Estimado - Fechas y plazos
 * 
 * ÚLTIMA ACTUALIZACIÓN: 13 Febrero 2026 - INTEGRACIÓN LISTAS DE CHEQUEO
 */

import { useState } from 'react';
import { FileText, Users, Calendar, CheckCircle, ChevronRight, ChevronLeft, Target, Clock, Building2, MapPin, Shield, CheckSquare, AlertCircle } from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
// import { notificationsService } from '@/services/api/notificationsService';
import { notificationsService } from '../../services/api/notificationsService';

// ============ TIPOS ============

type PasoWizard = 0 | 1 | 2 | 3 | 4;

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  territorial: string;
  areaAuditable: string;
  procesoNombre: string;
  responsableArea: {
    nombre: string;
    cargo: string;
    email: string;
  };
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
  auditorLider: {
    nombre: string;
    cargo: string;
    email: string;
  };
  equipoAuditores: {
    nombre: string;
    cargo: string;
  }[];
  // Cronograma de 3 etapas
  fechaInicio: string; // Inicio Planeación
  fechaFinPlaneacion?: string;
  fechaInicioEjecucion?: string;
  fechaFinEjecucion?: string;
  fechaInicioComunicacion?: string;
  fechaFin: string; // Fin Comunicación
  // Campos adicionales
  objetivos?: any[];
  criterios?: any[];
  calificacionRiesgo?: string;
}

interface InicioAuditoriaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
  onIniciar: (auditoria: Auditoria) => void;
}

// ============ COMPONENTE PRINCIPAL ============

export function InicioAuditoriaWizardWorldClass({
  isOpen,
  onClose,
  auditoria,
  onIniciar
}: InicioAuditoriaWizardProps) {
  const [paso, setPaso] = useState<PasoWizard>(0);
  const [loading, setLoading] = useState(false);

  if (!auditoria) return null;

  // Badges dinámicos según paso
  const getBadges = () => {
    const badges = [
      { label: `Paso ${paso} de 4`, variant: 'info' as const }
    ];

    if (paso === 4) {
      badges.push({
        label: 'Listo para iniciar',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        variant: 'success' as const
      });
    }

    return badges;
  };

  // Handlers
  const handleSiguiente = () => {
    if (paso < 4) {
      setPaso((prev) => (prev + 1) as PasoWizard);
    }
  };

  const handleAnterior = () => {
    if (paso > 0) {
      setPaso((prev) => (prev - 1) as PasoWizard);
    }
  };

  const handleIniciar = async () => {
    setLoading(true);
    
    // Simular proceso de inicio
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onIniciar(auditoria);

    // 🚀 DISPARAR EVENTO AL BACKEND
    try {
      await notificationsService.triggerEvent('EVT-AUD-001', {
        auditoriaId: auditoria.id,
        auditoriaCodigo: auditoria.codigo,
        tituloCustom: 'Auditoría Iniciada',
        mensajeCustom: `La auditoría ${auditoria.codigo} ha sido formalmente iniciada.`,
        url_accion: `/control-interno/auditorias/${auditoria.id}`,
      });
    } catch (e) {
      console.error('Error disparando notificación:', e);
    }

    toast.success('Auditoría iniciada correctamente', {
      description: `${auditoria.codigo} - Se generaron todos los documentos oficiales`
    });
    
    setLoading(false);
    setPaso(0);
    onClose();
  };

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo="Iniciar Auditoría"
      codigo={auditoria.codigo}
      icono={<FileText className="w-6 h-6" />}
      badges={getBadges()}
      size="xl"
      closeOnOverlay={false}
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          {/* Indicador de pasos */}
          <div className="hidden md:flex items-center gap-2">
            {[0, 1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                  ${paso >= num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {paso > num ? <CheckCircle className="w-4 h-4" /> : num}
              </div>
            ))}
          </div>
          <div className="flex md:hidden flex-col items-center sm:items-start text-center sm:text-left">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
              Progreso
            </span>
            <span className="text-sm font-bold text-blue-600">
              Paso {paso + 1} de 5
            </span>
          </div>

          {/* Botones de navegación */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            {paso > 0 && (
              <button
                onClick={handleAnterior}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
            )}

            {paso < 4 ? (
              <button
                onClick={handleSiguiente}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleIniciar}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? 'Iniciando...' : 'Iniciar Auditoría'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Contenido según paso — altura flexible para móviles y fija en escritorios */}
      <div className="h-auto max-h-[50vh] md:h-[420px] overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          {paso === 0 && <Paso0ListasChequeo key="paso0" auditoria={auditoria} />}
          {paso === 1 && <Paso1AuditoriaSeleccionada key="paso1" auditoria={auditoria} />}
          {paso === 2 && <Paso2ProcesoAuditado key="paso2" auditoria={auditoria} />}
          {paso === 3 && <Paso3EquipoAuditor key="paso3" auditoria={auditoria} />}
          {paso === 4 && <Paso4Cronograma key="paso4" auditoria={auditoria} />}
        </AnimatePresence>
      </div>
    </ModalWorldClass>
  );
}

// ============ PASO 0: LISTAS DE CHEQUEO ============

function Paso0ListasChequeo({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          Listas de Chequeo
        </h3>
        <p className="text-sm text-gray-600">
          Verifique los elementos necesarios para la planeación y ejecución de la auditoría.
        </p>
      </div>

      {/* Listas de chequeo */}
      <div className="space-y-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-900">Documentos de Apoyo</h4>
          </div>
          <ul className="list-disc list-inside mt-2">
            <li>Oficio de Anuncio</li>
            <li>Cartas de Compromiso</li>
            <li>Programa Individual</li>
          </ul>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-purple-600" />
            <h4 className="text-sm font-medium text-gray-900">Recursos y Equipos</h4>
          </div>
          <ul className="list-disc list-inside mt-2">
            <li>Software de Auditoría</li>
            <li>Dispositivos de Medición</li>
            <li>Documentación Técnica</li>
          </ul>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-orange-600" />
            <h4 className="text-sm font-medium text-gray-900">Personal y Roles</h4>
          </div>
          <ul className="list-disc list-inside mt-2">
            <li>Auditor Líder</li>
            <li>Equipo de Auditoría</li>
            <li>Responsable del Área</li>
          </ul>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h4 className="text-sm font-medium text-gray-900">Riesgos y Controles</h4>
          </div>
          <ul className="list-disc list-inside mt-2">
            <li>Identificación de Riesgos</li>
            <li>Plan de Mitigación</li>
            <li>Controles Internos</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ============ PASO 1: AUDITORÍA SELECCIONADA ============

function Paso1AuditoriaSeleccionada({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Auditoría Seleccionada
        </h3>
        <p className="text-sm text-gray-600">
          Revise la información de la auditoría que está a punto de iniciar formalmente.
        </p>
      </div>

      {/* Banner principal */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Auditoría a Iniciar</p>
            <h4 className="text-lg text-gray-900 font-bold">{auditoria.codigo}</h4>
            <p className="text-sm text-gray-700 mt-1">{auditoria.titulo}</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium border border-green-200">
            Activo
          </span>
        </div>

        {/* Descripción */}
        <div className="bg-white/50 rounded-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {auditoria.descripcion}
          </p>
        </div>
      </div>

      {/* Información básica */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          icon={<MapPin className="w-5 h-5" />}
          label="Territorial"
          value={auditoria.territorial}
        />
        <InfoCard
          icon={<Building2 className="w-5 h-5" />}
          label="Área Auditable"
          value={auditoria.areaAuditable}
        />
      </div>
    </motion.div>
  );
}

// ============ PASO 2: PROCESO AUDITADO ============

function Paso2ProcesoAuditado({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Proceso Auditado
        </h3>
        <p className="text-sm text-gray-600">
          Información del área y responsable que será auditado.
        </p>
      </div>

      {/* Área auditada */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Área / Proceso</p>
            <h4 className="text-lg text-gray-900 font-bold">{auditoria.areaAuditable}</h4>
            <p className="text-sm text-gray-700 mt-1">{auditoria.procesoNombre}</p>
          </div>
        </div>
      </div>

      {/* Responsable del área */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Responsable del Área</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(auditoria.responsableAreaNombre || 'NA').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900">{auditoria.responsableAreaNombre || 'Sin asignar'}</h5>
              <p className="text-xs text-gray-600">{auditoria.responsableAreaCargo || 'Sin cargo'}</p>
              <p className="text-xs text-blue-600 mt-1">{auditoria.responsableAreaEmail || 'Sin email'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-900 font-medium mb-1">Importante</p>
            <p className="text-xs text-amber-800">
              Se enviará notificación automática al responsable del área informando sobre el inicio de la auditoría.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ PASO 3: EQUIPO AUDITOR ============

function Paso3EquipoAuditor({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Equipo Auditor
        </h3>
        <p className="text-sm text-gray-600">
          Auditor líder y equipo asignado a esta auditoría.
        </p>
      </div>

      {/* Auditor Líder */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Auditor Líder
        </h4>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-lg font-medium">
              {auditoria.auditorLider.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900">{auditoria.auditorLider.nombre}</h5>
              <p className="text-xs text-gray-600">{auditoria.auditorLider.cargo}</p>
              <p className="text-xs text-blue-600 mt-1">{auditoria.auditorLider.email}</p>
              <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                Responsable principal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Equipo Auditor */}
      {auditoria.equipoAuditores.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Equipo Auditor ({auditoria.equipoAuditores.length} miembros)
          </h4>
          <div className="space-y-3">
            {auditoria.equipoAuditores.map((auditor, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {auditor.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900">{auditor.nombre}</h5>
                    <p className="text-xs text-gray-600">{auditor.cargo}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============ PASO 4: CRONOGRAMA ============

// Función para parsear fecha en múltiples formatos (sin problemas de timezone)
function parsearFecha(fecha?: string): Date | null {
  if (!fecha || fecha === 'null' || fecha === 'undefined' || fecha === '') return null;
  
  // Limpiar la fecha de cualquier parte de tiempo
  const fechaLimpia = fecha.split('T')[0];
  
  // Intentar formato YYYY-MM-DD (ISO sin tiempo) - PRIMERO para evitar timezone issues
  if (fechaLimpia.includes('-')) {
    const partesISO = fechaLimpia.split('-');
    if (partesISO.length === 3) {
      const [anio, mes, dia] = partesISO.map(Number);
      if (anio > 1900 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
        // Crear fecha en timezone local (no UTC)
        const date = new Date(anio, mes - 1, dia, 12, 0, 0); // 12:00 para evitar problemas de día
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  // Intentar formato DD/MM/YYYY
  if (fechaLimpia.includes('/')) {
    const partes = fechaLimpia.split('/');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes.map(Number);
      if (anio > 1900 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
        const date = new Date(anio, mes - 1, dia, 12, 0, 0);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  return null;
}

// Función para calcular días entre fechas
function calcularDias(fechaInicio?: string, fechaFin?: string): number {
  const inicio = parsearFecha(fechaInicio);
  const fin = parsearFecha(fechaFin);
  if (!inicio || !fin) return 0;
  const diffTime = Math.abs(fin.getTime() - inicio.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Función para formatear fecha
function formatearFecha(fecha?: string): string {
  const date = parsearFecha(fecha);
  if (!date) return 'No definida';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Paso4Cronograma({ auditoria }: { auditoria: Auditoria }) {
  // Calcular días de cada fase
  const diasPlaneacion = calcularDias(auditoria.fechaInicio, auditoria.fechaFinPlaneacion);
  const diasEjecucion = calcularDias(auditoria.fechaInicioEjecucion, auditoria.fechaFinEjecucion);
  const diasComunicacion = calcularDias(auditoria.fechaInicioComunicacion, auditoria.fechaFin);
  const totalDias = calcularDias(auditoria.fechaInicio, auditoria.fechaFin);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Cronograma Estimado
        </h3>
        <p className="text-sm text-gray-600">
          Duración estimada de cada fase de la auditoría.
        </p>
      </div>

      {/* Fecha de inicio */}
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center text-white">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Fecha de Inicio</p>
            <h4 className="text-lg text-gray-900 font-bold">{formatearFecha(auditoria.fechaInicio)}</h4>
            <p className="text-sm text-gray-700">Duración total estimada: {totalDias} días</p>
          </div>
        </div>
      </div>

      {/* Fases con fechas reales */}
      <div className="space-y-3">
        <FaseCardConFechas
          numero={1}
          nombre="Planeación"
          fechaInicio={auditoria.fechaInicio}
          fechaFin={auditoria.fechaFinPlaneacion}
          dias={diasPlaneacion}
          color="blue"
        />
        <FaseCardConFechas
          numero={2}
          nombre="Ejecución"
          fechaInicio={auditoria.fechaInicioEjecucion}
          fechaFin={auditoria.fechaFinEjecucion}
          dias={diasEjecucion}
          color="purple"
        />
        <FaseCardConFechas
          numero={3}
          nombre="Comunicación"
          fechaInicio={auditoria.fechaInicioComunicacion}
          fechaFin={auditoria.fechaFin}
          dias={diasComunicacion}
          color="orange"
        />
      </div>

      {/* Nota final */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium mb-1">Todo listo para iniciar</p>
            <p className="text-xs text-blue-800">
              Al confirmar se generarán automáticamente los documentos oficiales (Oficio de Anuncio, Cartas de Compromiso, Programa Individual) y se notificará a todas las partes involucradas.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ COMPONENTES AUXILIARES ============

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-600 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm text-gray-900 font-medium">{value}</p>
    </div>
  );
}

function FaseCard({ numero, nombre, dias, color }: { numero: number; nombre: string; dias: number; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${color === 'blue' ? 'bg-blue-600 text-white' : color === 'purple' ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'}`}>
            {numero}
          </div>
          <div>
            <h5 className="text-sm font-medium">{nombre}</h5>
            <p className="text-xs opacity-80">Fase {numero}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-bold">{dias} días</span>
        </div>
      </div>
    </div>
  );
}

function FaseCardConFechas({ numero, nombre, fechaInicio, fechaFin, dias, color }: {
  numero: number;
  nombre: string;
  fechaInicio?: string;
  fechaFin?: string;
  dias: number;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${color === 'blue' ? 'bg-blue-600 text-white' : color === 'purple' ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'}`}>
            {numero}
          </div>
          <div>
            <h5 className="text-sm font-medium">{nombre}</h5>
            <p className="text-xs opacity-80">
              {formatearFecha(fechaInicio)} - {formatearFecha(fechaFin)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-bold">{dias > 0 ? `${dias} días` : 'Sin definir'}</span>
        </div>
      </div>
    </div>
  );
}