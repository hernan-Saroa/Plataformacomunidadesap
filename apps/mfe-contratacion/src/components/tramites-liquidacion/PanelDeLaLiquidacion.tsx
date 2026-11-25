import React, { useState } from 'react';

import { SituacionTramiteLiquidacion } from '../../types';
import { PanelLiquidacion } from '../liquidacion/PanelLiquidacion';
import { PanelCierreFinanciero } from '../cierre-financiero/PanelCierreFinanciero';
import { PanelTramiteLiquidacion } from './PanelTramiteLiquidacion';

/**
 * La 10.2 desde la 151: el trámite manda.
 *
 * Los paneles de siempre —el acta vigente con su balance y el cierre del saldo—
 * salen cuando ya hay algo que mostrar en ellos: el acta firmada, el PSPAG
 * cerrado, o un proceso que iba por la 10.2 antes de que existiera el trámite.
 */
export function PanelDeLaLiquidacion({ procesoId, onCambio }: { procesoId: string; onCambio: () => void }) {
  const [s, setS] = useState<SituacionTramiteLiquidacion | null>(null);
  const t = s?.tramite;

  const conActa = t?.clase === 'LIQUIDACION' && (t.estado === 'PERFECCIONADA' || t.estado === 'PUBLICADA');
  const cerrado = t?.clase === 'CIERRE' && t.estado === 'CERRADA';
  const caminoViejo = !!s && !t && s.etapa10Abierta;

  return (
    <div className="space-y-3">
      <PanelTramiteLiquidacion procesoId={procesoId} onCambio={onCambio} onSituacion={setS} />
      {(conActa || caminoViejo) && <PanelLiquidacion procesoId={procesoId} onCambio={onCambio} />}
      {(conActa || cerrado || caminoViejo) && <PanelCierreFinanciero procesoId={procesoId} onCambio={onCambio} />}
    </div>
  );
}
