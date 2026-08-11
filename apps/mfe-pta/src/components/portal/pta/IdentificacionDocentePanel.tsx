import { useId, useMemo, useState } from 'react';
import { Calendar, ChevronDown, UserRound } from 'lucide-react';

interface IdentificacionDocentePanelProps {
  pta: any;
  userPerfil: any;
  periodoAcademico?: any;
}

interface DatoPerfil {
  label: string;
  value: any;
}

const datoNoVacio = (...values: any[]): any => values.find((value) => (
  value !== null
  && value !== undefined
  && String(value).trim() !== ''
));

const fmtFecha = (value?: any): string | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString('es-CO');
};

function Dato({ label, value }: DatoPerfil) {
  const vacio = value === null || value === undefined || value === '';

  return (
    <div className="perfil-docente-card">
      <span className="perfil-docente-card-label">{label}</span>
      <span className={`perfil-docente-card-value${vacio ? ' perfil-docente-card-value-empty' : ''}`}>
        {vacio ? '—' : value}
      </span>
    </div>
  );
}

/**
 * Información institucional del perfil docente. Es un bloque de consulta:
 * su despliegue no altera los datos ni el estado del PTA.
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

    return {
      periodoCodigo,
      perfil: [
        {
          label: 'Perfil académico',
          value: datoNoVacio(userPerfil?.perfil_academico, userPerfil?.perfil_academico_pro),
        },
        { label: 'Categoría', value: datoNoVacio(userPerfil?.categoria) },
        { label: 'Sede territorial', value: datoNoVacio(userPerfil?.territorial) },
        { label: 'Núcleo temático', value: datoNoVacio(userPerfil?.nucleo_tematico) },
        {
          label: 'Acto administrativo',
          value: datoNoVacio(userPerfil?.acto_administrativo_vinculacion),
        },
        { label: 'Situación administrativa', value: datoNoVacio(userPerfil?.situacion_administrativa) },
      ],
      fechas: [
        {
          label: 'Fecha inicio de vinculación',
          value: fmtFecha(userPerfil?.inicio_vinculacion),
        },
        {
          label: 'Fecha fin de vinculación',
          value: fmtFecha(userPerfil?.fin_vinculacion),
        },
        {
          label: 'Inicio período académico',
          value: fmtFecha(datoNoVacio(
            periodoAcademico?.fechaInicio,
            periodoAcademico?.fecha_inicio,
            pta?.periodo_fecha_inicio,
          )),
        },
        {
          label: 'Fin período académico',
          value: fmtFecha(datoNoVacio(
            periodoAcademico?.fechaFin,
            periodoAcademico?.fecha_fin,
            pta?.periodo_fecha_fin,
          )),
        },
      ],
    };
  }, [pta, userPerfil, periodoAcademico]);

  return (
    <section
      aria-label="Perfil docente"
      style={{
        overflow: 'hidden',
        borderRadius: 16,
        border: '1px solid #D8E2EE',
        background: '#FFFFFF',
        boxShadow: '0 3px 12px rgba(15, 23, 42, 0.055)',
      }}
    >
      <style>{`
        .perfil-docente-toggle:hover {
          filter: brightness(0.975);
        }
        .perfil-docente-toggle:focus-visible {
          outline: 3px solid #FACC15;
          outline-offset: -3px;
        }
        .perfil-docente-content {
          padding: 15px 16px 16px;
        }
        .perfil-docente-grid {
          display: grid;
          gap: 10px;
        }
        .perfil-docente-grid-profile {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
        .perfil-docente-grid-dates {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .perfil-docente-section-title {
          margin: 14px 0 8px;
          color: #64748B;
          font-size: 0.61rem;
          font-weight: 850;
          letter-spacing: 0.045em;
          line-height: 1.25;
          text-transform: uppercase;
        }
        .perfil-docente-card {
          min-width: 0;
          min-height: 76px;
          padding: 10px 11px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-sizing: border-box;
          border: 1px solid #E7EBF0;
          border-radius: 10px;
          background: #F3F4F6;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
        }
        .perfil-docente-card-label {
          color: #8A94A4;
          font-size: 0.56rem;
          font-weight: 800;
          letter-spacing: 0.025em;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .perfil-docente-card-value {
          color: #172033;
          font-size: 0.69rem;
          font-weight: 750;
          line-height: 1.35;
          overflow-wrap: anywhere;
          white-space: pre-line;
        }
        .perfil-docente-card-value-empty {
          color: #94A3B8;
        }
        @media (max-width: 1250px) {
          .perfil-docente-grid-profile {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 900px) {
          .perfil-docente-grid-profile,
          .perfil-docente-grid-dates {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 720px) {
          .perfil-docente-subtitle,
          .perfil-docente-toggle-label {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .perfil-docente-content {
            padding: 12px;
          }
          .perfil-docente-grid-profile,
          .perfil-docente-grid-dates {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <button
        className="perfil-docente-toggle"
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
              Perfil docente
            </span>
            <span className="perfil-docente-subtitle" style={{ display: 'block', marginTop: 3, color: '#64748B', fontSize: '0.6rem', fontWeight: 650, lineHeight: 1.25 }}>
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
            <span className="perfil-docente-toggle-label">
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
          <div className="perfil-docente-content">
            <div className="perfil-docente-grid perfil-docente-grid-profile">
              {data.perfil.map(item => <Dato key={item.label} {...item} />)}
            </div>

            <div className="perfil-docente-section-title">Fechas de vinculación</div>
            <div className="perfil-docente-grid perfil-docente-grid-dates">
              {data.fechas.map(item => <Dato key={item.label} {...item} />)}
            </div>
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
