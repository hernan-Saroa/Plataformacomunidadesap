import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AprobacionDeLaActividad } from './AprobacionDeLaActividad';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PROCESO = '11111111-1111-1111-1111-111111111111';

/** Lo que devuelve el backend, con lo que cada caso necesita cambiar. */
const estado = (cambios: Record<string, unknown> = {}) => ({
  requiereAprobacion: true,
  aprobadores: { roles: ['Director de Contratación'], personas: [] },
  puedoAprobar: false,
  estado: 'BORRADOR',
  esMia: false,
  observaciones: null,
  decididaPor: null,
  revisiones: [],
  ...cambios,
});

const montar = (
  respuesta: Record<string, unknown>,
  parte?: 'aviso' | 'decision',
  faltanDocumentos?: number,
) => {
  vi.spyOn(contratacionService, 'aprobadoresDeActividad').mockResolvedValue(
    respuesta as never,
  );
  return render(
    <AprobacionDeLaActividad
      procesoId={PROCESO}
      numeral="5.9"
      parte={parte}
      faltanDocumentos={faltanDocumentos}
    />,
  );
};

describe('AprobacionDeLaActividad · EFDS-1183', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('no ocupa sitio en las actividades que nadie configuró', async () => {
    const { container } = montar(
      estado({ requiereAprobacion: false, aprobadores: null }),
    );

    // Se monta en las treinta y ocho actividades: en las que no exigen
    // aprobación —hoy, todas— tiene que ser invisible.
    await waitFor(() => expect(contratacionService.aprobadoresDeActividad).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('dice quién aprobará antes de enviar, no después', async () => {
    montar(estado());

    // Descubrir quién la aprueba una vez enviada ya no le sirve al gestor.
    expect(await screen.findByText(/La aprobará Director de Contratación/)).toBeInTheDocument();
    // El envío no vive aquí: lo hace el registro, que es el que sabe si el
    // trabajo está hecho. Este bloque solo dice por dónde sale.
    expect(await screen.findByText(/Se envía sola al registrar la actividad/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar a aprobación/ })).toBeNull();
  });

  it('deja retirar solo a quien la envió', async () => {
    montar(estado({ estado: 'EN_REVISION', esMia: true }));

    expect(await screen.findByRole('button', { name: /Retirar de aprobación/ })).toBeInTheDocument();
  });

  it('a los demás les muestra la espera sin botón de retirar', async () => {
    montar(estado({ estado: 'EN_REVISION', esMia: false }));

    expect(await screen.findByText(/pendiente de aprobación/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retirar/ })).not.toBeInTheDocument();
  });

  it('solo ofrece decidir a quien puede aprobar', async () => {
    montar(estado({ estado: 'EN_REVISION', puedoAprobar: true }), 'decision');

    expect(await screen.findByRole('button', { name: /^Aprobar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Devolver con observaciones/ })).toBeInTheDocument();
  });

  it('no pone los botones arriba, donde se decidiría sin ver nada', async () => {
    // La decisión va al final de los documentos: quien aprueba tiene que ver
    // lo que le cargaron antes de resolver.
    montar(estado({ estado: 'EN_REVISION', puedoAprobar: true }), 'aviso');

    expect(await screen.findByText(/pendiente de aprobación/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Aprobar/ })).not.toBeInTheDocument();
  });

  it('a quien no aprueba no le pinta nada abajo', async () => {
    const { container } = montar(
      estado({ estado: 'EN_REVISION', puedoAprobar: false }),
      'decision',
    );

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('no deja devolver sin decir qué corregir', async () => {
    montar(estado({ estado: 'EN_REVISION', puedoAprobar: true }), 'decision');

    await userEvent.click(await screen.findByRole('button', { name: /Devolver con observaciones/ }));

    // Devolver en blanco deja al gestor adivinando qué cambiar.
    expect(screen.getByRole('button', { name: /^Devolver/ })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Observaciones/), 'Falta la firma del ordenador');
    expect(screen.getByRole('button', { name: /^Devolver/ })).toBeEnabled();
  });

  it('al devolverla muestra la observación y quién la devolvió', async () => {
    montar(
      estado({
        estado: 'DEVUELTO',
        observaciones: 'Falta la firma del ordenador del gasto',
        decididaPor: 'Ana Lucía Prieto',
      }),
    );

    expect(await screen.findByText(/Devuelta por Ana Lucía Prieto/)).toBeInTheDocument();
    expect(screen.getByText(/Falta la firma del ordenador del gasto/)).toBeInTheDocument();
    // Corregir se hace abajo, en el panel de trabajo, y volver a registrar
    // la reenvia: aqui solo se dice por donde sale.
    expect(screen.getByText(/vuelve a registrar la actividad/)).toBeInTheDocument();
  });

  it('una vez aprobada no vuelve a ofrecer enviarla', async () => {
    montar(estado({ estado: 'APROBADO', decididaPor: 'Ana Lucía Prieto' }));

    expect(await screen.findByText(/Actividad aprobada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar/ })).not.toBeInTheDocument();
  });

  it('si la consulta falla no bloquea la actividad', async () => {
    vi.spyOn(contratacionService, 'aprobadoresDeActividad').mockRejectedValue(
      new Error('sin red'),
    );

    const { container } = render(
      <AprobacionDeLaActividad procesoId={PROCESO} numeral="5.9" />,
    );

    // Dejar la pantalla en un estado de espera porque una consulta falló
    // impediría trabajar una actividad que quizá ni exige aprobación.
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('no deja aprobar mientras falte un formato por cargar', async () => {
    montar(estado({ estado: 'EN_REVISION', puedoAprobar: true }), 'decision', 1);

    // El bloque de documentos avisa «Falta 1 de 1» justo encima: dejar el
    // botón activo debajo de ese aviso era pedir el visto bueno sin soporte.
    expect(await screen.findByRole('button', { name: /Aprobar/ })).toBeDisabled();
  });

  it('deja devolver aunque falten formatos, que es el caso legítimo', async () => {
    montar(estado({ estado: 'EN_REVISION', puedoAprobar: true }), 'decision', 2);

    // Devolver por falta de soporte es exactamente para lo que sirve devolver.
    expect(
      await screen.findByRole('button', { name: /Devolver con observaciones/ }),
    ).toBeEnabled();
    expect(screen.getByText(/Faltan 2 formatos por cargar/)).toBeInTheDocument();
  });

  it('deja aprobar cuando ya están todos los formatos', async () => {
    montar(estado({ estado: 'EN_REVISION', puedoAprobar: true }), 'decision', 0);

    expect(await screen.findByRole('button', { name: /Aprobar/ })).toBeEnabled();
  });

  it('avisa de que hay decisión, para que el contenedor abra la columna', async () => {
    const avisar = vi.fn();
    vi.spyOn(contratacionService, 'aprobadoresDeActividad').mockResolvedValue(
      estado({ estado: 'EN_REVISION', puedoAprobar: true }) as never,
    );
    render(
      <AprobacionDeLaActividad
        procesoId={PROCESO}
        numeral="5.9"
        parte="decision"
        onHayDecision={avisar}
      />,
    );

    await waitFor(() => expect(avisar).toHaveBeenCalledWith(true));
  });

  it('no avisa de decisión cuando el rol no aprueba', async () => {
    const avisar = vi.fn();
    vi.spyOn(contratacionService, 'aprobadoresDeActividad').mockResolvedValue(
      estado({ estado: 'EN_REVISION', puedoAprobar: false }) as never,
    );
    render(
      <AprobacionDeLaActividad
        procesoId={PROCESO}
        numeral="5.9"
        parte="decision"
        onHayDecision={avisar}
      />,
    );

    // Sin esto, el contenedor reservaría la columna y pintaría una burbuja
    // para alguien que no tiene nada que resolver.
    await waitFor(() => expect(avisar).toHaveBeenCalled());
    expect(avisar).not.toHaveBeenCalledWith(true);
  });

  it('se puede esconder, y solo cuando alguien sabe recogerla', async () => {
    const esconder = vi.fn();
    vi.spyOn(contratacionService, 'aprobadoresDeActividad').mockResolvedValue(
      estado({ estado: 'EN_REVISION', puedoAprobar: true }) as never,
    );
    render(
      <AprobacionDeLaActividad
        procesoId={PROCESO}
        numeral="5.9"
        parte="decision"
        onEsconder={esconder}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Esconder la decisión/ }));
    expect(esconder).toHaveBeenCalled();
  });

  it('muestra el recorrido completo, no solo la última decisión', async () => {
    montar(
      estado({
        estado: 'DEVUELTO',
        observaciones: 'Falta la ficha técnica.',
        decididaPor: 'Ana Prieto',
        revisiones: [
          {
            decision: 'DEVUELTO',
            observaciones: 'Falta la ficha técnica.',
            revisadoPor: 'Ana Prieto',
            versionRevisada: 2,
            fecha: '2026-09-03T10:00:00.000Z',
          },
          {
            decision: 'DEVUELTO',
            observaciones: 'El valor no coincide con el estudio de mercado.',
            revisadoPor: 'Ana Prieto',
            versionRevisada: 1,
            fecha: '2026-09-01T09:00:00.000Z',
          },
        ],
      }),
    );

    // Sin desplegar solo se anuncia; la observación vieja no puede tapar la
    // vigente, que es la que hay que corregir ahora.
    const abrir = await screen.findByRole('button', { name: /Ver el historial/ });
    expect(screen.queryByText(/no coincide con el estudio de mercado/)).toBeNull();

    await userEvent.click(abrir);
    expect(screen.getByText(/no coincide con el estudio de mercado/)).toBeInTheDocument();
  });

  it('sin revisiones previas no anuncia ningún historial', async () => {
    montar(estado({ estado: 'BORRADOR' }));

    await screen.findByText(/Se envía sola al registrar la actividad/);
    expect(screen.queryByRole('button', { name: /Ver el historial|Ver la decisión/ })).toBeNull();
  });

  it('sin quien la recoja no se ofrece esconderla', async () => {
    // El botón desaparecería la tarjeta sin dejar burbuja: sería una forma de
    // perder de vista lo que hay que resolver.
    montar(estado({ estado: 'EN_REVISION', puedoAprobar: true }), 'decision', 0);

    await screen.findByRole('button', { name: /Aprobar/ });
    expect(screen.queryByRole('button', { name: /Esconder/ })).toBeNull();
  });
});

