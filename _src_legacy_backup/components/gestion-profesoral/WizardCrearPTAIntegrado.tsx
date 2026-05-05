/**
 * WIZARD DE CREACIÓN DE PTA - INTEGRADO CON PERSONAS
 * 
 * ✅ Versión 2.0 - Completamente integrada con el módulo de Personas
 * ✅ Datos pre-cargados automáticamente
 * ✅ Hook simplificado usePTAConPersonas
 * 
 * Fecha: 2026-01-03
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { 
  User, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  Save
} from 'lucide-react';
import { usePTAConPersonas } from '../../hooks/usePTAConPersonas';
import { WizardCrearPTA } from './WizardCrearPTA';
import { periodParametersService } from '../../services/periodParametersService';

// ============================================================================
// COMPONENTE WRAPPER INTEGRADO
// ============================================================================

interface WizardCrearPTAIntegradoProps {
  onSalir?: () => void;
}

export function WizardCrearPTAIntegrado({ onSalir }: WizardCrearPTAIntegradoProps) {
  const {
    usuarioActual,
    docenteInfo,
    esDocente,
    puedeCrearPTA,
    inicializarNuevoPTA,
    guardarPTA,
    enviarAAprobacion,
    isLoading,
    estadisticas
  } = usePTAConPersonas();

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // ============================================================================
  // VALIDACIONES INICIALES
  // ============================================================================

  useEffect(() => {
    const validarAcceso = async () => {
      try {
        setCargandoInicial(true);

        // Verificar que sea docente
        if (!esDocente) {
          setErrorCarga('No tienes permisos de docente para crear un PTA');
          return;
        }

        // Verificar que pueda crear PTA
        if (!puedeCrearPTA) {
          setErrorCarga('No puedes crear PTAs en este momento. Contacta a Talento Humano.');
          return;
        }

        // Verificar que haya información del docente
        if (!docenteInfo) {
          setErrorCarga('No se pudo cargar tu información. Intenta de nuevo más tarde.');
          return;
        }

        // Todo OK
        setErrorCarga(null);
      } catch (error: any) {
        setErrorCarga(error.message || 'Error al validar acceso');
      } finally {
        setCargandoInicial(false);
      }
    };

    if (usuarioActual) {
      validarAcceso();
    }
  }, [usuarioActual, esDocente, puedeCrearPTA, docenteInfo]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleGuardar = async (pta: any) => {
    try {
      await guardarPTA();
      toast.success('PTA guardado', {
        description: 'Tu borrador ha sido guardado correctamente'
      });
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.message || 'No se pudo guardar el PTA'
      });
    }
  };

  const handleEnviar = async (pta: any) => {
    try {
      const radicado = await enviarAAprobacion();
      toast.success('PTA enviado a aprobación', {
        description: `Radicado: ${radicado}`
      });
      
      // Regresar al dashboard después de 2 segundos
      setTimeout(() => {
        onSalir?.();
      }, 2000);
    } catch (error: any) {
      toast.error('Error al enviar', {
        description: error.message || 'No se pudo enviar el PTA'
      });
    }
  };

  const handleCancelar = () => {
    if (confirm('¿Estás seguro de cancelar? Perderás los cambios no guardados.')) {
      onSalir?.();
    }
  };

  // ============================================================================
  // ESTADOS DE CARGA Y ERROR
  // ============================================================================

  if (cargandoInicial || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Cargando información...
          </h2>
          <p className="text-gray-600">
            Obteniendo tus datos desde el módulo de Personas
          </p>
        </div>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border-2 border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Error de Acceso
            </h2>
            <p className="text-gray-600 mb-6">
              {errorCarga}
            </p>
            <button
              onClick={() => onSalir?.()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!docenteInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Información No Disponible
          </h2>
          <p className="text-gray-600">
            No se pudo cargar tu información de docente
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // BIENVENIDA (Primera Vez)
  // ============================================================================

  const mostrarBienvenida = !estadisticas.horasUtilizadas || estadisticas.horasUtilizadas === 0;

  if (mostrarBienvenida) {
    return <PantallaBienvenida docenteInfo={docenteInfo} onContinuar={() => {}} />;
  }

  // ============================================================================
  // WIZARD PRINCIPAL
  // ============================================================================

  // Convertir DocentePTA a DocenteInfo para el wizard
  const docenteInfoParaWizard = {
    cedula: docenteInfo.documentNumber,
    nombreCompleto: docenteInfo.nombreCompleto,
    perfilAcademico: docenteInfo.perfilAcademico,
    categoria: docenteInfo.categoria,
    sedeVinculacion: docenteInfo.sedeVinculacion,
    tipoVinculacion: docenteInfo.tipoVinculacion,
    tipoDedicacion: docenteInfo.tipoDedicacion,
    nucleoTematico: docenteInfo.nucleoTematico,
    horasProgramables: docenteInfo.horasProgramables
  };

  return (
    <WizardCrearPTA
      docenteInfo={docenteInfoParaWizard}
      onGuardar={handleGuardar}
      onEnviar={handleEnviar}
      onCancelar={handleCancelar}
    />
  );
}

// ============================================================================
// PANTALLA DE BIENVENIDA
// ============================================================================

interface PantallaBienvenidaProps {
  docenteInfo: any;
  onContinuar: () => void;
}

function PantallaBienvenida({ docenteInfo, onContinuar }: PantallaBienvenidaProps) {
  const parametroActivo = periodParametersService.getParametroActivo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">¡Bienvenido!</h1>
                <p className="text-blue-100 text-lg">
                  {docenteInfo.nombreCompleto}
                </p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8">
            {/* Información del Docente */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h2 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Tu información ha sido cargada automáticamente
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="Sede" value={docenteInfo.sedeVinculacion} />
                <InfoItem label="Territorial" value={docenteInfo.territorial || 'Nacional'} />
                <InfoItem label="Vinculación" value={docenteInfo.tipoVinculacion} />
                <InfoItem label="Dedicación" value={docenteInfo.tipoDedicacion === 'TC' ? 'Tiempo Completo' : 'Medio Tiempo'} />
                <InfoItem label="Perfil Académico" value={docenteInfo.perfilAcademico} />
                <InfoItem label="Horas Programables" value={`${docenteInfo.horasProgramables} horas`} />
              </div>
            </div>

            {/* Información del Período */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
              <h2 className="font-bold text-purple-900 mb-3">
                Período Académico
              </h2>
              <p className="text-purple-800 text-lg font-semibold mb-2">
                {parametroActivo?.periodoAcademico || '2025-1'}
              </p>
              <p className="text-sm text-purple-700">
                {parametroActivo?.tipoPeriodo === 'semestral' ? 'Semestral' : 'Anual'}
              </p>
            </div>

            {/* Instrucciones */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-gray-900 mb-3">
                ¿Qué haremos ahora?
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Registrar tus asignaturas de docencia</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Definir actividades de investigación</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Incluir extensión y actividades complementarias</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Revisar y enviar a aprobación</span>
                </li>
              </ul>
            </div>

            {/* Botón para continuar */}
            <button
              onClick={onContinuar}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
            >
              <span className="text-lg font-semibold">Comenzar a Crear mi PTA</span>
              <ArrowRight className="w-6 h-6" />
            </button>

            {/* Nota */}
            <p className="text-center text-sm text-gray-500 mt-4">
              El sistema guardará automáticamente tu progreso cada 30 segundos
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-blue-700 mb-1">{label}</p>
      <p className="font-semibold text-blue-900">{value}</p>
    </div>
  );
}

// ============================================================================
// EXPORTACIÓN
// ============================================================================

export default WizardCrearPTAIntegrado;
