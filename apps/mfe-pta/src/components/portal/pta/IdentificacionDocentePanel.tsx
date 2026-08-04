import { useId, useMemo, useState } from 'react';
import { Calendar, ChevronDown, UserRound } from 'lucide-react';
import { formatPtaCompletionPercentage } from '../../../utils/ptaCompletion';

interface IdentificacionDocentePanelProps {
  pta: any;
  userPerfil: any;
  periodoAcademico?: any;
}

interface DatoIdentificacion {
  label: string;
  value: any;
}

const datoNoVacio = (...values: any[]): any => values.find((value) => (
  value !== null
  && value !== undefined
  && String(value).trim() !== ''
));

const esUuid = (value: any): boolean => (
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || '').trim())
);

const documentoReal = (...values: any[]): string | null => {
  const value = values.find((candidate) => (
    candidate !== null
    && candidate !== undefined
    && String(candidate).trim() !== ''
    && !esUuid(candidate)
  ));
  return value === undefined ? null : String(value).trim();
};

const fmtDocumento = (value: string | null): string | null => {
  if (!value) return null;
  const compact = value.replace(/\s+/g, '');
  return /^\d+$/.test(compact)
    ? compact.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : value;
};

const fmtFecha = (value?: any): string | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString('es-CO');
};

const numero = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function Dato({ label, value }: DatoIdentificacion) {
  const vacio = value === null || value === undefined || value === '';
  const destacado = label === 'Total horas PTA';

  return (
    <div className={destacado ? 'identificacion-docente-oficial-total' : undefined} style={{
      minWidth: 0,
      minHeight: 118,
      display: 'flex',
      flexDirection: 'column',
      background: '#FFFFFF',
    }}>
      <div style={{
        height: 43,
        boxSizing: 'border-box',
        padding: '6px 7px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748B',
        background: '#EEF2F7',
        borderBottom: '1px solid #D9E2EC',
        fontSize: '0.55rem',
        fontWeight: 800,
        letterSpacing: '0.015em',
        lineHeight: 1.15,
        textAlign: 'center',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        flex: 1,
        minHeight: 75,
        padding: '10px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: vacio ? '#94A3B8' : (destacado ? '#003DA5' : '#172033'),
        background: destacado ? '#EFF6FF' : '#FFFFFF',
        fontSize: destacado ? '0.92rem' : '0.69rem',
        fontWeight: destacado ? 900 : 700,
        lineHeight: 1.3,
        overflowWrap: 'anywhere',
        textAlign: 'center',
        whiteSpace: 'pre-line',
      }}>
        {vacio ? '—' : value}
      </div>
    </div>
  );
}

/**
 * Versión de consulta del encabezado dinámico del reporte PTA. Conserva sus
 * fuentes de datos, pero usa un diseño propio de pantalla y desplegable.
 */
