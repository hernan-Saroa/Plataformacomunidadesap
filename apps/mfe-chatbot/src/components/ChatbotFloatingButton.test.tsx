import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ChatbotFloatingButton } from '../../../shell/src/components/esap/ChatbotFloatingButton';

vi.mock('chatbot/Module', () => ({ default: ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const [draft, setDraft] = useState('');
  return <input aria-label="Mensaje pendiente" data-api-base={apiBaseUrl} value={draft} onChange={(event) => setDraft(event.target.value)} />;
} }));
afterEach(cleanup);

it('carga al abrir y conserva el borrador al minimizar y reabrir el widget', async () => {
  render(<ChatbotFloatingButton isActive userId="alice" />);
  expect(screen.queryByRole('textbox', { name: 'Mensaje pendiente' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Asistente ESAP' }));
  const input = await screen.findByRole('textbox', { name: 'Mensaje pendiente' }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Consulta pendiente sin confirmar' } });
  fireEvent.click(screen.getByTitle('Minimizar chat'));
  expect(screen.queryByRole('textbox', { name: 'Mensaje pendiente' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Asistente ESAP' }));
  expect((screen.getByRole('textbox', { name: 'Mensaje pendiente' }) as HTMLInputElement).value).toBe('Consulta pendiente sin confirmar');
});

it('entrega al remoto el mismo gateway configurado por el contenedor', async () => {
  render(<ChatbotFloatingButton isActive userId="alice" apiBaseUrl="https://qa.example/services" />);
  fireEvent.click(screen.getByRole('button', { name: 'Asistente ESAP' }));
  expect((await screen.findByRole('textbox', { name: 'Mensaje pendiente' })).getAttribute('data-api-base')).toBe('https://qa.example/services');
});

it('declara el diálogo, enfoca el panel y devuelve el foco al minimizar con Escape', async () => {
  render(<ChatbotFloatingButton isActive />);
  const launcher = screen.getByRole('button', { name: 'Asistente ESAP' });
  expect(launcher.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(launcher);
  const dialog = screen.getByRole('dialog', { name: 'ChatBot Institucional' });
  expect(launcher.getAttribute('aria-expanded')).toBe('true');
  expect(launcher.getAttribute('aria-controls')).toBe(dialog.id);
  expect(dialog.getAttribute('aria-modal')).toBe('false');
  expect(document.activeElement).toBe(dialog);
  const input = await screen.findByRole('textbox', { name: 'Mensaje pendiente' });
  input.focus();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(launcher);
  expect(launcher.getAttribute('aria-expanded')).toBe('false');
});

it('amplía y restaura el mismo panel conservando el borrador', async () => {
  render(<ChatbotFloatingButton isActive />);
  fireEvent.click(screen.getByRole('button', { name: 'Asistente ESAP' }));
  const input = await screen.findByRole('textbox', { name: 'Mensaje pendiente' });
  fireEvent.change(input, { target: { value: 'Conservar al ampliar' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ampliar chat' }));
  expect(screen.getByRole('button', { name: 'Restaurar tamaño del chat' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('textbox')).toBe(input);
  expect((input as HTMLInputElement).value).toBe('Conservar al ampliar');
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar tamaño del chat' }));
  expect(screen.getByRole('button', { name: 'Ampliar chat' }).getAttribute('aria-pressed')).toBe('false');
});

it('adapta el panel al viewport visual y retira los listeners al minimizar', () => {
  const viewport = Object.assign(new EventTarget(), { width: 390, height: 700, offsetLeft: 0, offsetTop: 0 });
  const remove = vi.spyOn(viewport, 'removeEventListener');
  const previous = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  try {
    render(<ChatbotFloatingButton isActive />);
    fireEvent.click(screen.getByRole('button', { name: 'Asistente ESAP' }));
    const root = screen.getByRole('dialog').parentElement!;
    expect(root.style.getPropertyValue('--chatbot-viewport-height')).toBe('700px');
    act(() => { viewport.height = 300; viewport.offsetTop = 25; viewport.dispatchEvent(new Event('resize')); });
    expect(root.style.getPropertyValue('--chatbot-viewport-height')).toBe('300px');
    expect(root.style.getPropertyValue('--chatbot-viewport-top')).toBe('25px');
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar chat' }));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  } finally {
    if (previous) Object.defineProperty(window, 'visualViewport', previous);
    else Reflect.deleteProperty(window, 'visualViewport');
  }
});

it('no intercepta Escape de la página cuando el panel está minimizado', async () => {
  const escape = vi.fn();
  render(<div onKeyDown={escape}><input aria-label="Formulario principal" /><ChatbotFloatingButton isActive /></div>);
  const formInput = screen.getByRole('textbox', { name: 'Formulario principal' });
  formInput.focus();
  fireEvent.keyDown(formInput, { key: 'Escape' });
  expect(escape).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(formInput);
});