/**
 * El aviso releyendo cuando el panel de abajo cambia el trámite (EFDS-1183).
 *
 * Son dos montajes con su propio estado. Al corregir una actividad devuelta y
 * reenviarla desde el panel, este bloque seguía creyéndola devuelta y volvía a
 * ofrecer corregir sobre un registro ya vigente; el servicio lo rechazaba con
 * «ya tiene un registro vigente», que es cierto pero no explica nada a quien
 * acaba de guardar bien.
 */
describe('AprobacionDeLaActividad · relee cuando el panel cambia el trámite', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('deja de decir «devuelta» cuando la actividad vuelve a revisión', async () => {
    const consulta = vi
      .spyOn(contratacionService, 'aprobadoresDeActividad')
      .mockResolvedValue(
        estado({ estado: 'DEVUELTO', observaciones: 'Faltan las fichas técnicas.' }) as never,
      );

    const { rerender } = render(
      <AprobacionDeLaActividad
        procesoId={PROCESO}
        numeral="5.9"
        parte="aviso"
        recargarToken={0}
      />,
    );

    expect(await screen.findByText(/Devuelta/)).toBeInTheDocument();

    // El panel de abajo guardó la corrección: la actividad ya está en revisión.
    consulta.mockResolvedValue(estado({ estado: 'EN_REVISION' }) as never);
    rerender(
      <AprobacionDeLaActividad
        procesoId={PROCESO}
        numeral="5.9"
        parte="aviso"
        recargarToken={1}
      />,
    );

    // Se espera al texto nuevo y no solo a que desaparezca el viejo: entre una
    // cosa y otra el bloque no pinta nada mientras relee.
    expect(
      await screen.findByText('En revisión · pendiente de aprobación'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Devuelta/)).toBeNull();
  });

  it('avisa al contenedor de que ya no está devuelta', async () => {
    // Es lo que apaga el botón de corregir en el panel de abajo.
    const consulta = vi
      .spyOn(contratacionService, 'aprobadoresDeActividad')
      .mockResolvedValue(estado({ estado: 'DEVUELTO' }) as never);
    const onDevuelta = vi.fn();

    const { rerender } = render(
      <AprobacionDeLaActividad
        procesoId={PROCESO}
        numeral="5.9"
        parte="aviso"
        onDevuelta={onDevuelta}
        recargarToken={0}
      />,
    );

    await waitFor(() => expect(onDevuelta).toHaveBeenCalledWith(true));

    consulta.mockResolvedValue(estado({ estado: 'EN_REVISION' }) as never);
    rerender(
      <AprobacionDeLaActividad
        procesoId={PROCESO}
        numeral="5.9"
        parte="aviso"
        onDevuelta={onDevuelta}
        recargarToken={1}
      />,
    );

    await waitFor(() => expect(onDevuelta).toHaveBeenLastCalledWith(false));
  });
});

