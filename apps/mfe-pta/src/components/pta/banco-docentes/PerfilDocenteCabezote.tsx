/**
 * REQ-RUND-F002 — Cabezote del perfil docente.
 *
 * Encabezado con los datos clave de vinculación, que son de solo lectura: no
 * renderiza controles editables sobre ellos.
 *
 * RUND-013 — La tercera línea, "Datos de contacto" (correo institucional,
 * correo personal y teléfono), permite editar cada dato en el lugar, pero solo
 * cuando el padre entrega `edicionContacto.puedeEditar`. Sin esa prop (p. ej. la
 * vista del propio docente) las tarjetas se muestran sin botón de edición.
 *
 * El puntaje salarial se enmascara según `proteccion_datos.acceso_completo`,
 * que el backend calcula con el catálogo central de datos sensibles RUND.
 *
 * Estilos en línea a propósito: los `index.css` de los micro-frontends son
 * snapshots precompilados de Tailwind, así que una clase nueva no existiría en
 * tiempo de ejecución. El diseño responsivo se resuelve con `auto-fit` y
 * `minmax`, que no dependen de breakpoints ni de hojas de estilo externas.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PublishedAvatar } from '../../../../../shared/profile-photos';
import { CheckCircle2, Lock, Mail, Pencil, XCircle } from 'lucide-react';
import {
  buildCabezotePerfilDocente,
  type CabezoteCampoClave,
  type CabezoteCampoVista,
  type CabezoteContactoClave,
  type CabezoteContactoVista,
} from '../../../utils/rundPerfilCabezote';
import { validarContactoCabezote } from '../../../utils/rundContactoCabezote';

export interface EdicionContactoCabezote {
  /** Solo los roles con permiso de modificación ven el botón de edición. */
  puedeEditar: boolean;
  /** Persiste el dato. `ok: false` deja la tarjeta en edición con `mensaje`. */
  guardar: (clave: CabezoteContactoClave, valor: string) => Promise<{ ok: boolean; mensaje?: string }>;
}

interface Props {
  /** Perfil RUND tal como lo entrega el backend, ya protegido por RBAC. */
  docente: any;
  /** Compacta el bloque cuando va embebido en una fila de tabla. */
  compacto?: boolean;
  /** RUND-013 — habilita la edición de la línea "Datos de contacto". */
  edicionContacto?: EdicionContactoCabezote;
}

const ACENTOS: Record<CabezoteCampoClave, string> = {
  TIPO_VINCULACION: '#2563EB',
  CATEGORIA_ESCALAFON: '#7C3AED',
  TERRITORIAL: '#059669',
  ESTADO_VINCULACION: '#0891B2',
  PUNTAJE_SALARIAL: '#B45309',
  ULTIMA_EVALUACION: '#DB2777',
  CLASE_DOCENTE: '#0F766E',
};

function CampoCabezote({ campo, activo }: { campo: CabezoteCampoVista; activo: boolean }) {
  const esEstado = campo.clave === 'ESTADO_VINCULACION';
  const acento = campo.restringido
    ? '#B45309'
    : esEstado
      ? (activo ? '#059669' : '#6B7280')
      : ACENTOS[campo.clave];

  const colorValor = campo.restringido
    ? '#92400E'
    : campo.ausente
      ? '#9CA3AF'
      : esEstado
        ? (activo ? '#065F46' : '#374151')
        : '#0F172A';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        columnGap: 10,
        rowGap: 3,
        alignItems: 'start',
        minWidth: 0,
        padding: '12px 14px',
        borderRadius: 12,
        background: campo.restringido ? '#FFFBEB' : '#FFFFFF',
        border: `1px solid ${campo.restringido ? '#FDE68A' : '#E2E8F0'}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          gridRow: '1 / span 2',
          width: 22,
          height: 22,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${acento}1F`,
        }}
      >
        {campo.restringido && <Lock size={13} color={acento} strokeWidth={2.2} />}
      </span>
      <dt
        style={{
          margin: 0,
          minWidth: 0,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#94A3B8',
          lineHeight: 1.3,
        }}
      >
        {campo.etiqueta}
      </dt>
      <dd
        style={{
          margin: 0,
          minWidth: 0,
          fontSize: 14,
          fontWeight: campo.ausente ? 500 : 700,
          color: colorValor,
          lineHeight: 1.35,
          overflowWrap: 'anywhere',
        }}
      >
        {campo.valor}
        {campo.nota && (
          <span
            style={{
              display: 'block',
              marginTop: 4,
              fontSize: 10.5,
              fontWeight: 500,
              color: '#94A3B8',
              lineHeight: 1.35,
            }}
          >
            {campo.nota}
          </span>
        )}
      </dd>
    </div>
  );
}

const ACENTO_CONTACTO = '#2563EB';

const BOTON_ACCION = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
} as const;

