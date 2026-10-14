import { expect, it } from 'vitest';
import { rundAutogestionLink, RUND_PUBLIC_AUTOGESTION_PATH } from './rundPublicLinks';

it('abre el formulario nuevo en la URL pública configurada del shell', () => {
  expect(rundAutogestionLink(undefined, 'https://comunidad.example/')).toBe('https://comunidad.example' + RUND_PUBLIC_AUTOGESTION_PATH);
});
it('codifica el token de invitación sin introducir otro parámetro o perder la base pública', () => {
  expect(rundAutogestionLink('token&otro=valor', 'https://comunidad.example')).toBe('https://comunidad.example/rund/autogestion/docentes?token=token%26otro%3Dvalor');
});
