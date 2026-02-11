/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL NUEVA DEMANDA JUDICIAL - VERSIÓN DEFINITIVA SEGÚN MOCKUP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ Diseño compacto y profesional según imagen de referencia
 * ✅ Layout en grid de 2-3 columnas para optimizar espacio
 * ✅ Campos organizados por secciones visuales simples
 * ✅ Parte Demandante, Parte Demandada, Otros Actores
 * ✅ Información del Apoderado con checkbox
 * ✅ Fechas y Tiempos Procesales
 * ✅ Tamaño modal: max-w-6xl (ancho apropiado)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { 
  Gavel, User, Plus, Trash2, Users, UserPlus, Calendar, Clock, 
  CheckCircle, X, Save, Mail, Phone, MapPin, Briefcase, UserCog,
  Building2
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card } from '../../../ui/card';
import { Checkbox } from '../../../ui/checkbox';
import { toast } from 'sonner@2.0.3';

// Importar header limpio
import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';

interface ModalNuevaDemandaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demanda: any) => void;
}

interface Parte {
  id: string;
  tipoPersona: 'natural' | 'juridica';
  nombre: string;
  identificacion: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: {
    nombre: string;
    telefono: string;
    correo: string;
  };
  cargo?: string; // Solo para demandados
}

interface OtroActor {
  id: string;
  tipoPersona: 'natural' | 'juridica';
  nombre: string;
  identificacion: string;
  rol: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: {
    nombre: string;
    telefono: string;
    correo: string;
  };
}

// ✅ Export tipo para compatibilidad con ModuloDefensaJudicialV3
export interface NuevaDemandaData {
  demandantes: Parte[];
  demandados: Parte[];
  otrosActores: OtroActor[];
  valorEconomico: string;
  fechaNotificacion: string;
  horaNotificacion: string;
  fechaVencimiento: string;
  horaVencimiento: string;
  tipoDias: 'habiles' | 'calendario';
  validacionReactiva: boolean;
}

