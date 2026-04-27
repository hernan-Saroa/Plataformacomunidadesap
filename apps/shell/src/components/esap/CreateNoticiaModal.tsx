/**
 * MODAL: CREAR NOTICIA DISCIPLINARIA
 * RF001 – Gestión de Noticias Disciplinarias
 * Formulario completo con validación y generación automática de número único
 */

import { useState, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  User, 
  Calendar, 
  Building2, 
  FileText,
  Upload,
  Plus,
  Trash2,
  MapPin,
  UserCheck,
  Pencil
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { disciplinaryService, DisciplinaryBehavior } from '../../services/api/disciplinary.service';
import { authService } from '../../services/api/authService';

// ✅ NUEVO: Interface para Apoderado
interface Apoderado {
  nombre: string;
  cedula: string;
  correo: string;
  celular: string;
  direccion?: string; // ✅ NUEVO: Dirección del apoderado (opcional)
}

interface Denunciante {
  id: string;
  nombre: string;
  identificacion: string;
  direccion: string;
  telefono: string;
  correo: string;
  cargo: string;
  entidad: string;
  tipo: 'Denunciante' | 'Víctima'; // ✅ NUEVO: Tipo de denunciante
  apoderado?: Apoderado; // ✅ NUEVO: Apoderado opcional
}

interface Denunciado {
  id: string;
  nombre: string;
  identificacion: string;
  cargo: string;
  lugarHechos: string; // ✅ Cambiado de 'dependencia' a 'lugarHechos'
  apoderado?: Apoderado; // ✅ NUEVO: Apoderado opcional
}

interface CreateNoticiaModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  noticiaToEdit?: any; // ✅ NUEVO: Noticia a editar (opcional)
  isEditMode?: boolean; // ✅ NUEVO: Modo edición
}

const ORIGENES_NOTICIA = [
  'Anónimo',
  'Quejoso',
  'Informante',
  'De oficio',
  'Remisión por competencia'
];

const TERRITORIALES_ESAP = [
  'Dirección Nacional',
  'Territorial Amazonas',
  'Territorial Antioquia',
  'Territorial Atlántico',
  'Territorial Bogotá',
  'Territorial Bolívar',
  'Territorial Boyacá',
  'Territorial Caldas',
  'Territorial Caquetá',
  'Territorial Casanare',
  'Territorial Cauca',
  'Territorial Cesar',
  'Territorial Chocó',
  'Territorial Córdoba',
  'Territorial Cundinamarca',
  'Territorial Huila',
  'Territorial La Guajira',
  'Territorial Magdalena',
  'Territorial Meta',
  'Territorial Nariño',
  'Territorial Norte de Santander',
  'Territorial Putumayo',
  'Territorial Quindío',
  'Territorial Risaralda',
  'Territorial Santander',
  'Territorial Sucre',
  'Territorial Tolima',
  'Territorial Valle del Cauca'
];

const DEPENDENCIAS_ESAP = [
  'Por determinar',
  'Subdirección Académica',
  'Subdirección Administrativa y Financiera',
  'Oficina Control Interno Disciplinario (OCID)',
  'Oficina Asesora Jurídica',
  'Oficina de Control Interno',
  'Talento Humano',
  'Sistemas de Información',
  'Comunicaciones',
  ...TERRITORIALES_ESAP
];

// Conductas indisciplinarias ahora se cargan desde la API

// Mapa de valores DB (enum) → etiqueta de display para el SELECT
const ORIGEN_DB_A_LABEL: Record<string, string> = {
  ANONIMO: 'Anónimo',
  QUEJOSO: 'Quejoso',
  OFICIO: 'De oficio',
  REMISION: 'Remisión por competencia',
  POR_DETERMINAR: 'Por determinar',
};

