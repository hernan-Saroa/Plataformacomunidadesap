/**
 * MODAL REMITIR POR COMPETENCIA — WORLD CLASS ESAP SIGL v5.0
 * Permite remitir una noticia disciplinaria a otra entidad o area
 * cuando no es competencia de Control Interno Disciplinario.
 * Genera numero RC (Remision por Competencia) y registra en bitacora.
 */

import { useState, useEffect } from 'react';
import { useResponsive } from './hooks/useResponsive';
import { Send, AlertTriangle, FileText, Building2, Info, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  WorldClassModal, WCLabel, WCSelect, WCTextarea, WCResumenBloque,
  WCInfoBox, WCWarningBox, WCBotonPrimario, WCBotonSecundario, WCInput,
} from './WorldClassModalBase';
import { tiposRemisionService, TipoRemision } from '../../../services/api/tiposRemisionService';
import { entidadesRemisionService, EntidadRemision as EntidadRemisionApi } from '../../../services/api/entidadesRemisionService';
import { authService } from '../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

interface NoticiaRemitirProps {
  id: string;
  processId?: string;
  numero: string;
  origen?: string;
  fechaRecepcion?: string;
  denunciante: { nombre: string; identificacion?: string };
  denunciado: { nombre: string; identificacion?: string; cargo?: string };
  hechos?: string;
  entidadDestinoPredefinida?: string;
  entidadDestinoEmailPredefinida?: string;
}

interface EntidadRemision {
  id: string;
  nombre: string;
  correo: string;
  activo?: boolean;
}

interface Props {
  noticia: NoticiaRemitirProps;
  entidadesConfiguradas?: EntidadRemision[];
  onClose: () => void;
  onConfirm: (datos: {
    entidadId: string;
    entidadNombre: string;
    entidadCorreo: string;
    tipoRemision: string;
    justificacion: string;
    numeroRC: string;
  }) => Promise<void>; // Cambiado a Promise para manejar carga
}

const ENTIDADES_POR_DEFECTO = [
  { id: 'procuraduria',  nombre: 'Procuraduría General de la Nación',    correo: 'quejas@procuraduria.gov.co' },
  { id: 'personeria',    nombre: 'Personería Municipal / Distrital',      correo: '' },
  { id: 'contraloria',   nombre: 'Contraloría General de la República',   correo: '' },
  { id: 'fiscalia',      nombre: 'Fiscalía General de la Nación',         correo: '' },
  { id: 'min-publico',   nombre: 'Ministerio Público',                    correo: '' },
  { id: 'oficina-control', nombre: 'Oficina de Control Interno Disciplinario (otra entidad)', correo: '' },
];

// Los tipos de remisión se cargan dinámicamente desde el backend

const FUNDAMENTOS_LEGALES = [
  { value: 'art-2-ley-1952',    label: 'Art. 2 - Ley 1952 de 2019 (Titularidad de la acción)' },
  { value: 'art-3-ley-1952',    label: 'Art. 3 - Ley 1952 de 2019 (Poder disciplinario preferente)' },
  { value: 'art-12-ley-1952',   label: 'Art. 12 - Ley 1952 de 2019 (Competencia por factor territorial)' },
  { value: 'art-13-ley-1952',   label: 'Art. 13 - Ley 1952 de 2019 (Competencia por factor funcional)' },
  { value: 'art-75-ley-1952',   label: 'Art. 75 - Ley 1952 de 2019 (Conflicto de competencias)' },
  { value: 'otro',              label: 'Otro fundamento (especificar en justificación)' },
];