export function ModalNuevaDemandaRESTAURADO({ 
  isOpen, 
  onClose, 
  onSave 
}: ModalNuevaDemandaProps) {

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════════════════════

  const [validacionReactiva, setValidacionReactiva] = useState(true);
  const [valorEconomico, setValorEconomico] = useState('');

  // DEMANDANTES
  const [demandantes, setDemandantes] = useState<Parte[]>([]);
  const [nuevoDemandante, setNuevoDemandante] = useState({
    tipoPersona: 'natural' as 'natural' | 'juridica',
    nombre: '',
    identificacion: '',
    telefono: '',
    correo: '',
    direccion: '',
    tieneApoderado: false,
    apoderadoNombre: '',
    apoderadoTelefono: '',
    apoderadoCorreo: ''
  });

  // DEMANDADOS
  const [demandados, setDemandados] = useState<Parte[]>([]);
  const [nuevoDemandado, setNuevoDemandado] = useState({
    tipoPersona: 'natural' as 'natural' | 'juridica',
    nombre: '',
    identificacion: '',
    cargo: '',
    telefono: '',
    correo: '',
    direccion: '',
    tieneApoderado: false,
    apoderadoNombre: '',
    apoderadoTelefono: '',
    apoderadoCorreo: ''
  });

  // OTROS ACTORES
  const [otrosActores, setOtrosActores] = useState<OtroActor[]>([]);
  const [nuevoOtroActor, setNuevoOtroActor] = useState({
    tipoPersona: 'natural' as 'natural' | 'juridica',
    nombre: '',
    identificacion: '',
    rol: '',
    telefono: '',
    correo: '',
    direccion: '',
    tieneApoderado: false,
    apoderadoNombre: '',
    apoderadoTelefono: '',
    apoderadoCorreo: ''
  });

  // FECHAS Y TIEMPOS PROCESALES
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [horaNotificacion, setHoraNotificacion] = useState('08:00');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [horaVencimiento, setHoraVencimiento] = useState('17:00');
  const [tipoDias, setTipoDias] = useState<'habiles' | 'calendario'>('habiles');

  const [enviando, setEnviando] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Calcular fecha vencimiento sugerida
  const calcularFechaVencimientoSugerida = useMemo(() => {
    if (!fechaNotificacion) return null;
    
    const fecha = new Date(fechaNotificacion);
    const diasAgregar = tipoDias === 'habiles' ? 14 : 10;
    fecha.setDate(fecha.getDate() + diasAgregar);
    return fecha.toISOString().split('T')[0];
  }, [fechaNotificacion, tipoDias]);

  // Campos completados
  const camposCompletados = useMemo(() => {
    let total = 0;
    if (demandantes.length > 0) total++;
    if (fechaNotificacion) total++;
    if (fechaVencimiento) total++;
    return total;
  }, [demandantes, fechaNotificacion, fechaVencimiento]);

  const totalCampos = 3;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - DEMANDANTES
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAgregarDemandante = () => {
    if (!nuevoDemandante.nombre.trim()) {
      toast.error('⚠️ El nombre es obligatorio');
      return;
    }
    if (!nuevoDemandante.identificacion.trim()) {
      toast.error('⚠️ La identificación es obligatoria');
      return;
    }

    const demandante: Parte = {
      id: Date.now().toString(),
      tipoPersona: nuevoDemandante.tipoPersona,
      nombre: nuevoDemandante.nombre,
      identificacion: nuevoDemandante.identificacion,
      telefono: nuevoDemandante.telefono,
      correo: nuevoDemandante.correo,
      direccion: nuevoDemandante.direccion,
      tieneApoderado: nuevoDemandante.tieneApoderado,
      ...(nuevoDemandante.tieneApoderado && {
        apoderado: {
          nombre: nuevoDemandante.apoderadoNombre,
          telefono: nuevoDemandante.apoderadoTelefono,
          correo: nuevoDemandante.apoderadoCorreo
        }
      })
    };

    setDemandantes([...demandantes, demandante]);
    setNuevoDemandante({
      tipoPersona: 'natural',
      nombre: '',
      identificacion: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false,
      apoderadoNombre: '',
      apoderadoTelefono: '',
      apoderadoCorreo: ''
    });

    toast.success('✅ Demandante agregado');
  };

  const handleEliminarDemandante = (id: string) => {
    setDemandantes(demandantes.filter(d => d.id !== id));
    toast.info('🗑️ Demandante eliminado');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - DEMANDADOS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAgregarDemandado = () => {
    if (!nuevoDemandado.nombre.trim()) {
      toast.error('⚠️ El nombre es obligatorio');
      return;
    }
    if (!nuevoDemandado.identificacion.trim()) {
      toast.error('⚠️ La identificación es obligatoria');
      return;
    }

    const demandado: Parte = {
      id: Date.now().toString(),
      tipoPersona: nuevoDemandado.tipoPersona,
      nombre: nuevoDemandado.nombre,
      identificacion: nuevoDemandado.identificacion,
      cargo: nuevoDemandado.cargo,
      telefono: nuevoDemandado.telefono,
      correo: nuevoDemandado.correo,
      direccion: nuevoDemandado.direccion,
      tieneApoderado: nuevoDemandado.tieneApoderado,
      ...(nuevoDemandado.tieneApoderado && {
        apoderado: {
          nombre: nuevoDemandado.apoderadoNombre,
          telefono: nuevoDemandado.apoderadoTelefono,
          correo: nuevoDemandado.apoderadoCorreo
        }
      })
    };

    setDemandados([...demandados, demandado]);
    setNuevoDemandado({
      tipoPersona: 'natural',
      nombre: '',
      identificacion: '',
      cargo: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false,
      apoderadoNombre: '',
      apoderadoTelefono: '',
      apoderadoCorreo: ''
    });

    toast.success('✅ Demandado agregado');
  };

  const handleEliminarDemandado = (id: string) => {
    setDemandados(demandados.filter(d => d.id !== id));
    toast.info('🗑️ Demandado eliminado');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - OTROS ACTORES
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAgregarOtroActor = () => {
    if (!nuevoOtroActor.nombre.trim()) {
      toast.error('⚠️ El nombre es obligatorio');
      return;
    }
    if (!nuevoOtroActor.identificacion.trim()) {
      toast.error('⚠️ La identificación es obligatoria');
      return;
    }
    if (!nuevoOtroActor.rol.trim()) {
      toast.error('⚠️ El rol es obligatorio');
      return;
    }

    const otroActor: OtroActor = {
      id: Date.now().toString(),
      tipoPersona: nuevoOtroActor.tipoPersona,
      nombre: nuevoOtroActor.nombre,
      identificacion: nuevoOtroActor.identificacion,
      rol: nuevoOtroActor.rol,
      telefono: nuevoOtroActor.telefono,
      correo: nuevoOtroActor.correo,
      direccion: nuevoOtroActor.direccion,
      tieneApoderado: nuevoOtroActor.tieneApoderado,
      ...(nuevoOtroActor.tieneApoderado && {
        apoderado: {
          nombre: nuevoOtroActor.apoderadoNombre,
          telefono: nuevoOtroActor.apoderadoTelefono,
          correo: nuevoOtroActor.apoderadoCorreo
        }
      })
    };

    setOtrosActores([...otrosActores, otroActor]);
    setNuevoOtroActor({
      tipoPersona: 'natural',
      nombre: '',
      identificacion: '',
      rol: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false,
      apoderadoNombre: '',
      apoderadoTelefono: '',
      apoderadoCorreo: ''
    });

    toast.success('✅ Otro actor agregado');
  };

  const handleEliminarOtroActor = (id: string) => {
    setOtrosActores(otrosActores.filter(a => a.id !== id));
    toast.info('🗑️ Actor eliminado');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER - AUTO-CALCULAR FECHA VENCIMIENTO
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAutoFillFechaVencimiento = () => {
    if (calcularFechaVencimientoSugerida) {
      setFechaVencimiento(calcularFechaVencimientoSugerida);
      toast.success('✅ Fecha calculada automáticamente', {
        description: `10 días ${tipoDias === 'habiles' ? 'hábiles' : 'calendario'} desde la notificación`
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER - SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSubmit = async () => {
    if (demandantes.length === 0) {
      toast.error('⚠️ Debe agregar al menos un demandante');
      return;
    }

    if (!fechaNotificacion) {
      toast.error('⚠️ La fecha de notificación es obligatoria');
      return;
    }

    if (!fechaVencimiento) {
      toast.error('⚠️ La fecha de vencimiento es obligatoria');
      return;
    }

    if (new Date(fechaVencimiento) <= new Date(fechaNotificacion)) {
      toast.error('⚠️ La fecha de vencimiento debe ser posterior a la notificación');
      return;
    }

    setEnviando(true);

    try {
      const demandaData: NuevaDemandaData = {
        demandantes,
        demandados,
        otrosActores,
        valorEconomico,
        fechaNotificacion,
        horaNotificacion,
        fechaVencimiento,
        horaVencimiento,
        tipoDias,
        validacionReactiva
      };

      await onSave(demandaData);

      toast.success('✅ Demanda guardada exitosamente', {
        description: 'El proceso judicial ha sido registrado',
        duration: 5000
      });

      handleCancelar();
    } catch (error) {
      toast.error('❌ Error al guardar', {
        description: 'Intente nuevamente'
      });
    } finally {
      setEnviando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER - CANCELAR
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCancelar = () => {
    setDemandantes([]);
    setDemandados([]);
    setOtrosActores([]);
    setValorEconomico('');
    setFechaNotificacion('');
    setHoraNotificacion('08:00');
    setFechaVencimiento('');
    setHoraVencimiento('17:00');
    setTipoDias('habiles');
    setNuevoDemandante({
      tipoPersona: 'natural',
      nombre: '',
      identificacion: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false,
      apoderadoNombre: '',
      apoderadoTelefono: '',
      apoderadoCorreo: ''
    });
    setNuevoDemandado({
      tipoPersona: 'natural',
      nombre: '',
      identificacion: '',
      cargo: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false,
      apoderadoNombre: '',
      apoderadoTelefono: '',
      apoderadoCorreo: ''
    });
    setNuevoOtroActor({
      tipoPersona: 'natural',
      nombre: '',
      identificacion: '',
      rol: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false,
      apoderadoNombre: '',
      apoderadoTelefono: '',
      apoderadoCorreo: ''
    });
    
    onClose();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isOpen) return null;

  const puedeGuardar = demandantes.length > 0 && fechaNotificacion && fechaVencimiento;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        hideCloseButton 
        className="w-[98vw] max-w-6xl max-h-[92vh] flex flex-col p-0"
      >
        <DialogTitle className="sr-only">
          Nueva Demanda Judicial
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar una nueva demanda judicial
        </DialogDescription>

        {/* ═══ HEADER ═══ */}
        <ModalHeaderClean
          icono={Gavel}
          colorIcono="blue"
          titulo="Nueva Demanda Judicial"
          subtitulo="Registro completo de proceso judicial"
          badgePrincipal="NOTIFICADA"
          badgeColor="blue"
          onClose={onClose}
        />

        {/* ═══ CONTENIDO ═══ */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* CHECKBOX VALIDACIÓN */}
          <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
            <input
              type="checkbox"
              id="validacionReactiva"
              checked={validacionReactiva}
              onChange={(e) => setValidacionReactiva(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <Label htmlFor="validacionReactiva" className="text-sm font-semibold text-gray-700 cursor-pointer">
              ✅ Validación Reactiva
            </Label>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PARTE DEMANDANTE (ACTOR) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b-2 border-green-200">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-green-600">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Parte Demandante (Actor)</h3>
            </div>

            {/* Lista de demandantes */}
            {demandantes.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {demandantes.map((dem) => (
                  <Card key={dem.id} className="p-3 bg-green-50/50 border-green-200 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminarDemandante(dem.id)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <div className="pr-8">
                      <p className="font-bold text-sm text-gray-900 mb-1">{dem.nombre}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-600">
                        <p><span className="font-semibold">ID:</span> {dem.identificacion}</p>
                        <p><span className="font-semibold">Tel:</span> {dem.telefono || 'N/A'}</p>
                        <p className="col-span-2"><span className="font-semibold">Email:</span> {dem.correo || 'N/A'}</p>
                        {dem.tieneApoderado && dem.apoderado && (
                          <p className="col-span-2 text-blue-700 font-semibold flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {dem.apoderado.nombre}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Formulario agregar */}
            <Card className="p-4 bg-white border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Fila 1: Tipo, Nombre, ID */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo</Label>
                  <Select
                    value={nuevoDemandante.tipoPersona}
                    onValueChange={(val: 'natural' | 'juridica') => 
                      setNuevoDemandante({ ...nuevoDemandante, tipoPersona: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">👤 Natural</SelectItem>
                      <SelectItem value="juridica">🏢 Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Nombre * </Label>
                  <Input
                    value={nuevoDemandante.nombre}
                    onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, nombre: e.target.value })}
                    placeholder="Nombre completo"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Identificación *
                  </Label>
                  <Input
                    value={nuevoDemandante.identificacion}
                    onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, identificacion: e.target.value })}
                    placeholder="CC/NIT"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Fila 2: Teléfono, Correo, Dirección */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Teléfono</Label>
                  <Input
                    value={nuevoDemandante.telefono}
                    onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, telefono: e.target.value })}
                    placeholder="3001234567"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Correo</Label>
                  <Input
                    type="email"
                    value={nuevoDemandante.correo}
                    onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Dirección</Label>
                  <Input
                    value={nuevoDemandante.direccion}
                    onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, direccion: e.target.value })}
                    placeholder="Dirección completa"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Checkbox Apoderado */}
                <div className="col-span-full flex items-center gap-2 py-2 px-3 bg-blue-50 rounded border border-blue-200">
                  <Checkbox
                    id="dem-apoderado"
                    checked={nuevoDemandante.tieneApoderado}
                    onCheckedChange={(checked) => 
                      setNuevoDemandante({ ...nuevoDemandante, tieneApoderado: checked as boolean })
                    }
                  />
                  <Label htmlFor="dem-apoderado" className="text-xs font-semibold cursor-pointer flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Tiene apoderado judicial
                  </Label>
                </div>

                {/* Campos Apoderado */}
                {nuevoDemandante.tieneApoderado && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Nombre apoderado</Label>
                      <Input
                        value={nuevoDemandante.apoderadoNombre}
                        onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, apoderadoNombre: e.target.value })}
                        placeholder="Dr. Carlos Méndez"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Teléfono apoderado</Label>
                      <Input
                        value={nuevoDemandante.apoderadoTelefono}
                        onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, apoderadoTelefono: e.target.value })}
                        placeholder="3009876543"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Correo apoderado</Label>
                      <Input
                        type="email"
                        value={nuevoDemandante.apoderadoCorreo}
                        onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, apoderadoCorreo: e.target.value })}
                        placeholder="abogado@firma.com"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                  </>
                )}

                {/* Botón */}
                <div className="col-span-full">
                  <Button
                    type="button"
                    onClick={handleAgregarDemandante}
                    className="w-full h-9 text-xs bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar Demandante
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PARTE DEMANDADA */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b-2 border-orange-200">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-orange-600">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Parte Demandada</h3>
            </div>

            {/* Lista de demandados */}
            {demandados.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {demandados.map((dem) => (
                  <Card key={dem.id} className="p-3 bg-orange-50/50 border-orange-200 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminarDemandado(dem.id)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <div className="pr-8">
                      <p className="font-bold text-sm text-gray-900 mb-1">{dem.nombre}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-600">
                        <p><span className="font-semibold">ID:</span> {dem.identificacion}</p>
                        {dem.cargo && <p><span className="font-semibold">Cargo:</span> {dem.cargo}</p>}
                        <p className="col-span-2"><span className="font-semibold">Tel:</span> {dem.telefono || 'N/A'}</p>
                        {dem.tieneApoderado && dem.apoderado && (
                          <p className="col-span-2 text-blue-700 font-semibold flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {dem.apoderado.nombre}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Formulario agregar */}
            <Card className="p-4 bg-white border-orange-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Tipo, Nombre, ID */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo</Label>
                  <Select
                    value={nuevoDemandado.tipoPersona}
                    onValueChange={(val: 'natural' | 'juridica') => 
                      setNuevoDemandado({ ...nuevoDemandado, tipoPersona: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">👤 Natural</SelectItem>
                      <SelectItem value="juridica">🏢 Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Nombre *</Label>
                  <Input
                    value={nuevoDemandado.nombre}
                    onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, nombre: e.target.value })}
                    placeholder="ESAP"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Identificación *</Label>
                  <Input
                    value={nuevoDemandado.identificacion}
                    onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, identificacion: e.target.value })}
                    placeholder="NIT"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Cargo, Tel, Correo */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Cargo</Label>
                  <Input
                    value={nuevoDemandado.cargo}
                    onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, cargo: e.target.value })}
                    placeholder="Rector"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Teléfono</Label>
                  <Input
                    value={nuevoDemandado.telefono}
                    onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, telefono: e.target.value })}
                    placeholder="6012202790"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Correo</Label>
                  <Input
                    type="email"
                    value={nuevoDemandado.correo}
                    onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, correo: e.target.value })}
                    placeholder="juridica@esap.edu.co"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Dirección */}
                <div className="col-span-full">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Dirección</Label>
                  <Input
                    value={nuevoDemandado.direccion}
                    onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, direccion: e.target.value })}
                    placeholder="Calle 44 #53-37, Bogotá"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Checkbox Apoderado */}
                <div className="col-span-full flex items-center gap-2 py-2 px-3 bg-blue-50 rounded border border-blue-200">
                  <Checkbox
                    id="ddo-apoderado"
                    checked={nuevoDemandado.tieneApoderado}
                    onCheckedChange={(checked) => 
                      setNuevoDemandado({ ...nuevoDemandado, tieneApoderado: checked as boolean })
                    }
                  />
                  <Label htmlFor="ddo-apoderado" className="text-xs font-semibold cursor-pointer flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Tiene apoderado judicial
                  </Label>
                </div>

                {/* Campos Apoderado */}
                {nuevoDemandado.tieneApoderado && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Nombre apoderado</Label>
                      <Input
                        value={nuevoDemandado.apoderadoNombre}
                        onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, apoderadoNombre: e.target.value })}
                        placeholder="Dra. Ana López"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Teléfono apoderado</Label>
                      <Input
                        value={nuevoDemandado.apoderadoTelefono}
                        onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, apoderadoTelefono: e.target.value })}
                        placeholder="3009876543"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Correo apoderado</Label>
                      <Input
                        type="email"
                        value={nuevoDemandado.apoderadoCorreo}
                        onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, apoderadoCorreo: e.target.value })}
                        placeholder="abogado@firma.com"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                  </>
                )}

                {/* Botón */}
                <div className="col-span-full">
                  <Button
                    type="button"
                    onClick={handleAgregarDemandado}
                    className="w-full h-9 text-xs bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar Demandado
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* OTROS ACTORES */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b-2 border-purple-200">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-purple-600">
                <UserCog className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Otros Actores</h3>
            </div>

            {/* Lista */}
            {otrosActores.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {otrosActores.map((actor) => (
                  <Card key={actor.id} className="p-3 bg-purple-50/50 border-purple-200 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminarOtroActor(actor.id)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <div className="pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm text-gray-900">{actor.nombre}</p>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold">
                          {actor.rol}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-600">
                        <p><span className="font-semibold">ID:</span> {actor.identificacion}</p>
                        <p><span className="font-semibold">Tel:</span> {actor.telefono || 'N/A'}</p>
                        {actor.tieneApoderado && actor.apoderado && (
                          <p className="col-span-2 text-blue-700 font-semibold flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {actor.apoderado.nombre}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Formulario */}
            <Card className="p-4 bg-white border-purple-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo</Label>
                  <Select
                    value={nuevoOtroActor.tipoPersona}
                    onValueChange={(val: 'natural' | 'juridica') => 
                      setNuevoOtroActor({ ...nuevoOtroActor, tipoPersona: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">👤 Natural</SelectItem>
                      <SelectItem value="juridica">🏢 Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Nombre *</Label>
                  <Input
                    value={nuevoOtroActor.nombre}
                    onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, nombre: e.target.value })}
                    placeholder="Nombre completo"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">ID *</Label>
                  <Input
                    value={nuevoOtroActor.identificacion}
                    onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, identificacion: e.target.value })}
                    placeholder="CC/NIT"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Rol *</Label>
                  <Select
                    value={nuevoOtroActor.rol}
                    onValueChange={(val) => setNuevoOtroActor({ ...nuevoOtroActor, rol: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tercero">Tercero</SelectItem>
                      <SelectItem value="Vinculado">Vinculado</SelectItem>
                      <SelectItem value="Llamado en Garantía">Llamado en Garantía</SelectItem>
                      <SelectItem value="Ministerio Público">Ministerio Público</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Teléfono</Label>
                  <Input
                    value={nuevoOtroActor.telefono}
                    onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, telefono: e.target.value })}
                    placeholder="3001234567"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Correo</Label>
                  <Input
                    type="email"
                    value={nuevoOtroActor.correo}
                    onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="col-span-full">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Dirección</Label>
                  <Input
                    value={nuevoOtroActor.direccion}
                    onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, direccion: e.target.value })}
                    placeholder="Dirección completa"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="col-span-full flex items-center gap-2 py-2 px-3 bg-blue-50 rounded border border-blue-200">
                  <Checkbox
                    id="oa-apoderado"
                    checked={nuevoOtroActor.tieneApoderado}
                    onCheckedChange={(checked) => 
                      setNuevoOtroActor({ ...nuevoOtroActor, tieneApoderado: checked as boolean })
                    }
                  />
                  <Label htmlFor="oa-apoderado" className="text-xs font-semibold cursor-pointer flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Tiene apoderado judicial
                  </Label>
                </div>

                {nuevoOtroActor.tieneApoderado && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Nombre apoderado</Label>
                      <Input
                        value={nuevoOtroActor.apoderadoNombre}
                        onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, apoderadoNombre: e.target.value })}
                        placeholder="Dr. Roberto García"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Teléfono apoderado</Label>
                      <Input
                        value={nuevoOtroActor.apoderadoTelefono}
                        onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, apoderadoTelefono: e.target.value })}
                        placeholder="3009876543"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">Correo apoderado</Label>
                      <Input
                        type="email"
                        value={nuevoOtroActor.apoderadoCorreo}
                        onChange={(e) => setNuevoOtroActor({ ...nuevoOtroActor, apoderadoCorreo: e.target.value })}
                        placeholder="abogado@firma.com"
                        className="h-9 text-xs bg-blue-50"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-full">
                  <Button
                    type="button"
                    onClick={handleAgregarOtroActor}
                    className="w-full h-9 text-xs bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar Otro Actor
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FECHAS Y TIEMPOS PROCESALES */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-blue-200">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-600">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Fechas y Tiempos Procesales</h3>
            </div>

            <Card className="p-4 bg-blue-50/30 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo de días *</Label>
                  <Select
                    value={tipoDias}
                    onValueChange={(val: 'habiles' | 'calendario') => {
                      setTipoDias(val);
                      toast.success(
                        val === 'habiles' ? '📅 Días hábiles' : '📆 Días calendario'
                      );
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="habiles">📅 Hábiles</SelectItem>
                      <SelectItem value="calendario">📆 Calendario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Fecha notificación *</Label>
                  <Input
                    type="date"
                    value={fechaNotificacion}
                    onChange={(e) => setFechaNotificacion(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Hora notificación</Label>
                  <Input
                    type="text"
                    value={horaNotificacion}
                    onChange={(e) => setHoraNotificacion(e.target.value)}
                    placeholder="08:00"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Fecha vencimiento *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className="h-9 text-xs flex-1"
                    />
                    {calcularFechaVencimientoSugerida && !fechaVencimiento && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoFillFechaVencimiento}
                        className="h-9 px-2 text-xs"
                        title="Auto-calcular"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              <span className="font-semibold">* Campo obligatorio</span>
              <span className="mx-2">•</span>
              <span className={puedeGuardar ? 'text-blue-600 font-semibold' : 'text-orange-600'}>
                {camposCompletados}/{totalCampos} completados
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelar}
                disabled={enviando}
                className="h-9 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Cancelar
              </Button>
              
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!puedeGuardar || enviando}
                style={puedeGuardar && !enviando ? { 
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' 
                } : {}}
                className={`h-9 text-xs ${!puedeGuardar || enviando ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {enviando ? (
                  <>
                    <div className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-1" />
                    Guardar Demanda
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}