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