export function IdentificacionDocentePanel({
  pta,
  userPerfil,
  periodoAcademico,
}: IdentificacionDocentePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();

  const data = useMemo(() => {
    const periodoCodigo = String(datoNoVacio(
      typeof pta?.periodo === 'string' ? pta.periodo : pta?.periodo?.codigo,
      periodoAcademico?.codigo,
    ) || '').trim();

    const horasDisponibles = numero(pta?.horas_asignables ?? pta?.horas_a_programar ?? 0);
    const horasProgramables = [
      pta?.horas_asignables,
      pta?.horas_a_programar,
      horasDisponibles,
      userPerfil?.horas_programables,
    ].map(numero).find(value => value > 0) || 0;
    const horasProgramadas = numero(
      pta?.horas_totales
      ?? pta?.total_horas_programadas
      ?? (
        numero(pta?.horas_docencia)
        + numero(pta?.horas_investigacion)
        + numero(pta?.horas_extension)
        + numero(pta?.horas_complementarias)
      ),
    );

    return {
      periodoCodigo,
      identidad: [
        {
          label: 'Número de cédula',
          value: fmtDocumento(documentoReal(
            userPerfil?.documento_identidad,
            userPerfil?.documento,
            userPerfil?.identificacion,
            pta?.docente_documento,
          )),
        },
        {
          label: 'Nombre',
          value: datoNoVacio(userPerfil?.nombre_completo, userPerfil?.nombre, pta?.docente_nombre),
        },
        {
          label: 'Correo institucional',
          value: datoNoVacio(
            userPerfil?.correo_institucional,
            userPerfil?.email,
            pta?.docente_email,
            pta?.correo_institucional,
          ),
        },
        {
          label: 'Correo personal',
          value: datoNoVacio(userPerfil?.correo_personal, userPerfil?.correo_alternativo),
        },
        {
          label: 'Número celular',
          value: datoNoVacio(userPerfil?.telefono, userPerfil?.numero_celular, pta?.telefono_docente),
        },
      ],
      perfil: [
        {
          label: 'Perfil académico',
          value: datoNoVacio(userPerfil?.perfil_academico, userPerfil?.perfil_academico_pro),
        },
        { label: 'Categoría', value: datoNoVacio(userPerfil?.categoria) },
        { label: 'Núcleo temático de vinculación', value: datoNoVacio(userPerfil?.nucleo_tematico) },
        { label: 'Sede territorial de vinculación', value: datoNoVacio(userPerfil?.territorial) },
        { label: 'Situación administrativa', value: datoNoVacio(userPerfil?.situacion_administrativa) },
        { label: 'Última evaluación docente', value: datoNoVacio(userPerfil?.ultima_evaluacion) },
        {
          label: 'Tipo de vinculación',
          value: datoNoVacio(userPerfil?.vinculacion, pta?.tipo_vinculacion),
        },
        {
          label: 'Tipo de dedicación',
          value: datoNoVacio(userPerfil?.dedicacion, pta?.dedicacion),
        },
        {
          label: 'Acto administrativo de vinculación',
          value: datoNoVacio(userPerfil?.acto_administrativo_vinculacion),
        },
        { label: 'Fecha inicio de vinculación', value: fmtFecha(userPerfil?.inicio_vinculacion) },
        { label: 'Fecha fin de vinculación', value: fmtFecha(userPerfil?.fin_vinculacion) },
      ],
      periodo: [
        {
          label: `Inicio período académico${periodoCodigo ? ` ${periodoCodigo}` : ''}`,
          value: fmtFecha(datoNoVacio(
            periodoAcademico?.fechaInicio,
            periodoAcademico?.fecha_inicio,
            pta?.periodo_fecha_inicio,
          )),
        },
        {
          label: `Fin período académico${periodoCodigo ? ` ${periodoCodigo}` : ''}`,
          value: fmtFecha(datoNoVacio(
            periodoAcademico?.fechaFin,
            periodoAcademico?.fecha_fin,
            pta?.periodo_fecha_fin,
          )),
        },
        {
          label: 'Total horas PTA',
          value: `${horasProgramadas}h / ${horasProgramables}h (${formatPtaCompletionPercentage(horasProgramadas, horasProgramables)}%)`,
        },
      ],
    };
  }, [pta, userPerfil, periodoAcademico]);

  // Orden equivalente al encabezado GTH-F081 del reporte institucional.
  const campos: DatoIdentificacion[] = [
    data.identidad[0], // Número de cédula
    data.identidad[1], // Nombre
    data.perfil[0], // Perfil académico
    data.perfil[1], // Categoría
    data.perfil[3], // Sede territorial
    data.perfil[4], // Situación administrativa
    data.perfil[5], // Última evaluación
    data.identidad[2], // Correo institucional
    data.identidad[3], // Correo personal
    data.identidad[4], // Número celular
    data.perfil[6], // Tipo de vinculación
    data.perfil[7], // Tipo de dedicación
    data.perfil[2], // Núcleo temático
    data.perfil[8], // Acto administrativo
    data.perfil[9], // Inicio de vinculación
    data.perfil[10], // Fin de vinculación
    ...data.periodo,
  ];

  return (
    <section
      aria-label="Identificación docente"
      style={{
        overflow: 'hidden',
        borderRadius: 16,
        border: '1px solid #D8E2EE',
        background: '#FFFFFF',
        boxShadow: '0 3px 12px rgba(15, 23, 42, 0.055)',
      }}
    >
      <style>{`
        .identificacion-docente-oficial-toggle:hover {
          filter: brightness(0.975);
        }
        .identificacion-docente-oficial-toggle:focus-visible {
          outline: 3px solid #FACC15;
          outline-offset: -3px;
        }
        .identificacion-docente-oficial-grid {
          display: grid;
          grid-template-columns: repeat(10, minmax(0, 1fr));
          gap: 1px;
          padding: 1px;
          background: #D5DFEA;
        }
        .identificacion-docente-oficial-total {
          grid-column: span 2;
        }
        @media (max-width: 1279px) {
          .identificacion-docente-oficial-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }
        @media (max-width: 720px) {
          .identificacion-docente-oficial-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .identificacion-docente-oficial-subtitle,
          .identificacion-docente-oficial-toggle-label {
            display: none !important;
          }
        }
        @media (max-width: 430px) {
          .identificacion-docente-oficial-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .identificacion-docente-oficial-total {
            grid-column: span 1;
          }
        }
      `}</style>
      <button
        className="identificacion-docente-oficial-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded(current => !current)}
        style={{
          width: '100%',
          minHeight: 61,
          padding: '9px 13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          border: 0,
          borderBottom: expanded ? '1px solid #D8E2EE' : 0,
          background: 'linear-gradient(100deg, #F7FAFE 0%, #FFFFFF 62%, #F8FAFC 100%)',
          boxShadow: 'inset 4px 0 0 #003DA5',
          color: '#172033',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'filter 160ms ease',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <span style={{
            width: 39,
            height: 39,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: '#E8F0FE',
            border: '1px solid #D5E4FA',
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(0, 61, 165, 0.1)',
          }}>
            <UserRound size={19} color="#003DA5" strokeWidth={2.2} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: '#172033', fontSize: '0.79rem', fontWeight: 850, letterSpacing: '0.005em', lineHeight: 1.2 }}>
              Identificación docente
            </span>
            <span className="identificacion-docente-oficial-subtitle" style={{ display: 'block', marginTop: 3, color: '#64748B', fontSize: '0.6rem', fontWeight: 650, lineHeight: 1.25 }}>
              Información institucional de consulta
            </span>
          </span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {data.periodoCodigo && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 9px',
              border: '1px solid #D5E1F1',
              borderRadius: 999,
              background: '#FFFFFF',
              color: '#47617E',
              fontSize: '0.62rem',
              fontWeight: 900,
            }}>
              <Calendar size={11} />
              {data.periodoCodigo}
            </span>
          )}
          <span style={{
            minHeight: 31,
            padding: '0 9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            border: '1px solid #D5E1F1',
            borderRadius: 8,
            background: '#FFFFFF',
            color: '#47617E',
            fontSize: '0.61rem',
            fontWeight: 850,
          }}>
            <span className="identificacion-docente-oficial-toggle-label">
              {expanded ? 'Ocultar datos' : 'Mostrar datos'}
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 180ms ease',
              }}
            />
          </span>
        </span>
      </button>

      <div
        id={contentId}
        aria-hidden={!expanded}
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          visibility: expanded ? 'visible' : 'hidden',
          transition: 'grid-template-rows 220ms ease, visibility 220ms ease',
        }}
      >
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div className="identificacion-docente-oficial-grid">
            {campos.map(item => <Dato key={item.label} {...item} />)}
          </div>
          <div style={{
            padding: '7px 11px',
            borderTop: '1px solid #D8E2EE',
            background: '#F8FAFC',
            color: '#64748B',
            fontSize: '0.58rem',
            fontWeight: 700,
            lineHeight: 1.35,
            textAlign: 'center',
          }}>
            Información de consulta proveniente de la ficha institucional del docente. Este bloque no modifica los datos del PTA.
          </div>
        </div>
      </div>
    </section>
  );
}
