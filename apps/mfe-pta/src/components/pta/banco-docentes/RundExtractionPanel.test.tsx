import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RundExtractionPanel } from './RundExtractionPanel';
import { apiClient } from '../../../../../shell/src/services/api';
import { getAppOnlineStatus } from '../../../../../shell/src/utils/connectivity';
vi.mock('../../../../../shell/src/services/api',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
vi.mock('../../../../../shell/src/utils/connectivity',()=>({getAppOnlineStatus:vi.fn()}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
const suggestion={id:'s-1',campo:'pregrado',label:'Pregrado',valor:'Administración Pública',valor_previo:'',pagina:1,evidencia:'Título: Administración Pública',estado:'PENDIENTE',baja_confianza:true};
const data={enabled:true,documents:[],jobs:[{id:'j-1',documento_id:'d-1',nombre_archivo:'diploma.pdf',version:1,estado:'COMPLETADO',documento_estado:'ACTIVO',sugerencias:[suggestion]}]};
const props={docenteId:'doc-1',revision:0,onUse:vi.fn(),onView:vi.fn()};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(getAppOnlineStatus).mockReturnValue(true);vi.mocked(apiClient.get).mockResolvedValue(data);});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('revisión humana de OCR',()=>{
  it('distingue sugerencia de dato confirmado y abrir edición no escribe el perfil',async()=>{
    render(<RundExtractionPanel {...props}/>);
    expect(await screen.findByText(/Baja confianza · Sugerido/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Revisar y aplicar'}));
    expect(props.onUse).toHaveBeenCalledWith(suggestion);
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('ofrece el PDF exacto de la versión de origen',async()=>{
    render(<RundExtractionPanel {...props}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Ver PDF de origen'}));
    expect(props.onView).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/doc-1/documentos/d-1/contenido','diploma.pdf','Pregrado');
  });
  it('descarta con motivo, bloquea duplicados y vuelve a consultar',async()=>{
    let resolve!:(value:any)=>void;
    vi.mocked(apiClient.post).mockImplementation(()=>new Promise(done=>{resolve=done;}));
    render(<RundExtractionPanel {...props}/>);
    const input=await screen.findByLabelText('Motivo de descarte de Pregrado');
    expect((screen.getByText('Descartar') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input,{target:{value:'Título incorrecto'}});
    fireEvent.click(screen.getByText('Descartar'));fireEvent.click(screen.getByText('Descartar'));
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    await act(async()=>resolve({success:true,data:{discarded:true}}));
    await waitFor(()=>expect(apiClient.get).toHaveBeenCalledTimes(2));
  });
  it('no permite aplicar una sugerencia cuyo PDF fue reemplazado',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],documento_estado:'REEMPLAZADO'}]});
    render(<RundExtractionPanel {...props}/>);await screen.findByText(/diploma.pdf/);
    expect(screen.queryByText('Revisar y aplicar')).toBeNull();
  });
  it('muestra claramente el dato confirmado por el operador',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],sugerencias:[{...suggestion,estado:'CORREGIDA',valor_confirmado:'Título corregido'}]}]});
    render(<RundExtractionPanel {...props}/>);
    expect(await screen.findByText('Corregido y confirmado por una persona')).toBeTruthy();
    expect(screen.getByText('Título corregido')).toBeTruthy();
    expect(screen.queryByText('Revisar y aplicar')).toBeNull();
  });
  it('el módulo desactivado no agrega controles al expediente',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({enabled:false,jobs:[],documents:[]});
    const {container}=render(<RundExtractionPanel {...props}/>);
    await waitFor(()=>expect(container.innerHTML).toBe(''));
  });
  it('conserva el motivo escrito cuando se refrescan las sugerencias',async()=>{
    const view=render(<RundExtractionPanel {...props}/>);
    const input=await screen.findByLabelText('Motivo de descarte de Pregrado');
    fireEvent.change(input,{target:{value:'Revisando diploma'}});
    view.rerender(<RundExtractionPanel {...props} revision={1}/>);
    await waitFor(()=>expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText('Motivo de descarte de Pregrado') as HTMLInputElement).value).toBe('Revisando diploma');
  });
  it('recupera la etapa persistida al volver al expediente y no cancela el trabajo al salir',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],estado:'PROCESANDO',etapa:'MODELO',iniciado_en:new Date(Date.now()-125000).toISOString(),sugerencias:[]}]});
    const view=render(<RundExtractionPanel {...props}/>);
    const progress=await screen.findByRole('progressbar');
    expect(progress.getAttribute('aria-valuetext')).toBe('Extraer datos');
    expect(screen.getByText(/Puedes cambiar de módulo o cerrar sesión/)).toBeTruthy();
    view.unmount();expect(apiClient.post).not.toHaveBeenCalled();
    render(<RundExtractionPanel {...props}/>);
    expect((await screen.findByRole('progressbar')).getAttribute('aria-valuetext')).toBe('Extraer datos');
  });
  it('distingue la espera de reintento del procesamiento activo',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],estado:'PENDIENTE',etapa:'REINTENTO',intentos:1,sugerencias:[]}]});
    render(<RundExtractionPanel {...props}/>);
    expect((await screen.findByRole('progressbar')).getAttribute('aria-valuetext')).toBe('Esperando reintento automático');
  });
});
