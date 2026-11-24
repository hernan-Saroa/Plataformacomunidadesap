import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBancoDocenteCabezote, updateBancoDocenteContacto } from '../../../services/api/ptaApi';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRundPermission } from '../../../../../shared/rund-permissions';
import { useAnchoVisible } from '../../../utils/useAnchoVisible';
import { RundValidationPanel } from './RundValidationPanel';
import { PerfilDocenteCabezote, type EdicionContactoCabezote } from './PerfilDocenteCabezote';

interface Props {
  docente: any;
  periodoCarga?: string;
  onUpdated?: () => void;
  columnCount?: number;
}

export function BancoDocenteDetalleInline({ docente, periodoCarga, onUpdated, columnCount = 8 }: Props) {
  const [resultado, setResultado] = useState<{ source: any; periodo?: string; data: any; error: boolean } | null>(null);
  const periodo = periodoCarga || docente?.periodo_carga || docente?.periodoCarga || docente?.period_carga;
  const docenteId = docente?.docente_id || docente?.id;
  const auth = useAuth();
  // La fila vive en una tabla con min-width y scroll: el detalle se limita al ancho visible para ser responsive.
  const contenidoRef = useRef<HTMLDivElement>(null);
  const anchoVisible = useAnchoVisible(contenidoRef, Boolean(docente));
  // RUND-013 — misma regla de modificación que el resto del perfil RUND; el servidor la vuelve a exigir.
  const puedeEditarContacto = hasRundPermission(auth, 'banco-docentes.rund.edit') || hasRundPermission(auth, 'banco-docentes.rund.manage');

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

  const guardarContacto = useCallback<EdicionContactoCabezote['guardar']>(async (clave, valor) => {
    const res = await updateBancoDocenteContacto(docenteId, { campo: clave, valor, periodoCarga: periodo });
    if (!res.success) return { ok: false, mensaje: (res as { message?: string }).message };
    const guardado = res.data?.valor ?? null;
    const campoPerfil = clave === 'CORREO_INSTITUCIONAL' ? 'correo_institucional'
      : clave === 'CORREO_ALTERNATIVO' ? 'correo_personal' : 'telefono';
    setResultado((previo) => (previo?.data
      ? { ...previo, data: { ...previo.data, [campoPerfil]: guardado } }
      : previo));
    onUpdated?.();
    return { ok: true };
  }, [docenteId, periodo, onUpdated]);

  const edicionContacto = useMemo<EdicionContactoCabezote>(
    () => ({ puedeEditar: puedeEditarContacto, guardar: guardarContacto }),
    [puedeEditarContacto, guardarContacto],
  );

  if (!docente) return null;
  const actual = resultado?.source === docente && resultado?.periodo === periodo ? resultado : null;

  return (
    <tr>
      <td colSpan={columnCount} style={{ padding: 0, background: '#FAFBFC' }}>
        <div
          ref={contenidoRef}
          data-testid="detalle-docente-contenido"
          style={{
            borderTop: '2px solid #003DA5',
            boxSizing: 'border-box',
            ...(anchoVisible ? { position: 'sticky', left: 0, width: anchoVisible } : {}),
          }}
        >
          <div style={{ padding: '20px 20px 0' }}>
            {!actual ? (
              <p role="status">Cargando cabezote del perfil docente…</p>
            ) : actual.error ? (
              <p role="alert">No fue posible consultar el cabezote para este periodo. Cierre y vuelva a abrir el detalle para reintentar.</p>
            ) : (
              <PerfilDocenteCabezote docente={actual.data} compacto edicionContacto={edicionContacto} />
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
