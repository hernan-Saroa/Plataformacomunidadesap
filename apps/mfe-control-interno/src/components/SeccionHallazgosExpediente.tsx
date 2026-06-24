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
type CategoriaHallazgo = 'borrador' | 'leve' | 'moderado' | 'grave' | 'critico' | 'controversia';
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
  /** Tras subir evidencias, refrescar tab Documentación del expediente */
  onEvidenciasActualizadas?: () => void;
  /** Callback para notificar que los hallazgos se han creado o modificado */
  onHallazgosActualizados?: () => void;
  /** Si true, muestra selector Tipo (Preliminar/Identificado). Preliminar oculta el bloque de evidencia */
  permitirTipoPreliminar?: boolean;
  /** Datos ya cargados por el expediente (evita GET hallazgos + N×evidencias) */
  hallazgosPrecargados?: Hallazgo[];
  evidenciasPorHallazgoPrecargadas?: Record<string, any[]>;
}

// Tipo para personas disponibles
interface PersonaDisponible {
  id: string;
  nombre: string;
  cargo?: string;
}

export function SeccionHallazgosExpediente({
  auditoriaId,
  auditoriaNombre,
  permitirTipoPreliminar,
  onEvidenciasActualizadas,
  onHallazgosActualizados,
  hallazgosPrecargados,
  evidenciasPorHallazgoPrecargadas,
}: Props) {
  const precargaHallazgos = hallazgosPrecargados !== undefined;
  const precargaEvidencias = evidenciasPorHallazgoPrecargadas !== undefined;

  // Estados para datos
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(hallazgosPrecargados ?? []);
  const [loading, setLoading] = useState(!precargaHallazgos);
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
  const [evidenciasPorHallazgo, setEvidenciasPorHallazgo] = useState<Record<string, any[]>>(
    evidenciasPorHallazgoPrecargadas ?? {},
  );
  
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
    causa: '',
    efecto: '',
    recomendacion: '',
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
    if (precargaHallazgos) return;
    cargarHallazgos();
  }, [cargarHallazgos, precargaHallazgos]);

  useEffect(() => {
    if (hallazgosPrecargados !== undefined) {
      setHallazgos(hallazgosPrecargados);
      setLoading(false);
    }
  }, [hallazgosPrecargados]);

  useEffect(() => {
    if (evidenciasPorHallazgoPrecargadas !== undefined) {
      setEvidenciasPorHallazgo(evidenciasPorHallazgoPrecargadas);
    }
  }, [evidenciasPorHallazgoPrecargadas]);

  // Cargar evidencias por hallazgo si no vienen precargadas del expediente
  useEffect(() => {
    if (precargaEvidencias) return;

    const cargarTodasEvidencias = async () => {
      if (hallazgos.length === 0) return;

      const evidenciasMap: Record<string, any[]> = {};

      await Promise.all(
        hallazgos.map(async (hallazgo) => {
          try {
            const evidencias = await controlInternoService.getEvidenciasByHallazgo(hallazgo.id);
            evidenciasMap[hallazgo.id] = evidencias || [];
          } catch {
            evidenciasMap[hallazgo.id] = [];
          }
        }),
      );

      setEvidenciasPorHallazgo(evidenciasMap);
    };

    cargarTodasEvidencias();
  }, [hallazgos, precargaEvidencias]);

  // Cargar personas disponibles
  useEffect(() => {
    const cargarPersonas = async () => {
      setCargandoPersonas(true);
      try {
        const { auditoriasApi } = await import('./services/api');
        const response = await auditoriasApi.getPersonasDisponibles();
        if (response.success && response.data) {
          const personas = response.data
            .map((p: any) => ({
              id: String(p.idPersona || p.id_tercero || p.id),
              nombre: p.nombre || p.nom_largo || '',
              cargo: p.cargo || 'Auditor'
            }))
            // Filter out entries without a valid name
            .filter((p: PersonaDisponible) => {
              const n = (p.nombre || '').trim();
              return n && n !== 'Sin nombre' && n !== 'Usuario Sin Nombre' && n !== 'Sin Nombre';
            });
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
    if (!nuevoHallazgo.area || !nuevoHallazgo.descripcion || !nuevoHallazgo.criterioIncumplido ||
        !nuevoHallazgo.causa?.trim() || !nuevoHallazgo.efecto?.trim() || !nuevoHallazgo.recomendacion?.trim()) {
      toast.error('Por favor completa todos los campos obligatorios: Descripción, Criterio Incumplido, Causa, Efecto y Recomendación');
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
          causa: nuevoHallazgo.causa || undefined,
          efecto: nuevoHallazgo.efecto || undefined,
          recomendaciones: nuevoHallazgo.recomendacion ? [nuevoHallazgo.recomendacion] : [],
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
          causa: nuevoHallazgo.causa || undefined,
          efecto: nuevoHallazgo.efecto || undefined,
          recomendaciones: nuevoHallazgo.recomendacion ? [nuevoHallazgo.recomendacion] : [],
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
        onEvidenciasActualizadas?.();
      }
      
      setMostrarFormulario(false);
      setHallazgoEditandoId(null);
      setNuevoHallazgo({
        titulo: '',
        categoria: 'borrador',
        area: '',
        descripcion: '',
        criterioIncumplido: '',
        causa: '',
        efecto: '',
        recomendacion: '',
        fechaDeteccion: new Date().toISOString().split('T')[0],
        responsable: ''
      });
      setArchivosEvidencia([]);
      setTipoHallazgo('identificado');
      cargarHallazgos();
      onHallazgosActualizados?.();
    } catch (err: any) {
      console.error('Error creando hallazgo:', err);
      // Intentar extraer detalles del error del backend
      const backendMsg = err?.response?.data?.message
        || err?.response?.message
        || err?.message
        || 'Error desconocido';
      const statusCode = err?.response?.status || err?.statusCode || '';
      console.error('📋 Payload enviado:', JSON.stringify({
        titulo: nuevoHallazgo.descripcion?.substring(0, 100),
        categoria: nuevoHallazgo.categoria,
        area: nuevoHallazgo.area,
        descripcion: nuevoHallazgo.descripcion?.substring(0, 50),
        criterioIncumplido: nuevoHallazgo.criterioIncumplido?.substring(0, 50),
        causa: nuevoHallazgo.causa?.substring(0, 50),
        efecto: nuevoHallazgo.efecto?.substring(0, 50),
        fechaDeteccion: nuevoHallazgo.fechaDeteccion,
        responsable: nuevoHallazgo.responsable,
        auditoriaId: auditoriaId,
        auditoria: auditoriaNombre
      }, null, 2));
      toast.error(`Error al crear hallazgo${statusCode ? ` (${statusCode})` : ''}`, {
        description: Array.isArray(backendMsg) ? backendMsg.join(', ') : String(backendMsg),
        duration: 8000
      });
    } finally {
      setGuardando(false);
    }
  };

  // Abrir formulario para editar hallazgo
  const handleEditarHallazgo = (hallazgo: Hallazgo) => {
    setHallazgoEditandoId(hallazgo.id);
    const recom = Array.isArray(hallazgo.recomendaciones) && hallazgo.recomendaciones.length
      ? hallazgo.recomendaciones[0] : '';
    setNuevoHallazgo({
      titulo: (hallazgo as any).titulo || hallazgo.descripcion?.substring(0, 100) || '',
      categoria: hallazgo.categoria as CategoriaHallazgo,
      area: hallazgo.area,
      descripcion: hallazgo.descripcion,
      criterioIncumplido: hallazgo.criterioIncumplido,
      causa: (hallazgo as any).causa || '',
      efecto: (hallazgo as any).efecto || '',
      recomendacion: recom,
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
      causa: '',
      efecto: '',
      recomendacion: '',
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
      case 'grave':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'moderado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'leve':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'controversia':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'borrador':
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
      case 'grave': return 'Grave';
      case 'moderado': return 'Moderado';
      case 'leve': return 'Leve';
      case 'controversia': return 'En Controversia';
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
      {/* Header con estadísticas y controles compactos en UNA SOLA LÍNEA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-150">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">
            Hallazgos de Auditoría
          </h3>
          <span className="text-[10px] text-gray-600 font-bold bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
            {totalHallazgos}
          </span>
          {hallazgosCriticos > 0 && (
            <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
              {hallazgosCriticos} crítico{hallazgosCriticos !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          {/* Barra de búsqueda integrada */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar hallazgo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              style={{ height: '28px' }}
            />
          </div>

          <ButtonSIGL
            variant={mostrarFiltros ? 'primary' : 'secondary'}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="font-bold text-xs"
            style={{ minHeight: 0, height: '28px', padding: '0 8px', fontSize: '11px' }}
            icon={<Filter className="w-3.5 h-3.5" />}
          >
            Filtros
          </ButtonSIGL>

          <ButtonSIGL
            variant="primary"
            onClick={() => setMostrarFormulario(true)}
            className="font-bold text-xs shrink-0"
            style={{ minHeight: 0, height: '28px', padding: '0 10px', fontSize: '11px', backgroundColor: '#003DA5', color: '#FFFFFF' }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Nuevo Hallazgo
          </ButtonSIGL>
        </div>
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
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="grave">Grave</option>
                    <option value="critico">Crítico</option>
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Causa *
                </label>
                <textarea
                  value={nuevoHallazgo.causa}
                  onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, causa: e.target.value }))}
                  placeholder="Razón del hallazgo..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Efecto *
                </label>
                <textarea
                  value={nuevoHallazgo.efecto}
                  onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, efecto: e.target.value }))}
                  placeholder="Consecuencia del hallazgo..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Recomendación *
                </label>
                <textarea
                  value={nuevoHallazgo.recomendacion}
                  onChange={(e) => setNuevoHallazgo(prev => ({ ...prev, recomendacion: e.target.value }))}
                  placeholder="Acción correctiva recomendada..."
                  rows={3}
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

      {/* Panel de filtros */}
      <div className="space-y-3">

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
                    <option value="borrador">Por clasificar</option>
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="grave">Grave</option>
                    <option value="critico">Crítico</option>
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
              <CardSIGL hover padding="none">
                {/* Cuerpo del hallazgo */}
                <div className="p-3 pb-2.5">
                  {/* Header del hallazgo */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ background: '#E0EDFF', color: '#003DA5' }}
                      >
                        {hallazgo.codigo}
                      </span>
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${getColorCategoria(hallazgo.categoria as CategoriaHallazgo)}`}>
                        {getLabelCategoria(hallazgo.categoria)}
                      </span>
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${getColorEstado(hallazgo.estado)}`}>
                        {getLabelEstado(hallazgo.estado)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setHallazgoSeleccionado(hallazgo)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleEditarHallazgo(hallazgo)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                    {hallazgo.descripcion}
                  </p>
                </div>

                {/* Footer con información adicional (Metadata) centrado verticalmente y alineado a la izquierda */}
                <div className="px-3 py-2.5 border-t border-gray-200 flex flex-wrap items-center justify-start gap-x-5 gap-y-1 text-[11px] leading-tight bg-gray-50/20">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Área:</span>
                    <span className="font-semibold text-gray-800" title={hallazgo.area}>{hallazgo.area}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Resp:</span>
                    <span className="font-semibold text-gray-800" title={getNombreResponsable(hallazgo.responsable)}>{getNombreResponsable(hallazgo.responsable)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Criterio:</span>
                    <span className="font-semibold text-gray-800" title={hallazgo.criterioIncumplido}>{hallazgo.criterioIncumplido || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Detección:</span>
                    <span className="font-semibold text-gray-800">{hallazgo.fechaDeteccion?.split('T')[0] || 'N/A'}</span>
                  </div>
                </div>

                {/* Evidencias (cargadas del backend) */}
                {evidenciasPorHallazgo[hallazgo.id] && evidenciasPorHallazgo[hallazgo.id].length > 0 && (
                  <div className="px-3 pb-2.5 pt-2 border-t border-gray-100 bg-gray-50/5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-gray-400" />
                        Evidencias ({evidenciasPorHallazgo[hallazgo.id].length}):
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {evidenciasPorHallazgo[hallazgo.id].map((evidencia, idx) => (
                          <button
                            key={evidencia.id || idx}
                            onClick={() => handleVerEvidencia(evidencia)}
                            className="text-[10px] bg-blue-50/50 hover:bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200/60 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ver/Descargar evidencia"
                          >
                            <Eye className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">{evidencia.nombre || evidencia.nombreArchivoOriginal}</span>
                            <Download className="w-3 h-3 text-blue-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
                  <p className="text-sm text-gray-700 break-words">
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
                        <div className="min-w-0">
                          <label className="block text-sm font-bold text-gray-900 mb-1">Causa:</label>
                          <p className="text-sm text-gray-700 break-words">{causaMatch[1].trim()}</p>
                        </div>
                      )}
                      {efectoMatch?.[1] && (
                        <div className="min-w-0">
                          <label className="block text-sm font-bold text-gray-900 mb-1">Efecto:</label>
                          <p className="text-sm text-gray-700 break-words">{efectoMatch[1].trim()}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Observaciones:</label>
                      <p className="text-sm text-gray-700 break-words">{obs}</p>
                    </div>
                  );
                })()}

                {hallazgoSeleccionado.recomendaciones && hallazgoSeleccionado.recomendaciones.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Recomendaciones:
                    </label>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {hallazgoSeleccionado.recomendaciones.map((rec, idx) => (
                        <li key={idx} className="break-words">{rec}</li>
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
