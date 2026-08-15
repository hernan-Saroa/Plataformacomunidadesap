import React, { useEffect, useState } from 'react';
import { Check, Download, FileSignature, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DatosContrato,
  EstadoContratoProceso,
  TipoPersonaContratista,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Estado inicial del formulario; también sirve para limpiarlo al terminar. */
const VACIO = {
  tipologia: '',
  numero: '',
  objeto: '',
  valor: '',
  plazoDias: '',
  contratistaDocumento: '',
  contratistaNombre: '',
  contratistaTipo: 'NATURAL' as TipoPersonaContratista,
};

/**
 * Actividad 8.1 · Contrato electrónico y aceptación (EFDS-1161).
 *
 * El sistema no redacta la minuta: ofrece el formato del SIG de la tipología,
 * se diligencia fuera y se sube el documento resultante. Después se registra si
 * el proponente lo acepta, que es lo que formaliza el vínculo.
 */
export function PanelContrato({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoContratoProceso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const [datos, setDatos] = useState(VACIO);
  const [minuta, setMinuta] = useState<File | null>(null);
  const [aceptante, setAceptante] = useState('');

  const leer = () =>
    contratacionService
      .contrato(procesoId)
      .then((respuesta) => {
        setEstado(respuesta);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const limpiar = () => {
    setDatos(VACIO);
    setMinuta(null);
    setGenerando(false);
  };

  const cambiar = (clave: keyof typeof VACIO, valor: string) =>
    setDatos((previo) => ({ ...previo, [clave]: valor }));

  const generar = async () => {
    if (!minuta) return;

    const cuerpo: DatosContrato = {
      tipologia: datos.tipologia,
      numero: datos.numero.trim(),
      objeto: datos.objeto.trim(),
      valor: Number(datos.valor),
      contratistaDocumento: datos.contratistaDocumento.trim(),
      contratistaNombre: datos.contratistaNombre.trim(),
      contratistaTipo: datos.contratistaTipo,
      ...(datos.plazoDias ? { plazoDias: Number(datos.plazoDias) } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.generarContrato(procesoId, cuerpo, minuta));
      limpiar();
      toast.success('Contrato generado; falta que el proponente lo acepte');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const aceptar = async () => {
    const nombre = aceptante.trim();
    if (!nombre) {
      toast.error('Escribe quién acepta en nombre del proponente');
      return;
    }

    setGuardando(true);
    try {
      setEstado(await contratacionService.aceptarContrato(procesoId, nombre));
      setAceptante('');
      toast.success('Aceptación registrada; el contrato queda formalizado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const rechazar = async () => {
    const quien = window.prompt('¿Quién rechaza en nombre del proponente?')?.trim();
    if (!quien) return;

    const motivo = window.prompt('¿Por qué no acepta la minuta?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.rechazarContrato(procesoId, quien, motivo));
      toast.success('Rechazo registrado; puedes generar una nueva minuta');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el contrato…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  const contrato = estado.contrato;
  const completo =
    datos.tipologia &&
    datos.numero.trim() &&
    datos.objeto.trim().length >= 10 &&
    Number(datos.valor) > 0 &&
    datos.contratistaDocumento.trim() &&
    datos.contratistaNombre.trim() &&
    minuta;

  return (
    <Marco>
      <Titulo>Contrato electrónico</Titulo>
      <Ayuda>
        Descarga el formato de la tipología, diligéncialo y sube la minuta firmada. El contrato
        queda formalizado cuando se registra la aceptación del proponente.
      </Ayuda>

      {/* Por qué no se puede todavía, en vez de un botón apagado sin explicación. */}
      {!estado.adjudicado && !contrato ? (
        <Pendiente
          falta="7.4"
          texto={`El contrato se elabora sobre un proceso ya adjudicado: ${
            estado.motivoNoAdjudicado ?? 'todavía no lo está'
          }.`}
        />
      ) : null}

      {/* Los formatos del SIG de esta actividad, para descargarlos y diligenciarlos. */}
      {estado.formatos.length > 0 && !contrato ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Formatos de la actividad</p>
          {estado.formatos.map((formato) => (
            <a
              key={formato.id}
              href={formato.archivoUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              {formato.nombre} ({formato.codigo} v{formato.version})
            </a>
          ))}
        </div>
      ) : null}

      {contrato ? (
        <>
          <div
            className={`rounded-lg border px-3.5 py-3 ${
              contrato.estado === 'ACEPTADO'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <FileSignature
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  contrato.estado === 'ACEPTADO' ? 'text-emerald-900' : 'text-slate-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[12.5px] font-bold m-0 break-words ${
                    contrato.estado === 'ACEPTADO' ? 'text-emerald-900' : 'text-slate-800'
                  }`}
                >
                  Contrato {contrato.numero} · {contrato.tipologiaNombre}
                </p>
                <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                  {contrato.contratista.nombre} ({contrato.contratista.documento}) ·{' '}
                  {pesos.format(contrato.valor)}
                  {contrato.plazoDias ? ` · ${contrato.plazoDias} días` : ''}
                </p>
                <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                  {contrato.objeto}
                </p>
                {contrato.minuta ? (
                  <a
                    href={contrato.minuta.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {contrato.minuta.nombre}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {contrato.estado === 'ACEPTADO' ? (
            <Aviso tono="ok" titulo="El proponente aceptó el contrato">
              Aceptado por {contrato.aceptadoPor}
              {contrato.aceptadoAt ? ` el ${fechaLarga(contrato.aceptadoAt)}` : ''}. Con esto el
              vínculo contractual queda formalizado.
            </Aviso>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
              <p className="text-[12.5px] font-bold text-slate-800 m-0">
                Respuesta del proponente
              </p>
              <Ayuda>
                Se registra quién acepta en nombre del proponente, que no es quien opera el
                sistema.
              </Ayuda>

              <div>
                <label
                  htmlFor="contrato-aceptante"
                  className="block text-xs font-bold text-gray-600 mb-1.5"
                >
                  Quién acepta <span className="text-red-600">*</span>
                </label>
                <input
                  id="contrato-aceptante"
                  type="text"
                  value={aceptante}
                  onChange={(e) => setAceptante(e.target.value)}
                  placeholder="Nombre del representante del proponente"
                  className={campo}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Boton
                  icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  disabled={guardando || !aceptante.trim()}
                  onClick={aceptar}
                >
                  Registrar la aceptación
                </Boton>
                <BotonSecundario
                  icono={<Undo2 className="w-3.5 h-3.5" />}
                  disabled={guardando}
                  onClick={rechazar}
                >
                  No acepta la minuta
                </BotonSecundario>
              </div>
            </div>
          )}
        </>
      ) : null}

      {estado.puedeGenerar && !generando ? (
        <Boton
          icono={<FileSignature className="w-3.5 h-3.5" />}
          onClick={() => setGenerando(true)}
        >
          Generar el contrato
        </Boton>
      ) : null}

      {estado.puedeGenerar && generando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nuevo contrato</p>

          <div>
            <label
              htmlFor="contrato-tipologia"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Tipología <span className="text-red-600">*</span>
            </label>
            <select
              id="contrato-tipologia"
              value={datos.tipologia}
              onChange={(e) => cambiar('tipologia', e.target.value)}
              className={campo}
            >
              <option value="">Elige la tipología del contrato</option>
              {estado.tipologias.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="contrato-numero"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Número <span className="text-red-600">*</span>
              </label>
              <input
                id="contrato-numero"
                type="text"
                value={datos.numero}
                onChange={(e) => cambiar('numero', e.target.value)}
                placeholder="CTO-2026-001"
                className={campo}
              />
            </div>
            <div>
              <label
                htmlFor="contrato-valor"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Valor <span className="text-red-600">*</span>
              </label>
              <input
                id="contrato-valor"
                type="number"
                min={1}
                value={datos.valor}
                onChange={(e) => cambiar('valor', e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="contrato-objeto"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Objeto <span className="text-red-600">*</span>
            </label>
            <textarea
              id="contrato-objeto"
              rows={2}
              value={datos.objeto}
              onChange={(e) => cambiar('objeto', e.target.value)}
              placeholder="Qué se contrata"
              className={campo}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="contrato-documento"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Documento del contratista <span className="text-red-600">*</span>
              </label>
              <input
                id="contrato-documento"
                type="text"
                value={datos.contratistaDocumento}
                onChange={(e) => cambiar('contratistaDocumento', e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <label
                htmlFor="contrato-plazo"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Plazo en días
              </label>
              <input
                id="contrato-plazo"
                type="number"
                min={1}
                value={datos.plazoDias}
                onChange={(e) => cambiar('plazoDias', e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="contrato-contratista"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Nombre o razón social <span className="text-red-600">*</span>
            </label>
            <input
              id="contrato-contratista"
              type="text"
              value={datos.contratistaNombre}
              onChange={(e) => cambiar('contratistaNombre', e.target.value)}
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor="contrato-tipo"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Tipo de persona <span className="text-red-600">*</span>
            </label>
            <select
              id="contrato-tipo"
              value={datos.contratistaTipo}
              onChange={(e) => cambiar('contratistaTipo', e.target.value)}
              className={campo}
            >
              <option value="NATURAL">Persona natural</option>
              <option value="JURIDICA">Persona jurídica</option>
            </select>
            {/* Se dice aquí porque es la razón por la que se pregunta. */}
            <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
              Si es persona natural, la legalización exigirá el registro de la ARL.
            </p>
          </div>

          <div>
            <label
              htmlFor="contrato-minuta"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Minuta diligenciada <span className="text-red-600">*</span>
            </label>
            <input
              id="contrato-minuta"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setMinuta(e.target.files?.[0] ?? null)}
              className="block w-full text-[11.5px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11.5px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<FileSignature className="w-3.5 h-3.5" />}
              disabled={guardando || !completo}
              onClick={generar}
            >
              Registrar el contrato
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={limpiar}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}
