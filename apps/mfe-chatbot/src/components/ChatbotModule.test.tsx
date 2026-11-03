import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChatbotModule } from './ChatbotModule';
import { getTransientChat } from '../state/transientChat';

let fetchMock: ReturnType<typeof vi.fn>;
const component = (props = {}) => <ChatbotModule apiBaseUrl="/services" {...props} />;
const input = () => screen.getByRole('textbox', { name: 'Mensaje para el asistente' }) as HTMLInputElement;
function send(text = 'Mi pregunta') { fireEvent.change(input(), { target: { value: text } });fireEvent.click(screen.getByRole('button', { name: 'Enviar' })); }
beforeEach(() => {
  getTransientChat('/services').reset();getTransientChat('/other').reset();
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ respuesta: 'Respuesta del servicio' }) });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup();vi.unstubAllGlobals();vi.restoreAllMocks(); });

it.each(['authenticated', 'public'] as const)('abre en modo %s sin pedir historial, permisos ni autenticación', async mode => {
  render(component({mode,userId:'alice',initialConversationId:'old-conversation',onLogin:vi.fn()}));
  expect(screen.getByText('¿En qué puedo orientarte hoy?')).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Historial'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Iniciar sesión'})).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
  send();
  await screen.findByText(/Respuesta del servicio/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/public\/consultas$/);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({credentials:'omit',cache:'no-store',body:JSON.stringify({contenido:'Mi pregunta'})});
});

it('conserva la conversación y el borrador al iniciar sesión, cambiar de cuenta y cambiar de vista', async () => {
  const view=render(component({mode:'public',isWidget:true}));
  send();await screen.findByText(/Respuesta del servicio/);
  fireEvent.change(input(),{target:{value:'Borrador conservado'}});
  for(const props of [{mode:'authenticated',userId:'alice'},{mode:'authenticated',userId:'bob',isWidget:false},{mode:'public',isWidget:true}]){
    view.rerender(component(props));
    expect(input().value).toBe('Borrador conservado');
    expect(screen.getByText(/Respuesta del servicio/)).toBeTruthy();
  }
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('comparte mensajes y borrador entre el módulo completo y el widget', async () => {
  render(<><div data-testid="widget">{component({isWidget:true})}</div><div data-testid="full">{component()}</div></>);
  const widget=within(screen.getByTestId('widget')),full=within(screen.getByTestId('full'));
  const widgetInput=widget.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(widgetInput,{target:{value:'Consulta compartida'}});
  expect((full.getByRole('textbox') as HTMLInputElement).value).toBe('Consulta compartida');
  fireEvent.click(widget.getByRole('button',{name:'Enviar'}));
  await full.findByText(/Respuesta del servicio/);
  expect(widget.getByText(/Respuesta del servicio/)).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('conserva mensajes en memoria al desmontar una vista y abrir otra', async () => {
  const view=render(component());send();await screen.findByText(/Respuesta del servicio/);
  fireEvent.change(input(),{target:{value:'Pendiente'}});
  view.unmount();render(component({isWidget:true,userId:'alice'}));
  expect(screen.getByText(/Respuesta del servicio/)).toBeTruthy();expect(input().value).toBe('Pendiente');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('completa una consulta mientras la vista está cerrada y recupera el resultado al volver', async () => {
  let finish!:(value:unknown)=>void;
  fetchMock.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  const view=render(component());send();view.unmount();
  await act(async()=>finish({ok:true,json:async()=>({respuesta:'Resultado al volver'})}));
  render(component());expect(screen.getByText(/Resultado al volver/)).toBeTruthy();
});

it('una nueva carga del módulo en otro documento comienza sin mensajes ni borrador', async () => {
  const session=getTransientChat('/services');session.setDraft('Pregunta anterior');await session.send();
  vi.resetModules();
  const fresh=await import('../state/transientChat');
  expect(fresh.getTransientChat('/services').getSnapshot()).toMatchObject({messages:[],draft:'',busy:false,error:''});
});

it('no guarda la conversación en localStorage o sessionStorage', async () => {
  const storage=vi.spyOn(Storage.prototype,'setItem');
  render(component());send();await screen.findByText(/Respuesta del servicio/);
  expect(storage).not.toHaveBeenCalled();
});

it('nueva conversación limpia las vistas compartidas y enfoca la entrada', async () => {
  render(component());send();await screen.findByText(/Respuesta del servicio/);
  fireEvent.click(screen.getByRole('button',{name:'Nueva conversación'}));
  expect(screen.queryByText(/Respuesta del servicio/)).toBeNull();
  expect(input().value).toBe('');expect(document.activeElement).toBe(input());
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('las sugerencias llenan el campo y no envían consultas automáticamente', () => {
  render(component({isWidget:true}));
  fireEvent.click(screen.getByRole('button',{name:/^Viáticos/}));
  expect(input().value).toContain('legalizo viáticos');expect(document.activeElement).toBe(input());
  expect(fetchMock).not.toHaveBeenCalled();
});

it('un fallo conserva el borrador sin añadir una respuesta ni reintentar automáticamente', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline'));
  render(component());send('Pregunta conservada');
  await screen.findByRole('alert');expect(input().value).toBe('Pregunta conservada');
  expect(screen.queryByText(/Respuesta del servicio/)).toBeNull();expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
  await screen.findByText(/Respuesta del servicio/);expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each([401,403])('un error HTTP %s del endpoint general no pide iniciar sesión ni renueva cookies', async status => {
  fetchMock.mockResolvedValueOnce({ok:false,status});
  render(component({onLogin:vi.fn()}));send();
  expect((await screen.findByRole('alert')).textContent).toContain('no está disponible');
  expect(screen.queryByRole('button',{name:'Iniciar sesión'})).toBeNull();
  expect(screen.queryByText(/sesión ha expirado/)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('bloquea el doble envío y conserva el estado hasta que responde el servicio', async () => {
  let finish!:(value:unknown)=>void;
  fetchMock.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  render(component());send();fireEvent.submit(input().closest('form')!);
  expect(fetchMock).toHaveBeenCalledTimes(1);expect(input().disabled).toBe(true);
  await act(async()=>finish({ok:true,json:async()=>({respuesta:'Confirmada'})}));
  await waitFor(()=>expect(input().disabled).toBe(false));expect(screen.getByText(/Confirmada/)).toBeTruthy();
});

it('descarta un resultado tardío cuando se reinicia la conversación', async () => {
  let finish!:(value:unknown)=>void;
  fetchMock.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  render(component());send();
  act(()=>getTransientChat('/services').reset());
  await act(async()=>finish({ok:true,json:async()=>({respuesta:'Resultado anterior'})}));
  expect(screen.queryByText(/Resultado anterior/)).toBeNull();expect(input().value).toBe('');
});

it('un gateway diferente no muestra respuestas ni borradores del anterior', async () => {
  const view=render(component());send();await screen.findByText(/Respuesta del servicio/);
  fireEvent.change(input(),{target:{value:'Borrador anterior'}});
  view.rerender(component({apiBaseUrl:'/other'}));
  expect(screen.queryByText(/Respuesta del servicio/)).toBeNull();expect(input().value).toBe('');
});

it('no envía texto vacío y limita la consulta a dos mil caracteres', () => {
  render(component());fireEvent.change(input(),{target:{value:'   '}});
  expect((screen.getByRole('button',{name:'Enviar'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(input(),{target:{value:'x'.repeat(2100)}});
  expect(input().value).toHaveLength(2000);expect(input().maxLength).toBe(2000);
});
