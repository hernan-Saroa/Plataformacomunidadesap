/**
 * ============================================
 * FORMULARIOS - EJECUCIÓN DE AUDITORÍA
 * ============================================
 * 
 * Formularios especializados para la fase de ejecución:
 * - Formulario de Hallazgos
 * - Formulario de Evidencias
 * - Formulario de Reunión de Cierre
 */

import { useState } from 'react';
import { Upload, Save, X, Plus, Trash2, Calendar, Users, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';

type GravedadHallazgo = 'leve' | 'moderado' | 'grave';

// ============ FORMULARIO DE HALLAZGO ============

interface FormularioHallazgoProps {
  onCrear: (datos: any) => void;
  onCancelar: () => void;
  evidenciasDisponibles: any[];
}

export function FormularioHallazgo({
  onCrear,
  onCancelar,
}: FormularioHallazgoProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [gravedad, setGravedad] = useState<GravedadHallazgo>('moderado');
  const [criterio, setCriterio] = useState('');
  const [causas, setCausas] = useState<string[]>(['']);
  const [efectos, setEfectos] = useState<string[]>(['']);
  const [recomendaciones, setRecomendaciones] = useState<string[]>(['']);

  const handleSubmit = () => {
    if (!titulo || !descripcion || !criterio) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    const causasFiltradas = causas.filter(c => c.trim());
    const efectosFiltrados = efectos.filter(e => e.trim());
    const recomendacionesFiltradas = recomendaciones.filter(r => r.trim());

    if (causasFiltradas.length === 0 || recomendacionesFiltradas.length === 0) {
      toast.error('Debe especificar al menos una causa y una recomendación');
      return;
    }

    onCrear({
      titulo,
      descripcion,
      gravedad,
      criterioIncumplido: criterio,
      causas: causasFiltradas,
      efectos: efectosFiltrados,
      recomendaciones: recomendacionesFiltradas,
    });
  };

  return (
    <div className="space-y-4">
      {/* Información básica */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Título del Hallazgo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Ej: Incumplimiento en segregación de funciones"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Descripción del Hallazgo <span className="text-red-500">*</span>
        </label>
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Describa detalladamente el hallazgo identificado..."
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Gravedad <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['leve', 'moderado', 'grave'] as GravedadHallazgo[]).map(g => (
              <button
                key={g}
                onClick={() => setGravedad(g)}
                className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                  gravedad === g
                    ? g === 'grave'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : g === 'moderado'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Criterio Incumplido <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={criterio}
            onChange={e => setCriterio(e.target.value)}
            placeholder="Ej: Art. 5 Decreto 1068/2015"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Causas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-700">
            Causas del Hallazgo <span className="text-red-500">*</span>
          </label>
          <button
            onClick={() => setCausas([...causas, ''])}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Agregar causa
          </button>
        </div>
        <div className="space-y-2">
          {causas.map((causa, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={causa}
                onChange={e => {
                  const nuevas = [...causas];
                  nuevas[idx] = e.target.value;
                  setCausas(nuevas);
                }}
                placeholder={`Causa ${idx + 1}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {causas.length > 1 && (
                <button
                  onClick={() => setCausas(causas.filter((_, i) => i !== idx))}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Efectos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-700">Efectos o Riesgos</label>
          <button
            onClick={() => setEfectos([...efectos, ''])}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Agregar efecto
          </button>
        </div>
        <div className="space-y-2">
          {efectos.map((efecto, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={efecto}
                onChange={e => {
                  const nuevos = [...efectos];
                  nuevos[idx] = e.target.value;
                  setEfectos(nuevos);
                }}
                placeholder={`Efecto ${idx + 1}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {efectos.length > 1 && (
                <button
                  onClick={() => setEfectos(efectos.filter((_, i) => i !== idx))}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recomendaciones */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-700">
            Recomendaciones <span className="text-red-500">*</span>
          </label>
          <button
            onClick={() => setRecomendaciones([...recomendaciones, ''])}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Agregar recomendación
          </button>
        </div>
        <div className="space-y-2">
          {recomendaciones.map((rec, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={rec}
                onChange={e => {
                  const nuevas = [...recomendaciones];
                  nuevas[idx] = e.target.value;
                  setRecomendaciones(nuevas);
                }}
                placeholder={`Recomendación ${idx + 1}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {recomendaciones.length > 1 && (
                <button
                  onClick={() => setRecomendaciones(recomendaciones.filter((_, i) => i !== idx))}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <ButtonSIGL variant="secondary" onClick={onCancelar} className="flex-1">
          Cancelar
        </ButtonSIGL>
        <ButtonSIGL variant="primary" onClick={handleSubmit} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Registrar Hallazgo
        </ButtonSIGL>
      </div>
    </div>
  );
}

// ============ FORMULARIO DE EVIDENCIA ============

interface FormularioEvidenciaProps {
  onCargar: (datos: any) => void;
  onCancelar: () => void;
}

export function FormularioEvidencia({
  onCargar,
  onCancelar,
}: FormularioEvidenciaProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'documento' | 'fotografia' | 'video' | 'captura' | 'otro'>('documento');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = () => {
    if (!nombre || !descripcion || !archivo) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    onCargar({
      nombre,
      descripcion,
      tipo,
      archivo,
      tags,
    });
  };

  const agregarTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Nombre de la Evidencia <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Registro contable enero 2025"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Descripción <span className="text-red-500">*</span>
        </label>
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Describa el contenido de la evidencia..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Tipo de Evidencia
        </label>
        <div className="grid grid-cols-5 gap-2">
          {(['documento', 'fotografia', 'video', 'captura', 'otro'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                tipo === t
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Archivo <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          onChange={e => setArchivo(e.target.files?.[0] || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          accept={
            tipo === 'documento'
              ? '.pdf,.doc,.docx,.xls,.xlsx'
              : tipo === 'fotografia'
              ? 'image/*'
              : tipo === 'video'
              ? 'video/*'
              : '*'
          }
        />
        {archivo && (
          <p className="text-xs text-gray-600 mt-1">
            Archivo seleccionado: {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">Etiquetas (Tags)</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && agregarTag()}
            placeholder="Escriba y presione Enter"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={agregarTag}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
              >
                {tag}
                <button
                  onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <ButtonSIGL variant="secondary" onClick={onCancelar} className="flex-1">
          Cancelar
        </ButtonSIGL>
        <ButtonSIGL variant="primary" onClick={handleSubmit} className="flex-1">
          <Upload className="w-4 h-4 mr-2" />
          Cargar Evidencia
        </ButtonSIGL>
      </div>
    </div>
  );
}

// ============ FORMULARIO DE REUNIÓN DE CIERRE ============

interface FormularioReunionCierreProps {
  auditoria: any;
  onProgramar: (datos: any) => void;
  onCancelar: () => void;
}

export function FormularioReunionCierre({
  auditoria,
  onProgramar,
  onCancelar,
}: FormularioReunionCierreProps) {
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState('14:00');
  const [lugar, setLugar] = useState('');
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual' | 'hibrida'>('virtual');
  const [enlaceVirtual, setEnlaceVirtual] = useState('');

  const handleSubmit = () => {
    if (!fecha || !hora || !lugar) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    if (modalidad !== 'presencial' && !enlaceVirtual) {
      toast.error('Debe proporcionar un enlace para reuniones virtuales o híbridas');
      return;
    }

    onProgramar({
      fecha,
      hora,
      lugar,
      modalidad,
      enlaceVirtual: modalidad !== 'presencial' ? enlaceVirtual : undefined,
      participantes: [
        {
          nombre: auditoria.auditorLider.nombre,
          rol: 'Auditor Líder',
          confirmado: true,
        },
        {
          nombre: auditoria.responsableArea.nombre,
          rol: 'Responsable del Área',
          confirmado: false,
        },
        ...auditoria.equipoAuditores.map((a: any) => ({
          nombre: a.nombre,
          rol: 'Auditor',
          confirmado: true,
        })),
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Participantes:</strong>
        </p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>• {auditoria.auditorLider.nombre} (Auditor Líder)</li>
          <li>• {auditoria.responsableArea.nombre} (Responsable del Área)</li>
          {auditoria.equipoAuditores.map((a: any) => (
            <li key={a.id}>• {a.nombre} (Auditor)</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={fecha?.toISOString().split('T')[0] || ''}
            onChange={e => setFecha(new Date(e.target.value))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Hora <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={hora}
            onChange={e => setHora(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Modalidad <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['presencial', 'virtual', 'hibrida'] as const).map(mod => (
            <button
              key={mod}
              onClick={() => setModalidad(mod)}
              className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                modalidad === mod
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Lugar <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={lugar}
          onChange={e => setLugar(e.target.value)}
          placeholder="Ej: Sala de Juntas - Piso 3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {modalidad !== 'presencial' && (
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Enlace Virtual <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={enlaceVirtual}
            onChange={e => setEnlaceVirtual(e.target.value)}
            placeholder="https://teams.microsoft.com/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <ButtonSIGL variant="secondary" onClick={onCancelar} className="flex-1">
          Cancelar
        </ButtonSIGL>
        <ButtonSIGL variant="primary" onClick={handleSubmit} className="flex-1">
          <Calendar className="w-4 h-4 mr-2" />
          Programar Reunión
        </ButtonSIGL>
      </div>
    </div>
  );
}
