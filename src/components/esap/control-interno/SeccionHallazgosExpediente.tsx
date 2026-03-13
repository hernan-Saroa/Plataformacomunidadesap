/**
 * ============================================
 * SECCIÓN: HALLAZGOS EN EXPEDIENTE
 * ============================================
 * 
 * Componente para gestionar hallazgos dentro del expediente de auditoría
 * CONECTADO AL BACKEND
 * 
 * FUNCIONALIDADES:
 * - Lista de hallazgos con filtros
 * - Crear nuevo hallazgo (conectado a backend)
 * - Editar hallazgo existente
 * - Ver detalle de hallazgo
 * - Filtros por categoría, estado
 * 
 * ÚLTIMA ACTUALIZACIÓN: 18 Febrero 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle, Plus, Edit2, Eye, Trash2, Search, Filter,
  CheckCircle, Clock, AlertTriangle, FileText, X, Loader2, Upload, Paperclip, Download
} from 'lucide-react';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { controlInternoService, type Hallazgo } from '../../../services/api/controlInternoService';
import { toast } from 'sonner';

// Tipos locales para UI
type CategoriaHallazgo = 'critico' | 'controversia' | 'borrador';
type EstadoHallazgo = 'borrador' | 'notificado' | 'aceptado' | 'en-controversia' | 'ratificado' | 'modificado' | 'retirado' | 'cerrado';

// Áreas/Dependencias de la ESAP
const AREAS_ESAP = [
  'Rectoría Nacional',
  'Secretaría General',
  'Subdirección Académica',
  'Subdirección Administrativa y Financiera',
  'Oficina de Control Interno',
  'Oficina Control Interno Disciplinario (OCID)',
  'Oficina Asesora Jurídica',
  'Oficina Asesora de Planeación',
  'Talento Humano',
  'Sistemas de Información',
  'Comunicaciones',
  'Dirección de Docencia',
  'Dirección de Investigación',
  'Otra'
];

interface Props {
  auditoriaId: string;
  auditoriaNombre: string;
  /** Si true, muestra selector Tipo (Preliminar/Identificado). Preliminar oculta el bloque de evidencia */
  permitirTipoPreliminar?: boolean;
}

// Tipo para personas disponibles
interface PersonaDisponible {
  id: string;
  nombre: string;
  cargo?: string;
}

