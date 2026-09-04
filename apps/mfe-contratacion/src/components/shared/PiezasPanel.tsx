import React from 'react';
import { AlertTriangle, Check, FileText, Lock, Paperclip, Undo2 } from 'lucide-react';

/**
 * Piezas comunes de los paneles de actividad.
 *
 * Cada actividad del riel abre su propio panel —el CDP en la etapa 4, la
 * publicación del pliego en la 5— y todas necesitan las mismas cinco cosas:
 * decir qué se hace, avisar del resultado, explicar qué falta y quién puede
 * hacerlo. Estaban duplicadas al final de cada panel; aquí se escriben una vez.
 *
 * Salieron tal cual de PanelCdp, sin tocar una clase: extraerlas no debe
 * cambiar cómo se ve la etapa 4.
 */

export const Marco = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 space-y-3">{children}</div>
);

export const Titulo = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12.5px] font-bold text-slate-800 m-0">{children}</p>
);

export const Ayuda = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">{children}</p>
);

/** Qué falta antes de poder trabajar esta actividad, y en cuál se hace. */
export const Pendiente = ({ falta, texto }: { falta: string; texto: string }) => (
  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
    <p className="text-[12.5px] font-bold text-slate-700 m-0">Pendiente del paso {falta}</p>
    <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">{texto}</p>
  </div>
);

export const Siguiente = ({ texto }: { texto: string }) => (
  <p className="text-[11px] text-slate-500 m-0 leading-relaxed">{texto}</p>
);

/** El rol no alcanza: se dice quién puede, en vez de dejar un botón que da 403. */
export const SinPermiso = ({ quien }: { quien: string }) => (
  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 flex items-start gap-2.5">
    <Lock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-[12.5px] font-bold text-slate-700 m-0">Este paso lo realiza {quien}</p>
      <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
        Puedes consultarlo, pero no ejecutarlo con tu rol.
      </p>
    </div>
  </div>
);

const TONOS = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  aviso: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
} as const;

export const Aviso = ({
  tono,
  titulo,
  children,
}: {
  tono: keyof typeof TONOS;
  titulo: string;
  children: React.ReactNode;
}) => (
  <div className={`rounded-lg border px-3.5 py-3 flex items-start gap-2.5 ${TONOS[tono]}`}>
    {tono === 'ok' ? (
      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={3} />
    ) : (
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
    )}
    <div className="min-w-0">
      <p className="text-[12.5px] font-bold m-0">{titulo}</p>
      <p className="text-[11.5px] m-0 mt-0.5 leading-relaxed">{children}</p>
    </div>
  </div>
);

export const Boton = ({
  children,
  icono,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icono: React.ReactNode }) => (
  <button
    type="button"
    {...props}
    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
  >
    {icono}
    {children}
  </button>
);

/** Botón secundario: acciones que corrigen o devuelven, no las que avanzan. */
export const BotonSecundario = ({
  children,
  icono,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icono: React.ReactNode }) => (
  <button
    type="button"
    {...props}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
  >
    {icono}
    {children}
  </button>
);

export const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/** Lo que el backend acepta como documento (ver `MIME_DOCUMENTOS`). */
export const ARCHIVOS_ACEPTADOS = '.pdf,.doc,.docx,.xls,.xlsx';

/** El tope que aplica multer en el servidor. */
const MAX_BYTES = 25 * 1024 * 1024;

const pesoLegible = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Adjunto de una actividad, con su nombre cuando ya está elegido.
 *
 * El input nativo se oculta detrás de un botón del sistema: el del navegador
 * dice «Ningún archivo seleccionado» en el idioma del sistema operativo y con
 * un estilo que no es el de la aplicación.
 *
 * El tamaño y la extensión se comprueban aquí y no solo en el servidor: subir
 * 30 MB para que los rechacen al final gasta la espera del usuario, y el
 * mensaje de multer no dice cuál era el tope.
 */