export function CreateNoticiaModal({ onClose, onSave, noticiaToEdit, isEditMode }: CreateNoticiaModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [conductasIndisciplinarias, setConductasIndisciplinarias] = useState<DisciplinaryBehavior[]>([]);
  const [loadingConductas, setLoadingConductas] = useState(true);

  // Cargar conductas indisciplinarias desde la API
  useEffect(() => {
    const loadConductas = async () => {
      try {
        setLoadingConductas(true);
        const conductas = await disciplinaryService.getDisciplinaryBehaviors();
        setConductasIndisciplinarias(conductas);
      } catch (error) {
        console.error('Error loading disciplinary behaviors:', error);
        toast.error('Error al cargar las conductas indisciplinarias');
        // Fallback to empty array
        setConductasIndisciplinarias([]);
      } finally {
        setLoadingConductas(false);
      }
    };

    loadConductas();
  }, []);

  // En edición, el origen llega como valor de enum (ej: 'ANONIMO'). Lo convertimos a la
  // etiqueta que muestra el SELECT (ej: 'Anónimo') para que la opción quede seleccionada.
  const origenInicial = isEditMode && noticiaToEdit?.origen
    ? (ORIGEN_DB_A_LABEL[noticiaToEdit.origen] ?? noticiaToEdit.origen)
    : '';

  const [formData, setFormData] = useState({
    origen: origenInicial,
    fechaQueja: (noticiaToEdit as any)?.fechaQueja || noticiaToEdit?.fechaRecepcion || new Date().toISOString().split('T')[0],
    fechaHechos: noticiaToEdit?.fechaHechos || '',
    territorial: noticiaToEdit?.territorial || '',
    denunciado: {
      nombre: noticiaToEdit?.denunciado?.nombre || '',
      identificacion: noticiaToEdit?.denunciado?.numeroIdentificacion || '',
      cargo: noticiaToEdit?.cargo || '',
      dependencia: noticiaToEdit?.dependencia || ''
    },
    descripcionHechos: noticiaToEdit?.hechos || '',
    conductasSeleccionadas: noticiaToEdit?.conductasSeleccionadas || [] as string[],
    procesosRelacionados: noticiaToEdit?.procesosRelacionados || [] as string[]
  });

  // ✅ NUEVO: Estado para manejar múltiples hechos separados
  const [hechosSeparados, setHechosSeparados] = useState<{ id: string; descripcion: string; fecha?: string }[]>(() => {
    if (noticiaToEdit?.hechosSeparados?.length > 0) return noticiaToEdit.hechosSeparados;
    if (isEditMode && noticiaToEdit?.hechos) {
      return noticiaToEdit.hechos
        .split(/\n\n/)
        .filter((p: string) => p.trim())
        .map((part: string, idx: number) => ({
          id: `edit-hecho-${idx}`,
          descripcion: part.replace(/^Hecho \d+:\s*/i, '').trim() || part.trim()
        }));
    }
    return [];
  });
  const [hechoActual, setHechoActual] = useState('');

  // ✅ NUEVO: Estado para conducta seleccionada y campo personalizado
  const [conductaSeleccionada, setConductaSeleccionada] = useState<string>(
    noticiaToEdit?.conductaSeleccionada || ''
  );
  const [conductaPersonalizada, setConductaPersonalizada] = useState<string>(
    noticiaToEdit?.conductaPersonalizada || ''
  );

  // ✅ Cálculo de la fecha de caducidad (5 años desde la fecha de los hechos)
  const calcularFechaCaducidad = (fechaHechos: string): string => {
    if (!fechaHechos) return '';
    const fecha = new Date(fechaHechos);
    fecha.setFullYear(fecha.getFullYear() + 5);
    return fecha.toISOString().split('T')[0];
  };

  // ✅ Verificar si está próximo a vencer (menos de 6 meses)
  const verificarProximoVencimiento = (fechaHechos: string): boolean => {
    if (!fechaHechos) return false;
    const fechaCaducidad = new Date(calcularFechaCaducidad(fechaHechos));
    const hoy = new Date();
    const seiseMesesAntes = new Date(fechaCaducidad);
    seiseMesesAntes.setMonth(seiseMesesAntes.getMonth() - 6);
    return hoy >= seiseMesesAntes && hoy <= fechaCaducidad;
  };

  // ✅ Verificar si ya caducó
  const verificarCaducado = (fechaHechos: string): boolean => {
    if (!fechaHechos) return false;
    const fechaCaducidad = new Date(calcularFechaCaducidad(fechaHechos));
    const hoy = new Date();
    return hoy > fechaCaducidad;
  };

  // ✅ NUEVO: Estado para múltiples denunciados
  const [denunciados, setDenunciados] = useState<Denunciado[]>(() => {
    if (!isEditMode || !noticiaToEdit) return [];
    const denunciadoObj = noticiaToEdit.denunciado && typeof noticiaToEdit.denunciado !== 'string'
      ? noticiaToEdit.denunciado
      : null;
    const nombre = denunciadoObj?.nombre || '';
    if (!nombre || nombre === 'Sin denunciado') return [];
    return [{
      id: 'edit-0',
      nombre,
      identificacion: denunciadoObj?.numeroIdentificacion || '',
      cargo: noticiaToEdit.cargo || '',
      lugarHechos: noticiaToEdit.dependencia || ''
    }];
  });
  const [currentDenunciado, setCurrentDenunciado] = useState<Denunciado>({
    id: '',
    nombre: '',
    identificacion: '',
    cargo: '',
    lugarHechos: '' // ✅ Cambiado de 'dependencia' a 'lugarHechos'
  });
  const [editingDenunciadoId, setEditingDenunciadoId] = useState<string | null>(null);

  const [denunciantes, setDenunciantes] = useState<Denunciante[]>(() => {
    if (!isEditMode || !noticiaToEdit) return [];
    const denuncianteObj = noticiaToEdit.denunciante && typeof noticiaToEdit.denunciante !== 'string'
      ? noticiaToEdit.denunciante
      : null;
    const nombre = denuncianteObj?.nombre || '';
    if (!nombre || nombre === 'Sin denunciante' || nombre === 'Anonimo') return [];
    return [{
      id: 'edit-0',
      nombre,
      identificacion: denuncianteObj?.numeroIdentificacion || '',
      direccion: '',
      telefono: '',
      correo: '',
      cargo: '',
      entidad: '',
      tipo: 'Denunciante' as const
    }];
  });
  const [currentDenunciante, setCurrentDenunciante] = useState<Denunciante>({
    id: '',
    nombre: '',
    identificacion: '',
    direccion: '',
    telefono: '',
    correo: '',
    cargo: '',
    entidad: '',
    tipo: 'Denunciante' // ✅ NUEVO: Tipo de denunciante
  });
  const [editingDenuncianteId, setEditingDenuncianteId] = useState<string | null>(null);

  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ NUEVO: Estado para apoderados
  const [mostrarApoderadoDenunciado, setMostrarApoderadoDenunciado] = useState(false);
  const [apoderadoDenunciado, setApoderadoDenunciado] = useState<Apoderado>({
    nombre: '',
    cedula: '',
    correo: '',
    celular: '',
    direccion: '' // ✅ NUEVO: Dirección del apoderado
  });

  const [mostrarApoderadoDenunciante, setMostrarApoderadoDenunciante] = useState(false);
  const [apoderadoDenunciante, setApoderadoDenunciante] = useState<Apoderado>({
    nombre: '',
    cedula: '',
    correo: '',
    celular: '',
    direccion: '' // ✅ NUEVO: Dirección del apoderado
  });

  // ✅ NUEVO: Estado para campos "Por determinar"
  const [porDeterminar, setPorDeterminar] = useState({
    // Paso 1
    // En edición: si el origen guardado es POR_DETERMINAR, mostrar el checkbox marcado
    origen: isEditMode ? (noticiaToEdit?.origen === 'POR_DETERMINAR') : false,
    // En edición: si el valor guardado es 'Por determinar', mostrar el checkbox marcado
    territorial: isEditMode ? (noticiaToEdit?.territorial === 'Por determinar') : false,
    // En modo edición, si no hay fechaHechos guardada se marca "Por determinar" para no bloquear el wizard
    fechaHechos: isEditMode ? !noticiaToEdit?.fechaHechos : false,
    // Paso 2 - Denunciado actual
    denunciadoNombre: false,
    denunciadoIdentificacion: false,
    denunciadoCargo: false,
    denunciadoLugarHechos: false,
    // Paso 3 - Denunciante actual
    denuncianteNombre: false,
    denuncianteIdentificacion: false,
    denuncianteDireccion: false,
    denuncianteTelefono: false,
    denuncianteCorreo: false,
    denuncianteCargo: false,
    denuncianteEntidad: false
  });

  // ✅ NUEVO: Función para alternar "Por determinar"
  const togglePorDeterminar = (campo: keyof typeof porDeterminar) => {
    const nuevoValor = !porDeterminar[campo];
    setPorDeterminar({ ...porDeterminar, [campo]: nuevoValor });

    // Auto-completar con "Por determinar" cuando se marca
    if (nuevoValor) {
      // Paso 1
      if (campo === 'origen') handleChange('origen', 'Por determinar');
      if (campo === 'territorial') handleChange('territorial', 'Por determinar');
      // fechaHechos: no limpiar el valor guardado, solo ocultar el input (porDeterminar controla la visibilidad)
      
      // Paso 2 - Denunciado
      if (campo === 'denunciadoNombre') setCurrentDenunciado({ ...currentDenunciado, nombre: 'Por determinar' });
      if (campo === 'denunciadoIdentificacion') setCurrentDenunciado({ ...currentDenunciado, identificacion: 'Por determinar' });
      if (campo === 'denunciadoCargo') setCurrentDenunciado({ ...currentDenunciado, cargo: 'Por determinar' });
      if (campo === 'denunciadoLugarHechos') setCurrentDenunciado({ ...currentDenunciado, lugarHechos: 'Por determinar' });
      
      // Paso 3 - Denunciante
      if (campo === 'denuncianteNombre') setCurrentDenunciante({ ...currentDenunciante, nombre: 'Por determinar' });
      if (campo === 'denuncianteIdentificacion') setCurrentDenunciante({ ...currentDenunciante, identificacion: 'Por determinar' });
      if (campo === 'denuncianteDireccion') setCurrentDenunciante({ ...currentDenunciante, direccion: 'Por determinar' });
      if (campo === 'denuncianteTelefono') setCurrentDenunciante({ ...currentDenunciante, telefono: 'Por determinar' });
      if (campo === 'denuncianteCorreo') setCurrentDenunciante({ ...currentDenunciante, correo: 'Por determinar' });
      if (campo === 'denuncianteCargo') setCurrentDenunciante({ ...currentDenunciante, cargo: 'Por determinar' });
      if (campo === 'denuncianteEntidad') setCurrentDenunciante({ ...currentDenunciante, entidad: 'Por determinar' });
    } else {
      // Limpiar cuando se desmarca
      if (campo === 'origen') handleChange('origen', '');
      if (campo === 'territorial') handleChange('territorial', '');
      // fechaHechos: al desmarcar, mostrar el input con el valor que ya había (no limpiar)
      
      if (campo === 'denunciadoNombre') setCurrentDenunciado({ ...currentDenunciado, nombre: '' });
      if (campo === 'denunciadoIdentificacion') setCurrentDenunciado({ ...currentDenunciado, identificacion: '' });
      if (campo === 'denunciadoCargo') setCurrentDenunciado({ ...currentDenunciado, cargo: '' });
      if (campo === 'denunciadoLugarHechos') setCurrentDenunciado({ ...currentDenunciado, lugarHechos: '' });
      
      if (campo === 'denuncianteNombre') setCurrentDenunciante({ ...currentDenunciante, nombre: '' });
      if (campo === 'denuncianteIdentificacion') setCurrentDenunciante({ ...currentDenunciante, identificacion: '' });
      if (campo === 'denuncianteDireccion') setCurrentDenunciante({ ...currentDenunciante, direccion: '' });
      if (campo === 'denuncianteTelefono') setCurrentDenunciante({ ...currentDenunciante, telefono: '' });
      if (campo === 'denuncianteCorreo') setCurrentDenunciante({ ...currentDenunciante, correo: '' });
      if (campo === 'denuncianteCargo') setCurrentDenunciante({ ...currentDenunciante, cargo: '' });
      if (campo === 'denuncianteEntidad') setCurrentDenunciante({ ...currentDenunciante, entidad: '' });
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('denunciado.')) {
      const subField = field.split('.')[1];
      setFormData({
        ...formData,
        denunciado: {
          ...formData.denunciado,
          [subField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
    // Limpiar error del campo
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // ✅ ELIMINADO: handleConductaToggle - Ya no se usa con el nuevo sistema de select
  // const handleConductaToggle = (conducta: string) => {
  //   const isSelected = formData.conductasSeleccionadas.includes(conducta);
  //   if (isSelected) {
  //     setFormData({
  //       ...formData,
  //       conductasSeleccionadas: formData.conductasSeleccionadas.filter(c => c !== conducta)
  //     });
  //   } else {
  //     setFormData({
  //       ...formData,
  //       conductasSeleccionadas: [...formData.conductasSeleccionadas, conducta]
  //     });
  //   }
  // };

  const handleAgregarDenunciante = () => {
    if (!currentDenunciante.nombre || !currentDenunciante.identificacion) {
      toast.error('Campos requeridos', {
        description: 'Nombre e identificación son obligatorios'
      });
      return;
    }

    const denuncianteData: Denunciante = {
      ...currentDenunciante,
      id: editingDenuncianteId || Date.now().toString(),
      apoderado: mostrarApoderadoDenunciante && apoderadoDenunciante.nombre ? apoderadoDenunciante : undefined
    };

    if (editingDenuncianteId) {
      setDenunciantes(denunciantes.map(d => d.id === editingDenuncianteId ? denuncianteData : d));
      setEditingDenuncianteId(null);
      toast.success('Denunciante actualizado');
    } else {
      setDenunciantes([...denunciantes, denuncianteData]);
      toast.success('Denunciante agregado');
    }

    setCurrentDenunciante({ id: '', nombre: '', identificacion: '', direccion: '', telefono: '', correo: '', cargo: '', entidad: '', tipo: 'Denunciante' });
    setMostrarApoderadoDenunciante(false);
    setApoderadoDenunciante({ nombre: '', cedula: '', correo: '', celular: '', direccion: '' });
  };

  const handleEditarDenunciante = (denunciante: Denunciante) => {
    setCurrentDenunciante({ ...denunciante });
    setEditingDenuncianteId(denunciante.id);
    if (denunciante.apoderado) {
      setMostrarApoderadoDenunciante(true);
      setApoderadoDenunciante(denunciante.apoderado);
    }
  };

  const handleEliminarDenunciante = (id: string) => {
    setDenunciantes(denunciantes.filter(d => d.id !== id));
    if (editingDenuncianteId === id) setEditingDenuncianteId(null);
  };

  // ✅ NUEVO: Funciones para manejar denunciados
  const handleAgregarDenunciado = () => {
    if (!currentDenunciado.nombre || !currentDenunciado.identificacion || !currentDenunciado.lugarHechos) {
      toast.error('Campos requeridos', {
        description: 'Nombre, identificación y lugar de los hechos son obligatorios'
      });
      return;
    }

    const denunciadoData: Denunciado = {
      ...currentDenunciado,
      id: editingDenunciadoId || Date.now().toString(),
      apoderado: mostrarApoderadoDenunciado && apoderadoDenunciado.nombre ? apoderadoDenunciado : undefined
    };

    if (editingDenunciadoId) {
      setDenunciados(denunciados.map(d => d.id === editingDenunciadoId ? denunciadoData : d));
      setEditingDenunciadoId(null);
      toast.success('Denunciado actualizado');
    } else {
      setDenunciados([...denunciados, denunciadoData]);
      toast.success('Denunciado agregado');
    }

    setCurrentDenunciado({ id: '', nombre: '', identificacion: '', cargo: '', lugarHechos: '' });
    setMostrarApoderadoDenunciado(false);
    setApoderadoDenunciado({ nombre: '', cedula: '', correo: '', celular: '', direccion: '' });
  };

  const handleEditarDenunciado = (denunciado: Denunciado) => {
    setCurrentDenunciado({ ...denunciado });
    setEditingDenunciadoId(denunciado.id);
    if (denunciado.apoderado) {
      setMostrarApoderadoDenunciado(true);
      setApoderadoDenunciado(denunciado.apoderado);
    }
  };

  const handleEliminarDenunciado = (id: string) => {
    setDenunciados(denunciados.filter(d => d.id !== id));
    if (editingDenunciadoId === id) setEditingDenunciadoId(null);
  };

  // ✅ NUEVO: Funciones para manejar hechos separados
  const handleAgregarHecho = () => {
    if (!hechoActual || hechoActual.trim().length < 20) {
      toast.error('Hecho inválido', {
        description: 'Debe describir el hecho con al menos 20 caracteres'
      });
      return;
    }

    const nuevoHecho = {
      id: Date.now().toString(),
      descripcion: hechoActual.trim(),
      fecha: new Date().toISOString()
    };

    setHechosSeparados([...hechosSeparados, nuevoHecho]);
    setHechoActual('');
    toast.success('Hecho agregado', {
      description: `Hecho ${hechosSeparados.length + 1} registrado correctamente`
    });
  };

  const handleEliminarHecho = (id: string) => {
    setHechosSeparados(hechosSeparados.filter(h => h.id !== id));
    toast.success('Hecho eliminado');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArchivosAdjuntos([...archivosAdjuntos, ...Array.from(e.target.files)]);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    // ✅ Permitir "Por determinar" como valor válido
    if (!formData.origen) newErrors.origen = 'Debe seleccionar el origen de la noticia';
    if (!formData.territorial) newErrors.territorial = 'Debe seleccionar la territorial';
    if (!formData.fechaHechos && !porDeterminar.fechaHechos) {
      newErrors.fechaHechos = 'Debe ingresar la fecha de los hechos o marcar "Por determinar"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    // En modo edición, los datos del denunciado se mantienen del original si no se agrega uno nuevo
    if (!isEditMode && denunciados.length === 0) {
      newErrors.denunciados = 'Debe agregar al menos un denunciado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    // El paso 3 (denunciantes) es opcional, no requiere validación
    // Los denunciantes pueden agregarse opcionalmente
    return true;
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};

    // En modo edición, hechos y conducta son opcionales (se preservan del original)
    if (!isEditMode && hechosSeparados.length === 0) {
      newErrors.hechos = 'Debe agregar al menos un hecho disciplinario';
    }

    if (!isEditMode && !conductaSeleccionada) {
      newErrors.conductas = 'Debe seleccionar una conducta indisciplinaria';
    }

    // Si seleccionó "Otro", validar descripción (aplica siempre)
    if (conductaSeleccionada === 'Otro') {
      if (!conductaPersonalizada.trim()) {
        newErrors.conductas = 'Debe especificar la conducta indisciplinaria';
      } else if (conductaPersonalizada.trim().length < 10) {
        newErrors.conductas = 'La descripción de la conducta debe tener al menos 10 caracteres';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSave = () => {
    const valid = validateStep4();
    if (!valid) return;

    const currentUser = authService.getCurrentUser();
    const dataToSave = {
      ...formData,
      denunciados, // ✅ Incluir múltiples denunciados
      hechosSeparados, // ✅ Incluir los hechos separados
      denunciantes, // ✅ Incluir múltiples denunciantes
      archivosAdjuntos,
      fechaRegistro: new Date().toISOString(),
      radicadorId: currentUser?.id, // ✅ ID del usuario que radica
      porDeterminar, // ✅ Incluir flags de campos "Por determinar"
      // ✅ NUEVO: Incluir conducta seleccionada
      conductaSeleccionada: conductaSeleccionada === 'Otro' ? conductaPersonalizada : conductaSeleccionada,
      conductaPersonalizada: conductaSeleccionada === 'Otro' ? conductaPersonalizada : null
    };

    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[111] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
        >
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditMode ? 'Editar Noticia Disciplinaria' : 'Nueva Noticia Disciplinaria'}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {isEditMode ? `Noticia ${noticiaToEdit?.numero || ''}` : 'RF001 – Sistema de radicación automática'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Datos Básicos' },
              { num: 2, label: 'Denunciados (Múltiples)' },
              { num: 3, label: 'Denunciantes' },
              { num: 4, label: 'Hechos y Documentos' }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      currentStep >= step.num
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.num}
                  </div>
                  <span className="text-xs mt-2 text-gray-600">{step.label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* PASO 1: Datos Básicos */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Origen de la Noticia *
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={porDeterminar.origen}
                      onChange={() => togglePorDeterminar('origen')}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                      Por determinar
                    </span>
                  </label>
                </div>
                <select
                  value={formData.origen}
                  onChange={(e) => handleChange('origen', e.target.value)}
                  disabled={porDeterminar.origen}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.origen ? 'border-red-500' : 'border-gray-300'
                  } ${porDeterminar.origen ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                >
                  <option value="">Seleccione el origen...</option>
                  <option value="Por determinar">Por determinar</option>
                  {ORIGENES_NOTICIA.map(origen => (
                    <option key={origen} value={origen}>{origen}</option>
                  ))}
                </select>
                {errors.origen && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.origen}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fechaQueja}
                  onChange={(e) => handleChange('fechaQueja', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fecha de la queja o notificación
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Territorial *
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={porDeterminar.territorial}
                      onChange={() => togglePorDeterminar('territorial')}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                      Por determinar
                    </span>
                  </label>
                </div>
                <select
                  value={formData.territorial}
                  onChange={(e) => handleChange('territorial', e.target.value)}
                  disabled={porDeterminar.territorial}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.territorial ? 'border-red-500' : 'border-gray-300'
                  } ${porDeterminar.territorial ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                >
                  <option value="">Seleccione territorial...</option>
                  <option value="Por determinar">Por determinar</option>
                  {TERRITORIALES_ESAP.map(territorial => (
                    <option key={territorial} value={territorial}>{territorial}</option>
                  ))}
                </select>
                {errors.territorial && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.territorial}
                  </p>
                )}
              </div>

              {/* ✅ FECHA DE LOS HECHOS Y CÁLCULO DE CADUCIDAD */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de los Hechos *
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={porDeterminar.fechaHechos}
                      onChange={() => togglePorDeterminar('fechaHechos')}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                      Por determinar
                    </span>
                  </label>
                </div>
                {porDeterminar.fechaHechos ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Fecha por determinar</span>
                  </div>
                ) : (
                  <input
                    type="date"
                    value={formData.fechaHechos}
                    onChange={(e) => handleChange('fechaHechos', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fechaHechos ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Fecha en que ocurrieron los hechos que generan la noticia disciplinaria
                </p>
                {errors.fechaHechos && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.fechaHechos}
                  </p>
                )}

                {/* ✅ CÁLCULO AUTOMÁTICO DE CADUCIDAD (5 AÑOS) */}
                {formData.fechaHechos && !porDeterminar.fechaHechos && (
                  <div className="mt-4 space-y-3">
                    {/* Fecha de Caducidad */}
                    <div className={`p-4 rounded-lg border-2 ${
                      verificarCaducado(formData.fechaHechos) 
                        ? 'bg-red-50 border-red-300' 
                        : verificarProximoVencimiento(formData.fechaHechos)
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-blue-50 border-blue-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          verificarCaducado(formData.fechaHechos)
                            ? 'bg-red-100'
                            : verificarProximoVencimiento(formData.fechaHechos)
                            ? 'bg-amber-100'
                            : 'bg-blue-100'
                        }`}>
                          <Calendar className={`w-5 h-5 ${
                            verificarCaducado(formData.fechaHechos)
                              ? 'text-red-600'
                              : verificarProximoVencimiento(formData.fechaHechos)
                              ? 'text-amber-600'
                              : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-sm font-bold mb-1 ${
                            verificarCaducado(formData.fechaHechos)
                              ? 'text-red-900'
                              : verificarProximoVencimiento(formData.fechaHechos)
                              ? 'text-amber-900'
                              : 'text-blue-900'
                          }`}>
                            {verificarCaducado(formData.fechaHechos)
                              ? '⚠️ ACCIÓN DISCIPLINARIA CADUCADA'
                              : verificarProximoVencimiento(formData.fechaHechos)
                              ? '⏰ PRÓXIMO A VENCER'
                              : '✓ Término de Caducidad Vigente'
                            }
                          </h4>
                          <p className={`text-xs font-medium mb-2 ${
                            verificarCaducado(formData.fechaHechos)
                              ? 'text-red-700'
                              : verificarProximoVencimiento(formData.fechaHechos)
                              ? 'text-amber-700'
                              : 'text-blue-700'
                          }`}>
                            Fecha de caducidad: {new Date(calcularFechaCaducidad(formData.fechaHechos)).toLocaleDateString('es-CO', { 
                              day: '2-digit', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                          <p className={`text-xs ${
                            verificarCaducado(formData.fechaHechos)
                              ? 'text-red-600'
                              : verificarProximoVencimiento(formData.fechaHechos)
                              ? 'text-amber-600'
                              : 'text-blue-600'
                          }`}>
                            {verificarCaducado(formData.fechaHechos)
                              ? 'La acción disciplinaria ha perdido vigencia. Han transcurrido más de 5 años desde la ocurrencia de los hechos.'
                              : verificarProximoVencimiento(formData.fechaHechos)
                              ? 'Menos de 6 meses para el vencimiento. Se recomienda priorizar esta noticia.'
                              : 'Según la ley 1952 de 2019 del Código general disciplinario, la acción disciplinaria caduca a los 5 años desde la ocurrencia de los hechos.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Información Legal */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-700 font-medium mb-1">
                        📖 Marco Legal - ley 1952 de 2019 (Código General Disciplinario)
                      </p>
                      <p className="text-xs text-gray-600">
                        <strong>Artículo 33. Caducidad y prescripción de la acción disciplinaria:</strong> "La acción disciplinaria caducará si transcurridos cinco (5) años desde la ocurrencia de la falta, no se ha proferido auto de apertura de investigación disciplinaria."
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 2: Denunciados (Múltiples) */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <User className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Denunciados</h3>
                    <p className="text-sm text-blue-700">
                      Puede agregar uno o varios denunciados. Al menos un denunciado es obligatorio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario para agregar denunciado */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/30">
                <h3 className="font-semibold text-gray-900 mb-4">Agregar Denunciado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Nombre Completo *
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denunciadoNombre}
                          onChange={() => togglePorDeterminar('denunciadoNombre')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentDenunciado.nombre}
                      onChange={(e) => setCurrentDenunciado({ ...currentDenunciado, nombre: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s]/g, '') })}
                      placeholder="Nombres y apellidos completos"
                      disabled={porDeterminar.denunciadoNombre}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denunciadoNombre ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Identificación *
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denunciadoIdentificacion}
                          onChange={() => togglePorDeterminar('denunciadoIdentificacion')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={currentDenunciado.identificacion}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setCurrentDenunciado({ ...currentDenunciado, identificacion: value });
                      }}
                      onKeyDown={(e) => {
                        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Número de cédula"
                      disabled={porDeterminar.denunciadoIdentificacion}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denunciadoIdentificacion ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Cargo
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denunciadoCargo}
                          onChange={() => togglePorDeterminar('denunciadoCargo')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentDenunciado.cargo}
                      onChange={(e) => setCurrentDenunciado({ ...currentDenunciado, cargo: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s]/g, '') })}
                      placeholder="Cargo del denunciado"
                      disabled={porDeterminar.denunciadoCargo}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denunciadoCargo ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        Lugar de los Hechos *
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denunciadoLugarHechos}
                          onChange={() => togglePorDeterminar('denunciadoLugarHechos')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <select
                      value={currentDenunciado.lugarHechos}
                      onChange={(e) => setCurrentDenunciado({ ...currentDenunciado, lugarHechos: e.target.value })}
                      disabled={porDeterminar.denunciadoLugarHechos}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denunciadoLugarHechos ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Seleccione lugar de los hechos...</option>
                      {DEPENDENCIAS_ESAP.map(dep => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ✅ NUEVO: Sección de Apoderado */}
                <div className="mt-6 pt-4 border-t border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      Apoderado (Opcional)
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mostrarApoderadoDenunciado}
                        onChange={(e) => setMostrarApoderadoDenunciado(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-xs text-gray-600 font-medium">
                        Tiene apoderado
                      </span>
                    </label>
                  </div>

                  {mostrarApoderadoDenunciado && (
                    <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-blue-200">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nombre Completo del Apoderado
                        </label>
                        <input
                          type="text"
                          value={apoderadoDenunciado.nombre}
                          onChange={(e) => setApoderadoDenunciado({ ...apoderadoDenunciado, nombre: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s]/g, '') })}
                          placeholder="Nombres y apellidos del apoderado"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Cédula
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={apoderadoDenunciado.cedula}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setApoderadoDenunciado({ ...apoderadoDenunciado, cedula: value });
                          }}
                          onKeyDown={(e) => {
                            if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Número de cédula"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Número Celular
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          pattern="[0-9]*"
                          value={apoderadoDenunciado.celular}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setApoderadoDenunciado({ ...apoderadoDenunciado, celular: value });
                          }}
                          onKeyDown={(e) => {
                            if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="3001234567"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          value={apoderadoDenunciado.correo}
                          onChange={(e) => setApoderadoDenunciado({ ...apoderadoDenunciado, correo: e.target.value })}
                          placeholder="apoderado@ejemplo.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {/* ✅ NUEVO: Campo de Dirección del Apoderado */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={apoderadoDenunciado.direccion || ''}
                          onChange={(e) => setApoderadoDenunciado({ ...apoderadoDenunciado, direccion: e.target.value })}
                          placeholder="Dirección de residencia u oficina"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Button
                    onClick={handleAgregarDenunciado}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
                  >
                    {editingDenunciadoId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingDenunciadoId ? 'Actualizar Denunciado' : 'Agregar Denunciado'}
                  </Button>
                </div>
              </div>

              {/* Mensaje de error si no hay denunciados */}
              {errors.denunciados && denunciados.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.denunciados}
                  </p>
                </div>
              )}

              {/* Lista de denunciados agregados */}
              {denunciados.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Denunciados Registrados ({denunciados.length})
                  </h3>
                  <div className="space-y-2">
                    {denunciados.map((denunciado, index) => (
                      <div 
                        key={denunciado.id} 
                        className="bg-white border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span 
                                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                              >
                                Denunciado {index + 1}
                              </span>
                              {denunciado.apoderado && (
                                <span 
                                  className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300 flex items-center gap-1"
                                  title="Tiene apoderado asignado"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Con apoderado
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 mb-1">{denunciado.nombre}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <p>
                                <span className="font-medium">Identificación:</span> {denunciado.identificacion}
                              </p>
                              {denunciado.cargo && (
                                <p>
                                  <span className="font-medium">Cargo:</span> {denunciado.cargo}
                                </p>
                              )}
                              <p className="col-span-2">
                                <span className="font-medium">Lugar de los Hechos:</span> {denunciado.lugarHechos}
                              </p>
                            </div>
                            
                            {/* ✅ NUEVO: Mostrar apoderado si existe */}
                            {denunciado.apoderado && (
                              <div className="mt-3 pt-3 border-t border-blue-200 bg-blue-50 rounded-lg p-3">
                                <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1">
                                  <UserCheck className="w-4 h-4" />
                                  Apoderado
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                                  <p><span className="font-semibold">Nombre:</span> {denunciado.apoderado.nombre}</p>
                                  <p><span className="font-semibold">Cédula:</span> {denunciado.apoderado.cedula}</p>
                                  <p><span className="font-semibold">Celular:</span> {denunciado.apoderado.celular}</p>
                                  <p><span className="font-semibold">Correo:</span> {denunciado.apoderado.correo}</p>
                                  {denunciado.apoderado.direccion && (
                                    <p className="col-span-2"><span className="font-semibold">Dirección:</span> {denunciado.apoderado.direccion}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleEditarDenunciado(denunciado)}
                            className="flex-shrink-0 p-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Editar denunciado"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarDenunciado(denunciado.id)}
                            className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                            title="Eliminar denunciado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>✓ Trazabilidad:</strong> Se han registrado {denunciados.length} denunciado(s) en esta noticia disciplinaria.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Denunciantes */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-1">Denunciantes Opcionales</h3>
                    <p className="text-sm text-amber-700">
                      Puede agregar uno o varios denunciantes. Si el origen es "Anónimo", puede omitir esta sección.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario para agregar denunciante */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Agregar Denunciante</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* ✅ NUEVO: Campo Tipo de Denunciante */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Denunciante *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label 
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          currentDenunciante.tipo === 'Denunciante' 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipoDenunciante"
                          checked={currentDenunciante.tipo === 'Denunciante'}
                          onChange={() => setCurrentDenunciante({ ...currentDenunciante, tipo: 'Denunciante' })}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${
                            currentDenunciante.tipo === 'Denunciante' ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            👤 Denunciante
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Persona que reporta los hechos
                          </p>
                        </div>
                      </label>

                      <label 
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          currentDenunciante.tipo === 'Víctima' 
                            ? 'border-purple-600 bg-purple-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipoDenunciante"
                          checked={currentDenunciante.tipo === 'Víctima'}
                          onChange={() => setCurrentDenunciante({ ...currentDenunciante, tipo: 'Víctima' })}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${
                            currentDenunciante.tipo === 'Víctima' ? 'text-purple-900' : 'text-gray-700'
                          }`}>
                            🛡️ Víctima
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Persona afectada por los hechos
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Nombre Completo
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denuncianteNombre}
                          onChange={() => togglePorDeterminar('denuncianteNombre')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentDenunciante.nombre}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, nombre: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s]/g, '') })}
                      disabled={porDeterminar.denuncianteNombre}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteNombre ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Identificación
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denuncianteIdentificacion}
                          onChange={() => togglePorDeterminar('denuncianteIdentificacion')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={currentDenunciante.identificacion}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setCurrentDenunciante({ ...currentDenunciante, identificacion: value });
                      }}
                      onKeyDown={(e) => {
                        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      disabled={porDeterminar.denuncianteIdentificacion}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteIdentificacion ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Dirección
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denuncianteDireccion}
                          onChange={() => togglePorDeterminar('denuncianteDireccion')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentDenunciante.direccion}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, direccion: e.target.value })}
                      disabled={porDeterminar.denuncianteDireccion}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteDireccion ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Teléfono
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denuncianteTelefono}
                          onChange={() => togglePorDeterminar('denuncianteTelefono')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      inputMode="tel"
                      pattern="[0-9]*"
                      value={currentDenunciante.telefono}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setCurrentDenunciante({ ...currentDenunciante, telefono: value });
                      }}
                      onKeyDown={(e) => {
                        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      disabled={porDeterminar.denuncianteTelefono}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteTelefono ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Correo Electrónico
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denuncianteCorreo}
                          onChange={() => togglePorDeterminar('denuncianteCorreo')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="email"
                      value={currentDenunciante.correo}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, correo: e.target.value })}
                      disabled={porDeterminar.denuncianteCorreo}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteCorreo ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Cargo
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denuncianteCargo}
                          onChange={() => togglePorDeterminar('denuncianteCargo')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentDenunciante.cargo}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, cargo: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s]/g, '') })}
                      disabled={porDeterminar.denuncianteCargo}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteCargo ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Entidad
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={porDeterminar.denuncianteEntidad}
                          onChange={() => togglePorDeterminar('denuncianteEntidad')}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600 group-hover:text-blue-600 font-medium">
                          Por determinar
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentDenunciante.entidad}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, entidad: e.target.value })}
                      disabled={porDeterminar.denuncianteEntidad}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteEntidad ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>

                {/* ✅ NUEVO: Sección de Apoderado para Denunciante/Víctima */}
                <div className="mt-6 pt-4 border-t border-gray-300">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      Apoderado (Opcional)
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mostrarApoderadoDenunciante}
                        onChange={(e) => setMostrarApoderadoDenunciante(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-xs text-gray-600 font-medium">
                        Tiene apoderado
                      </span>
                    </label>
                  </div>

                  {mostrarApoderadoDenunciante && (
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-300">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nombre Completo del Apoderado
                        </label>
                        <input
                          type="text"
                          value={apoderadoDenunciante.nombre}
                          onChange={(e) => setApoderadoDenunciante({ ...apoderadoDenunciante, nombre: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s]/g, '') })}
                          placeholder="Nombres y apellidos del apoderado"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Cédula
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={apoderadoDenunciante.cedula}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setApoderadoDenunciante({ ...apoderadoDenunciante, cedula: value });
                          }}
                          onKeyDown={(e) => {
                            if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Número de cédula"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Número Celular
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          pattern="[0-9]*"
                          value={apoderadoDenunciante.celular}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setApoderadoDenunciante({ ...apoderadoDenunciante, celular: value });
                          }}
                          onKeyDown={(e) => {
                            if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="3001234567"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          value={apoderadoDenunciante.correo}
                          onChange={(e) => setApoderadoDenunciante({ ...apoderadoDenunciante, correo: e.target.value })}
                          placeholder="apoderado@ejemplo.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Button
                    onClick={handleAgregarDenunciante}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
                  >
                    {editingDenuncianteId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingDenuncianteId ? 'Actualizar Denunciante' : 'Agregar Denunciante'}
                  </Button>
                </div>
              </div>

              {/* Lista de denunciantes agregados */}
              {denunciantes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Denunciantes Registrados ({denunciantes.length})
                  </h3>
                  <div className="space-y-2">
                    {denunciantes.map(denunciante => (
                      <div key={denunciante.id} className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {/* ✅ NUEVO: Badge distintivo según tipo */}
                              <span 
                                className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${
                                  denunciante.tipo === 'Víctima' 
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700' 
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700'
                                }`}
                              >
                                {denunciante.tipo === 'Víctima' ? '🛡️ Víctima' : '👤 Denunciante'}
                              </span>
                              {denunciante.apoderado && (
                                <span 
                                  className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300 flex items-center gap-1"
                                  title="Tiene apoderado asignado"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Con apoderado
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 mb-1">{denunciante.nombre}</p>
                            <p className="text-sm text-gray-600">
                              {denunciante.identificacion} • {denunciante.entidad || 'Sin entidad'}
                            </p>
                            
                            {/* ✅ NUEVO: Mostrar apoderado si existe */}
                            {denunciante.apoderado && (
                              <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                                  <UserCheck className="w-4 h-4" />
                                  Apoderado
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                                  <p><span className="font-semibold">Nombre:</span> {denunciante.apoderado.nombre}</p>
                                  <p><span className="font-semibold">Cédula:</span> {denunciante.apoderado.cedula}</p>
                                  <p><span className="font-semibold">Celular:</span> {denunciante.apoderado.celular}</p>
                                  <p><span className="font-semibold">Correo:</span> {denunciante.apoderado.correo}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleEditarDenunciante(denunciante)}
                            className="flex-shrink-0 p-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Editar denunciante"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarDenunciante(denunciante.id)}
                            className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                            title="Eliminar denunciante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>✓ Trazabilidad:</strong> Se han registrado {denunciantes.length} denunciante(s) en esta noticia disciplinaria.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Hechos y Documentos */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* ✅ NUEVO SISTEMA: HECHOS DISCIPLINARIOS SEPARADOS */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Hechos Disciplinarios *
                </label>
                
                {/* Formulario para agregar nuevo hecho */}
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/30 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Agregar Nuevo Hecho</h3>
                  <textarea
                    value={hechoActual}
                    onChange={(e) => setHechoActual(e.target.value)}
                    rows={4}
                    placeholder="Ejemplo: La persona tuvo una conducta muy irregular con el estudiante en una sesión de clases..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      {hechoActual.length} caracteres {hechoActual.length < 20 && hechoActual.length > 0 && `(mínimo 20 requeridos)`}
                    </p>
                    <Button
                      onClick={handleAgregarHecho}
                      variant="outline"
                      size="sm"
                      className="border-blue-600 text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Agregar Hecho
                    </Button>
                  </div>
                </div>

                {/* Mensaje de error si no hay hechos */}
                {errors.hechos && hechosSeparados.length === 0 && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.hechos}
                  </p>
                )}

                {/* Lista de hechos agregados */}
                {hechosSeparados.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Hechos Registrados ({hechosSeparados.length})
                    </h3>
                    <div className="space-y-3">
                      {hechosSeparados.map((hecho, index) => (
                        <div 
                          key={hecho.id} 
                          className="bg-white border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span 
                                  className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                  style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                                >
                                  Hecho {index + 1}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(hecho.fecha || '').toLocaleDateString('es-CO', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 leading-relaxed">{hecho.descripcion}</p>
                              <p className="text-xs text-gray-500 mt-1">{hecho.descripcion.length} caracteres</p>
                            </div>
                            <button
                              onClick={() => handleEliminarHecho(hecho.id)}
                              className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                              title="Eliminar hecho"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800">
                        <strong>✓ Trazabilidad:</strong> Se han registrado {hechosSeparados.length} hecho(s) disciplinario(s) de forma separada para mantener la trazabilidad completa.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Conducta Presuntamente Indisciplinaria *
                </label>
                <select
                  value={conductaSeleccionada}
                  onChange={(e) => {
                    setConductaSeleccionada(e.target.value);
                    if (e.target.value !== 'Otro') {
                      setConductaPersonalizada(''); // Limpiar campo personalizado si no es "Otro"
                    }
                  }}
                  disabled={loadingConductas}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingConductas ? 'Cargando conductas...' : 'Seleccione la conducta presuntamente indisciplinaria...'}
                  </option>
                  {conductasIndisciplinarias.map(conducta => (
                    <option key={conducta.id} value={conducta.nombre}>
                      {conducta.nombre}
                    </option>
                  ))}
                </select>
                {errors.conductas && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.conductas}
                  </p>
                )}
                
                {/* ✅ NUEVO: Campo de texto para "Otro" */}
                {conductaSeleccionada === 'Otro' && (
                  <div className="mt-3 bg-blue-50 border-2 border-blue-300 rounded-lg p-4 animate-fadeIn">
                    <label className="block text-xs font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Especifique la conducta indisciplinaria
                    </label>
                    <textarea
                      value={conductaPersonalizada}
                      onChange={(e) => setConductaPersonalizada(e.target.value)}
                      placeholder="Ejemplo: Uso indebido de información privilegiada para beneficio personal..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                    />
                    {conductaPersonalizada && conductaPersonalizada.trim().length > 10 ? (
                      <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded-lg">
                        <p className="text-xs text-green-800 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Conducta personalizada registrada ({conductaPersonalizada.trim().length} caracteres)
                        </p>
                      </div>
                    ) : conductaPersonalizada && (
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ Por favor, proporcione una descripción más detallada (mínimo 10 caracteres)
                      </p>
                    )}
                  </div>
                )}

                {conductaSeleccionada && conductaSeleccionada !== 'Otro' && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded-lg">
                    <p className="text-xs text-green-800 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Conducta seleccionada: <strong>{conductaSeleccionada}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* ✅ NUEVO: Resumen de Apoderados */}
              {(denunciados.some(d => d.apoderado) || denunciantes.some(d => d.apoderado)) && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    Apoderados Asignados en esta Noticia
                  </h4>
                  <div className="space-y-3">
                    {denunciados.filter(d => d.apoderado).map((denunciado, idx) => (
                      <div key={idx} className="bg-white border border-green-200 rounded p-3">
                        <p className="text-xs font-bold text-gray-900 mb-1">
                          Denunciado: {denunciado.nombre}
                        </p>
                        <p className="text-xs text-gray-700">
                          Apoderado: <span className="font-semibold">{denunciado.apoderado!.nombre}</span> • 
                          CC: {denunciado.apoderado!.cedula} • 
                          Tel: {denunciado.apoderado!.celular}
                          {denunciado.apoderado!.direccion && <> • Dir: {denunciado.apoderado!.direccion}</>}
                        </p>
                      </div>
                    ))}
                    {denunciantes.filter(d => d.apoderado).map((denunciante, idx) => (
                      <div key={idx} className="bg-white border border-green-200 rounded p-3">
                        <p className="text-xs font-bold text-gray-900 mb-1">
                          {denunciante.tipo}: {denunciante.nombre}
                        </p>
                        <p className="text-xs text-gray-700">
                          Apoderado: <span className="font-semibold">{denunciante.apoderado!.nombre}</span> • 
                          CC: {denunciante.apoderado!.cedula} • 
                          Tel: {denunciante.apoderado!.celular}
                          {denunciante.apoderado!.direccion && <> • Dir: {denunciante.apoderado!.direccion}</>}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-green-700 mt-3 italic">
                    ✓ Los apoderados podrán actuar en nombre de sus representados durante el proceso disciplinario.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Upload className="w-4 h-4 inline mr-1" />
                  Documentos Soporte
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Click para seleccionar archivos
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, Word, Excel, imágenes
                    </p>
                  </label>
                </div>
                {archivosAdjuntos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {archivosAdjuntos.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          onClick={() => setArchivosAdjuntos(archivosAdjuntos.filter((_, i) => i !== idx))}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50">
          <Button
            onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
            variant="outline"
          >
            {currentStep === 1 ? 'Cancelar' : 'Anterior'}
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={handleNextStep}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              Guardar Noticia
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}