/**
 * Aprobar lo que uno mismo trabajó (EFDS-1183).
 *
 * Estaba prohibido, copiando la regla de las garantías: allí quien carga la
 * póliza y quien la revisa son papeles distintos y nunca coinciden. En las
 * actividades sí coinciden —la 3.3 y la 3.4 las ejecuta la Dirección de
 * Contratación y las aprueba su director—, y el bloqueo lo dejaba esperándose
 * a sí mismo con la actividad sin salida. El control que queda es el rol.
 */
describe('AprobacionDeLaActividad · quien la trabajó también decide', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('le ofrece resolverla aunque la haya enviado él', async () => {
    montar(estado({ estado: 'EN_REVISION', esMia: true, puedoAprobar: true }));

    expect(await screen.findByText('Te toca resolverla.')).toBeInTheDocument();
  });

  it('y le da los botones de decidir', async () => {
    montar(estado({ estado: 'EN_REVISION', esMia: true, puedoAprobar: true }), 'decision');

    expect(await screen.findByRole('button', { name: /^Aprobar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Devolver con observaciones/ })).toBeInTheDocument();
  });

  it('sigue pudiendo retirarla en vez de decidir', async () => {
    // Retirar no desaparece: corregir antes de que nadie la mire sigue siendo
    // la salida limpia cuando uno mismo ve el error.
    montar(estado({ estado: 'EN_REVISION', esMia: true, puedoAprobar: true }));

    expect(await screen.findByRole('button', { name: /Retirar de aprobación/ })).toBeInTheDocument();
  });

  it('a quien no tiene el rol le sigue diciendo a quién espera', async () => {
    montar(estado({ estado: 'EN_REVISION', esMia: true, puedoAprobar: false }));

    expect(await screen.findByText(/Espera a Director de Contratación/)).toBeInTheDocument();
  });
});
