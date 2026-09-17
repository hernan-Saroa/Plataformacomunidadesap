import { buildEmailButton } from './email-button.util';

describe('buildEmailButton', () => {
  it('should generate valid button HTML with given URL and default text', () => {
    const url = 'https://comunidadesap.esap.edu.co/?module=control-disciplinario';
    const html = buildEmailButton(url);

    expect(html).toContain('href="https://comunidadesap.esap.edu.co/?module=control-disciplinario"');
    expect(html).toContain('Ingresar a la Plataforma &rarr;');
    // Should NOT contain !important in inline styles to prevent email client stripping
    expect(html).not.toContain('!important');
    // Should contain font tag for bulletproof color preservation
    expect(html).toContain('<font color="#ffffff"');
    // Should contain MSO VML fallback
    expect(html).toContain('<v:roundrect');
    expect(html).toContain('fillcolor="#003DA5"');
    // Should contain copyable plain link fallback
    expect(html).toContain('Si el bot&oacute;n no abre directamente');
  });

  it('should use custom text and escape HTML characters', () => {
    const url = 'http://4.156.71.181/expediente/123';
    const html = buildEmailButton(url, 'Acceder <Expediente> & Mas');

    expect(html).toContain('Acceder &lt;Expediente&gt; &amp; Mas &rarr;');
    expect(html).not.toContain('Acceder <Expediente>');
  });

  it('should preserve text color #ffffff on anchor and span', () => {
    const html = buildEmailButton('http://test.com', 'Ver');
    expect(html).toContain('color: #ffffff;');
    expect(html).toContain('background-color: #003DA5;');
  });
});
