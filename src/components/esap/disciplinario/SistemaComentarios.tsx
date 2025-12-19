/**
 * SISTEMA DE COMENTARIOS - CONTROL INTERNO DISCIPLINARIO
 * Permite agregar comentarios en cada fase del proceso para trazabilidad
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Send, Pin, AlertCircle, Info, CheckCircle,
  User, Clock, X, Edit2, Trash2, Flag, Search, Filter,
  FileText, Scale, Users, Calendar, Tag, ChevronDown, ChevronUp,
  Paperclip, Download
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Comentario {
  id: string;
  autor: Persona;
  fecha: string;
  hora: string;
  etapa: string;
  contenido: string;
  tipo: 'normal' | 'importante' | 'guia' | 'alerta';
  categoria?: 'juridico' | 'administrativo' | 'probatorio' | 'general';
  adjuntos?: string[];
  fijado?: boolean;
  editado?: boolean;
}

interface SistemaComentariosProps {
  numeroProceso: string;
  etapaActual: string;
  comentariosIniciales?: Comentario[];
  profesionalActual: Persona;
}

export function SistemaComentarios({ 
  numeroProceso, 
  etapaActual,
  comentariosIniciales = [],
  profesionalActual 
}: SistemaComentariosProps) {
  const [comentarios, setComentarios] = useState<Comentario[]>(comentariosIniciales.length > 0 ? comentariosIniciales : [
    {
      id: 'c1',
      autor: {
        nombre: 'Juan Pérez Gómez',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: '1234567890'
      },
      fecha: '2025-01-08',
      hora: '09:30',
      etapa: 'Recepción',
      contenido: 'Se recibe la noticia disciplinaria proveniente de la Contraloría General. Se verifica que cumple con los requisitos formales establecidos en el artículo 67 de la Ley 734 de 2002. Se procede a radicar con número ND-2025-0120.',
      tipo: 'importante',
      categoria: 'juridico',
      fijado: true
    },
    {
      id: 'c2',
      autor: {
        nombre: 'María Torres Silva',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: '9876543210'
      },
      fecha: '2025-01-09',
      hora: '14:15',
      etapa: 'Indagación Previa',
      contenido: 'Se realiza estudio preliminar de la documentación aportada. Los hechos descritos podrían configurar falta disciplinaria grave según el artículo 48 del CDU. Se recomienda iniciar indagación preliminar para determinar competencia y verificar prescripción.',
      tipo: 'guia',
      categoria: 'juridico',
      fijado: false
    },
    {
      id: 'c3',
      autor: {
        nombre: 'Carlos Ramírez',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: '5555555555'
      },
      fecha: '2025-01-10',
      hora: '11:20',
      etapa: 'Indagación Previa',
      contenido: 'IMPORTANTE: Verificar término de caducidad. Los hechos ocurrieron el 15/08/2023. Según artículo 30 Ley 734, tenemos 6 meses para formular pliego de cargos desde que tuvimos conocimiento (08/01/2025). Plazo vence: 08/07/2025.',
      tipo: 'alerta',
      categoria: 'juridico',
      fijado: true
    },
    {
      id: 'c4',
      autor: {
        nombre: 'Ana María Castillo',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: '7777777777'
      },
      fecha: '2025-01-11',
      hora: '16:45',
      etapa: 'Valoración',
      contenido: 'Se solicitaron documentos adicionales a la dependencia involucrada mediante oficio OCID-025-2025. Pendiente respuesta. Se requieren: 1) Informes de gestión del periodo, 2) Actas de comité, 3) Soportes de las transacciones observadas.',
      tipo: 'normal',
      categoria: 'probatorio',
      fijado: false
    }
  ]);
  
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'normal' | 'importante' | 'guia' | 'alerta'>('normal');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<'juridico' | 'administrativo' | 'probatorio' | 'general'>('general');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);

  const etapas = [
    'Recepción',
    'Indagación Previa',
    'Valoración',
    'Indagación Preliminar',
    'Investigación',
    'Pliego de Cargos',
    'Descargos',
    'Evaluación'
  ];

  const tiposComentario = [
    { id: 'normal', nombre: 'Normal', color: '#6B7280', icon: MessageCircle },
    { id: 'importante', nombre: 'Importante', color: '#F59E0B', icon: Flag },
    { id: 'guia', nombre: 'Guía', color: '#3B82F6', icon: Info },
    { id: 'alerta', nombre: 'Alerta', color: '#DC2626', icon: AlertCircle }
  ];

  const categorias = [
    { id: 'general', nombre: 'General', icon: MessageCircle },
    { id: 'juridico', nombre: 'Jurídico', icon: Scale },
    { id: 'administrativo', nombre: 'Administrativo', icon: FileText },
    { id: 'probatorio', nombre: 'Probatorio', icon: Users }
  ];

  const handleAgregarComentario = () => {
    if (!nuevoComentario.trim()) {
      toast.error('Error', {
        description: 'Debes escribir un comentario'
      });
      return;
    }

    const ahora = new Date();
    const adjuntos = archivosAdjuntos.length > 0 
      ? archivosAdjuntos.map(f => f.name) 
      : undefined;

    const comentario: Comentario = {
      id: `c${Date.now()}`,
      autor: profesionalActual,
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().split(' ')[0].substring(0, 5),
      etapa: etapaActual,
      contenido: nuevoComentario,
      tipo: tipoSeleccionado,
      categoria: categoriaSeleccionada,
      adjuntos,
      fijado: false,
      editado: false
    };

    setComentarios([comentario, ...comentarios]);
    setNuevoComentario('');
    setTipoSeleccionado('normal');
    setCategoriaSeleccionada('general');
    setArchivosAdjuntos([]);
    setMostrarFormulario(false);

    toast.success('Comentario agregado', {
      description: adjuntos 
        ? `Comentario con ${adjuntos.length} archivo(s) adjunto(s)` 
        : `Se agregó comentario en etapa: ${etapaActual}`
    });
  };

  const handleFijarComentario = (id: string) => {
    setComentarios(comentarios.map(c => 
      c.id === id ? { ...c, fijado: !c.fijado } : c
    ));
    const comentario = comentarios.find(c => c.id === id);
    toast.success(
      comentario?.fijado ? 'Comentario desfijado' : 'Comentario fijado',
      { description: comentario?.fijado ? 'El comentario ya no está destacado' : 'El comentario se mostrará en la parte superior' }
    );
  };

  const handleEliminarComentario = (id: string) => {
    setComentarios(comentarios.filter(c => c.id !== id));
    toast.success('Comentario eliminado', {
      description: 'El comentario ha sido eliminado permanentemente'
    });
  };

  // Filtrar comentarios
  const comentariosFiltrados = comentarios.filter(c => {
    const coincideBusqueda = c.contenido.toLowerCase().includes(busqueda.toLowerCase()) ||
                            c.autor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            c.etapa.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEtapa = filtroEtapa === 'todas' || c.etapa === filtroEtapa;
    const coincideTipo = filtroTipo === 'todos' || c.tipo === filtroTipo;
    return coincideBusqueda && coincideEtapa && coincideTipo;
  });

  // Separar fijados y no fijados
  const comentariosFijados = comentariosFiltrados.filter(c => c.fijado);
  const comentariosNormales = comentariosFiltrados.filter(c => !c.fijado);

  const getTipoConfig = (tipo: string) => {
    return tiposComentario.find(t => t.id === tipo) || tiposComentario[0];
  };

  const getCategoriaConfig = (categoria?: string) => {
    return categorias.find(c => c.id === categoria) || categorias[0];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0056D6 100%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-white">
                Comentarios del Proceso
              </h3>
              <p className="text-xs text-white/80">
                {numeroProceso} • {comentariosFiltrados.length} comentario(s)
              </p>
            </div>
          </div>
          <Button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            size="sm"
            style={{ background: '#FFFFFF', color: '#003DA5' }}
            className="hover:bg-white/90"
          >
            {mostrarFormulario ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                Nuevo Comentario
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Formulario de Nuevo Comentario */}
      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 border-2 border-blue-200 bg-blue-50">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">
                    Etapa Actual
                  </label>
                  <div className="p-2 bg-white rounded-lg border">
                    <p className="text-sm font-bold" style={{ color: '#003DA5' }}>
                      {etapaActual}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">
                      Tipo de Comentario
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {tiposComentario.map((tipo) => (
                        <button
                          key={tipo.id}
                          onClick={() => setTipoSeleccionado(tipo.id as any)}
                          className={`p-2 rounded-lg border-2 text-sm font-bold transition-all ${
                            tipoSeleccionado === tipo.id
                              ? 'border-current shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{
                            color: tipoSeleccionado === tipo.id ? tipo.color : '#6B7280',
                            background: tipoSeleccionado === tipo.id ? tipo.color + '10' : '#FFFFFF'
                          }}
                        >
                          <tipo.icon className="w-4 h-4 mx-auto mb-1" />
                          {tipo.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">
                      Categoría
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categorias.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCategoriaSeleccionada(cat.id as any)}
                          className={`p-2 rounded-lg border-2 text-xs font-bold transition-all ${
                            categoriaSeleccionada === cat.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <cat.icon className="w-3.5 h-3.5 mx-auto mb-1" />
                          {cat.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">
                    Contenido del Comentario
                  </label>
                  <textarea
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    placeholder="Escribe tu comentario aquí... Incluye detalles relevantes del proceso, decisiones tomadas, documentos pendientes, términos legales, etc."
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                  />
                </div>

                {/* Adjuntar Archivos */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">
                    Archivos Adjuntos (Opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload-comentario"
                      multiple
                      accept="*/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setArchivosAdjuntos(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="file-upload-comentario">
                      <div className={`p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                        archivosAdjuntos.length > 0
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          {archivosAdjuntos.length > 0 ? (
                            <>
                              <Paperclip className="w-5 h-5 text-green-600" />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-green-900">
                                  {archivosAdjuntos.length} archivo(s) seleccionado(s)
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {archivosAdjuntos.map((file, index) => (
                                    <Badge 
                                      key={index}
                                      variant="outline" 
                                      className="text-xs bg-white border-green-300 text-green-700"
                                    >
                                      {file.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setArchivosAdjuntos([]);
                                  const input = document.getElementById('file-upload-comentario') as HTMLInputElement;
                                  if (input) input.value = '';
                                }}
                                variant="outline"
                                size="sm"
                                className="flex-shrink-0"
                              >
                                Quitar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Paperclip className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm font-bold text-gray-700">
                                  Adjuntar documentos
                                </p>
                                <p className="text-xs text-gray-500">
                                  Click para seleccionar archivos
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setMostrarFormulario(false);
                      setNuevoComentario('');
                      setTipoSeleccionado('normal');
                      setCategoriaSeleccionada('general');
                      setArchivosAdjuntos([]);
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAgregarComentario}
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                    disabled={!nuevoComentario.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Agregar Comentario
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Búsqueda y Filtros */}
      <Card className="p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en comentarios..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            variant="outline"
            size="sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {mostrarFiltros ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        <AnimatePresence>
          {mostrarFiltros && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 block">
                    Filtrar por Etapa
                  </label>
                  <select
                    value={filtroEtapa}
                    onChange={(e) => setFiltroEtapa(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todas">Todas las etapas</option>
                    {etapas.map((etapa) => (
                      <option key={etapa} value={etapa}>{etapa}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 block">
                    Filtrar por Tipo
                  </label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todos">Todos los tipos</option>
                    {tiposComentario.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Lista de Comentarios */}
      <div className="space-y-3">
        {/* Comentarios Fijados */}
        {comentariosFijados.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Pin className="w-4 h-4 text-orange-600" />
              <p className="text-xs font-bold text-orange-600">COMENTARIOS FIJADOS</p>
            </div>
            {comentariosFijados.map((comentario) => (
              <ComentarioItem
                key={comentario.id}
                comentario={comentario}
                onFijar={handleFijarComentario}
                onEliminar={handleEliminarComentario}
                getTipoConfig={getTipoConfig}
                getCategoriaConfig={getCategoriaConfig}
              />
            ))}
          </div>
        )}

        {/* Comentarios Normales */}
        {comentariosNormales.length > 0 ? (
          comentariosNormales.map((comentario) => (
            <ComentarioItem
              key={comentario.id}
              comentario={comentario}
              onFijar={handleFijarComentario}
              onEliminar={handleEliminarComentario}
              getTipoConfig={getTipoConfig}
              getCategoriaConfig={getCategoriaConfig}
            />
          ))
        ) : comentariosFijados.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-600">
              {busqueda || filtroEtapa !== 'todas' || filtroTipo !== 'todos'
                ? 'No se encontraron comentarios con los filtros aplicados'
                : 'No hay comentarios en este proceso'}
            </p>
          </Card>
        ) : null}
      </div>

      {/* Resumen por Etapas */}
      {comentarios.length > 0 && (
        <Card className="p-4 bg-gray-50">
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Resumen por Etapa
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {etapas.map((etapa) => {
              const cantidad = comentarios.filter(c => c.etapa === etapa).length;
              if (cantidad === 0) return null;
              return (
                <Badge
                  key={etapa}
                  variant="outline"
                  className="justify-between cursor-pointer hover:bg-white"
                  onClick={() => setFiltroEtapa(etapa)}
                >
                  <span className="text-xs">{etapa}</span>
                  <span className="text-xs font-black ml-1">{cantidad}</span>
                </Badge>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// Componente individual de comentario
interface ComentarioItemProps {
  comentario: Comentario;
  onFijar: (id: string) => void;
  onEliminar: (id: string) => void;
  getTipoConfig: (tipo: string) => any;
  getCategoriaConfig: (categoria?: string) => any;
}

function ComentarioItem({ 
  comentario, 
  onFijar, 
  onEliminar,
  getTipoConfig,
  getCategoriaConfig 
}: ComentarioItemProps) {
  const tipoConfig = getTipoConfig(comentario.tipo);
  const categoriaConfig = getCategoriaConfig(comentario.categoria);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card 
        className={`p-4 hover:shadow-md transition-shadow ${
          comentario.fijado ? 'border-2 border-orange-300 bg-orange-50' : ''
        }`}
      >
        {/* Header del comentario */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div 
              className="p-2 rounded-lg"
              style={{ background: tipoConfig.color + '20' }}
            >
              <tipoConfig.icon 
                className="w-4 h-4" 
                style={{ color: tipoConfig.color }} 
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-bold text-gray-900">{comentario.autor.nombre}</p>
                <Badge 
                  variant="outline"
                  style={{ 
                    background: tipoConfig.color + '15',
                    color: tipoConfig.color,
                    borderColor: tipoConfig.color + '40'
                  }}
                >
                  {tipoConfig.nombre}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <categoriaConfig.icon className="w-3 h-3 mr-1" />
                  {categoriaConfig.nombre}
                </Badge>
                {comentario.fijado && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs">
                    <Pin className="w-3 h-3 mr-1" />
                    Fijado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {comentario.autor.tipoIdentificacion} {comentario.autor.numeroIdentificacion}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {comentario.fecha}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {comentario.hora}
                </span>
                <Badge variant="outline" className="text-xs" style={{ color: '#003DA5' }}>
                  {comentario.etapa}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Acciones */}
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onFijar(comentario.id)}
              title={comentario.fijado ? 'Desfijar comentario' : 'Fijar comentario'}
              className={comentario.fijado ? 'bg-orange-100 border-orange-300' : ''}
            >
              <Pin className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm('¿Estás seguro de eliminar este comentario?')) {
                  onEliminar(comentario.id);
                }
              }}
              title="Eliminar comentario"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Contenido */}
        <div className="pl-14">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {comentario.contenido}
          </p>

          {/* Archivos Adjuntos */}
          {comentario.adjuntos && comentario.adjuntos.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-3.5 h-3.5 text-gray-600" />
                <p className="text-xs font-bold text-gray-700">
                  {comentario.adjuntos.length} archivo(s) adjunto(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {comentario.adjuntos.map((archivo, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      toast.info('Descargar archivo', {
                        description: archivo
                      });
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-xs text-gray-700">{archivo}</span>
                    <Download className="w-3 h-3 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {comentario.editado && (
            <p className="text-xs text-gray-500 mt-2 italic">
              Editado
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