export function SeccionHallazgosExpediente({ auditoriaId, auditoriaNombre, permitirTipoPreliminar }: Props) {
  // Estados para datos
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personasDisponibles, setPersonasDisponibles] = useState<PersonaDisponible[]>([]);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);

  // Estados para UI
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaHallazgo | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoHallazgo | ''>('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [archivosEvidencia, setArchivosEvidencia] = useState<File[]>([]);
  
  // Estado para evidencias del hallazgo seleccionado (cargadas del backend)
  const [evidenciasHallazgo, setEvidenciasHallazgo] = useState<any[]>([]);
  const [cargandoEvidencias, setCargandoEvidencias] = useState(false);
  
  // Estado para evidencias de TODOS los hallazgos (para mostrar en tarjetas)
  const [evidenciasPorHallazgo, setEvidenciasPorHallazgo] = useState<Record<string, any[]>>({});
  
  // Estado para edición (null = creando nuevo, string = editando ese ID)
  const [hallazgoEditandoId, setHallazgoEditandoId] = useState<string | null>(null);

  const [tipoHallazgo, setTipoHallazgo] = useState<'preliminar' | 'identificado'>('identificado');

  // Estado para nuevo hallazgo
  const [nuevoHallazgo, setNuevoHallazgo] = useState({
    titulo: '',
    categoria: 'borrador' as CategoriaHallazgo,
    area: '',
    descripcion: '',
    criterioIncumplido: '',
    fechaDeteccion: new Date().toISOString().split('T')[0],
    responsable: ''
  });

  // Validar si es un UUID válido
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Obtener nombre de persona por ID
  const getNombreResponsable = (responsableId: string | undefined): string => {
    if (!responsableId) return 'Sin asignar';
    const persona = personasDisponibles.find(p => p.id === responsableId);
    return persona ? persona.nombre : responsableId;
  };

  // Cargar hallazgos del backend
  const cargarHallazgos = useCallback(async () => {
    // No hacer la llamada si no es un UUID válido (evita errores con IDs de ejemplo como 'aud-001')
    if (!isValidUUID(auditoriaId)) {
      console.warn('[SeccionHallazgosExpediente] auditoriaId no es un UUID válido:', auditoriaId);
      setHallazgos([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await controlInternoService.getHallazgosByAuditoria(auditoriaId);
      setHallazgos(data);
    } catch (err: any) {
      console.error('Error cargando hallazgos:', err);
      setError('Error al cargar hallazgos');
      // Si hay error, usar array vacío
      setHallazgos([]);
    } finally {
      setLoading(false);
    }
  }, [auditoriaId]);

  useEffect(() => {
    cargarHallazgos();
  }, [cargarHallazgos]);

  // Cargar evidencias de todos los hallazgos para mostrar en tarjetas
  useEffect(() => {
    const cargarTodasEvidencias = async () => {
      if (hallazgos.length === 0) return;
      
      const evidenciasMap: Record<string, any[]> = {};
      
      // Cargar evidencias de cada hallazgo en paralelo
      await Promise.all(
        hallazgos.map(async (hallazgo) => {
          try {
            const evidencias = await controlInternoService.getEvidenciasByHallazgo(hallazgo.id);
            evidenciasMap[hallazgo.id] = evidencias || [];
          } catch (err) {
            evidenciasMap[hallazgo.id] = [];
          }
        })
      );
      
      setEvidenciasPorHallazgo(evidenciasMap);
    };
    
    cargarTodasEvidencias();
  }, [hallazgos]);

  // Cargar personas disponibles
  useEffect(() => {
    const cargarPersonas = async () => {
      setCargandoPersonas(true);
      try {
        const { auditoriasApi } = await import('./services/api');
        const response = await auditoriasApi.getPersonasDisponibles();
        if (response.success && response.data) {
          const personas = response.data.map((p: any) => ({
            id: String(p.idPersona || p.id_tercero || p.id),
            nombre: p.nombre || p.nom_largo || 'Sin nombre',
            cargo: p.cargo || 'Auditor'
          }));
          setPersonasDisponibles(personas);
        }
      } catch (err) {
        console.error('Error cargando personas:', err);
      } finally {
        setCargandoPersonas(false);
      }
    };
    cargarPersonas();
  }, []);

  // Filtrar hallazgos localmente
  const hallazgosFiltrados = hallazgos.filter(h => {
    if (filtroCategoria && h.categoria !== filtroCategoria) return false;
    if (filtroEstado && h.estado !== filtroEstado) return false;
    if (busqueda) {
      const term = busqueda.toLowerCase();
      return (
        h.codigo?.toLowerCase().includes(term) ||
        h.descripcion?.toLowerCase().includes(term) ||
        h.area?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Contadores
  const totalHallazgos = hallazgos.length;
  const hallazgosCriticos = hallazgos.filter(h => h.categoria === 'critico').length;

  // Crear o actualizar hallazgo
  const handleCrearHallazgo = async () => {
    if (!nuevoHallazgo.area || !nuevoHallazgo.descripcion || !nuevoHallazgo.criterioIncumplido) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    // Validar UUID antes de crear
    if (!hallazgoEditandoId && !isValidUUID(auditoriaId)) {
      toast.error('No se puede crear hallazgo: ID de auditoría no válido');
      return;
    }

    try {
      setGuardando(true);
      
      let hallazgoId = hallazgoEditandoId;
      
      if (hallazgoEditandoId) {
        // Actualizar hallazgo existente
        await controlInternoService.updateHallazgo(hallazgoEditandoId, {
          categoria: nuevoHallazgo.categoria,
          area: nuevoHallazgo.area,
          descripcion: nuevoHallazgo.descripcion,
          criterioIncumplido: nuevoHallazgo.criterioIncumplido,
          responsable: nuevoHallazgo.responsable || undefined
        });
        toast.success('Hallazgo actualizado exitosamente');
      } else {
        // Crear nuevo hallazgo primero (sin evidencias)
        const hallazgoCreado = await controlInternoService.createHallazgo({
          titulo: nuevoHallazgo.descripcion.substring(0, 100),
          categoria: nuevoHallazgo.categoria,
          area: nuevoHallazgo.area,
          descripcion: nuevoHallazgo.descripcion,
          criterioIncumplido: nuevoHallazgo.criterioIncumplido,
          fechaDeteccion: nuevoHallazgo.fechaDeteccion,
          responsable: nuevoHallazgo.responsable || undefined,
          auditoria: auditoriaNombre,
          auditoriaId: auditoriaId
        });
        hallazgoId = hallazgoCreado.id;
        toast.success('Hallazgo creado exitosamente');
      }
      
      // Subir archivos de evidencia (solo si no es preliminar)
      if (archivosEvidencia.length > 0 && hallazgoId && tipoHallazgo === 'identificado') {
        toast.info(`Subiendo ${archivosEvidencia.length} archivo(s)...`);
        
        for (const archivo of archivosEvidencia) {
          try {
            await controlInternoService.createEvidencia(
              archivo,
              {
                nombre: archivo.name,
                descripcion: `Evidencia para hallazgo`,
                tipoDocumento: 'evidencia_hallazgo',
                hallazgoId: hallazgoId,
                subidoPor: 'Sistema'
              }
            );
          } catch (uploadErr) {
            console.error(`Error subiendo ${archivo.name}:`, uploadErr);
            toast.error(`Error al subir: ${archivo.name}`);
          }
        }
        toast.success('Archivos subidos correctamente');
      }
      
      setMostrarFormulario(false);
      setHallazgoEditandoId(null);
      setNuevoHallazgo({
        titulo: '',
        categoria: 'borrador',
        area: '',
        descripcion: '',
        criterioIncumplido: '',
        fechaDeteccion: new Date().toISOString().split('T')[0],
        responsable: ''
      });
      setArchivosEvidencia([]);
      setTipoHallazgo('identificado');
      cargarHallazgos();
    } catch (err: any) {
      console.error('Error creando hallazgo:', err);
      toast.error('Error al crear hallazgo');
    } finally {
      setGuardando(false);
    }
  };

  // Abrir formulario para editar hallazgo
  const handleEditarHallazgo = (hallazgo: Hallazgo) => {
    setHallazgoEditandoId(hallazgo.id);
    setNuevoHallazgo({
      titulo: (hallazgo as any).titulo || hallazgo.descripcion?.substring(0, 100) || '',
      categoria: hallazgo.categoria as CategoriaHallazgo,
      area: hallazgo.area,
      descripcion: hallazgo.descripcion,
      criterioIncumplido: hallazgo.criterioIncumplido,
      fechaDeteccion: hallazgo.fechaDeteccion?.split('T')[0] || new Date().toISOString().split('T')[0],
      responsable: hallazgo.responsable || ''
    });
    setMostrarFormulario(true);
  };

  // Cancelar formulario
  const handleCancelarFormulario = () => {
    setMostrarFormulario(false);
    setHallazgoEditandoId(null);
    setTipoHallazgo('identificado');
    setNuevoHallazgo({
      titulo: '',
      categoria: 'borrador',
      area: '',
      descripcion: '',
      criterioIncumplido: '',
      fechaDeteccion: new Date().toISOString().split('T')[0],
      responsable: ''
    });
    setArchivosEvidencia([]);
  };

  // Cargar evidencias cuando se selecciona un hallazgo
  useEffect(() => {
    const cargarEvidenciasHallazgo = async () => {
      if (!hallazgoSeleccionado?.id) {
        setEvidenciasHallazgo([]);
        return;
      }
      
      setCargandoEvidencias(true);
      try {
        const evidencias = await controlInternoService.getEvidenciasByHallazgo(hallazgoSeleccionado.id);
        setEvidenciasHallazgo(evidencias || []);
      } catch (err) {
        console.error('Error cargando evidencias:', err);
        setEvidenciasHallazgo([]);
      } finally {
        setCargandoEvidencias(false);
      }
    };
    
    cargarEvidenciasHallazgo();
  }, [hallazgoSeleccionado?.id]);

  // Ver/Descargar evidencia
  const handleVerEvidencia = (evidencia: any) => {
    const nombre = evidencia.nombre || evidencia.nombreArchivoOriginal || evidencia;
    const tipo = evidencia.tipoMime || evidencia.tipo || '';
    
    // Construir URL del servidor
    let url = evidencia.rutaArchivo;
    if (url && !url.startsWith('http')) {
      // URL relativa, agregar base del servidor
      url = `http://localhost:3007/${url.replace(/\\/g, '/')}`;
    }
    
    // Determinar si es PDF o imagen
    const esPDF = tipo.includes('pdf') || nombre.toLowerCase().endsWith('.pdf');
    const esImagen = tipo.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(nombre);
    
    if (url) {
      if (esPDF || esImagen) {
        // Abrir en nueva pestaña para ver
        window.open(url, '_blank');
      } else {
        // Descargar el archivo
        const link = document.createElement('a');
        link.href = url;
        link.download = nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Descargando: ${nombre}`);
      }
    } else {
      // Sin URL, mostrar info
      toast.info(`Evidencia: ${nombre}`, {
        description: esPDF ? 'PDF - Sin URL disponible' : esImagen ? 'Imagen - Sin URL disponible' : `Tipo: ${tipo || 'Documento'}`
      });
    }
  };

  // Función para obtener color según categoría
  const getColorCategoria = (categoria: CategoriaHallazgo): string => {
    switch (categoria) {
      case 'critico':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'controversia':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'borrador':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Función para obtener color según estado
  const getColorEstado = (estado: string): string => {
    switch (estado) {
      case 'borrador':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'notificado':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'aceptado':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'en-controversia':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ratificado':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'modificado':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'retirado':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'cerrado':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Label para categoría
  const getLabelCategoria = (cat: string): string => {
    switch (cat) {
      case 'critico': return 'Crítico';
      case 'controversia': return 'Controversia';
      case 'borrador': return 'Por clasificar';
      default: return cat;
    }
  };

  // Label para estado
  const getLabelEstado = (est: string): string => {
    switch (est) {
      case 'borrador': return 'Borrador';
      case 'notificado': return 'Notificado';
      case 'aceptado': return 'Aceptado';
      case 'en-controversia': return 'En Controversia';
      case 'ratificado': return 'Ratificado';
      case 'modificado': return 'Modificado';
      case 'retirado': return 'Retirado';
      case 'cerrado': return 'Cerrado';
      default: return est;
    }
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Cargando hallazgos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Hallazgos de Auditoría
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {totalHallazgos} hallazgo{totalHallazgos !== 1 ? 's' : ''} registrado{totalHallazgos !== 1 ? 's' : ''}
            {hallazgosCriticos > 0 && (
              <span className="ml-2 text-red-600 font-semibold">
                • {hallazgosCriticos} crítico{hallazgosCriticos !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <ButtonSIGL
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setMostrarFormulario(true)}
        >
          Nuevo Hallazgo
        </ButtonSIGL>
      </div>

      {/* FORMULARIO DE CREACIÓN */}
      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">
                  {hallazgoEditandoId ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}
                </h4>
                <button
                  onClick={handleCancelarFormulario}
                  className="p-1 rounded hover:bg-blue-100"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {permitirTipoPreliminar && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de hallazgo</label>
                  <select
                    value={tipoHallazgo}
                    onChange={(e) => setTipoHallazgo(e.target.value as 'preliminar' | 'identificado')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="preliminar">Preliminar (sin evidencia)</option>
                    <option value="identificado">Identificado (con evidencia)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    value={nuevoHallazgo.categoria}
                    onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, categoria: e.target.value as CategoriaHallazgo }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="borrador">Por clasificar</option>
                    <option value="critico">Crítico</option>
                    <option value="controversia">En Controversia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Área Responsable *
                  </label>
                  <select
                    value={nuevoHallazgo.area}
                    onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, area: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione un área</option>
                    {AREAS_ESAP.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción del Hallazgo *
                </label>
                <textarea
                  value={nuevoHallazgo.descripcion}
                  onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe el hallazgo identificado..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Criterio Incumplido *
                </label>
                <input
                  type="text"
                  value={nuevoHallazgo.criterioIncumplido}
                  onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, criterioIncumplido: e.target.value }))}
                  placeholder="Ej: Artículo 5 de la Ley 1474 de 2011"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fecha de Detección
                  </label>
                  <input
                    type="date"
                    value={nuevoHallazgo.fechaDeteccion}
                    onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, fechaDeteccion: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Responsable (quien lo detectó) *
                  </label>
                  <select
                    value={nuevoHallazgo.responsable}
                    onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, responsable: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={cargandoPersonas}
                  >
                    <option value="">{cargandoPersonas ? 'Cargando...' : 'Seleccione un responsable'}</option>
                    {personasDisponibles.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subir Evidencia - oculto cuando es preliminar */}
              {(!permitirTipoPreliminar || tipoHallazgo === 'identificado') && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Paperclip className="w-3 h-3 inline mr-1" />
                  Evidencia (opcional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="evidencia-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setArchivosEvidencia(prev => [...prev, ...files]);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="evidencia-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Haz clic para subir archivos</span>
                    <span className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Imágenes (máx. 10MB)</span>
                  </label>
                </div>
                {archivosEvidencia.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {archivosEvidencia.map((archivo, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="truncate max-w-[200px]">{archivo.name}</span>
                          <span className="text-xs text-gray-400">({(archivo.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setArchivosEvidencia(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <ButtonSIGL
                  variant="outline"
                  onClick={handleCancelarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </ButtonSIGL>
                <ButtonSIGL
                  variant="primary"
                  onClick={handleCrearHallazgo}
                  disabled={guardando}
                  icon={guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : hallazgoEditandoId ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                >
                  {guardando ? 'Guardando...' : hallazgoEditandoId ? 'Actualizar Hallazgo' : 'Crear Hallazgo'}
                </ButtonSIGL>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de búsqueda y filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, título o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ButtonSIGL
            variant={mostrarFiltros ? 'primary' : 'outline'}
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            Filtros
          </ButtonSIGL>
        </div>

        {/* Panel de filtros */}
        <AnimatePresence>
          {mostrarFiltros && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value as CategoriaHallazgo | '')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas</option>
                    <option value="critico">Crítico</option>
                    <option value="controversia">En Controversia</option>
                    <option value="borrador">Por clasificar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as EstadoHallazgo | '')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="borrador">Borrador</option>
                    <option value="notificado">Notificado</option>
                    <option value="aceptado">Aceptado</option>
                    <option value="en-controversia">En Controversia</option>
                    <option value="ratificado">Ratificado</option>
                    <option value="modificado">Modificado</option>
                    <option value="retirado">Retirado</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista de hallazgos */}
      <div className="space-y-3">
        {hallazgosFiltrados.length === 0 ? (
          <CardSIGL variant="secondary">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {hallazgos.length === 0
                  ? 'No hay hallazgos registrados en esta auditoría'
                  : 'No se encontraron hallazgos con los filtros aplicados'}
              </p>
              {hallazgos.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Haz clic en "Nuevo Hallazgo" para registrar el primer hallazgo
                </p>
              )}
            </div>
          </CardSIGL>
        ) : (
          hallazgosFiltrados.map((hallazgo) => (
            <motion.div
              key={hallazgo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardSIGL hover>
                <div className="p-4">
                  {/* Header del hallazgo */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-mono font-bold px-2 py-1 rounded"
                          style={{ background: '#E0EDFF', color: '#003DA5' }}
                        >
                          {hallazgo.codigo}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border ${getColorCategoria(hallazgo.categoria as CategoriaHallazgo)}`}>
                          {getLabelCategoria(hallazgo.categoria)}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border ${getColorEstado(hallazgo.estado)}`}>
                          {getLabelEstado(hallazgo.estado)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {hallazgo.area}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setHallazgoSeleccionado(hallazgo)}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleEditarHallazgo(hallazgo)}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {hallazgo.descripcion}
                  </p>

                  {/* Footer con información adicional */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Área Responsable:</p>
                      <p className="text-xs font-semibold text-gray-900">{hallazgo.area}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Responsable:</p>
                      <p className="text-xs font-semibold text-gray-900">{getNombreResponsable(hallazgo.responsable)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Criterio Incumplido:</p>
                      <p className="text-xs font-semibold text-gray-900">{hallazgo.criterioIncumplido}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Fecha Detección:</p>
                      <p className="text-xs font-semibold text-gray-900">{hallazgo.fechaDeteccion?.split('T')[0] || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Evidencias (cargadas del backend) */}
                  {evidenciasPorHallazgo[hallazgo.id] && evidenciasPorHallazgo[hallazgo.id].length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">
                        <Paperclip className="w-3 h-3 inline mr-1" />
                        Evidencias ({evidenciasPorHallazgo[hallazgo.id].length}):
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {evidenciasPorHallazgo[hallazgo.id].map((evidencia, idx) => (
                          <button
                            key={evidencia.id || idx}
                            onClick={() => handleVerEvidencia(evidencia)}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Ver/Descargar evidencia"
                          >
                            <Eye className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">{evidencia.nombre || evidencia.nombreArchivoOriginal}</span>
                            <Download className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardSIGL>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {hallazgoSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setHallazgoSeleccionado(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Detalle del Hallazgo
                </h3>
                <button
                  onClick={() => setHallazgoSeleccionado(null)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-sm font-mono font-bold px-3 py-1 rounded"
                      style={{ background: '#E0EDFF', color: '#003DA5' }}
                    >
                      {hallazgoSeleccionado.codigo}
                    </span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded border ${getColorCategoria(hallazgoSeleccionado.categoria as CategoriaHallazgo)}`}>
                      {getLabelCategoria(hallazgoSeleccionado.categoria)}
                    </span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded border ${getColorEstado(hallazgoSeleccionado.estado)}`}>
                      {getLabelEstado(hallazgoSeleccionado.estado)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Área: {hallazgoSeleccionado.area}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Descripción:
                  </label>
                  <p className="text-sm text-gray-700">
                    {hallazgoSeleccionado.descripcion}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Criterio Incumplido:
                  </label>
                  <p className="text-sm text-gray-700">
                    {hallazgoSeleccionado.criterioIncumplido}
                  </p>
                </div>

                {hallazgoSeleccionado.normativaRelacionada && hallazgoSeleccionado.normativaRelacionada.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Normativa Relacionada:
                    </label>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {hallazgoSeleccionado.normativaRelacionada.map((norma, idx) => (
                        <li key={idx}>{norma}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Área:
                    </label>
                    <p className="text-sm text-gray-700">
                      {hallazgoSeleccionado.area}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Responsable:
                    </label>
                    <p className="text-sm text-gray-700">
                      {getNombreResponsable(hallazgoSeleccionado.responsable)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Fecha Detección:
                    </label>
                    <p className="text-sm text-gray-700">
                      {hallazgoSeleccionado.fechaDeteccion?.split('T')[0] || 'N/A'}
                    </p>
                  </div>

                  {hallazgoSeleccionado.fechaLimiteCorreccion && (
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">
                        Fecha Límite Corrección:
                      </label>
                      <p className="text-sm text-gray-700">
                        {hallazgoSeleccionado.fechaLimiteCorreccion.split('T')[0]}
                      </p>
                    </div>
                  )}
                </div>

                {hallazgoSeleccionado.observacionesControversia && (() => {
                  const obs = hallazgoSeleccionado.observacionesControversia;
                  const causaMatch = obs.match(/CAUSA:\s*([\s\S]*?)(?=EFECTO:|$)/i);
                  const efectoMatch = obs.match(/EFECTO:\s*([\s\S]*?)$/i);
                  const tieneCausaEfecto = causaMatch?.[1] || efectoMatch?.[1];
                  return tieneCausaEfecto ? (
                    <div className="grid grid-cols-2 gap-4">
                      {causaMatch?.[1] && (
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Causa:</label>
                          <p className="text-sm text-gray-700">{causaMatch[1].trim()}</p>
                        </div>
                      )}
                      {efectoMatch?.[1] && (
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Efecto:</label>
                          <p className="text-sm text-gray-700">{efectoMatch[1].trim()}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Observaciones:</label>
                      <p className="text-sm text-gray-700">{obs}</p>
                    </div>
                  );
                })()}

                {hallazgoSeleccionado.recomendaciones && hallazgoSeleccionado.recomendaciones.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Recomendaciones:
                    </label>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {hallazgoSeleccionado.recomendaciones.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidencias cargadas del backend */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Evidencias:
                  </label>
                  {cargandoEvidencias ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Cargando evidencias...</span>
                    </div>
                  ) : evidenciasHallazgo.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {evidenciasHallazgo.map((evidencia, idx) => (
                        <button
                          key={evidencia.id || idx}
                          onClick={() => handleVerEvidencia(evidencia)}
                          className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-200 flex items-center gap-2 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Ver/Descargar evidencia"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{evidencia.nombre || evidencia.nombreArchivoOriginal}</span>
                          <span className="text-xs text-gray-400">({(evidencia.tamanioBytes / 1024).toFixed(1)} KB)</span>
                          <Download className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Sin evidencias adjuntas</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
