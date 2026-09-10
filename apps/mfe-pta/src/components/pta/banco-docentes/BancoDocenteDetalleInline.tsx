import { useEffect, useState } from 'react';
import { getBancoDocenteCabezote } from '../../../services/api/ptaApi';
import { RundValidationPanel } from './RundValidationPanel';
import { PerfilDocenteCabezote } from './PerfilDocenteCabezote';

interface Props {
  docente: any;
  periodoCarga?: string;
  onUpdated?: () => void;
}

export function BancoDocenteDetalleInline({ docente, periodoCarga, onUpdated }: Props) {
  const [resultado, setResultado] = useState<{ source: any; periodo?: string; data: any; error: boolean } | null>(null);
  const periodo = periodoCarga || docente?.periodo_carga || docente?.periodoCarga || docente?.period_carga;
  const docenteId = docente?.docente_id || docente?.id;

  useEffect(() => {
    let vigente = true;
    if (!docenteId) return;
    getBancoDocenteCabezote(docenteId, periodo)
      .then((res) => {
        if (vigente) setResultado({ source: docente, periodo, data: res.success ? res.data : null, error: !res.success || !res.data });
      })
      .catch(() => {
        if (vigente) setResultado({ source: docente, periodo, data: null, error: true });
      });
    return () => { vigente = false; };
  }, [docente, docenteId, periodo]);

  if (!docente) return null;
  const actual = resultado?.source === docente && resultado?.periodo === periodo ? resultado : null;

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, background: '#FAFBFC' }}>
        <div style={{ borderTop: '2px solid #003DA5' }}>
          <div style={{ padding: '20px 20px 0' }}>
            {!actual ? (
              <p role="status">Cargando cabezote del perfil docente…</p>
            ) : actual.error ? (
              <p role="alert">No fue posible consultar el cabezote para este periodo. Cierre y vuelva a abrir el detalle para reintentar.</p>
            ) : (
              <PerfilDocenteCabezote docente={actual.data} compacto />
            )}
          </div>
          <div style={{ padding: '20px 20px 0' }}>
            <RundValidationPanel
              docenteId={docenteId}
              cleanPersonaId={docente.personaId || docente.persona_id}
              docente={docente}
              onUpdated={onUpdated}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}
