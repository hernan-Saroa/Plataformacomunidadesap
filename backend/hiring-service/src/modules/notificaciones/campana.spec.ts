import { htmlDelAviso } from './campana';

/** El correo de un aviso (EFDS-1183). */
describe('htmlDelAviso', () => {
  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  it('lo que escribió un usuario no se vuelve HTML', () => {
    // Las observaciones de una devolución las escribe una persona.
    const html = htmlDelAviso({ titulo: 'Te devolvieron una actividad', mensaje: 'Falta <b>el CDP</b> & la póliza' });

    expect(html).toContain('Falta &lt;b&gt;el CDP&lt;/b&gt; &amp; la póliza');
    expect(html).not.toContain('<b>el CDP</b>');
  });

  it('lleva a la plataforma cuando se sabe dónde está', () => {
    process.env.FRONTEND_URL = 'https://superapp.esap.edu.co';

    expect(htmlDelAviso({ titulo: 'T', mensaje: 'M' })).toContain('href="https://superapp.esap.edu.co"');
  });

  it('sin la dirección de la plataforma no pone un enlace roto', () => {
    expect(htmlDelAviso({ titulo: 'T', mensaje: 'M' })).not.toContain('href=');
  });
});

/** El correo a quien no tiene cuenta: el contratista, un correo escrito a mano (088). */
describe('htmlDelAviso · a un destinatario externo', () => {
  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  it('no lo manda a una plataforma a la que no puede entrar', () => {
    process.env.FRONTEND_URL = 'https://superapp.esap.edu.co';
    const html = htmlDelAviso({ titulo: 'T', mensaje: 'M' }, { externo: true });

    expect(html).not.toContain('href=');
    expect(html).not.toContain('campana');
  });
});
