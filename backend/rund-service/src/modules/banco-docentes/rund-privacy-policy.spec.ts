import fs from 'fs';
import { acceptedPrivacyPolicy, rundPrivacyPolicy } from './rund-privacy-policy';

describe('Evidencia de aceptación en autogestión', () => {
  afterEach(() => { delete process.env.RUND_PRIVACY_POLICY_FILE; jest.restoreAllMocks(); });
  it.each([undefined, false, 'true', 1])('no acepta un consentimiento ausente o no booleano: %s', value => {
    expect(() => acceptedPrivacyPolicy({ terminosAceptados: value, politicaTratamientoHuella: rundPrivacyPolicy().huella })).toThrow('Debe aceptar');
  });
  it('conserva texto, versión y hash calculados por el servidor', () => {
    const policy = rundPrivacyPolicy();
    expect(acceptedPrivacyPolicy({ terminosAceptados: true, politicaTratamientoHuella: policy.huella, texto: 'inyectado' }))
      .toMatchObject({ ...policy, aceptada: true });
    expect(policy.configurada).toBe(false);
  });
  it('rechaza aceptación de una versión distinta a la mostrada', () => {
    expect(() => acceptedPrivacyPolicy({ terminosAceptados: true, politicaTratamientoHuella: 'anterior' })).toThrow('cambió');
  });

  it('permite el formulario anterior únicamente para el aviso original y distingue la evidencia', () => {
    expect(acceptedPrivacyPolicy({ terminosAceptados: true })).toMatchObject({
      configurada: false, huellaVerificada: false, canalAceptacion: 'FORMULARIO_ANTERIOR',
    });
    expect(acceptedPrivacyPolicy({ terminosAceptados: true, politicaTratamientoHuella: rundPrivacyPolicy().huella }))
      .toMatchObject({ huellaVerificada: true, canalAceptacion: 'AVISO_VERSIONADO' });
  });

  it('no acepta un formulario anterior cuando ya se configuró la política institucional', () => {
    process.env.RUND_PRIVACY_POLICY_FILE = 'fixture.json';
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ version: 'v2', texto: 'texto aprobado', aprobacion: 'acta prueba', url: 'https://example.test/politica' }));
    expect(() => acceptedPrivacyPolicy({ terminosAceptados: true })).toThrow('cambió');
  });
  it('valida política institucional y rechaza enlaces inseguros', () => {
    process.env.RUND_PRIVACY_POLICY_FILE = 'fixture.json';
    const read = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ version: 'v2', texto: 'texto aprobado', aprobacion: 'acta prueba', url: 'https://example.test/politica' }));
    expect(rundPrivacyPolicy()).toMatchObject({ configurada: true, version: 'v2' });
    read.mockReturnValue('{"version":"v3","texto":"texto","aprobacion":"acta","url":"javascript:alert(1)"}');
    expect(rundPrivacyPolicy).toThrow('mal configurada');
  });
});
