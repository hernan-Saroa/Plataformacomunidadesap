import React, { useEffect, useState } from 'react';
import { FileSignature, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoSuscripcionActa, EvidenciaFirmaOtp } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, SelectorArchivo, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';
import { DocumentoVisible, VisorDocumento } from '../shared/VisorDocumento';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '8.7';

/**
 * Actividad 8.7 · Acta de inicio suscrita (migración 089).
 *
 * Antes compartía pantalla con la reunión de inicio (9.1), y la casilla del
 * riel que decía «Acta de inicio» abría un panel titulado «Reunión de inicio».
 * Ahora cada una tiene la suya: aquí se registra el acta firmada por las dos
 * partes, que cierra la legalización, y la reunión la toma de aquí.
 *
 * Si el acta aplica no se pregunta: lo dice la matriz SÍ/NO por modalidad. Por
 * eso ya no hay casilla de «el contrato la pactó».
 */
export function PanelSuscripcionActa({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Registrar el acta de inicio');
  const [estado, setEstado] = useState<EstadoSuscripcionActa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fecha, setFecha] = useState(hoyEnBogota());
  const [acta, setActa] = useState<File | null>(null);
  const [viendo, setViendo] = useState<DocumentoVisible | null>(null);

  useEffect(() => {
    setEstado(null);
    contratacionService
      .actaSuscrita(procesoId)
      .then((e) => {
        setEstado(e);
        setError(null);
      })
      .catch((e: any) => setError(e.message));
  }, [procesoId]);

  const registrar = async (firmaOtp?: EvidenciaFirmaOtp) => {
    if (!acta) return;
    setGuardando(true);
    try {
      setEstado(
        await contratacionService.registrarActaSuscrita(
          procesoId,
          { fechaSuscripcion: fecha, firma: firmaOtp },
          acta,
        ),
      );
      setActa(null);
      toast.success('Acta de inicio registrada');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (error) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error}
        </Aviso>
      </Marco>
    );
  }

  if (!estado) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el acta de inicio…</p>
      </Marco>
    );
  }

  const suscrita = estado.suscripcion;

  return (
    <Marco>
      <Titulo>Acta de inicio</Titulo>
      <Ayuda>
        La entidad y el contratista suscriben el acta de inicio. Con ella se cierra la legalización;
        el contrato entra en ejecución con la reunión de inicio (9.1).
      </Ayuda>

      {!estado.aplica ? (
        <Aviso tono="aviso" titulo="Esta modalidad no suscribe acta de inicio">
          Así lo dice la matriz de la modalidad. El contrato arranca con la reunión de inicio, sin
          acta.
        </Aviso>
      ) : null}

      {estado.aplica && !suscrita && estado.motivoNoPuede ? (
        <Pendiente
          // Mismo criterio que la reunión: si ya está legalizado lo que falta es
          // el supervisor (8.2); si no, las garantías (8.4) o la ARL (8.5).
          falta={estado.legalizado ? '8.2' : estado.requiereArl ? '8.5' : '8.4'}
          texto={`El acta se suscribe sobre un contrato legalizado y con supervisor: ${estado.motivoNoPuede}.`}
        />
      ) : null}

      {suscrita ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <FileSignature className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                Suscrita el {fechaLarga(suscrita.fechaSuscripcion)}
              </p>
              <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed">
                {suscrita.registradoPor ? `Registró ${suscrita.registradoPor}` : 'Registrada'}
                {suscrita.createdAt ? ` el ${momento(suscrita.createdAt)}` : ''}
              </p>
              {suscrita.documento?.url ? (
                <button
                  type="button"
                  onClick={() =>
                    setViendo({
                      nombre: suscrita.documento!.nombre,
                      descargaUrl: suscrita.documento!.url,
                      mimeType: suscrita.documento!.mimeType,
                    })
                  }
                  className="inline-flex items-center gap-1.5 mt-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {suscrita.documento.nombre}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {estado.puedeRegistrar ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <div>
            <label htmlFor="acta-suscripcion" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha en que se firmó <span className="text-red-600">*</span>
            </label>
            <input
              id="acta-suscripcion"
              type="date"
              value={fecha}
              max={hoyEnBogota()}
              onChange={(e) => setFecha(e.target.value)}
              className={campo}
            />
          </div>

          <SelectorArchivo
            id="acta-suscrita"
            etiqueta="Acta firmada"
            ayuda="La suscrita por la entidad y el contratista"
            archivo={acta}
            onElegir={setActa}
          />

          <Boton
            icono={<FileSignature className="w-3.5 h-3.5" />}
            disabled={!fecha || !acta || guardando}
            onClick={() => firma.conFirma(registrar)}
          >
            {guardando ? 'Registrando…' : 'Registrar acta de inicio'}
          </Boton>
        </div>
      ) : null}

      <VisorDocumento documento={viendo} onClose={() => setViendo(null)} />
      {firma.modal}
    </Marco>
  );
}
