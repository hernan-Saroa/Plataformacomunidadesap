import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { PTAResumenPrint } from './PTAResumenPrint';

afterEach(cleanup);

const base = {
  id: 'pta-firmas', periodo: '2026-1', docente_nombre: 'Docente Prueba',
  documento_identidad: '123456', aprobador_nombre: 'Aprobador Prueba',
};
const reporte = (pta: any) => (
  <PTAResumenPrint pta={pta} onClose={() => {}} userPersonId="persona-interna" />
);

function comprobarFirmas(docente: boolean, aprobador: boolean) {
  const docenteSlot = screen.getByText('Firma del Docente').parentElement!;
  expect(Boolean(within(docenteSlot).queryByText('Aprobado Electrónicamente'))).toBe(docente);
  expect(Boolean(screen.queryByText('Aprobador registrado en el sistema'))).toBe(aprobador);
  expect(screen.queryAllByText('Aprobado Electrónicamente')).toHaveLength(Number(docente) + Number(aprobador));
}

describe('firmas del resumen individual del docente', () => {
  it('sigue el envío, aprobación, edición autorizada, reenvío y reaprobación en el mismo reporte', () => {
    const fechaAnterior = '2026-10-20T10:00:00Z';
    const fechaReenvio = '2026-10-28T10:00:00Z';
    const { rerender } = render(reporte({ ...base, estado: 'Borrador' }));
    comprobarFirmas(false, false);

    rerender(reporte({ ...base, estado: 'Pendiente Jefatura', fecha_envio_revision: fechaAnterior }));
    comprobarFirmas(true, false);

    rerender(reporte({ ...base, estado: 'Aprobado', fecha_envio_revision: fechaAnterior }));
    comprobarFirmas(true, true);

    // El historial y el nombre del aprobador previo siguen en el DTO al reabrir.
    rerender(reporte({ ...base, estado: 'REVISION_DOCENTE_N2', fecha_envio_revision: fechaAnterior }));
    comprobarFirmas(false, false);

    rerender(reporte({ ...base, estado: 'Pendiente Jefatura', fecha_envio_revision: fechaReenvio }));
    comprobarFirmas(true, false);

    rerender(reporte({ ...base, estado: 'Aprobado', fecha_envio_revision: fechaReenvio }));
    comprobarFirmas(true, true);
  });

  it.each(['REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3', 'Devuelto', 'Borrador'])(
    'no conserva firmas del envío anterior en %s', estado => {
      render(reporte({ ...base, estado, fecha_envio_revision: '2026-10-20T10:00:00Z' }));
      comprobarFirmas(false, false);
    },
  );

  it.each(['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'PENDIENTE_APROBACION'])(
    'muestra solo la firma docente en %s aunque falte la fecha histórica', estado => {
      render(reporte({ ...base, estado }));
      comprobarFirmas(true, false);
    },
  );

  it.each(['Aprobado', 'En Firme', 'Finalizado'])(
    'muestra ambas firmas en un PTA histórico %s sin fecha de envío', estado => {
      render(reporte({ ...base, estado }));
      comprobarFirmas(true, true);
    },
  );

  it.each(['PROPUESTO_POR_DIRECCION', 'NOTIFICADO_DOCENTE', 'EN_CONCERTACION', 'DESCONOCIDO', ''])(
    'no presume firmas antes del envío en %s', estado => {
      render(reporte({ ...base, estado }));
      comprobarFirmas(false, false);
    },
  );
});
