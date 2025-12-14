/**
 * MÓDULO: FORMULARIO DE PLAN DE MEJORAMIENTO - PORTAL TRANSACCIONAL
 * 
 * Formulario completo basado en el formato EM-FO-002 utilizado por la Oficina de Control Interno.
 * Permite a las áreas auditadas formular planes de mejoramiento en respuesta a hallazgos.
 * 
 * FORMATO EM-FO-002 - CAMPOS:
 * 1. N° hallazgo
 * 2. Descripción del hallazgo
 * 3. Causas (análisis de causas raíz)
 * 4. Acción de mejora a realizar
 * 5. Soporte o evidencia
 * 6. Cantidad unidad de medida programada
 * 7. Fecha inicial
 * 8. Fecha fin
 * 9. Tiempo de ejecución (CALCULADO automáticamente en meses)
 * 10. Cargo Responsable
 * 
 * USUARIOS: Personal de áreas auditadas
 * ROL: Área Auditada
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  Target,
  Info,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';

// Tipos
interface Hallazgo {
  id: string;
  numero: string;
  descripcion: string;
  tipo: string;
  gravedad: string;
  auditoria: string;
}

interface AccionCorrectiva {
  id: string;
  hallazgoId: string;
  hallazgoNumero: string;
  hallazgoDescripcion: string;
  causas: string;
  accionMejora: string;
  soporteEvidencia: string;
  cantidadProgramada: number;
  fechaInicial: string;
  fechaFin: string;
  tiempoEjecucionMeses: number; // Calculado
  cargoResponsable: string;
  nombreResponsable: string;
  emailResponsable: string;
}

interface PlanMejoramiento {
  id: string;
  auditoria: string;
  codigoAuditoria: string;
  area: string;
  responsableArea: string;
  fechaCreacion: string;
  estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado';
  acciones: AccionCorrectiva[];
  observacionesGenerales: string;
}

export function FormularioPlanMejoramiento() {
  const [paso, setPaso] = useState(1); // 1: Selección hallazgos, 2: Formulación acciones, 3: Revisión
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Usuario actual
  const usuarioActual = {
    nombre: 'María Fernanda Rodríguez López',
    area: 'Gestión Contractual',
    cargo: 'Coordinadora de Contratación',
    email: 'maria.rodriguez@esap.edu.co'
  };

  // Mock data - Hallazgos disponibles para formular plan
  const hallazgosDisponibles: Hallazgo[] = [
    {
      id: 'HALL-001',
      numero: 'H-2024-032-01',
      descripcion: 'No se encontró evidencia de actas del comité de contratación para 5 contratos superiores a 100 SMMLV durante el período auditado (enero-junio 2024)',
      tipo: 'No conformidad',
      gravedad: 'Crítico',
      auditoria: 'Auditoría Gestión Contractual 2024'
    },
    {
      id: 'HALL-002',
      numero: 'H-2024-032-02',
      descripcion: 'Los expedientes contractuales no cuentan con el orden establecido en la Guía de Gestión Documental v3.0, específicamente falta numeración de folios',
      tipo: 'Observación',
      gravedad: 'Mayor',
      auditoria: 'Auditoría Gestión Contractual 2024'
    },
    {
      id: 'HALL-003',
      numero: 'H-2024-032-03',
      descripcion: 'No se evidencia seguimiento sistemático al cumplimiento de obligaciones contractuales en contratos de prestación de servicios',
      tipo: 'Observación',
      gravedad: 'Mayor',
      auditoria: 'Auditoría Gestión Contractual 2024'
    }
  ];

  // Estado del plan
  const [plan, setPlan] = useState<PlanMejoramiento>({
    id: `PM-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    auditoria: 'Auditoría Gestión Contractual 2024',
    codigoAuditoria: 'AUD-2024-032',
    area: usuarioActual.area,
    responsableArea: usuarioActual.nombre,
    fechaCreacion: new Date().toISOString().split('T')[0],
    estado: 'borrador',
    acciones: [],
    observacionesGenerales: ''
  });

  // Hallazgos seleccionados
  const [hallazgosSeleccionados, setHallazgosSeleccionados] = useState<string[]>([]);

  // Acción en edición
  const [accionActual, setAccionActual] = useState<AccionCorrectiva | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Calcular tiempo de ejecución en meses
  const calcularTiempoEjecucion = (fechaInicio: string, fechaFin: string): number => {
    if (!fechaInicio || !fechaFin) return 0;
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    const meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
    return Math.max(0, meses);
  };

  // Toggle selección de hallazgo
  const toggleHallazgo = (hallazgoId: string) => {
    setHallazgosSeleccionados(prev => {
      if (prev.includes(hallazgoId)) {
        return prev.filter(id => id !== hallazgoId);
      } else {
        return [...prev, hallazgoId];
      }
    });
  };

  // Iniciar formulación de acción para un hallazgo
  const iniciarAccion = (hallazgo: Hallazgo) => {
    setAccionActual({
      id: `ACC-${Date.now()}`,
      hallazgoId: hallazgo.id,
      hallazgoNumero: hallazgo.numero,
      hallazgoDescripcion: hallazgo.descripcion,
      causas: '',
      accionMejora: '',
      soporteEvidencia: '',
      cantidadProgramada: 1,
      fechaInicial: '',
      fechaFin: '',
      tiempoEjecucionMeses: 0,
      cargoResponsable: usuarioActual.cargo,
      nombreResponsable: usuarioActual.nombre,
      emailResponsable: usuarioActual.email
    });
    setModoEdicion(false);
  };

  // Editar acción existente
  const editarAccion = (accion: AccionCorrectiva) => {
    setAccionActual(accion);
    setModoEdicion(true);
  };

  // Guardar acción
  const guardarAccion = () => {
    if (!accionActual) return;

    // Validaciones
    if (!accionActual.causas.trim()) {
      toast.error('Campo requerido', { description: 'Debe describir las causas del hallazgo' });
      return;
    }
    if (!accionActual.accionMejora.trim()) {
      toast.error('Campo requerido', { description: 'Debe definir la acción de mejora' });
      return;
    }
    if (!accionActual.fechaInicial || !accionActual.fechaFin) {
      toast.error('Fechas requeridas', { description: 'Debe definir fecha inicial y final' });
      return;
    }
    if (new Date(accionActual.fechaFin) <= new Date(accionActual.fechaInicial)) {
      toast.error('Fechas inválidas', { description: 'La fecha final debe ser posterior a la inicial' });
      return;
    }

    if (modoEdicion) {
      // Actualizar acción existente
      setPlan(prev => ({
        ...prev,
        acciones: prev.acciones.map(a => a.id === accionActual.id ? accionActual : a)
      }));
      toast.success('Acción actualizada', { description: 'Los cambios se guardaron correctamente' });
    } else {
      // Agregar nueva acción
      setPlan(prev => ({
        ...prev,
        acciones: [...prev.acciones, accionActual]
      }));
      toast.success('Acción agregada', { description: 'La acción se agregó al plan' });
    }

    setAccionActual(null);
    setModoEdicion(false);
  };

  // Eliminar acción
  const eliminarAccion = (accionId: string) => {
    setPlan(prev => ({
      ...prev,
      acciones: prev.acciones.filter(a => a.id !== accionId)
    }));
    toast.info('Acción eliminada', { description: 'La acción se eliminó del plan' });
  };

  // Guardar borrador
  const guardarBorrador = () => {
    toast.loading('Guardando borrador...', { id: 'save-draft' });
    setTimeout(() => {
      toast.success('Borrador guardado', {
        id: 'save-draft',
        description: 'Puede continuar editando más tarde'
      });
    }, 1000);
  };

  // Enviar para aprobación
  const enviarParaAprobacion = () => {
    // Validaciones finales
    if (plan.acciones.length === 0) {
      toast.error('Plan incompleto', { description: 'Debe agregar al menos una acción correctiva' });
      return;
    }

    toast.loading('Enviando plan para aprobación...', { id: 'submit-plan' });
    setTimeout(() => {
      setPlan(prev => ({ ...prev, estado: 'enviado' }));
      toast.success('¡Plan enviado!', {
        id: 'submit-plan',
        description: 'El Jefe de Control Interno revisará su plan'
      });
      setIsConfirmOpen(false);
    }, 2000);
  };

  const getGravedadBadge = (gravedad: string) => {
    const estilos = {
      'Crítico': { bg: 'bg-red-100', text: 'text-red-800' },
      'Mayor': { bg: 'bg-orange-100', text: 'text-orange-800' },
      'Menor': { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    };
    const estilo = estilos[gravedad as keyof typeof estilos];
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 text-xs`}>
        {gravedad}
      </Badge>
    );
  };

  const hallazgosConAcciones = hallazgosDisponibles.filter(h => 
    plan.acciones.some(a => a.hallazgoId === h.id)
  );

  const hallazgosSinAcciones = hallazgosDisponibles.filter(h => 
    !plan.acciones.some(a => a.hallazgoId === h.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
                }}
              >
                <FileText className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Formulación de Plan de Mejoramiento
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Formato EM-FO-002 • {plan.auditoria}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {plan.estado === 'borrador' && (
              <>
                <Badge className="bg-gray-100 text-gray-800 border-0 px-3 py-1.5">
                  Borrador
                </Badge>
                <Button variant="outline" size="sm" onClick={guardarBorrador} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar Borrador
                </Button>
              </>
            )}
            {plan.estado === 'enviado' && (
              <Badge className="bg-blue-100 text-blue-800 border-0 px-3 py-1.5">
                En Revisión
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Indicador de progreso */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                paso === 1 ? 'bg-[#003DA5] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className={`text-sm ${paso === 1 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                Hallazgos
              </span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 mx-4" />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                paso === 2 ? 'bg-[#003DA5] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={`text-sm ${paso === 2 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                Acciones Correctivas
              </span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 mx-4" />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                paso === 3 ? 'bg-[#003DA5] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className={`text-sm ${paso === 3 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                Revisión y Envío
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* PASO 1: Selección de Hallazgos */}
      {paso === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Paso 1: Información de la Auditoría
              </h3>
              <p className="text-sm text-gray-600">
                Revise los hallazgos identificados en la auditoría
              </p>
            </div>

            {/* Información de la auditoría */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Auditoría</p>
                <p className="font-semibold text-gray-900">{plan.auditoria}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Código</p>
                <p className="font-semibold text-gray-900">{plan.codigoAuditoria}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Área</p>
                <p className="font-semibold text-gray-900">{plan.area}</p>
              </div>
            </div>

            {/* Lista de hallazgos */}
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Hallazgos Identificados ({hallazgosDisponibles.length})
              </h4>

              {hallazgosDisponibles.map((hallazgo) => (
                <Card 
                  key={hallazgo.id} 
                  className={`p-4 border-2 ${
                    plan.acciones.some(a => a.hallazgoId === hallazgo.id)
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-blue-300'
                  } transition-all`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{hallazgo.numero}</Badge>
                        <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                          {hallazgo.tipo}
                        </Badge>
                        {getGravedadBadge(hallazgo.gravedad)}
                        {plan.acciones.some(a => a.hallazgoId === hallazgo.id) && (
                          <Badge className="bg-green-100 text-green-800 border-0 text-xs flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Plan formulado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-900">{hallazgo.descripcion}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t">
              <p className="text-sm text-gray-600">
                Hallazgos disponibles: <strong>{hallazgosDisponibles.length}</strong>
              </p>
              <Button 
                onClick={() => setPaso(2)} 
                className="bg-[#003DA5] hover:bg-[#002873] gap-2"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* PASO 2: Formulación de Acciones Correctivas */}
      {paso === 2 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Paso 2: Formulación de Acciones Correctivas
              </h3>
              <p className="text-sm text-gray-600">
                Para cada hallazgo, defina las acciones de mejora según el formato EM-FO-002
              </p>
            </div>

            {/* Hallazgos sin acciones */}
            {hallazgosSinAcciones.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Hallazgos Pendientes ({hallazgosSinAcciones.length})
                </h4>
                <div className="space-y-3">
                  {hallazgosSinAcciones.map((hallazgo) => (
                    <Card key={hallazgo.id} className="p-4 border-l-4 border-l-orange-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{hallazgo.numero}</Badge>
                            {getGravedadBadge(hallazgo.gravedad)}
                          </div>
                          <p className="text-sm text-gray-900">{hallazgo.descripcion}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => iniciarAccion(hallazgo)}
                          className="bg-[#003DA5] hover:bg-[#002873] gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Formular Acción
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario de acción actual */}
            {accionActual && (
              <Card className="p-6 bg-blue-50 border-2 border-blue-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#003DA5]" />
                    {modoEdicion ? 'Editar Acción Correctiva' : 'Nueva Acción Correctiva'}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAccionActual(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Hallazgo asociado */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{accionActual.hallazgoNumero}</Badge>
                    <span className="text-xs text-gray-600">Hallazgo</span>
                  </div>
                  <p className="text-sm text-gray-900">{accionActual.hallazgoDescripcion}</p>
                </div>

                <div className="space-y-4">
                  {/* Campo 3: Causas */}
                  <div>
                    <Label htmlFor="causas" className="flex items-center gap-1">
                      Causas del Hallazgo *
                      <Info className="w-3 h-3 text-gray-400" />
                    </Label>
                    <Textarea
                      id="causas"
                      value={accionActual.causas}
                      onChange={(e) => setAccionActual({
                        ...accionActual,
                        causas: e.target.value
                      })}
                      placeholder="Ej: Falta de procedimiento documentado, desconocimiento de la normativa..."
                      className="mt-2 min-h-[100px]"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Describa las causas que originaron el hallazgo (análisis de causa raíz)
                    </p>
                  </div>

                  {/* Campo 4: Acción de mejora */}
                  <div>
                    <Label htmlFor="accionMejora" className="flex items-center gap-1">
                      Acción de Mejora a Realizar *
                      <Info className="w-3 h-3 text-gray-400" />
                    </Label>
                    <Textarea
                      id="accionMejora"
                      value={accionActual.accionMejora}
                      onChange={(e) => setAccionActual({
                        ...accionActual,
                        accionMejora: e.target.value
                      })}
                      placeholder="Ej: Crear y documentar procedimiento PR-CTL-001, socializar con el equipo..."
                      className="mt-2 min-h-[100px]"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Describa las acciones específicas que implementará para corregir el hallazgo
                    </p>
                  </div>

                  {/* Campo 5: Soporte o evidencia */}
                  <div>
                    <Label htmlFor="soporteEvidencia">
                      Soporte o Evidencia
                    </Label>
                    <Input
                      id="soporteEvidencia"
                      value={accionActual.soporteEvidencia}
                      onChange={(e) => setAccionActual({
                        ...accionActual,
                        soporteEvidencia: e.target.value
                      })}
                      placeholder="Ej: Procedimiento PR-CTL-001 v1.0, Acta de socialización"
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Tipo de evidencia que demostrará el cumplimiento de la acción
                    </p>
                  </div>

                  {/* Campo 6: Cantidad programada */}
                  <div>
                    <Label htmlFor="cantidadProgramada" className="flex items-center gap-1">
                      Cantidad de Veces Programada *
                      <Info className="w-3 h-3 text-gray-400" />
                    </Label>
                    <Input
                      id="cantidadProgramada"
                      type="number"
                      min="1"
                      value={accionActual.cantidadProgramada}
                      onChange={(e) => setAccionActual({
                        ...accionActual,
                        cantidadProgramada: parseInt(e.target.value) || 1
                      })}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Número de veces que planea ejecutar esta acción (ej: 4 = una vez por trimestre)
                    </p>
                  </div>

                  {/* Campos 7 y 8: Fechas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaInicial" className="flex items-center gap-1">
                        Fecha Inicial *
                        <Calendar className="w-3 h-3 text-gray-400" />
                      </Label>
                      <Input
                        id="fechaInicial"
                        type="date"
                        value={accionActual.fechaInicial}
                        onChange={(e) => {
                          const newAccion = {
                            ...accionActual,
                            fechaInicial: e.target.value,
                            tiempoEjecucionMeses: calcularTiempoEjecucion(e.target.value, accionActual.fechaFin)
                          };
                          setAccionActual(newAccion);
                        }}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="fechaFin" className="flex items-center gap-1">
                        Fecha Final *
                        <Calendar className="w-3 h-3 text-gray-400" />
                      </Label>
                      <Input
                        id="fechaFin"
                        type="date"
                        value={accionActual.fechaFin}
                        min={accionActual.fechaInicial}
                        onChange={(e) => {
                          const newAccion = {
                            ...accionActual,
                            fechaFin: e.target.value,
                            tiempoEjecucionMeses: calcularTiempoEjecucion(accionActual.fechaInicial, e.target.value)
                          };
                          setAccionActual(newAccion);
                        }}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Campo 9: Tiempo de ejecución (CALCULADO) */}
                  {accionActual.fechaInicial && accionActual.fechaFin && (
                    <div className="p-4 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Tiempo de Ejecución: {accionActual.tiempoEjecucionMeses} {accionActual.tiempoEjecucionMeses === 1 ? 'mes' : 'meses'}
                          </p>
                          <p className="text-xs text-gray-600">
                            Calculado automáticamente según las fechas definidas
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campo 10: Responsable */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cargoResponsable" className="flex items-center gap-1">
                        Cargo del Responsable *
                        <User className="w-3 h-3 text-gray-400" />
                      </Label>
                      <Input
                        id="cargoResponsable"
                        value={accionActual.cargoResponsable}
                        onChange={(e) => setAccionActual({
                          ...accionActual,
                          cargoResponsable: e.target.value
                        })}
                        placeholder="Ej: Coordinador de Contratación"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="nombreResponsable">
                        Nombre del Responsable *
                      </Label>
                      <Input
                        id="nombreResponsable"
                        value={accionActual.nombreResponsable}
                        onChange={(e) => setAccionActual({
                          ...accionActual,
                          nombreResponsable: e.target.value
                        })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setAccionActual(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={guardarAccion}
                    className="bg-[#003DA5] hover:bg-[#002873] gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {modoEdicion ? 'Actualizar Acción' : 'Guardar Acción'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Acciones ya formuladas */}
            {hallazgosConAcciones.length > 0 && !accionActual && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Acciones Formuladas ({plan.acciones.length})
                </h4>
                <div className="space-y-3">
                  {hallazgosConAcciones.map((hallazgo) => {
                    const accion = plan.acciones.find(a => a.hallazgoId === hallazgo.id);
                    if (!accion) return null;

                    return (
                      <Card key={hallazgo.id} className="p-4 border-l-4 border-l-green-500">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">{hallazgo.numero}</Badge>
                              {getGravedadBadge(hallazgo.gravedad)}
                              <Badge className="bg-green-100 text-green-800 border-0 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Acción definida
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{hallazgo.descripcion}</p>

                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Acción de mejora:</p>
                                <p className="text-sm text-gray-900">{accion.accionMejora}</p>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <p className="text-gray-600">Duración</p>
                                  <p className="font-semibold text-gray-900">
                                    {accion.tiempoEjecucionMeses} {accion.tiempoEjecucionMeses === 1 ? 'mes' : 'meses'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Responsable</p>
                                  <p className="font-semibold text-gray-900">{accion.nombreResponsable}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Cantidad programada</p>
                                  <p className="font-semibold text-gray-900">{accion.cantidadProgramada} veces</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editarAccion(accion)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => eliminarAccion(accion.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t mt-6">
              <Button 
                variant="outline"
                onClick={() => setPaso(1)}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Acciones formuladas: <strong>{plan.acciones.length}</strong> de <strong>{hallazgosDisponibles.length}</strong>
                </p>
                <Button 
                  onClick={() => setPaso(3)}
                  disabled={plan.acciones.length === 0}
                  className="bg-[#003DA5] hover:bg-[#002873] gap-2"
                >
                  Continuar
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* PASO 3: Revisión y Envío */}
      {paso === 3 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Paso 3: Revisión y Envío
              </h3>
              <p className="text-sm text-gray-600">
                Revise el plan completo antes de enviarlo para aprobación
              </p>
            </div>

            {/* Resumen del plan */}
            <div className="space-y-6">
              {/* Info general */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 mb-1">ID Plan</p>
                  <p className="font-semibold text-gray-900">{plan.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Auditoría</p>
                  <p className="font-semibold text-gray-900">{plan.codigoAuditoria}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Área</p>
                  <p className="font-semibold text-gray-900">{plan.area}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Fecha</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(plan.fechaCreacion).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Tabla resumen de acciones */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Resumen de Acciones Correctivas ({plan.acciones.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b-2 border-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">N° Hallazgo</th>
                        <th className="px-4 py-3 text-left">Acción de Mejora</th>
                        <th className="px-4 py-3 text-left">Responsable</th>
                        <th className="px-4 py-3 text-left">Duración</th>
                        <th className="px-4 py-3 text-left">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {plan.acciones.map((accion, index) => (
                        <tr key={accion.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {accion.hallazgoNumero}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <p className="line-clamp-2">{accion.accionMejora}</p>
                          </td>
                          <td className="px-4 py-3">{accion.nombreResponsable}</td>
                          <td className="px-4 py-3">
                            {accion.tiempoEjecucionMeses} {accion.tiempoEjecucionMeses === 1 ? 'mes' : 'meses'}
                          </td>
                          <td className="px-4 py-3 text-center">{accion.cantidadProgramada}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observaciones generales */}
              <div>
                <Label htmlFor="observacionesGenerales">
                  Observaciones Generales (Opcional)
                </Label>
                <Textarea
                  id="observacionesGenerales"
                  value={plan.observacionesGenerales}
                  onChange={(e) => setPlan({
                    ...plan,
                    observacionesGenerales: e.target.value
                  })}
                  placeholder="Comentarios adicionales sobre el plan de mejoramiento..."
                  className="mt-2 min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t mt-6">
              <Button 
                variant="outline"
                onClick={() => setPaso(2)}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setIsPreviewOpen(true)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Vista Previa
                </Button>
                <Button 
                  onClick={() => setIsConfirmOpen(true)}
                  className="bg-[#003DA5] hover:bg-[#002873] gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar para Aprobación
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Modal de Confirmación */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#003DA5]" />
              Confirmar Envío del Plan de Mejoramiento
            </DialogTitle>
            <DialogDescription>
              Revise la información antes de enviar. El plan será revisado por el Jefe de Control Interno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-3">Resumen del Envío:</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  • Plan: <strong>{plan.id}</strong>
                </p>
                <p className="text-gray-700">
                  • Auditoría: <strong>{plan.auditoria}</strong>
                </p>
                <p className="text-gray-700">
                  • Acciones correctivas: <strong>{plan.acciones.length}</strong>
                </p>
                <p className="text-gray-700">
                  • Responsable: <strong>{plan.responsableArea}</strong>
                </p>
              </div>
            </Card>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">
                    Importante
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Una vez enviado, el plan no podrá ser modificado hasta que sea revisado</li>
                    <li>• El Jefe de Control Interno podrá aprobar o rechazar el plan</li>
                    <li>• Si es rechazado, deberá reformularlo según las observaciones</li>
                    <li>• Recibirá una notificación con la decisión</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={enviarParaAprobacion}
              className="bg-[#003DA5] hover:bg-[#002873] gap-2"
            >
              <Send className="w-4 h-4" />
              Confirmar Envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Vista Previa */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#003DA5]" />
              Vista Previa - Plan de Mejoramiento
            </DialogTitle>
            <DialogDescription>
              Formato EM-FO-002 • {plan.id}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 130px)' }}>
            {/* Aquí iría el formato completo del plan para imprimir/exportar */}
            <div className="bg-white">
              <div className="mb-6 pb-4 border-b-2 border-gray-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  PLAN DE MEJORAMIENTO
                </h2>
                <p className="text-sm text-gray-600">
                  Formato EM-FO-002 • Oficina de Control Interno de Gestión - ESAP
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">ID Plan:</p>
                    <p className="font-semibold">{plan.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Auditoría:</p>
                    <p className="font-semibold">{plan.auditoria}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Área:</p>
                    <p className="font-semibold">{plan.area}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha:</p>
                    <p className="font-semibold">{new Date(plan.fechaCreacion).toLocaleDateString('es-CO')}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse border border-gray-300">
                    <thead className="bg-[#003DA5] text-white">
                      <tr>
                        <th className="border border-gray-300 px-2 py-2">N° Hallazgo</th>
                        <th className="border border-gray-300 px-2 py-2">Descripción</th>
                        <th className="border border-gray-300 px-2 py-2">Causas</th>
                        <th className="border border-gray-300 px-2 py-2">Acción de Mejora</th>
                        <th className="border border-gray-300 px-2 py-2">Cantidad</th>
                        <th className="border border-gray-300 px-2 py-2">Fecha Inicio</th>
                        <th className="border border-gray-300 px-2 py-2">Fecha Fin</th>
                        <th className="border border-gray-300 px-2 py-2">Meses</th>
                        <th className="border border-gray-300 px-2 py-2">Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.acciones.map((accion, index) => (
                        <tr key={accion.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="border border-gray-300 px-2 py-2">{accion.hallazgoNumero}</td>
                          <td className="border border-gray-300 px-2 py-2">{accion.hallazgoDescripcion}</td>
                          <td className="border border-gray-300 px-2 py-2">{accion.causas}</td>
                          <td className="border border-gray-300 px-2 py-2">{accion.accionMejora}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{accion.cantidadProgramada}</td>
                          <td className="border border-gray-300 px-2 py-2">
                            {new Date(accion.fechaInicial).toLocaleDateString('es-CO')}
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            {new Date(accion.fechaFin).toLocaleDateString('es-CO')}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{accion.tiempoEjecucionMeses}</td>
                          <td className="border border-gray-300 px-2 py-2">{accion.nombreResponsable}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
            <Button onClick={() => setIsPreviewOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