export function ModalRemitirCompetencia({ noticia, entidadesConfiguradas, onClose, onConfirm }: Props) {
  const [entidadId, setEntidadId] = useState('');
  const [tipoRemision, setTipoRemision] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tiposRemision, setTiposRemision] = useState<TipoRemision[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [entidadesBD, setEntidadesBD] = useState<EntidadRemision[]>([]);
  const [mostrarEdicionManual, setMostrarEdicionManual] = useState(false);

  // Hook responsive
  const { isMobile } = useResponsive();

  // Cargar tipos de remisión y entidades paramétricas desde el backend
  useEffect(() => {
    cargarTiposRemision();
    entidadesRemisionService.getActivas().then(data => {
      if (data && data.length > 0) {
        setEntidadesBD(data);
      }
    }).catch(err => {
      console.warn('Error al cargar entidades parametricas en modal remision:', err);
    });
  }, []);

  const cargarTiposRemision = async () => {
    try {
      setLoadingTipos(true);
      const data = await tiposRemisionService.getActivas();
      setTiposRemision(data);
    } catch (error) {
      console.error('Error al cargar tipos de remisión:', error);
      // Fallback a datos hardcodeados si falla el backend
      setTiposRemision([
        { id: 'sin-competencia', codigo: 'sin-competencia', nombre: 'Sin competencia disciplinaria', activo: true },
        { id: 'factor-territorial', codigo: 'factor-territorial', nombre: 'Por factor territorial', activo: true },
        { id: 'factor-funcional', codigo: 'factor-funcional', nombre: 'Por factor funcional (servidor de otra entidad)', activo: true },
        { id: 'naturaleza-falta', codigo: 'naturaleza-falta', nombre: 'Por naturaleza de la falta (penal, fiscal)', activo: true },
        { id: 'prelacion-competencia', codigo: 'prelacion-competencia', nombre: 'Por prelación de competencia (Procuraduría)', activo: true },
      ]);
    } finally {
      setLoadingTipos(false);
    }
  };

  // Combinar entidades configuradas con las de BD o por defecto
  const fuenteEntidades = (entidadesConfiguradas && entidadesConfiguradas.length > 0)
    ? entidadesConfiguradas
    : (entidadesBD.length > 0 ? entidadesBD : ENTIDADES_POR_DEFECTO);

  const entidadesBase = fuenteEntidades.map(e => ({ id: e.id, nombre: e.nombre, correo: e.correo }));

  // Si el auto o proceso ya definió una entidad destino, buscar si coincide con la paramétrica para su correo
  const entidadCoincidente = entidadesBase.find(e =>
    e.nombre.toLowerCase().trim() === noticia.entidadDestinoPredefinida?.toLowerCase().trim() ||
    e.nombre.toLowerCase().includes(noticia.entidadDestinoPredefinida?.toLowerCase().trim() || '') ||
    (noticia.entidadDestinoPredefinida || '').toLowerCase().includes(e.nombre.toLowerCase())
  );

  const correoFinal = noticia.entidadDestinoEmailPredefinida || entidadCoincidente?.correo || '';

  // Si el auto aprobó una entidad destino que no está en la lista, incluirla
  const entidades = [...entidadesBase];
  if (noticia.entidadDestinoPredefinida && !entidades.some(e => e.nombre.toLowerCase() === noticia.entidadDestinoPredefinida?.toLowerCase() || e.id === noticia.entidadDestinoPredefinida)) {
    entidades.unshift({
      id: 'predefinida-jefe',
      nombre: noticia.entidadDestinoPredefinida,
      correo: correoFinal,
    });
  }

  // Pre-seleccionar la entidad, tipo y justificación si ya vienen del Auto / Jefe
  useEffect(() => {
    if (noticia.entidadDestinoPredefinida) {
      const match = entidades.find(e =>
        e.nombre.toLowerCase().includes(noticia.entidadDestinoPredefinida!.toLowerCase().trim()) ||
        noticia.entidadDestinoPredefinida!.toLowerCase().trim().includes(e.nombre.toLowerCase()) ||
        e.id === 'predefinida-jefe'
      );
      if (match) {
        setEntidadId(match.id);
      }
      if (!tipoRemision) {
        setTipoRemision('sin-competencia');
      }
      if (!justificacion) {
        setJustificacion('Remisión por competencia aprobada mediante Auto por el Jefe OCID para trámite ante la entidad competente.');
      }
    }
  }, [noticia.entidadDestinoPredefinida, entidades.length]);

  const entidadSeleccionada = entidades.find(e => e.id === entidadId);

  const esValido = entidadId
    && tipoRemision
    && justificacion.trim().length >= 20;

  const handleRemitir = async () => {
    const canRedimir = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_REDIMIR) ||
      authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_REDIMIR) ||
      authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_ROL_ES_RADICADOR) ||
      authService.isSuperAdmin();

    if (!canRedimir) {
      toast.error('No tiene permisos para remitir por competencia');
      return;
    }
    if (!entidadId) { toast.error('Validacion', { description: 'Selecciona la entidad de destino' }); return; }
    if (!tipoRemision) { toast.error('Validacion', { description: 'Selecciona el tipo de remision' }); return; }
    if (justificacion.trim().length < 20) { toast.error('Validacion', { description: 'La justificacion debe tener al menos 20 caracteres' }); return; }

    setEnviando(true);

    // Generar numero RC
    const anio = new Date().getFullYear();
    const consecutivo = String(Math.floor(Math.random() * 9000) + 1000);
    const numeroRC = `RC-${anio}-${consecutivo}`;

    try {
      // Llamar a onConfirm y esperar a que complete (incluye el envio del correo)
      await onConfirm({
        entidadId,
        entidadNombre: entidadSeleccionada?.nombre || entidadId,
        entidadCorreo: entidadSeleccionada?.correo || '',
        tipoRemision,
        justificacion: justificacion.trim(),
        numeroRC,
      });
      // onConfirm completado exitosamente - cerrar el modal
      onClose();
    } catch (error) {
      console.error('Error al remitir:', error);
      toast.error('Error al remitir la noticia por competencia');
    } finally {
      setEnviando(false);
    }
  };

  const pie = (
    <>
      <WCBotonSecundario onClick={onClose}>Cancelar</WCBotonSecundario>
      <button
        onClick={handleRemitir}
        disabled={!esValido || enviando}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
        style={{
          background: esValido && !enviando ? '#7C3AED' : '#D1D5DB',
          cursor: esValido && !enviando ? 'pointer' : 'not-allowed',
        }}
      >
        {enviando ? (
          <>
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Enviando correo...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Remitir por Competencia
          </>
        )}
      </button>
    </>
  );

  return (
    <WorldClassModal
      titulo="Remitir por Competencia"
      subtitulo={noticia.numero}
      icono={<Send className="w-5 h-5 text-white" />}
      ancho={620}
      pie={pie}
      onCerrar={onClose}
    >
      {/* Resumen de la noticia */}
      <WCResumenBloque
        icono={<FileText className="w-4 h-4 text-orange-600" />}
        etiqueta="NOTICIA A REMITIR"
        titulo={noticia.numero}
        subtitulo={`${noticia.denunciado.nombre} ${noticia.denunciado.identificacion ? '(' + noticia.denunciado.identificacion + ')' : ''}`}
        descripcion={noticia.denunciado.cargo ? `Cargo: ${noticia.denunciado.cargo} · Origen: ${noticia.origen}` : `Origen: ${noticia.origen}`}
      />

      {/* Info contextual */}
      <WCInfoBox>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
          <div>
            <p className="font-bold text-blue-800 mb-0.5">Remisión por competencia</p>
            <p>Se generará el radicado RC (Remisión por Competencia), se enviará el correo con los documentos del expediente y anexos comprimidos a la entidad correspondiente.</p>
          </div>
        </div>
      </WCInfoBox>

      {/* Si viene con entidad predefinida y no ha pedido modificar manualmente, mostramos la tarjeta ejecutiva de confirmación */}
      {noticia.entidadDestinoPredefinida && !mostrarEdicionManual ? (
        <div className="p-4 rounded-xl bg-purple-50/90 border-2 border-purple-300 text-purple-950 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">
                  Entidad Destino Aprobada
                </span>
                <p className="text-base font-black text-purple-950">
                  {entidadSeleccionada?.nombre || noticia.entidadDestinoPredefinida}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarEdicionManual(true)}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline px-2 py-1 rounded hover:bg-purple-100 transition-colors"
            >
              Modificar datos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-purple-200 text-xs">
            <div>
              <span className="text-purple-600 font-medium block">Correo oficial de remisión:</span>
              <span className="font-bold flex items-center gap-1.5 text-purple-900 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                {entidadSeleccionada?.correo || correoFinal || 'Sin correo configurado'}
              </span>
            </div>
            <div>
              <span className="text-purple-600 font-medium block">Tipo de remisión:</span>
              <span className="font-bold text-purple-900 mt-0.5 block">
                {tiposRemision.find(t => t.codigo === tipoRemision)?.nombre || 'Sin competencia disciplinaria'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-purple-200 text-xs">
            <span className="text-purple-600 font-medium block">Justificación:</span>
            <p className="text-purple-900 mt-1 text-xs bg-white/80 p-2.5 rounded-lg border border-purple-200">
              {justificacion}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Auto de remisión revisado y confirmado. Listo para remitir por competencia.</span>
          </div>
        </div>
      ) : (
        <>
          {noticia.entidadDestinoPredefinida && mostrarEdicionManual && (
            <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg border border-purple-200">
              <span className="text-xs text-purple-700 font-medium">Modo de edición manual activado</span>
              <button
                type="button"
                onClick={() => setMostrarEdicionManual(false)}
                className="text-xs text-purple-800 font-bold underline"
              >
                Volver a datos predeterminados
              </button>
            </div>
          )}

          {/* Entidad destino */}
          <div>
            <WCLabel required>Entidad / Área de destino</WCLabel>
            <WCSelect value={entidadId} onChange={e => setEntidadId(e.target.value)}>
              <option value="">Selecciona la entidad competente...</option>
              {entidades.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </WCSelect>
            {entidadSeleccionada?.correo && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
                <Mail className="w-3 h-3 text-purple-600" />
                <span className="text-[11px] text-purple-700 font-medium">{entidadSeleccionada.correo}</span>
              </div>
            )}
            {(!entidadesConfiguradas || entidadesConfiguradas.length === 0) && entidadesBD.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                Puedes configurar entidades personalizadas en Configuración &gt; Entidades de Remisión
              </p>
            )}
          </div>

          {/* Tipo de remisión */}
          <div>
            <WCLabel required>Tipo de remisión</WCLabel>
            <WCSelect value={tipoRemision} onChange={e => setTipoRemision(e.target.value)} disabled={loadingTipos}>
              <option value="">Selecciona el tipo...</option>
              {loadingTipos ? (
                <option value="" disabled>Cargando tipos...</option>
              ) : (
                tiposRemision.map(t => (
                  <option key={t.id} value={t.codigo}>{t.nombre}</option>
                ))
              )}
            </WCSelect>
          </div>

          {/* Justificación */}
          <div>
            <WCLabel required>Justificación de la remisión</WCLabel>
            <WCTextarea
              value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
              rows={3}
              placeholder="Explica detalladamente por qué esta noticia no corresponde a Control Interno Disciplinario y debe ser remitida a la entidad seleccionada..."
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-gray-400">Mínimo 20 caracteres</p>
              <p className={`text-[10px] font-bold ${justificacion.trim().length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                {justificacion.trim().length}/20
              </p>
            </div>
          </div>
        </>
      )}

      {/* Warning si es Procuraduria */}
      {entidadId === 'procuraduria' && (
        <WCWarningBox>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-bold text-amber-800 mb-0.5">Remision a Procuraduria</p>
              <p>La Procuraduria General de la Nacion ejerce el poder disciplinario preferente. Asegurate de remitir copia del expediente completo conforme al Art. 3 de la Ley 1952 de 2019.</p>
            </div>
          </div>
        </WCWarningBox>
      )}
    </WorldClassModal>
  );
}
