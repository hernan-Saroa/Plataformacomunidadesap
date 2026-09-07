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
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  const data = useMemo(() => {
    const periodoCodigo = String(datoNoVacio(
      typeof pta?.periodo === 'string' ? pta.periodo : pta?.periodo?.codigo,
      periodoAcademico?.codigo,
    ) || '').trim();
    const identificacionDocente = datoNoVacio(
      userPerfil?.identificacion,
      userPerfil?.documento_identidad,
      userPerfil?.documento,
    );
    const nombreDocente = datoNoVacio(
      userPerfil?.nombre,
      userPerfil?.nombre_completo,
      userPerfil?.nombreCompleto,
    );

    return {
      periodoCodigo,
      docenteResumen: [identificacionDocente, nombreDocente]
        .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
        .join(' · '),
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
        borderRadius: 12,
        border: '1px solid #D6E0EC',
        background: '#FFFFFF',
        boxShadow: '0 2px 9px rgba(15, 23, 42, 0.045)',
      }}
    >
      <style>{`
        .perfil-docente-toggle:hover {
          background: linear-gradient(100deg, #EAF3FF 0%, #FAFCFF 62%, #F1F6FC 100%) !important;
        }
        .perfil-docente-toggle:focus-visible {
          outline: 3px solid #FACC15;
          outline-offset: -3px;
        }
        .perfil-docente-content {
          padding: 12px 14px 14px;
          background: #FFFFFF;
        }
        .perfil-docente-grid {
          display: grid;
          gap: 10px;
        }
        .perfil-docente-grid-profile {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .perfil-docente-grid-dates {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .perfil-docente-section-title {
          margin: 12px 0 8px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #365C84;
          font-size: 0.59rem;
          font-weight: 850;
          letter-spacing: 0.055em;
          line-height: 1.25;
          text-transform: uppercase;
        }
        .perfil-docente-section-title::before {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #0B5CC4;
          box-shadow: 0 0 0 4px #DDEDFC;
          content: '';
          flex: 0 0 auto;
        }
        .perfil-docente-section-title::after {
          height: 1px;
          background: #D7E3F0;
          content: '';
          flex: 1;
        }
        .perfil-docente-card {
          position: relative;
          min-width: 0;
          min-height: 72px;
          padding: 10px 11px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-sizing: border-box;
          overflow: hidden;
          border: 1px solid #D6E3F1;
          border-radius: 8px;
          background: linear-gradient(135deg, #F2F6FB 0%, #F7FAFD 100%);
          box-shadow: 0 1px 3px rgba(0, 61, 165, 0.035);
        }
        .perfil-docente-card::before {
          position: absolute;
          inset: 0 auto 0 0;
          width: 2px;
          background: #80ADE2;
          content: '';
        }
        .perfil-docente-card-label {
          color: #55708E;
          font-size: 0.56rem;
          font-weight: 850;
          letter-spacing: 0.04em;
          line-height: 1.3;
          text-transform: uppercase;
        }
        .perfil-docente-card-value {
          color: #142033;
          font-size: 0.68rem;
          font-weight: 700;
          line-height: 1.42;
          overflow-wrap: anywhere;
          white-space: pre-line;
        }
        .perfil-docente-card-value-empty {
          color: #94A3B8;
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
        @media (max-width: 520px) {
          .perfil-docente-content {
            padding: 10px;
          }
          .perfil-docente-grid-profile,
          .perfil-docente-grid-dates {
            grid-template-columns: minmax(0, 1fr);
          }
          .perfil-docente-card {
            min-height: 68px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .perfil-docente-collapsible,
          .perfil-docente-chevron {
            transition: none !important;
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
          minHeight: 50,
          padding: '7px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          border: 0,
          borderBottom: expanded ? '1px solid #D8E2EE' : 0,
          background: 'linear-gradient(100deg, #F1F7FE 0%, #FCFDFF 62%, #F4F8FC 100%)',
          boxShadow: 'inset 4px 0 0 #003DA5',
          color: '#172033',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 160ms ease',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: '#E8F0FE',
            border: '1px solid #D5E4FA',
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(0, 61, 165, 0.1)',
          }}>
            <UserRound size={16} color="#003DA5" strokeWidth={2.2} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: '#172033', fontSize: '0.76rem', fontWeight: 850, letterSpacing: '0.005em', lineHeight: 1.2 }}>
              Perfil docente
            </span>
            <span className="perfil-docente-subtitle" style={{ display: 'block', marginTop: 2, color: '#64748B', fontSize: '0.57rem', fontWeight: 650, lineHeight: 1.25 }}>
              {data.docenteResumen || 'Información académica y de vinculación'}
            </span>
          </span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {data.periodoCodigo && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              border: '1px solid #C9DCEF',
              borderRadius: 999,
              background: '#F8FBFF',
              color: '#365F8A',
              fontSize: '0.57rem',
              fontWeight: 900,
            }}>
              <Calendar size={11} />
              {data.periodoCodigo}
            </span>
          )}
          <span style={{
            minHeight: 28,
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            border: '1px solid #C9DCEF',
            borderRadius: 7,
            background: '#F8FBFF',
            color: '#365F8A',
            fontSize: '0.57rem',
            fontWeight: 850,
          }}>
            <span className="perfil-docente-toggle-label">
              {expanded ? 'Ocultar información' : 'Ver información'}
            </span>
            <ChevronDown
              className="perfil-docente-chevron"
              size={13}
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
        className="perfil-docente-collapsible"
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
            padding: '6px 12px',
            borderTop: '1px solid #D5E3F1',
            background: '#FFFCF4',
            color: '#84601D',
            fontSize: '0.55rem',
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
