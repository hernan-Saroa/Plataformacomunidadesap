import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ChatMessageText } from './ChatMessageText';
afterEach(cleanup);
it('presenta énfasis sin interpretar HTML ni enlaces del contenido', () => {
  const { container } = render(<ChatMessageText text={'Consulta **Viáticos** <script>alert(1)</script> [link](javascript:alert(1))'} />);
  expect(container.querySelector('strong')?.textContent).toBe('Viáticos');
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('a')).toBeNull();
  expect(container.textContent).toContain('<script>alert(1)</script>');
});
it.each(['**', '****', '**sin cierre', '**dos\nlíneas**'])('conserva el texto sin delimitadores válidos: %s', (text) => {
  const { container } = render(<ChatMessageText text={text} />);
  expect(container.textContent).toBe(text);
  expect(container.querySelector('strong')).toBeNull();
});

it('permite abrir fuentes HTTPS sin interpretar HTML ni esquemas de script', () => {
  const { container } = render(<ChatMessageText text={'Fuente: https://example.invalid/documento.pdf. <img src=x> javascript:alert(1)'} />);
  const link = container.querySelector('a');
  expect(link?.getAttribute('href')).toBe('https://example.invalid/documento.pdf');
  expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  expect(container.querySelector('img')).toBeNull();
});

it('no activa enlaces con credenciales', () => {
  const { container } = render(<ChatMessageText text={'https://usuario:clave@example.invalid/documento'} />);
  expect(container.querySelector('a')).toBeNull();
});

it('abre el servicio laboral con un enlace relativo válido en cualquier ambiente', () => {
  const { container } = render(<ChatMessageText text={'[Solicitar certificado laboral](/solicitar-certificado-laboral)'} />);
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/solicitar-certificado-laboral');
  expect(container.textContent).toBe('Solicitar certificado laboral');
});
