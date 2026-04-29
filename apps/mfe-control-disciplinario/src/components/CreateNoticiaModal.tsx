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
import { Button } from '@esap-mfe/shared-ui/button';
import { toast } from 'sonner';
import { disciplinaryService, DisciplinaryBehavior } from '../../../services/api/disciplinary.service';
import { authService } from '../../../services/api/authService';

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
  onSave: (data: any) => Promise<void>;
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

// Función para validar email
const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
      nombre: noticiaToEdit?.denunciado?.nombre || noticiaToEdit?.disciplinable?.nombre || '',
      identificacion: noticiaToEdit?.denunciado?.numeroIdentificacion || noticiaToEdit?.disciplinable?.cedula || noticiaToEdit?.disciplinable?.documento || '',
      cargo: noticiaToEdit?.cargo || noticiaToEdit?.disciplinable?.cargo || '',
      dependencia: noticiaToEdit?.dependencia || noticiaToEdit?.disciplinable?.dependencia || ''
    },
    descripcionHechos: noticiaToEdit?.hechos || '',
    conductasSeleccionadas: noticiaToEdit?.conductasSeleccionadas || noticiaToEdit?.conductas || [] as string[],
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
    noticiaToEdit?.conductaSeleccionada || noticiaToEdit?.conductas?.[0] || ''
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

    // Handle both single object and array formats
    let denunciadoData: any[] = [];
    if (noticiaToEdit.denunciados && Array.isArray(noticiaToEdit.denunciados)) {
      denunciadoData = noticiaToEdit.denunciados;
    } else if (noticiaToEdit.denunciado && typeof noticiaToEdit.denunciado !== 'string') {
      denunciadoData = [noticiaToEdit.denunciado];
    } else if (noticiaToEdit.disciplinable) {
      denunciadoData = [noticiaToEdit.disciplinable];
    }

    return denunciadoData
      .filter(d => d?.nombre && d.nombre !== 'Sin denunciado')
      .map((d, index) => ({
        id: `edit-${index}`,
        nombre: d.nombre || '',
        identificacion: d.numeroIdentificacion || d.cedula || d.documento || d.identificacion || '',
        cargo: d.cargo || noticiaToEdit.cargo || '',
        lugarHechos: d.lugarHechos || d.dependencia || noticiaToEdit.dependencia || ''
      }));
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

    // Handle both single object and array formats
    let denuncianteData: any[] = [];
    if (noticiaToEdit.denunciantes && Array.isArray(noticiaToEdit.denunciantes)) {
      denuncianteData = noticiaToEdit.denunciantes;
    } else if (noticiaToEdit.denunciante && typeof noticiaToEdit.denunciante !== 'string') {
      denuncianteData = [noticiaToEdit.denunciante];
    } else if (noticiaToEdit.denunciante) {
      denuncianteData = [noticiaToEdit.denunciante];
    }

    return denuncianteData
      .filter(d => d?.nombre && d.nombre !== 'Sin denunciante' && d.nombre !== 'Anonimo')
      .map((d, index) => ({
        id: `edit-${index}`,
        nombre: d.nombre || '',
        identificacion: d.numeroIdentificacion || d.cedula || d.documento || d.identificacion || '',
        direccion: d.direccion || '',
        telefono: d.telefono || '',
        correo: d.email || d.correo || '',
        cargo: d.cargo || '',
        entidad: d.entidad || d.dependencia || '',
        tipo: (d.tipo as 'Denunciante' | 'Víctima') || 'Denunciante'
      }));
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

    // Reset form to normal state: checkboxes unchecked and inputs empty for new entry
    // Reset denunciante "Por determinar" checkboxes to false (unchecked) for clean state
    setPorDeterminar(prev => ({
      ...prev,
      denuncianteNombre: false,
      denuncianteIdentificacion: false,
      denuncianteDireccion: false,
      denuncianteTelefono: false,
      denuncianteCorreo: false,
      denuncianteCargo: false,
      denuncianteEntidad: false
    }));
    // Then reset form fields to empty values
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
    // Set "Por determinar" checkboxes based on current values
    setPorDeterminar(prev => ({
      ...prev,
      denuncianteNombre: denunciante.nombre === 'Por determinar',
      denuncianteIdentificacion: denunciante.identificacion === 'Por determinar',
      denuncianteDireccion: denunciante.direccion === 'Por determinar',
      denuncianteTelefono: denunciante.telefono === 'Por determinar',
      denuncianteCorreo: denunciante.correo === 'Por determinar',
      denuncianteCargo: denunciante.cargo === 'Por determinar',
      denuncianteEntidad: denunciante.entidad === 'Por determinar'
    }));
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

    // Reset form to normal state: checkboxes unchecked and inputs empty for new entry
    // Reset denunciado "Por determinar" checkboxes to false (unchecked) for clean state
    setPorDeterminar(prev => ({
      ...prev,
      denunciadoNombre: false,
      denunciadoIdentificacion: false,
      denunciadoCargo: false,
      denunciadoLugarHechos: false
    }));
    // Then reset form fields to empty values
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
    // Set "Por determinar" checkboxes based on current values
    setPorDeterminar(prev => ({
      ...prev,
      denunciadoNombre: denunciado.nombre === 'Por determinar',
      denunciadoIdentificacion: denunciado.identificacion === 'Por determinar',
      denunciadoCargo: denunciado.cargo === 'Por determinar',
      denunciadoLugarHechos: denunciado.lugarHechos === 'Por determinar'
    }));
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

    // Validar email del apoderado del denunciado si existe
    if (mostrarApoderadoDenunciado && apoderadoDenunciado.correo) {
      if (apoderadoDenunciado.correo !== 'Por determinar' && !validarEmail(apoderadoDenunciado.correo)) {
        newErrors.apoderadoDenunciadoEmail = 'El email del apoderado debe ser válido o estar vacío';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    // Validar email del denunciante si existe
    if (currentDenunciante.correo && !porDeterminar.denuncianteCorreo) {
      if (currentDenunciante.correo !== 'Por determinar' && !validarEmail(currentDenunciante.correo)) {
        newErrors.denuncianteEmail = 'El email del denunciante debe ser válido o estar vacío';
      }
    }

    // Validar email del apoderado del denunciante si existe
    if (mostrarApoderadoDenunciante && apoderadoDenunciante.correo) {
      if (apoderadoDenunciante.correo !== 'Por determinar' && !validarEmail(apoderadoDenunciante.correo)) {
        newErrors.apoderadoDenuncianteEmail = 'El email del apoderado debe ser válido o estar vacío';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSave = async () => {
    // Validar todos los pasos antes de guardar
    const step1Valid = validateStep1();
    const step2Valid = validateStep2();
    const step3Valid = validateStep3();
    const step4Valid = validateStep4();

    if (!step1Valid || !step2Valid || !step3Valid || !step4Valid) {
      // Encontrar el primer paso con errores y navegar a él
      if (!step1Valid) setCurrentStep(1);
      else if (!step2Valid) setCurrentStep(2);
      else if (!step3Valid) setCurrentStep(3);
      return;
    }

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

    try {
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      // Error is handled by the parent, but ensure modal stays open
      console.error('Error saving noticia:', error);
    }
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
              {isEditMode ? 'Editar Noticia Disciplinaria' : 'Nueva Noticia Disciplinariass'}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {isEditMode ? `Noticia ${noticiaToEdit?.numero || ''}` : 'RF0012 – Sistema de radicación automática'}
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
              { num: 1, label: 'Datos Básicossssssssss' },
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
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || validarEmail(value)) {
                              setApoderadoDenunciado({ ...apoderadoDenunciado, correo: value });
                            }
                          }}
                          placeholder="apoderado@ejemplo.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.apoderadoDenunciadoEmail && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.apoderadoDenunciadoEmail}
                          </p>
                        )}
                      </div>
                      {/* ✅ NUEVO: Campo de Dirección del Apoderado */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={apoderadoDenunciado.direccion}
                          onChange={(e) => setApoderadoDenunciado({ ...apoderadoDenunciado, direccion: e.target.value })}
                          placeholder="Dirección completa"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón Agregar */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleAgregarDenunciado}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Denunciado
                  </button>
                </div>
              </div>

              {/* Lista de denunciados agregados */}
              {denunciados.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Denunciados Agregados</h3>
                  {denunciados.map((denunciado) => (
                    <div key={denunciado.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Nombre Completo
                              </label>
                              <p className="text-sm text-gray-900">{denunciado.nombre}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Identificación
                              </label>
                              <p className="text-sm text-gray-900">{denunciado.identificacion}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Cargo
                              </label>
                              <p className="text-sm text-gray-900">{denunciado.cargo}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Lugar de los Hechos
                              </label>
                              <p className="text-sm text-gray-900">{denunciado.lugarHechos}</p>
                            </div>
                          </div>
                          {denunciado.apoderado && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-2">Apoderado:</p>
                              <p className="text-sm text-gray-900">{denunciado.apoderado.nombre}</p>
                              <p className="text-xs text-gray-600">Cédula: {denunciado.apoderado.cedula}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditarDenunciado(denunciado)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarDenunciado(denunciado.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Denunciantes */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <User className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">Denunciantes</h3>
                    <p className="text-sm text-green-700">
                      Agregue denunciantes si aplica. Este paso es opcional.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario para agregar denunciante */}
              <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50/30">
                <h3 className="font-semibold text-gray-900 mb-4">Agregar Denunciante</h3>
                <div className="grid grid-cols-2 gap-4">
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
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || validarEmail(value)) {
                          setCurrentDenunciante({ ...currentDenunciante, correo: value });
                        }
                      }}
                      disabled={porDeterminar.denuncianteCorreo}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${porDeterminar.denuncianteCorreo ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                    {errors.denuncianteEmail && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.denuncianteEmail}
                      </p>
                    )}
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
                <div className="mt-6 pt-4 border-t border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      Apoderado (Opcional)
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mostrarApoderadoDenunciante}
                        onChange={(e) => setMostrarApoderadoDenunciante(e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded border-gray-300"
                      />
                      <span className="text-xs text-gray-600 font-medium">
                        Tiene apoderado
                      </span>
                    </label>
                  </div>

                  {mostrarApoderadoDenunciante && (
                    <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-green-200">
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
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || validarEmail(value)) {
                              setApoderadoDenunciante({ ...apoderadoDenunciante, correo: value });
                            }
                          }}
                          placeholder="apoderado@ejemplo.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.apoderadoDenuncianteEmail && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.apoderadoDenuncianteEmail}
                          </p>
                        )}
                      </div>
                      {/* ✅ NUEVO: Campo de Dirección del Apoderado */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={apoderadoDenunciante.direccion}
                          onChange={(e) => setApoderadoDenunciante({ ...apoderadoDenunciante, direccion: e.target.value })}
                          placeholder="Dirección completa"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón Agregar */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleAgregarDenunciante}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Denunciante
                  </button>
                </div>
              </div>

              {/* Lista de denunciantes agregados */}
              {denunciantes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Denunciantes Agregados</h3>
                  {denunciantes.map((denunciante) => (
                    <div key={denunciante.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Nombre Completo
                              </label>
                              <p className="text-sm text-gray-900">{denunciante.nombre}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Identificación
                              </label>
                              <p className="text-sm text-gray-900">{denunciante.identificacion}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Cargo
                              </label>
                              <p className="text-sm text-gray-900">{denunciante.cargo}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Entidad
                              </label>
                              <p className="text-sm text-gray-900">{denunciante.entidad}</p>
                            </div>
                          </div>
                          {denunciante.apoderado && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-2">Apoderado:</p>
                              <p className="text-sm text-gray-900">{denunciante.apoderado.nombre}</p>
                              <p className="text-xs text-gray-600">Cédula: {denunciante.apoderado.cedula}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditarDenunciante(denunciante)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarDenunciante(denunciante.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Hechos y Documentos */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-1">Hechos y Documentos</h3>
                    <p className="text-sm text-purple-700">
                      Describa los hechos disciplinarios y adjunte documentos de soporte.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hechos Separados */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Hechos Disciplinarios</h3>
                <div className="space-y-4">
                  {hechosSeparados.map((hecho, index) => (
                    <div key={hecho.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">Hecho {index + 1}</h4>
                          <p className="text-sm text-gray-700">{hecho.descripcion}</p>
                          {hecho.fecha && (
                            <p className="text-xs text-gray-500 mt-2">
                              Registrado: {new Date(hecho.fecha).toLocaleString('es-CO')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEliminarHecho(hecho.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50/30">
                    <h4 className="font-medium text-gray-900 mb-3">Agregar Nuevo Hecho</h4>
                    <textarea
                      value={hechoActual}
                      onChange={(e) => setHechoActual(e.target.value)}
                      placeholder="Describa detalladamente el hecho disciplinario..."
                      className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleAgregarHecho}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar Hecho
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conducta Indisciplinaria */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Conducta Indisciplinaria</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conducta *
                    </label>
                    <select
                      value={conductaSeleccionada}
                      onChange={(e) => setConductaSeleccionada(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Seleccione una conducta...</option>
                      {conductasIndisciplinarias.map((conducta) => (
                        <option key={conducta.id} value={conducta.nombre}>
                          {conducta.nombre}
                        </option>
                      ))}
                      <option value="Otro">Otro (especificar)</option>
                    </select>
                  </div>
                  {conductaSeleccionada === 'Otro' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Especificar Conducta *
                      </label>
                      <input
                        type="text"
                        value={conductaPersonalizada}
                        onChange={(e) => setConductaPersonalizada(e.target.value)}
                        placeholder="Describa la conducta indisciplinaria"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Archivos Adjuntos */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Documentos de Soporte</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      Click para adjuntar archivos
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.avi,.mov,.mkv,.webm"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, Word, Excel, Imágenes, Videos (Máx. 10MB c/u)
                  </p>
                </div>

                {/* Lista de archivos */}
                {archivosAdjuntos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {archivosAdjuntos.map((archivo, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 flex-1">{archivo.name}</span>
                        <span className="text-xs text-gray-500">
                          {(archivo.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Paso {currentStep} de 4
          </div>
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
            )}
            {currentStep < 4 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2"
                style={{ background: '#003DA5' }}
              >
                Siguiente
                <AlertCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2"
                style={{ background: '#10B981' }}
              >
                <Save className="w-4 h-4" />
                {isEditMode ? 'Actualizar Noticia' : 'Guardar Noticia'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}