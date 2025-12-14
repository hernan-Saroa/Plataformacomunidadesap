/**
 * ETAPA DE PLANEACIÓN - RF005
 * Gestión completa de la etapa de planeación de auditoría
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Send, Calendar, Users, CheckCircle2, Download,
  Plus, Edit, Trash2, Eye, Clock, AlertCircle, Save, Upload
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ResponsiveModal } from '../../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  territorial: string;
  sede: string;
  responsable: string;
}

interface Documento {
  id: string;
  tipo: 'oficio-anuncio' | 'carta-representacion' | 'carta-compromiso' | 
        'programa-individual' | 'solicitud-info' | 'presentacion';
  nombre: string;
  estado: 'pendiente' | 'generado' | 'enviado' | 'recibido';
  fechaGeneracion?: string;
  fechaEnvio?: string;
  fechaRespuesta?: string;
  archivo?: string;
}

interface Reunion {
  id: string;
  tipo: 'apertura';
  fecha: string;
  hora: string;
  lugar: string;
  asistentes: string[];
  agenda: string;
  acta?: string;
  estado: 'programada' | 'realizada';
}

interface PlaneacionFormProps {
  auditoria: Auditoria;
  onVolver: () => void;
}

const TIPOS_DOCUMENTO = [
  { id: 'oficio-anuncio', nombre: 'Oficio de Anuncio', descripcion: 'Comunicación oficial del inicio de auditoría' },
  { id: 'carta-representacion', nombre: 'Carta de Representación', descripcion: 'Solicitud al área auditada' },
  { id: 'carta-compromiso', nombre: 'Carta de Compromiso', descripcion: 'Compromiso del área auditada' },
  { id: 'programa-individual', nombre: 'Programa Individual', descripcion: 'Plan detallado de la auditoría' },
  { id: 'solicitud-info', nombre: 'Solicitud de Información', descripcion: 'Requerimientos al área' },
  { id: 'presentacion', nombre: 'Presentación del Proceso', descripcion: 'Plantilla de presentación' }
];

export function PlaneacionForm({ auditoria, onVolver }: PlaneacionFormProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([
    {
      id: '1',
      tipo: 'oficio-anuncio',
      nombre: 'Oficio de Anuncio AUD-2024-001',
      estado: 'enviado',
      fechaGeneracion: '2024-11-15',
      fechaEnvio: '2024-11-15',
      archivo: 'oficio-anuncio-aud-2024-001.pdf'
    },
    {
      id: '2',
      tipo: 'carta-representacion',
      nombre: 'Carta de Representación',
      estado: 'recibido',
      fechaGeneracion: '2024-11-16',
      fechaEnvio: '2024-11-16',
      fechaRespuesta: '2024-11-20',
      archivo: 'carta-representacion.pdf'
    },
    {
      id: '3',
      tipo: 'programa-individual',
      nombre: 'Programa Individual de Auditoría',
      estado: 'generado',
      fechaGeneracion: '2024-11-25',
      archivo: 'programa-individual.pdf'
    }
  ]);

  const [reuniones, setReuniones] = useState<Reunion[]>([
    {
      id: '1',
      tipo: 'apertura',
      fecha: '2024-12-01',
      hora: '10:00',
      lugar: 'Sala de Juntas - Piso 3',
      asistentes: ['María González', 'Carlos Ramírez', 'Director Financiero', 'Coord. Contabilidad'],
      agenda: 'Presentación del equipo auditor, alcance de la auditoría, cronograma, solicitud de documentación',
      estado: 'realizada',
      acta: 'acta-reunion-apertura.pdf'
    }
  ]);

  const [modalDocumento, setModalDocumento] = useState(false);
  const [modalReunion, setModalReunion] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<string>('');

  const [formReunion, setFormReunion] = useState({
    fecha: '',
    hora: '',
    lugar: '',
    asistentes: '',
    agenda: ''
  });

  const handleGenerarDocumento = () => {
    if (!documentoSeleccionado) {
      toast.error('Selecciona un tipo de documento');
      return;
    }

    const tipoDoc = TIPOS_DOCUMENTO.find(t => t.id === documentoSeleccionado);
    const nuevoDocumento: Documento = {
      id: Date.now().toString(),
      tipo: documentoSeleccionado as any,
      nombre: tipoDoc?.nombre || '',
      estado: 'generado',
      fechaGeneracion: new Date().toISOString().split('T')[0]
    };

    setDocumentos([...documentos, nuevoDocumento]);
    toast.success('Documento generado exitosamente');
    setModalDocumento(false);
    setDocumentoSeleccionado('');
  };

  const handleProgramarReunion = () => {
    if (!formReunion.fecha || !formReunion.hora || !formReunion.lugar) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const nuevaReunion: Reunion = {
      id: Date.now().toString(),
      tipo: 'apertura',
      fecha: formReunion.fecha,
      hora: formReunion.hora,
      lugar: formReunion.lugar,
      asistentes: formReunion.asistentes.split(',').map(a => a.trim()),
      agenda: formReunion.agenda,
      estado: 'programada'
    };

    setReuniones([...reuniones, nuevaReunion]);
    toast.success('Reunión programada exitosamente');
    setModalReunion(false);
    setFormReunion({ fecha: '', hora: '', lugar: '', asistentes: '', agenda: '' });
  };

  const getEstadoDocColor = (estado: string) => {
    switch (estado) {
      case 'recibido': return '#10B981';
      case 'enviado': return '#3B82F6';
      case 'generado': return '#F59E0B';
      case 'pendiente': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getEstadoDocLabel = (estado: string) => {
    switch (estado) {
      case 'recibido': return 'Recibido';
      case 'enviado': return 'Enviado';
      case 'generado': return 'Generado';
      case 'pendiente': return 'Pendiente';
      default: return estado;
    }
  };

  const porcentajeCompletado = Math.round(
    ((documentos.filter(d => d.estado === 'recibido' || d.estado === 'enviado').length +
      reuniones.filter(r => r.estado === 'realizada').length) /
      (TIPOS_DOCUMENTO.length + 1)) * 100
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl" style={{ background: '#DBEAFE' }}>
            <FileText className="w-6 h-6" style={{ color: '#3B82F6' }} />
          </div>
          <div>
            <h2 className="text-xl font-black" style={{ color: '#1F2937' }}>
              Etapa de Planeación
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {auditoria.codigo} - {auditoria.nombre}
            </p>
          </div>
        </div>
      </div>

      {/* PROGRESO DE LA ETAPA */}
      <motion.div
        className="p-6 rounded-2xl border-2"
        style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold" style={{ color: '#1F2937' }}>
            Progreso de la Etapa
          </h3>
          <span className="text-2xl font-black" style={{ color: '#3B82F6' }}>
            {porcentajeCompletado}%
          </span>
        </div>
        <div className="h-4 rounded-full" style={{ background: '#E5E7EB' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ background: '#3B82F6', width: `${porcentajeCompletado}%` }}
          />
        </div>
        <div className="mt-3 text-sm" style={{ color: '#6B7280' }}>
          {documentos.filter(d => d.estado === 'recibido' || d.estado === 'enviado').length} de {TIPOS_DOCUMENTO.length} documentos completados
          • {reuniones.filter(r => r.estado === 'realizada').length} de 1 reunión realizada
        </div>
      </motion.div>

      {/* DOCUMENTOS DE PLANEACIÓN */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black" style={{ color: '#1F2937' }}>
              Documentos de Planeación
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Gestiona los documentos oficiales de esta etapa
            </p>
          </div>
          <Button
            onClick={() => setModalDocumento(true)}
            style={{ background: '#3B82F6', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generar Documento
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {documentos.map((doc) => {
            const tipoInfo = TIPOS_DOCUMENTO.find(t => t.id === doc.tipo);
            
            return (
              <motion.div
                key={doc.id}
                className="p-5 rounded-xl border-2 hover:shadow-md transition-all"
                style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" style={{ color: '#3B82F6' }} />
                      <h4 className="font-bold text-sm" style={{ color: '#1F2937' }}>
                        {doc.nombre}
                      </h4>
                    </div>
                    <Badge
                      style={{
                        background: `${getEstadoDocColor(doc.estado)}20`,
                        color: getEstadoDocColor(doc.estado)
                      }}
                    >
                      {getEstadoDocLabel(doc.estado)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {tipoInfo && (
                  <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                    {tipoInfo.descripcion}
                  </p>
                )}

                <div className="space-y-1 text-xs" style={{ color: '#6B7280' }}>
                  {doc.fechaGeneracion && (
                    <div>
                      <span className="font-semibold">Generado:</span>{' '}
                      {new Date(doc.fechaGeneracion).toLocaleDateString('es-CO')}
                    </div>
                  )}
                  {doc.fechaEnvio && (
                    <div>
                      <span className="font-semibold">Enviado:</span>{' '}
                      {new Date(doc.fechaEnvio).toLocaleDateString('es-CO')}
                    </div>
                  )}
                  {doc.fechaRespuesta && (
                    <div>
                      <span className="font-semibold">Respuesta:</span>{' '}
                      {new Date(doc.fechaRespuesta).toLocaleDateString('es-CO')}
                    </div>
                  )}
                </div>

                {doc.estado === 'generado' && (
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    style={{ background: '#3B82F6', color: '#FFFFFF' }}
                    onClick={() => {
                      const updatedDocs = documentos.map(d =>
                        d.id === doc.id ? { ...d, estado: 'enviado' as const, fechaEnvio: new Date().toISOString().split('T')[0] } : d
                      );
                      setDocumentos(updatedDocs);
                      toast.success('Documento marcado como enviado');
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Marcar como Enviado
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Documentos faltantes */}
        {TIPOS_DOCUMENTO.filter(t => !documentos.find(d => d.tipo === t.id)).length > 0 && (
          <motion.div
            className="mt-4 p-4 rounded-xl border-2 border-dashed"
            style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <div>
                <h4 className="font-bold text-sm mb-1" style={{ color: '#92400E' }}>
                  Documentos Pendientes
                </h4>
                <ul className="text-xs space-y-1" style={{ color: '#78350F' }}>
                  {TIPOS_DOCUMENTO.filter(t => !documentos.find(d => d.tipo === t.id)).map(tipo => (
                    <li key={tipo.id}>• {tipo.nombre}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* REUNIÓN DE APERTURA */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black" style={{ color: '#1F2937' }}>
              Reunión de Apertura
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Programación y registro de la reunión inicial
            </p>
          </div>
          <Button
            onClick={() => setModalReunion(true)}
            style={{ background: '#10B981', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Programar Reunión
          </Button>
        </div>

        <div className="space-y-4">
          {reuniones.map((reunion) => (
            <motion.div
              key={reunion.id}
              className="p-5 rounded-xl border-2"
              style={{
                background: reunion.estado === 'realizada' ? '#F0FDF4' : '#FFFFFF',
                borderColor: reunion.estado === 'realizada' ? '#10B981' : '#E5E7EB'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: reunion.estado === 'realizada' ? '#D1FAE5' : '#FEF3C7' }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: reunion.estado === 'realizada' ? '#10B981' : '#F59E0B' }} />
                  </div>
                  <div>
                    <h4 className="font-bold" style={{ color: '#1F2937' }}>
                      Reunión de Apertura
                    </h4>
                    <Badge
                      style={{
                        background: reunion.estado === 'realizada' ? '#D1FAE5' : '#FEF3C7',
                        color: reunion.estado === 'realizada' ? '#10B981' : '#F59E0B'
                      }}
                    >
                      {reunion.estado === 'realizada' ? 'Realizada' : 'Programada'}
                    </Badge>
                  </div>
                </div>
                {reunion.estado === 'realizada' && (
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#10B981' }} />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Fecha y Hora</div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#1F2937' }}>
                    <Calendar className="w-4 h-4" />
                    {new Date(reunion.fecha).toLocaleDateString('es-CO')} - {reunion.hora}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Lugar</div>
                  <div className="text-sm" style={{ color: '#1F2937' }}>{reunion.lugar}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Asistentes</div>
                <div className="flex flex-wrap gap-2">
                  {reunion.asistentes.map((asistente, idx) => (
                    <Badge key={idx} variant="outline">
                      <Users className="w-3 h-3 mr-1" />
                      {asistente}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Agenda</div>
                <p className="text-sm" style={{ color: '#4B5563' }}>{reunion.agenda}</p>
              </div>

              {reunion.estado === 'realizada' && reunion.acta && (
                <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#D1FAE5' }}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Acta de Reunión
                  </Button>
                </div>
              )}

              {reunion.estado === 'programada' && (
                <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                  <Button
                    size="sm"
                    className="w-full"
                    style={{ background: '#10B981', color: '#FFFFFF' }}
                    onClick={() => {
                      const updatedReuniones = reuniones.map(r =>
                        r.id === reunion.id ? { ...r, estado: 'realizada' as const } : r
                      );
                      setReuniones(updatedReuniones);
                      toast.success('Reunión marcada como realizada');
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar como Realizada
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* MODAL GENERAR DOCUMENTO */}
      <ResponsiveModal
        isOpen={modalDocumento}
        onClose={() => {
          setModalDocumento(false);
          setDocumentoSeleccionado('');
        }}
        title="Generar Documento"
        subtitle="Selecciona el tipo de documento a generar"
        icon={<FileText className="w-6 h-6" style={{ color: '#3B82F6' }} />}
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerarDocumento}
              className="flex-1 px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#3B82F6', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4 mr-2 inline" />
              Generar Documento
            </button>
            <button
              onClick={() => {
                setModalDocumento(false);
                setDocumentoSeleccionado('');
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-3 p-1">
          {TIPOS_DOCUMENTO.map((tipo) => {
            const yaGenerado = documentos.find(d => d.tipo === tipo.id);
            
            return (
              <button
                key={tipo.id}
                disabled={!!yaGenerado}
                onClick={() => setDocumentoSeleccionado(tipo.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  documentoSeleccionado === tipo.id ? 'border-[#3B82F6] bg-[#EFF6FF]' : 'border-[#E5E7EB]'
                } ${yaGenerado ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#3B82F6] cursor-pointer'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm" style={{ color: '#1F2937' }}>
                        {tipo.nombre}
                      </h4>
                      {yaGenerado && (
                        <Badge style={{ background: '#D1FAE5', color: '#10B981' }}>
                          Ya generado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {tipo.descripcion}
                    </p>
                  </div>
                  {documentoSeleccionado === tipo.id && !yaGenerado && (
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#3B82F6' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ResponsiveModal>

      {/* MODAL PROGRAMAR REUNIÓN */}
      <ResponsiveModal
        isOpen={modalReunion}
        onClose={() => {
          setModalReunion(false);
          setFormReunion({ fecha: '', hora: '', lugar: '', asistentes: '', agenda: '' });
        }}
        title="Programar Reunión de Apertura"
        subtitle="Completa los detalles de la reunión"
        icon={<Calendar className="w-6 h-6" style={{ color: '#10B981' }} />}
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleProgramarReunion}
              className="flex-1 px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4 mr-2 inline" />
              Programar Reunión
            </button>
            <button
              onClick={() => {
                setModalReunion(false);
                setFormReunion({ fecha: '', hora: '', lugar: '', asistentes: '', agenda: '' });
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Fecha *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#10B981]"
                style={{ borderColor: '#E5E7EB' }}
                value={formReunion.fecha}
                onChange={(e) => setFormReunion({ ...formReunion, fecha: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Hora *
              </label>
              <input
                type="time"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#10B981]"
                style={{ borderColor: '#E5E7EB' }}
                value={formReunion.hora}
                onChange={(e) => setFormReunion({ ...formReunion, hora: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Lugar *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#10B981]"
              style={{ borderColor: '#E5E7EB' }}
              value={formReunion.lugar}
              onChange={(e) => setFormReunion({ ...formReunion, lugar: e.target.value })}
              placeholder="Ej: Sala de Juntas - Piso 3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Asistentes (separados por coma)
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#10B981]"
              style={{ borderColor: '#E5E7EB' }}
              value={formReunion.asistentes}
              onChange={(e) => setFormReunion({ ...formReunion, asistentes: e.target.value })}
              placeholder="Ej: María González, Carlos Ramírez, Director Financiero"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Agenda de la Reunión
            </label>
            <textarea
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#10B981]"
              style={{ borderColor: '#E5E7EB' }}
              value={formReunion.agenda}
              onChange={(e) => setFormReunion({ ...formReunion, agenda: e.target.value })}
              placeholder="Describe los puntos a tratar en la reunión..."
            />
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