/** Texto visible igual al valor; solo añade un punto de corte preferido tras la arroba. */
function valorConCorte(dato: CabezoteContactoVista) {
  if (dato.ausente || dato.clave === 'TELEFONO') return dato.valor;
  const arroba = dato.valor.indexOf('@');
  if (arroba < 0) return dato.valor;
  return (
    <>
      {dato.valor.slice(0, arroba + 1)}
      <wbr />
      {dato.valor.slice(arroba + 1)}
    </>
  );
}

function TarjetaContacto({ dato, edicion }: { dato: CabezoteContactoVista; edicion?: EdicionContactoCabezote }) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const etiquetaCampo = dato.etiqueta.toLowerCase();
  const idCampo = `cabezote-contacto-${dato.clave}`;

  const abrir = () => {
    setBorrador(dato.valorActual);
    setError(null);
    setConfirmacion('');
    setEditando(true);
  };
  const cancelar = () => {
    if (guardando) return;
    setEditando(false);
    setError(null);
  };
  // Escape cancela la edición desde cualquier punto de la tarjeta. Se escucha en `window` en fase de
  // captura (antes que cualquier otro manejador de la página) para que ningún contenedor del shell
  // pueda consumir la tecla. Solo actúa si el foco o el evento están dentro de esta tarjeta.
  const cancelarRef = useRef(cancelar);
  cancelarRef.current = cancelar;
  useEffect(() => {
    if (!editando) return undefined;
    const alPulsar = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const tarjeta = tarjetaRef.current;
      const dentro = tarjeta && (
        (event.target instanceof Node && tarjeta.contains(event.target)) || tarjeta.contains(document.activeElement)
      );
      if (!dentro) return;
      event.preventDefault();
      cancelarRef.current();
    };
    window.addEventListener('keydown', alPulsar, true);
    return () => window.removeEventListener('keydown', alPulsar, true);
  }, [editando]);

  const guardar = async () => {
    if (guardando) return;
    const invalido = validarContactoCabezote(dato.clave, borrador);
    if (invalido) {
      setError(invalido);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const resultado = await edicion!.guardar(dato.clave, borrador.trim());
      if (resultado.ok) {
        setEditando(false);
        setConfirmacion(`${dato.etiqueta} guardado.`);
      } else setError(resultado.mensaje || 'No fue posible guardar el dato de contacto.');
    } catch {
      setError('No fue posible guardar el dato de contacto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      ref={tarjetaRef}
      data-testid={idCampo}
      style={{
        display: 'grid',
        position: 'relative',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        columnGap: 10,
        rowGap: 3,
        alignItems: 'start',
        alignContent: 'start',
        minWidth: 0,
        // Reserva el sitio del lápiz (28 px + 8 de aire) para que el texto no pase por debajo.
        padding: edicion?.puedeEditar && !editando ? '12px 50px 12px 14px' : '12px 14px',
        borderRadius: 12,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          gridRow: '1 / span 2',
          width: 24,
          height: 24,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#EFF6FF',
          border: '1px solid #DBEAFE',
        }}
      >
        <Mail size={13} color={ACENTO_CONTACTO} strokeWidth={2.2} />
      </span>
      <dt
        style={{
          margin: 0,
          minWidth: 0,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#94A3B8',
          lineHeight: 1.3,
        }}
      >
        <label htmlFor={editando ? idCampo : undefined}>{dato.etiqueta}</label>
      </dt>
      {edicion?.puedeEditar && !editando ? (
        <button
          type="button"
          onClick={abrir}
          aria-label={`Editar ${etiquetaCampo}`}
          title={`Editar ${etiquetaCampo}`}
          style={{
            // Fuera del flujo de la rejilla: así no estira las filas y el valor queda pegado a la etiqueta.
            position: 'absolute',
            top: 12,
            right: 14,
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            cursor: 'pointer',
          }}
        >
          <Pencil size={14} color={ACENTO_CONTACTO} aria-hidden="true" />
        </button>
      ) : null}
      <dd aria-busy={guardando || undefined} style={{ margin: 0, minWidth: 0, gridColumn: 2 }}>
        {/* Anuncia el resultado a lectores de pantalla sin ocupar espacio visual. */}
        <span
          role="status"
          aria-live="polite"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
        >
          {confirmacion}
        </span>
        {editando ? (
          <>
            <input
              id={idCampo}
              type={dato.clave === 'TELEFONO' ? 'tel' : 'email'}
              inputMode={dato.clave === 'TELEFONO' ? 'tel' : 'email'}
              autoComplete="off"
              maxLength={dato.clave === 'TELEFONO' ? 40 : 254}
              spellCheck={false}
              value={borrador}
              autoFocus
              disabled={guardando}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${idCampo}-error` : undefined}
              onChange={(event) => { setBorrador(event.target.value); if (error) setError(null); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { event.preventDefault(); void guardar(); }
              }}
              style={{
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${error ? '#DC2626' : '#93C5FD'}`,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
              }}
            />
            {error && (
              <p id={`${idCampo}-error`} role="alert" style={{ margin: '4px 0 0', fontSize: 11.5, fontWeight: 600, color: '#B91C1C', lineHeight: 1.35 }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { void guardar(); }}
                disabled={guardando}
                style={{ ...BOTON_ACCION, background: '#1D4ED8', color: '#FFFFFF', border: '1px solid #1D4ED8', opacity: guardando ? 0.7 : 1 }}
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={guardando}
                style={{ ...BOTON_ACCION, background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1' }}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <span
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: dato.ausente ? 500 : 700,
                color: dato.ausente ? '#9CA3AF' : '#0F172A',
                lineHeight: 1.35,
                overflowWrap: 'anywhere',
              }}
            >
              {valorConCorte(dato)}
            </span>
            <span style={{ display: 'block', marginTop: 4, fontSize: 10.5, fontWeight: 500, color: '#94A3B8', lineHeight: 1.35 }}>
              {dato.origen}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

export function PerfilDocenteCabezote({ docente, compacto = false, edicionContacto }: Props) {
  const cabezote = useMemo(() => buildCabezotePerfilDocente(docente), [docente]);
  if (!docente) return null;

  const { estado } = cabezote;
  const subtitulo = [
    cabezote.idRund ? `Registro ${cabezote.idRund}` : null,
    cabezote.periodoCarga ? `Periodo ${cabezote.periodoCarga}` : null,
  ].filter(Boolean).join(' · ');

  // `max()` limita la rejilla a tres columnas, así los seis campos quedan
  // siempre balanceados (3+3, 2+2+2 o apilados) en lugar de un 5+1 con un
  // hueco grande. Sin media queries: el ancho disponible decide.
  const anchoMinimo = compacto ? 180 : 200;
  const columnas = `repeat(auto-fit, minmax(max(${anchoMinimo}px, (100% - 20px) / 3), 1fr))`;

  return (
    <section
      aria-label="Cabezote del perfil docente"
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Identificación del docente */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: compacto ? '16px 18px' : '20px 24px',
          background: 'linear-gradient(135deg, #003DA5 0%, #1D4ED8 65%, #2563EB 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 260px' }}>
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: compacto ? 44 : 52,
              height: compacto ? 44 : 52,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              color: '#FFFFFF',
              fontSize: compacto ? 15 : 17,
              fontWeight: 800,
              letterSpacing: '0.02em',
            }}
          >
            <PublishedAvatar personaId={docente?.persona_id || docente?.personaId} name={cabezote.nombreCompleto} size={compacto ? 44 : 52} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: compacto ? 16 : 19,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
                overflowWrap: 'anywhere',
              }}
            >
              {cabezote.nombreCompleto}
            </h3>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.78)',
                lineHeight: 1.35,
                overflowWrap: 'anywhere',
              }}
            >
              {subtitulo || 'Perfil del Registro Único Nacional Docente'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 11px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              background: estado.activo ? '#FFFFFF' : '#F3F4F6',
              color: estado.activo ? '#047857' : '#374151',
              border: `1px solid ${estado.activo ? '#10B981' : '#D1D5DB'}`,
            }}
          >
            {estado.activo
              ? <CheckCircle2 size={13} color="#059669" aria-hidden="true" />
              : <XCircle size={13} color="#6B7280" aria-hidden="true" />}
            {estado.etiqueta}
          </span>
          <span
            title="Los datos de vinculación del cabezote son informativos; solo los datos de contacto se pueden editar."
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 11px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.55)',
            }}
          >
            Solo lectura
          </span>
        </div>
      </div>

      {/* Datos clave de vinculación */}
      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: columnas,
          gap: 10,
          padding: compacto ? '14px 18px' : '16px 24px',
          background: '#FFFFFF',
        }}
      >
        {cabezote.campos.map((campo) => (
          <CampoCabezote key={campo.clave} campo={campo} activo={estado.activo} />
        ))}
      </dl>

      {/* RUND-013 — Datos de contacto */}
      <div
        role="group"
        aria-label="Datos de contacto"
        style={{ padding: compacto ? '2px 18px 14px' : '2px 24px 16px', background: '#FFFFFF' }}
      >
        <h4
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#1D4ED8',
          }}
        >
          Datos de contacto
        </h4>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: columnas, gap: 10 }}>
          {cabezote.contacto.map((dato) => (
            <TarjetaContacto key={dato.clave} dato={dato} edicion={edicionContacto} />
          ))}
        </dl>
      </div>

      {cabezote.puntajeRestringido && (
        <p
          style={{
            margin: 0,
            padding: '9px 24px 12px',
            background: '#FFFFFF',
            fontSize: 11.5,
            fontWeight: 600,
            color: '#92400E',
            lineHeight: 1.4,
          }}
        >
          El puntaje salarial es un dato sensible y permanece oculto para su rol.
        </p>
      )}
    </section>
  );
}

export default PerfilDocenteCabezote;