export const SelectorArchivo = ({
  etiqueta,
  archivo,
  onElegir,
  ayuda,
  obligatorio = true,
  id,
}: {
  etiqueta: string;
  archivo: File | null;
  onElegir: (archivo: File | null) => void;
  ayuda?: string;
  obligatorio?: boolean;
  id?: string;
}) => {
  const input = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  const elegir = (elegido: File | null) => {
    if (!elegido) return;

    const extension = elegido.name.slice(elegido.name.lastIndexOf('.')).toLowerCase();
    if (!ARCHIVOS_ACEPTADOS.split(',').includes(extension)) {
      setError('Solo se admiten documentos en PDF, Word o Excel.');
      return;
    }
    if (elegido.size > MAX_BYTES) {
      setError(`El archivo pesa ${pesoLegible(elegido.size)} y el máximo son 25 MB.`);
      return;
    }

    setError(null);
    onElegir(elegido);
  };

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
        {etiqueta} {obligatorio ? <span className="text-red-600">*</span> : null}
      </p>

      <p
        className={`text-[11.5px] m-0 leading-relaxed break-words ${
          archivo ? 'text-emerald-900' : 'text-slate-600'
        }`}
      >
        {archivo
          ? `${archivo.name} · ${pesoLegible(archivo.size)}`
          : (ayuda ?? 'Sin archivo seleccionado.')}
      </p>

      {error ? (
        <p role="alert" className="text-[11.5px] text-red-700 m-0 leading-relaxed">
          {error}
        </p>
      ) : null}

      <input
        ref={input}
        id={id}
        type="file"
        className="hidden"
        accept={ARCHIVOS_ACEPTADOS}
        onChange={(e) => {
          const elegido = e.target.files?.[0] ?? null;
          // Se limpia para que elegir el mismo archivo dos veces vuelva a
          // disparar el cambio; sin esto, corregir tras un error no reacciona.
          e.target.value = '';
          elegir(elegido);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {archivo ? 'Cambiar archivo' : 'Elegir archivo'}
        </button>
        {archivo ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              onElegir(null);
            }}
            className="text-[11.5px] font-bold text-slate-500 hover:underline"
          >
            Quitar
          </button>
        ) : null}
        <span className="text-[11px] text-slate-500">PDF, Word o Excel · máx. 25 MB</span>
      </div>
    </div>
  );
};

/**
 * Esqueleto de carga: dice la forma de lo que viene, no solo que se espera.
 *
 * `filas` aproxima cuántos renglones tendrá el contenido real, para que la
 * página no salte cuando llegue.
 */
export const Cargando = ({ filas = 3 }: { filas?: number }) => (
  <div className="p-4 space-y-2.5" role="status" aria-label="Cargando">
    <div className="esqueleto h-4 w-2/5" />
    {Array.from({ length: filas }, (_, i) => (
      <div key={i} className="esqueleto h-9" style={{ width: `${94 - i * 7}%` }} />
    ))}
  </div>
);

/**
 * El pie de aprobación de una actividad (EFDS-1183).
 *
 * Va aquí y no en cada panel por la misma razón que el resto de estas piezas:
 * son treinta y ocho paneles y el trámite es idéntico en todos. Lo único que
 * cambia es qué actividad se está trabajando.
 *
 * Cuando el área no ha configurado aprobación para la actividad, se comporta
 * como hasta ahora: un botón que la cierra. Ese es el estado por defecto, así
 * que los paneles que lo adopten no cambian de comportamiento hasta que alguien
 * marque la actividad en Configuración.
 */
