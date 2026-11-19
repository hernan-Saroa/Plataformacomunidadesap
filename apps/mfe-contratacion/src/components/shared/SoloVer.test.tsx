import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Check } from 'lucide-react';

import { AvisoSoloVer, CamposDeSoloVer, SiPuedeEditar, SoloVer } from './SoloLectura';
import { Boton, BotonSecundario, SelectorArchivo } from './PiezasPanel';
import { LugarDeDecision } from './LugarDeDecision';

/**
 * Quien solo tiene permiso de ver una actividad no ve las opciones de
 * modificarla, y los campos no se dejan llenar. Antes llenaba el formulario y
 * al guardar recibía «no tienes permiso».
 */
describe('SoloVer · sin permiso de editar no se ofrece modificar', () => {
  it('esconde los botones que escriben y la carga de archivos', () => {
    render(
      <SoloVer activo>
        <Boton icono={<Check />}>Registrar</Boton>
        <BotonSecundario icono={<Check />}>Anular</BotonSecundario>
        <SelectorArchivo etiqueta="Acta firmada" archivo={null} onElegir={() => undefined} />
        <SiPuedeEditar>
          <button type="button">Revocar</button>
        </SiPuedeEditar>
      </SoloVer>,
    );
    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull();
    expect(screen.queryByText('Acta firmada')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Revocar' })).toBeNull();
  });

  it('con permiso de editar se ven como siempre', () => {
    render(
      <SoloVer activo={false}>
        <Boton icono={<Check />}>Registrar</Boton>
        <SiPuedeEditar>
          <button type="button">Revocar</button>
        </SiPuedeEditar>
      </SoloVer>,
    );
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Revocar' })).toBeInTheDocument();
  });

  it('en la revisión, el botón de decidir sí se muestra', () => {
    render(
      <LugarDeDecision enLaRevision>
        <SoloVer activo>
          <Boton icono={<Check />} decision>
            Aprobar
          </Boton>
          <Boton icono={<Check />}>Registrar</Boton>
        </SoloVer>
      </LugarDeDecision>,
    );
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });

  it('los campos se ven con lo diligenciado pero no se dejan llenar, ni los que aparecen después', async () => {
    const Formulario = () => {
      const [mas, setMas] = useState(false);
      return (
        <>
          <input aria-label="Número" defaultValue="CDP-12" />
          <select aria-label="Tipo">
            <option>Uno</option>
          </select>
          {mas ? <textarea aria-label="Motivo" /> : null}
          <button type="button" onClick={() => setMas(true)}>
            Ver más
          </button>
        </>
      );
    };
    render(
      <CamposDeSoloVer activo>
        <Formulario />
      </CamposDeSoloVer>,
    );

    expect(screen.getByLabelText('Número')).toBeDisabled();
    expect(screen.getByLabelText('Número')).toHaveValue('CDP-12');
    expect(screen.getByLabelText('Tipo')).toBeDisabled();

    // Lo que solo consulta sigue funcionando, y lo que aparece se apaga también.
    await userEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    await waitFor(() => expect(screen.getByLabelText('Motivo')).toBeDisabled());
  });

  it('dice en pantalla que solo puede ver', () => {
    render(<AvisoSoloVer />);
    expect(screen.getByText('Solo puedes ver esta actividad')).toBeInTheDocument();
  });
});
