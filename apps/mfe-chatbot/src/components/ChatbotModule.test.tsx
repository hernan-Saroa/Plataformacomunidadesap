import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChatbotModule } from './ChatbotModule';
import { chatbotProcesses } from './chatbotProcesses';
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
  expect(screen.getByRole('heading', { name: /Hola.*asistente virtual de la ESAP/ })).toBeTruthy();
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
  fireEvent.click(screen.getByRole('button',{name:'Gestión Financiera'}));
  fireEvent.click(screen.getByRole('button',{name:/legalizo viáticos/}));
  expect(input().value).toContain('legalizo viáticos');expect(document.activeElement).toBe(input());
  expect(fetchMock).not.toHaveBeenCalled();
});

it('saluda y permite consultar las preguntas frecuentes de los 17 procesos sin llamadas al servidor', () => {
  render(component());
  expect(screen.getByRole('heading', { name: /Hola.*asistente virtual de la ESAP/ })).toBeTruthy();
  const menu = () => within(screen.getByRole('navigation', { name: 'Procesos institucionales' }));
  expect(menu().getAllByRole('button')).toHaveLength(17);
  for (const { name, questions } of chatbotProcesses) {
    fireEvent.click(menu().getByRole('button', { name }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name }));
    const suggestions = within(screen.getByRole('list', { name: 'Preguntas frecuentes' }));
    expect(suggestions.getAllByRole('button').map((button) => button.textContent)).toEqual([...questions]);
    expect(input().disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Volver al menú' }));
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

it('permite editar una FAQ antes de enviarla y volver al menú con el borrador y la conversación en memoria', async () => {
  render(component());
  fireEvent.click(screen.getByRole('button', { name: 'Gestión del Talento Humano' }));
  fireEvent.click(screen.getByRole('button', { name: '¿Cómo solicito un certificado laboral?' }));
  const question = '¿Cómo solicito un certificado laboral como exfuncionario?';
  send(question);
  await screen.findByText(/Respuesta del servicio/);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ contenido: question });
  fireEvent.change(input(), { target: { value: 'Borrador conservado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Volver al menú' }));
  expect(screen.getByRole('navigation', { name: 'Procesos institucionales' })).toBeTruthy();
  expect(input().value).toBe('Borrador conservado');
  fireEvent.click(screen.getByRole('button', { name: 'Ver conversación' }));
  expect(screen.getByText(/Respuesta del servicio/)).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Conversación' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('ampliar deja el seguimiento editable y usa el mismo envío con el contexto anterior', async () => {
  render(component());
  const question = '¿Cómo solicito un certificado laboral?';
  send(question);
  await screen.findByText(/Respuesta del servicio/);
  fireEvent.click(screen.getByRole('button', { name: 'Ampliar información' }));
  expect(input().value).toBe('Requisitos');
  expect(document.activeElement).toBe(input());
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ respuesta: 'Detalle documental de requisitos' }) });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    credentials: 'omit',
    body: JSON.stringify({ contenido: 'Requisitos', historial: [{ pregunta: question, respuesta: 'Respuesta del servicio' }] }),
  });
  await screen.findByText('Detalle documental de requisitos');
  fireEvent.click(screen.getByRole('button', { name: 'Ampliar información' }));
  expect(input().value).toBe('Soportes');
});

it('mantiene el tema al ampliar varias veces y avisa cuando el servidor repite la guía o pide el tema', async () => {
  render(component());
  const question = '¿Cómo solicito un certificado laboral?';
  send(question);
  await screen.findByText(/Respuesta del servicio/);
  const clarification = 'Puedo orientarte sobre la plataforma y los documentos de ESAP. Indícame el módulo, el trámite o el código del documento que necesitas consultar.';
  for (const [index, aspect] of ['Requisitos', 'Soportes', 'Plazos'].entries()) {
    fetchMock.mockResolvedValueOnce({ ok:true, json:async () => ({ respuesta:index === 0 ? 'Respuesta del servicio' : clarification }) });
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar información' }));
    expect(input().value).toBe(aspect);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(screen.getAllByText(/No tengo detalles adicionales/)).toHaveLength(index + 1));
    expect(JSON.parse(fetchMock.mock.calls[index + 1][1].body)).toEqual({
      contenido: aspect,
      historial: [{ pregunta: question, respuesta: 'Respuesta del servicio' }],
    });
  }
  expect(screen.getAllByText(/Respuesta del servicio/)).toHaveLength(1);
});

it('ampliar conserva un borrador escrito y respeta la edición antes del envío', async () => {
  render(component());
  send('¿Cómo solicito un certificado laboral?');
  await screen.findByText(/Respuesta del servicio/);
  const draft = '¿Qué ocurre si falla la verificación por correo?';
  fireEvent.change(input(), { target: { value: draft } });
  fireEvent.click(screen.getByRole('button', { name: 'Ampliar información' }));
  expect(input().value).toBe(draft);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).contenido).toBe(draft);
  await screen.findByText(draft);
});

it('conserva el proceso seleccionado al abrir la otra vista y lo limpia con una nueva conversación', () => {
  const view = render(component({isWidget:true}));
  fireEvent.click(screen.getByRole('button', { name: 'Transformación Digital' }));
  fireEvent.click(screen.getByRole('button', { name: /soporte tecnológico/ }));
  view.unmount();
  render(component());
  expect(screen.getByRole('heading', { name: 'Transformación Digital' })).toBeTruthy();
  expect(input().value).toContain('soporte tecnológico');
  fireEvent.click(screen.getByRole('button', { name: 'Nueva conversación' }));
  expect(screen.getByRole('navigation', { name: 'Procesos institucionales' })).toBeTruthy();
  expect(input().value).toBe('');
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