export const PieAprobacion = ({
  estado,
  requiereAprobacion,
  quienAprueba,
  puedoAprobar,
  esMia,
  observaciones,
  devueltaPor,
  guardando,
  onRegistrar,
  onEnviar,
  onRetirar,
  onAprobar,
  onDevolver,
  etiquetaRegistrar = 'Registrar la actividad',
}: {
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'DEVUELTO';
  requiereAprobacion: boolean;
  /** Nombres legibles de quien aprueba, para decirlo antes de enviar. */
  quienAprueba?: string[];
  puedoAprobar?: boolean;
  /** Si la envió quien está mirando: solo él puede retirarla. */
  esMia?: boolean;
  observaciones?: string | null;
  devueltaPor?: string | null;
  guardando?: boolean;
  onRegistrar?: () => void;
  onEnviar?: () => void;
  onRetirar?: () => void;
  onAprobar?: () => void;
  onDevolver?: (observaciones: string) => void;
  etiquetaRegistrar?: string;
}) => {
  const [motivo, setMotivo] = React.useState('');
  const [devolviendo, setDevolviendo] = React.useState(false);

  // Sin aprobación configurada la actividad se cierra como siempre.
  if (!requiereAprobacion) {
    return (
      <Boton icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />} onClick={onRegistrar} disabled={guardando}>
        {etiquetaRegistrar}
      </Boton>
    );
  }

  if (estado === 'EN_REVISION') {
    return (
      <div className="space-y-2.5">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3">
          <p className="text-[12.5px] font-bold text-blue-900 m-0">
            En revisión · pendiente de aprobación
          </p>
          {quienAprueba?.length ? (
            <p className="text-[11.5px] text-blue-900 m-0 mt-0.5 leading-relaxed">
              Espera a {quienAprueba.join(' o ')}.
            </p>
          ) : null}
        </div>

        {/* Quien la envió puede retirarla mientras nadie la ha resuelto: sin
            esto tendría que pedirle al aprobador que se la devuelva para poder
            corregir un error que ya vio. */}
        {esMia ? (
          <BotonSecundario icono={<Undo2 className="w-3.5 h-3.5" />} onClick={onRetirar} disabled={guardando}>
            Retirar de aprobación
          </BotonSecundario>
        ) : null}

        {puedoAprobar ? (
          <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2.5">
            <p className="text-[12.5px] font-bold text-slate-800 m-0">Tu decisión</p>

            {devolviendo ? (
              <>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Qué debe corregirse"
                  aria-label="Observaciones de la devolución"
                  className={campo}
                />
                <div className="flex flex-wrap gap-2">
                  <BotonSecundario
                    icono={<Undo2 className="w-3.5 h-3.5" />}
                    onClick={() => onDevolver?.(motivo)}
                    disabled={guardando || !motivo.trim()}
                  >
                    Devolver
                  </BotonSecundario>
                  <button
                    type="button"
                    onClick={() => setDevolviendo(false)}
                    className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700 px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Boton
                  icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  onClick={onAprobar}
                  disabled={guardando}
                >
                  Aprobar
                </Boton>
                <BotonSecundario
                  icono={<Undo2 className="w-3.5 h-3.5" />}
                  onClick={() => setDevolviendo(true)}
                  disabled={guardando}
                >
                  Devolver con observaciones
                </BotonSecundario>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* La observación de la devolución, completa y arriba: es lo único que el
          gestor necesita leer para saber qué corregir. */}
      {estado === 'DEVUELTO' && observaciones ? (
        <Aviso tono="aviso" titulo={`Devuelta${devueltaPor ? ` por ${devueltaPor}` : ''}`}>
          {observaciones}
        </Aviso>
      ) : null}

      <Boton icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />} onClick={onEnviar} disabled={guardando}>
        {estado === 'DEVUELTO' ? 'Corregir y volver a enviar' : 'Enviar a aprobación'}
      </Boton>

      {/* Se dice quién aprobará antes de pulsar: descubrirlo después de enviar
          ya no le sirve al gestor para nada. */}
      {quienAprueba?.length ? (
        <p className="text-[11px] text-slate-500 m-0">
          {quienAprueba.length === 1 ? 'La aprobará' : 'La aprobará alguno de'}{' '}
          {quienAprueba.join(' o ')}.
        </p>
      ) : null}
    </div>
  );
};
