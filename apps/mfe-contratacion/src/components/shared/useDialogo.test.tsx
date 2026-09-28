import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useDialogo, PeticionDialogo } from './useDialogo';

/**
 * El diálogo que sustituyó a `window.prompt` en veintitrés acciones del módulo
 * y a `window.confirm` en una.
 *
 * Aquellos cuadros del sistema operativo no se podían probar —jsdom no los
 * implementa—, así que las veintitrés acciones que dependían de ellos estaban
 * sin cubrir: nadie comprobaba que un motivo vacío no pasara, porque nadie
 * podía escribir en un `prompt`.
 */

/** Un panel de mentira que usa el hook igual que los de verdad. */
function Panel({
  onResultado,
  peticion,
  modo = 'datos',
}: {
  onResultado: (v: unknown) => void;
  peticion?: Partial<PeticionDialogo> & { etiqueta?: string; opcional?: boolean };
  modo?: 'datos' | 'motivo' | 'confirmar';
}) {
  const dialogo = useDialogo();
  const [hecho, setHecho] = useState(false);

  const abrir = async () => {
    const base = { titulo: 'Anular la adenda 3', confirmar: 'Anular', ...peticion };
    const r =
      modo === 'motivo'
        ? await dialogo.pedirMotivo(base as never)
        : modo === 'confirmar'
          ? await dialogo.confirmar(base as never)
          : await dialogo.pedirDatos(base as never);
    onResultado(r);
    setHecho(true);
  };

  return (
    <div>
      <button type="button" onClick={abrir}>
        Abrir
      </button>
      {hecho ? <p>terminado</p> : null}
      {dialogo.elemento}
    </div>
  );
}

const abrir = async () => userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

describe('useDialogo · pedir un motivo sin el cuadro gris del navegador', () => {
  it('no deja confirmar hasta que el motivo tiene fondo', async () => {
    // `window.prompt` aceptaba un espacio en blanco, y ese espacio era el
    // motivo que quedaba en el expediente.
    const resultado = vi.fn();
    render(<Panel modo="motivo" onResultado={resultado} />);
    await abrir();

    const confirmar = screen.getByRole('button', { name: 'Anular' });
    expect(confirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Motivo/), '   ');
    expect(confirmar).toBeDisabled();

    await userEvent.clear(screen.getByLabelText(/Motivo/));
    await userEvent.type(screen.getByLabelText(/Motivo/), 'corto');
    expect(confirmar).toBeDisabled();
    // Y dice cuánto falta, en vez de dejar el botón apagado sin motivo.
    expect(screen.getByText(/al menos 10 caracteres/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Motivo/), ' pero ya no tanto');
    expect(confirmar).toBeEnabled();
  });

  it('devuelve el texto recortado', async () => {
    const resultado = vi.fn();
    render(<Panel modo="motivo" onResultado={resultado} />);
    await abrir();

    await userEvent.type(screen.getByLabelText(/Motivo/), '  se publicó con la fecha errada  ');
    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));

    expect(await screen.findByText('terminado')).toBeInTheDocument();
    expect(resultado).toHaveBeenCalledWith('se publicó con la fecha errada');
  });

  it('cancelar devuelve null, y eso es lo que aborta la acción', async () => {
    const resultado = vi.fn();
    render(<Panel modo="motivo" onResultado={resultado} />);
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByText('terminado')).toBeInTheDocument();
    expect(resultado).toHaveBeenCalledWith(null);
  });

  it('un motivo opcional se confirma en blanco, y eso no es cancelar', async () => {
    // La diferencia importa: la nota de cierre del traslado y la observación
    // al avalar son opcionales, pero cerrar el diálogo tiene que abortar.
    const resultado = vi.fn();
    render(<Panel modo="motivo" peticion={{ opcional: true }} onResultado={resultado} />);
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));

    expect(resultado).toHaveBeenCalledWith('');
  });

  it('pide varios datos a la vez cuando la acción necesita más de uno', async () => {
    // Antes eran dos `prompt` encadenados, y cancelar el segundo tiraba a la
    // basura lo escrito en el primero.
    const resultado = vi.fn();
    render(
      <Panel
        onResultado={resultado}
        peticion={{
          titulo: 'Registrar el rechazo',
          confirmar: 'Registrar',
          campos: [
            { nombre: 'quien', etiqueta: 'Quién rechaza', multilinea: false },
            { nombre: 'motivo', etiqueta: 'Por qué' },
          ],
        }}
      />,
    );
    await abrir();

    const registrar = screen.getByRole('button', { name: 'Registrar' });
    await userEvent.type(screen.getByLabelText(/Quién rechaza/), 'Ana Gómez');
    // Con un campo lleno y el otro no, sigue bloqueado.
    expect(registrar).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Por qué/), 'el pago no corresponde');
    await userEvent.click(registrar);

    expect(resultado).toHaveBeenCalledWith({
      quien: 'Ana Gómez',
      motivo: 'el pago no corresponde',
    });
  });

  it('un campo de una línea es un input y no un área de texto', async () => {
    render(
      <Panel
        onResultado={vi.fn()}
        peticion={{
          campos: [{ nombre: 'referencia', etiqueta: 'Referencia', multilinea: false }],
        }}
      />,
    );
    await abrir();

    expect(screen.getByLabelText(/Referencia/).tagName).toBe('INPUT');
  });

  it('sin campos es solo una confirmación', async () => {
    const resultado = vi.fn();
    render(<Panel modo="confirmar" onResultado={resultado} />);
    await abrir();

    expect(screen.queryByLabelText(/Motivo/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));

    expect(resultado).toHaveBeenCalledWith(true);
  });

  it('y cancelarla devuelve false', async () => {
    const resultado = vi.fn();
    render(<Panel modo="confirmar" onResultado={resultado} />);
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(resultado).toHaveBeenCalledWith(false);
  });

  it('no arrastra lo escrito de una vez a la siguiente', async () => {
    // El diálogo es uno solo por panel y lo reusan todas sus acciones: un
    // motivo que sobreviviera cambiaría el sentido de la acción siguiente.
    const resultado = vi.fn();
    render(<Panel modo="motivo" onResultado={resultado} />);

    await abrir();
    await userEvent.type(screen.getByLabelText(/Motivo/), 'el primero que escribí');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await abrir();
    expect(screen.getByLabelText(/Motivo/)).toHaveValue('');
  });
});
