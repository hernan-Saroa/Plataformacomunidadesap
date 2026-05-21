/**
 * MODAL DEVOLVER NOTICIA — WORLD CLASS ESAP SIGL v5.0
 * Permite devolver una noticia disciplinaria indicando motivo, área destino y observaciones.
 * Genera número de devolución (DEV-YYYY-XXXX) y actualiza trazabilidad.
 */

import { useState } from 'react';
import { ArrowLeft, AlertTriangle, FileText, MessageSquare, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  WorldClassModal, WCLabel, WCSelect, WCTextarea, WCResumenBloque,
  WCInfoBox, WCBotonPrimario, WCBotonSecundario,
} from './WorldClassModalBase';

interface NoticiaDevolverProps {
  id: string;
  numero: string;
  origen: string;
  fechaRecepcion: string;
  denunciante: { nombre: string; identificacion?: string };
  denunciado: { nombre: string; identificacion?: string };
  hechos?: string;
}

interface Props {
  noticia: NoticiaDevolverProps;
  onClose: () => void;
  onConfirm: (datos: {
    motivo: string;
    motivoLabel: string;
    observaciones: string;
    numeroDevolucion: string;
  }) => void;
}

const MOTIVOS_DEVOLUCION = [
  { value: 'info-incompleta',   label: 'Informacion incompleta o insuficiente',           requiereArea: false },
  { value: 'documentos-faltantes', label: 'Documentos soporte faltantes',                 requiereArea: false },
  { value: 'error-radicacion',  label: 'Error en la radicacion o datos inconsistentes',    requiereArea: false },
  { value: 'fuera-competencia', label: 'Fuera de competencia del area disciplinaria',      requiereArea: true },
  { value: 'duplicado',         label: 'Noticia duplicada con radicado existente',          requiereArea: false },
  { value: 'anonimo-sin-soporte', label: 'Queja anonima sin soporte probatorio minimo',    requiereArea: false },
  { value: 'otro',              label: 'Otro motivo',                                       requiereArea: false },
];


export function ModalDevolverNoticia({ noticia, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);

  const motivoSeleccionado = MOTIVOS_DEVOLUCION.find(m => m.value === motivo);

  const esValido = motivo && observaciones.trim().length >= 10;

  const handleDevolver = () => {
    if (!motivo) { toast.error('Validacion', { description: 'Selecciona el motivo de devolucion' }); return; }
    if (observaciones.trim().length < 10) { toast.error('Validacion', { description: 'Las observaciones deben tener al menos 10 caracteres' }); return; }

    setEnviando(true);

    // Generar numero de devolucion
    const anio = new Date().getFullYear();
    const consecutivo = String(Math.floor(Math.random() * 9000) + 1000);
    const numeroDevolucion = `DEV-${anio}-${consecutivo}`;

    // Simular procesamiento breve
    setTimeout(() => {
      onConfirm({
        motivo,
        motivoLabel: motivoSeleccionado?.label || motivo,
        observaciones: observaciones.trim(),
        numeroDevolucion,
      });
      setEnviando(false);
    }, 400);
  };

  const pie = (
    <>
      <WCBotonSecundario onClick={onClose}>Cancelar</WCBotonSecundario>
      <button
        onClick={handleDevolver}
        disabled={!esValido || enviando}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
        style={{
          background: esValido && !enviando ? '#D97706' : '#D1D5DB',
          cursor: esValido && !enviando ? 'pointer' : 'not-allowed',
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        {enviando ? 'Procesando...' : 'Devolver Noticia'}
      </button>
    </>
  );

  return (
    <WorldClassModal
      titulo="Devolver Noticia"
      subtitulo={noticia.numero}
      icono={<ArrowLeft className="w-5 h-5 text-white" />}
      ancho={580}
      pie={pie}
      onCerrar={onClose}
    >
      {/* Resumen de la noticia */}
      <WCResumenBloque
        icono={<FileText className="w-4 h-4 text-orange-600" />}
        etiqueta="NOTICIA A DEVOLVER"
        titulo={noticia.numero}
        subtitulo={`${noticia.denunciado.nombre} ${noticia.denunciado.identificacion ? '(' + noticia.denunciado.identificacion + ')' : ''}`}
        descripcion={`Origen: ${noticia.origen} · Fecha: ${new Date(noticia.fechaRecepcion).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`}
      />

      {/* Info box */}
      <WCInfoBox>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
          <div>
            <p className="font-bold text-blue-800 mb-0.5">Devolucion de noticia</p>
            <p>La noticia sera devuelta al radicador para que corrija o complete la informacion segun las observaciones indicadas. Se generara un numero de devolucion y se notificara al radicador.</p>
          </div>
        </div>
      </WCInfoBox>

      {/* Motivo de devolucion */}
      <div>
        <WCLabel required>Motivo de devolucion</WCLabel>
        <WCSelect value={motivo} onChange={e => setMotivo(e.target.value)}>
          <option value="">Selecciona un motivo...</option>
          {MOTIVOS_DEVOLUCION.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </WCSelect>
      </div>

      {/* Observaciones */}
      <div>
        <WCLabel required>Observaciones y justificacion</WCLabel>
        <WCTextarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Describe detalladamente el motivo de devolucion, acciones requeridas y/o documentos faltantes..."
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-gray-400">Minimo 10 caracteres</p>
          <p className={`text-[10px] font-bold ${observaciones.trim().length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
            {observaciones.trim().length}/10
          </p>
        </div>
      </div>

      {/* Advertencia */}
      {motivo === 'duplicado' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p><span className="font-bold">Nota:</span> Si la noticia es duplicada, menciona el numero de radicado original en las observaciones para mantener la trazabilidad.</p>
          </div>
        </div>
      )}
    </WorldClassModal>
  );
}
