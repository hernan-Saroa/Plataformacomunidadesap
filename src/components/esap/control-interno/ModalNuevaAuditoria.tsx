/**
 * Modal Nueva Auditoría
 * Formulario completo para crear una nueva auditoría en el sistema
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Badge } from '../../ui/badge';
import { 
  Plus, 
  X, 
  Calendar, 
  Users, 
  MapPin, 
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ModalNuevaAuditoriaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrear: (auditoria: any) => void;
}

export function ModalNuevaAuditoria({
  open,
  onOpenChange,
  onCrear
}: ModalNuevaAuditoriaProps) {
  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [alcance, setAlcance] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [territorial, setTerritorial] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [liderAuditoria, setLiderAuditoria] = useState('');
  const [equipoAuditor, setEquipoAuditor] = useState<string[]>([]);
  const [nuevoMiembro, setNuevoMiembro] = useState('');
  const [proceso, setProceso] = useState('');
  const [riesgoAsociado, setRiesgoAsociado] = useState('');
  
  // Validación básica
  const esFormularioValido = nombre && tipo && alcance && territorial && fechaInicio && fechaFin && liderAuditoria;

  // Tipos de auditoría según el formato
  const tiposAuditoria = [
    'Auditoría de Cumplimiento',
    'Auditoría Financiera',
    'Auditoría de Gestión',
    'Auditoría de Desempeño',
    'Auditoría Operacional',
    'Auditoría de Sistemas',
    'Auditoría Integral',
    'Auditoría Especial'
  ];

  // Alcances disponibles
  const alcancesDisponibles = [
    'Nacional',
    'Regional',
    'Territorial',
    'Por Proceso',
    'Por Proyecto'
  ];

  // Territoriales ESAP
  const territorialesESAP = [
    'Nacional - Sede Central',
    'Antioquia - Medellín',
    'Atlántico - Barranquilla',
    'Bolívar - Cartagena',
    'Boyacá - Tunja',
    'Caldas - Manizales',
    'Cauca - Popayán',
    'Cesar - Valledupar',
    'Córdoba - Montería',
    'Cundinamarca - Bogotá',
    'Huila - Neiva',
    'La Guajira - Riohacha',
    'Magdalena - Santa Marta',
    'Meta - Villavicencio',
    'Nariño - Pasto',
    'Norte de Santander - Cúcuta',
    'Quindío - Armenia',
    'Risaralda - Pereira',
    'Santander - Bucaramanga',
    'Sucre - Sincelejo',
    'Tolima - Ibagué',
    'Valle del Cauca - Cali'
  ];

  // Líderes de auditoría disponibles (simulado - en producción viene del módulo de Personas)
  const lideresDisponibles = [
    'Dra. María Rodríguez - Auditora Senior',
    'Dr. Carlos Méndez - Auditor Senior',
    'Mg. Ana Sánchez - Auditora',
    'Dr. Juan Torres - Auditor Especializado',
    'Dra. Patricia Gómez - Auditora de Sistemas'
  ];

  // Procesos ESAP
  const procesosESAP = [
    'Gestión Académica',
    'Gestión Financiera',
    'Gestión del Talento Humano',
    'Gestión de Infraestructura',
    'Gestión de Investigación',
    'Gestión de Proyección Social',
    'Gestión de Tecnología',
    'Gestión Documental',
    'Gestión Legal',
    'Gestión de Compras y Contratación'
  ];

  // Agregar miembro al equipo auditor
  const handleAgregarMiembro = () => {
    if (nuevoMiembro && !equipoAuditor.includes(nuevoMiembro)) {
      setEquipoAuditor([...equipoAuditor, nuevoMiembro]);
      setNuevoMiembro('');
    }
  };

  // Eliminar miembro del equipo
  const handleEliminarMiembro = (miembro: string) => {
    setEquipoAuditor(equipoAuditor.filter(m => m !== miembro));
  };

  // Limpiar formulario
  const limpiarFormulario = () => {
    setNombre('');
    setTipo('');
    setAlcance('');
    setObjetivo('');
    setTerritorial('');
    setFechaInicio('');
    setFechaFin('');
    setLiderAuditoria('');
    setEquipoAuditor([]);
    setNuevoMiembro('');
    setProceso('');
    setRiesgoAsociado('');
  };

  // Crear auditoría
  const handleCrearAuditoria = () => {
    if (!esFormularioValido) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Generar código automático
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900) + 100;
    const codigo = `AUD-${year}-${random}`;

    // Crear objeto de auditoría
    const nuevaAuditoria = {
      codigo,
      nombre,
      tipo,
      alcance,
      objetivo,
      territorial,
      fase: 'Por Programar', // Todas las nuevas auditorías empiezan en "Por Programar"
      prioridad: 'Media', // Prioridad por defecto
      fechaInicio,
      fechaFin,
      progreso: 0,
      liderAuditoria: liderAuditoria.split(' - ')[0], // Solo el nombre
      equipoAuditor,
      proceso,
      riesgoAsociado,
      estado: 'Activa',
      fechaCreacion: new Date().toISOString()
    };

    onCrear(nuevaAuditoria);
    limpiarFormulario();
    toast.success(`Auditoría ${codigo} creada exitosamente`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b-2 pb-4" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#003DA5' }}>
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Nueva Auditoría</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Completa la información para crear una nueva auditoría en el sistema
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SECCIÓN 1: Información Básica */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold text-gray-900">Información Básica</h3>
            </div>

            {/* Nombre de la Auditoría */}
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Auditoría <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Auditoría de Gestión - Dirección Financiera Territorial Antioquia"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="border-2"
              />
            </div>

            {/* Tipo y Alcance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">
                  Tipo de Auditoría <span className="text-red-500">*</span>
                </Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAuditoria.map((tipoItem) => (
                      <SelectItem key={tipoItem} value={tipoItem}>
                        {tipoItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alcance">
                  Alcance <span className="text-red-500">*</span>
                </Label>
                <Select value={alcance} onValueChange={setAlcance}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Selecciona el alcance" />
                  </SelectTrigger>
                  <SelectContent>
                    {alcancesDisponibles.map((alcanceItem) => (
                      <SelectItem key={alcanceItem} value={alcanceItem}>
                        {alcanceItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Objetivo */}
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo General</Label>
              <Textarea
                id="objetivo"
                placeholder="Describe el objetivo principal de la auditoría..."
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="border-2 min-h-[80px]"
              />
            </div>
          </div>

          {/* SECCIÓN 2: Alcance Territorial */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <MapPin className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold text-gray-900">Alcance Territorial y Proceso</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Territorial */}
              <div className="space-y-2">
                <Label htmlFor="territorial">
                  Territorial <span className="text-red-500">*</span>
                </Label>
                <Select value={territorial} onValueChange={setTerritorial}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Selecciona la territorial" />
                  </SelectTrigger>
                  <SelectContent>
                    {territorialesESAP.map((terr) => (
                      <SelectItem key={terr} value={terr}>
                        {terr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proceso */}
              <div className="space-y-2">
                <Label htmlFor="proceso">Proceso Asociado</Label>
                <Select value={proceso} onValueChange={setProceso}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Selecciona el proceso" />
                  </SelectTrigger>
                  <SelectContent>
                    {procesosESAP.map((proc) => (
                      <SelectItem key={proc} value={proc}>
                        {proc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Fechas de Ejecución */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold text-gray-900">Período de Ejecución</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">
                  Fecha de Inicio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFin">
                  Fecha de Finalización <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="border-2"
                  min={fechaInicio}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Equipo Auditor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <Users className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold text-gray-900">Equipo Auditor</h3>
            </div>

            {/* Líder de Auditoría */}
            <div className="space-y-2">
              <Label htmlFor="lider">
                Líder de Auditoría <span className="text-red-500">*</span>
              </Label>
              <Select value={liderAuditoria} onValueChange={setLiderAuditoria}>
                <SelectTrigger className="border-2">
                  <SelectValue placeholder="Selecciona el líder" />
                </SelectTrigger>
                <SelectContent>
                  {lideresDisponibles.map((lider) => (
                    <SelectItem key={lider} value={lider}>
                      {lider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equipo Auditor */}
            <div className="space-y-2">
              <Label>Miembros del Equipo Auditor</Label>
              <div className="flex gap-2">
                <Select value={nuevoMiembro} onValueChange={setNuevoMiembro}>
                  <SelectTrigger className="border-2 flex-1">
                    <SelectValue placeholder="Selecciona un miembro" />
                  </SelectTrigger>
                  <SelectContent>
                    {lideresDisponibles
                      .filter(lider => lider !== liderAuditoria && !equipoAuditor.includes(lider))
                      .map((miembro) => (
                        <SelectItem key={miembro} value={miembro}>
                          {miembro}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAgregarMiembro}
                  disabled={!nuevoMiembro}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar
                </Button>
              </div>

              {/* Lista de miembros agregados */}
              {equipoAuditor.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {equipoAuditor.map((miembro) => (
                    <Badge
                      key={miembro}
                      variant="secondary"
                      className="px-3 py-2 flex items-center gap-2"
                      style={{ background: '#EFF6FF', color: '#003DA5' }}
                    >
                      <Users className="w-3 h-3" />
                      {miembro.split(' - ')[0]}
                      <button
                        onClick={() => handleEliminarMiembro(miembro)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 5: Riesgos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <AlertCircle className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h3 className="font-semibold text-gray-900">Gestión de Riesgos</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riesgo">Riesgo Asociado (Opcional)</Label>
              <Textarea
                id="riesgo"
                placeholder="Describe los principales riesgos que motivan esta auditoría..."
                value={riesgoAsociado}
                onChange={(e) => setRiesgoAsociado(e.target.value)}
                className="border-2 min-h-[80px]"
              />
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="rounded-xl p-4" style={{ background: '#EFF6FF' }}>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
              <div>
                <p className="text-sm" style={{ color: '#003DA5' }}>
                  <strong>Nota:</strong> La auditoría se creará en la fase <strong>"Por Programar"</strong>. 
                  Posteriormente podrás moverla a través de las diferentes fases del proceso de auditoría.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex gap-3 pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
          <Button
            variant="outline"
            className="flex-1 border-2"
            onClick={() => {
              limpiarFormulario();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
            onClick={handleCrearAuditoria}
            disabled={!esFormularioValido}
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Auditoría
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}