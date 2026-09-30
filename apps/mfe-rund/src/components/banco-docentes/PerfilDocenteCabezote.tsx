/**
 * REQ-RUND-F002 — Cabezote del perfil docente.
 *
 * Encabezado de solo lectura con los datos clave de vinculación. No renderiza
 * ningún control editable (ni inputs, ni botones de acción): la HU lo exige
 * para el rol docente y no hay motivo para diferenciarlo por rol.
 *
 * El puntaje salarial se enmascara según `proteccion_datos.acceso_completo`,
 * que el backend calcula con el catálogo central de datos sensibles RUND.
 *
 * Estilos en línea a propósito: los `index.css` de los micro-frontends son
 * snapshots precompilados de Tailwind, así que una clase nueva no existiría en
 * tiempo de ejecución. El diseño responsivo se resuelve con `auto-fit` y
 * `minmax`, que no dependen de breakpoints ni de hojas de estilo externas.
 */
import { useMemo } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  buildCabezotePerfilDocente,
  type CabezoteCampoClave,
  type CabezoteCampoVista,
} from '../../../utils/rundPerfilCabezote';

interface Props {
  /** Perfil RUND tal como lo entrega el backend, ya protegido por RBAC. */
  docente: any;
  /** Compacta el bloque cuando va embebido en una fila de tabla. */
  compacto?: boolean;
}

const ICONOS: Record<CabezoteCampoClave, typeof Briefcase> = {
  TIPO_VINCULACION: Briefcase,
  CATEGORIA_ESCALAFON: Award,
  TERRITORIAL: Building2,
  ESTADO_VINCULACION: CheckCircle2,
  PUNTAJE_SALARIAL: Wallet,
  ULTIMA_EVALUACION: CalendarCheck,
};

const ACENTOS: Record<CabezoteCampoClave, string> = {
  TIPO_VINCULACION: '#2563EB',
  CATEGORIA_ESCALAFON: '#7C3AED',
  TERRITORIAL: '#059669',
  ESTADO_VINCULACION: '#0891B2',
  PUNTAJE_SALARIAL: '#B45309',
  ULTIMA_EVALUACION: '#DB2777',
};

function CampoCabezote({ campo, activo }: { campo: CabezoteCampoVista; activo: boolean }) {
  const esEstado = campo.clave === 'ESTADO_VINCULACION';
  const Icono = esEstado && !activo ? XCircle : campo.restringido ? Lock : ICONOS[campo.clave];
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
        border: `1px solid ${campo.restringido ? '#FDE68A' : '#EEF2F7'}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          gridRow: '1 / span 2',
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${acento}14`,
        }}
      >
        <Icono size={15} color={acento} strokeWidth={2.2} />
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

export function PerfilDocenteCabezote({ docente, compacto = false }: Props) {
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
            {cabezote.iniciales}
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
              background: estado.activo ? '#ECFDF5' : '#F3F4F6',
              color: estado.activo ? '#065F46' : '#374151',
              border: `1px solid ${estado.activo ? '#10B981' : '#D1D5DB'}`,
            }}
          >
            {estado.activo
              ? <CheckCircle2 size={13} color="#059669" aria-hidden="true" />
              : <XCircle size={13} color="#6B7280" aria-hidden="true" />}
            {estado.etiqueta}
          </span>
          <span
            title="El cabezote es informativo: no permite editar el perfil."
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
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <ShieldCheck size={13} aria-hidden="true" />
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
          background: '#F8FAFC',
        }}
      >
        {cabezote.campos.map((campo) => (
          <CampoCabezote key={campo.clave} campo={campo} activo={estado.activo} />
        ))}
      </dl>

      {cabezote.puntajeRestringido && (
        <p
          style={{
            margin: 0,
            padding: '9px 24px 12px',
            background: '#F8FAFC',
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
