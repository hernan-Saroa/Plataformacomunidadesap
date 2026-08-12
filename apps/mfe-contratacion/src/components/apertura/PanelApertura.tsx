import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, Gavel, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoApertura } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/**
 * Actividad 5.7 · Apertura formal del proceso (EFDS-1152).
 *
 * La resolución y el pliego definitivo se envían con el registro, no antes: el
 * proceso se abre con los dos documentos o no se abre. Un proceso abierto sin
 * el acto administrativo que lo respalda es lo que esta actividad evita.
 */
export function PanelApertura({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoApertura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(hoyEnBogota());
  const [secopUrl, setSecopUrl] = useState('');
  const [resolucion, setResolucion] = useState<File | null>(null);
  const [pliego, setPliego] = useState<File | null>(null);
  const [evidencia, setEvidencia] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .apertura(procesoId)
      .then((datos) => {
        setEstado(datos);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const registrar = async () => {
    if (!numero.trim() || !fecha || !resolucion || !pliego || !evidencia) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.registrarApertura(
          procesoId,
          { resolucionNumero: numero.trim(), resolucionFecha: fecha, secopUrl: secopUrl.trim() || undefined },
          resolucion,
          pliego,
          evidencia,
        ),
      );
      toast.success('Proceso abierto y pliego definitivo registrado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Consultando la apertura del proceso…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo consultar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Apertura del proceso</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no abre convocatoria">
          {estado.motivoNoAplica ??
            'La matriz de flujo no exige la apertura formal para la modalidad del proceso.'}
        </Aviso>
      </Marco>
    );
  }

  // Ya abierto: se muestra con qué acto, que es lo que el expediente debe
  // poder responder después.
  if (estado.abierta && estado.apertura) {
    const { resolucionNumero, resolucionFecha, secopUrl: enlace, abiertoPor } = estado.apertura;

    return (
      <Marco>
        <Titulo>Apertura del proceso</Titulo>
        <Aviso tono="ok" titulo={`Proceso abierto con la resolución ${resolucionNumero}`}>
          Del {fechaLarga(resolucionFecha)}
          {abiertoPor ? ` · registrada por ${abiertoPor}` : ''}. El pliego definitivo quedó en el
          expediente.
        </Aviso>

        {/* Los tres documentos que quedaron en el expediente. Se listan aquí y
            no solo en el expediente porque son los que responden "con qué se
            abrió", que es lo que se le pregunta a esta actividad. */}
        <div className="space-y-2">
          {(
            [
              ['Resolución de apertura', estado.apertura.resolucion],
              ['Pliego definitivo', estado.apertura.pliegoDefinitivo],
              ['Evidencia de la publicación', estado.apertura.evidencia],
            ] as const
          ).map(([etiqueta, archivo]) =>
            archivo ? (
              <div
                key={etiqueta}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 flex items-start gap-2.5"
              >
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-800 m-0">{etiqueta}</p>
                  <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                    {archivo.nombre}
                  </p>
                </div>
              </div>
            ) : null,
          )}
        </div>

        {enlace ? (
          <a
            href={enlace}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver el proceso en SECOP II
          </a>
        ) : null}
      </Marco>
    );
  }

  // El CDP es el único requisito que bloquea (RF-EST-05). Se dice qué falta y
  // dónde se resuelve, en vez de dejar el formulario muerto sin explicación.
  if (!estado.requisitos.cdp.cumplido) {
    return (
      <Marco>
        <Titulo>Apertura del proceso</Titulo>
        <Pendiente
          falta="4.3"
          texto={
            estado.requisitos.cdp.motivo
              ? `${estado.requisitos.cdp.motivo}. El proceso no puede abrirse sin el CDP expedido.`
              : 'El proceso no puede abrirse mientras el CDP no esté expedido.'
          }
        />
      </Marco>
    );
  }

  const listo = !!numero.trim() && !!fecha && !!resolucion && !!pliego && !!evidencia;

  return (
    <Marco>
      <Titulo>Apertura del proceso</Titulo>
      <Ayuda>
        Registra la resolución que da inicio formal al proceso y el pliego definitivo que rige de
        aquí en adelante. Los dos quedan en el expediente con su huella digital.
      </Ayuda>

      {/* No bloquea, pero abrir con la elaboración a medias es una señal de que
          algo se saltó. */}
      {!estado.requisitos.documentos.cumplido ? (
        <Aviso tono="aviso" titulo="La elaboración de documentos está incompleta">
          Faltan documentos de la actividad 5.1. Puedes abrir igualmente, pero conviene revisarla
          antes.
        </Aviso>
      ) : null}

      <div>
        <label htmlFor="apertura-numero" className="block text-xs font-bold text-gray-600 mb-1.5">
          Número de la resolución <span className="text-red-600">*</span>
        </label>
        <input
          id="apertura-numero"
          type="text"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="0451 de 2026"
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="apertura-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
          Fecha de la resolución <span className="text-red-600">*</span>
        </label>
        <input
          id="apertura-fecha"
          type="date"
          value={fecha}
          max={hoyEnBogota()}
          onChange={(e) => setFecha(e.target.value)}
          className={campo}
        />
        <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
          La del acto ya firmado, no la de hoy: de ella cuentan los términos que siguen.
        </p>
      </div>

      <div>
        <label htmlFor="apertura-secop" className="block text-xs font-bold text-gray-600 mb-1.5">
          Enlace en SECOP II
        </label>
        <input
          id="apertura-secop"
          type="url"
          value={secopUrl}
          onChange={(e) => setSecopUrl(e.target.value)}
          placeholder="https://community.secop.gov.co/…"
          className={campo}
        />
      </div>

      <SelectorArchivo
        etiqueta="Resolución de apertura"
        archivo={resolucion}
        onElegir={setResolucion}
      />
      <SelectorArchivo etiqueta="Pliego definitivo" archivo={pliego} onElegir={setPliego} />
      {/* Admite imagen, a diferencia de los dos anteriores: la prueba de que el
          pliego se publicó suele ser una captura de SECOP II. */}
      <SelectorArchivo
        etiqueta="Evidencia de la publicación"
        ayuda="Constancia o captura de SECOP II. Es lo único que prueba que el pliego definitivo se publicó."
        acepta=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        archivo={evidencia}
        onElegir={setEvidencia}
      />

      <Boton
        icono={<Gavel className="w-3.5 h-3.5" />}
        disabled={!listo || guardando}
        onClick={registrar}
      >
        {guardando ? 'Abriendo…' : 'Abrir el proceso'}
      </Boton>
    </Marco>
  );
}

/** Un adjunto obligatorio del registro, con su nombre cuando ya está elegido. */
function SelectorArchivo({
  etiqueta,
  ayuda,
  acepta = '.pdf,.doc,.docx,.xls,.xlsx',
  archivo,
  onElegir,
}: {
  etiqueta: string;
  ayuda?: string;
  acepta?: string;
  archivo: File | null;
  onElegir: (archivo: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        archivo ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p
        className={`text-xs font-bold m-0 flex items-start gap-1.5 ${
          archivo ? 'text-emerald-900' : 'text-slate-700'
        }`}
      >
        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {etiqueta} <span className="text-red-600">*</span>
      </p>
      <p
        className={`text-[11.5px] m-0 leading-relaxed break-words ${
          archivo ? 'text-emerald-900' : 'text-slate-600'
        }`}
      >
        {archivo ? archivo.name : (ayuda ?? 'Sin archivo seleccionado.')}
      </p>

      <input
        ref={input}
        type="file"
        className="hidden"
        accept={acepta}
        onChange={(e) => {
          const elegido = e.target.files?.[0];
          e.target.value = '';
          if (elegido) onElegir(elegido);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {archivo ? 'Cambiar archivo' : 'Seleccionar archivo'}
      </button>
    </div>
  );
}
