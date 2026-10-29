import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RundPhotoInbox, RundPhotoPanel } from './RundPhotoPanel';
import { apiClient } from '../../../../../shell/src/services/api';
import { onPhotoChanged } from '../../../../../shared/profile-photos';

vi.mock('../../../../../shell/src/services/api',()=>({ apiClient: { get: vi.fn(),post: vi.fn(),upload: vi.fn() } }));
vi.mock('../../../../../shared/profile-photos',()=>({
  PHOTO_API: '/pta/api/v1/pta/fotos-perfil',PHOTO_ACCEPT: 'image/png,image/jpeg',PHOTO_HELP: 'PNG o JPEG. Máximo 2 MB. 200 a 4096 px.',
  PublishedAvatar: ({ personaId }: any)=><span data-testid="published">Foto aprobada {personaId}</span>,
  onPhotoChanged: vi.fn(()=>()=>{}),photoChanged: vi.fn(),validatePhotoFile: vi.fn(async()=>{}),
}));
const pending={ id: 'new',estado: 'PENDIENTE',nombre: 'propuesta.png',origen: 'PTA',creado_en: '2026-10-01T12:00:00Z',ancho: 600,alto: 600 };
const status={ personaId: 'person',publicada: { ...pending,id: 'approved',estado: 'APROBADA' },solicitud: pending,historial: [pending] };
beforeEach(()=>{
  vi.clearAllMocks(); vi.mocked(apiClient.get).mockImplementation(async (url: string)=>url.includes('/versiones/') ? { url: 'data:image/png;base64,AAAA' } : status);
  vi.mocked(apiClient.post).mockResolvedValue({});
});
afterEach(cleanup);
describe('Revisión de foto en Identidad',()=>{
  it('conserva la foto aprobada y separa la propuesta pendiente',async()=>{
    render(<RundPhotoPanel docenteId="docente" />);
    await screen.findByAltText('Foto propuesta para revisión');
    expect(screen.getByTestId('published').textContent).toContain('person');
    expect(screen.getAllByText('Pendiente de validación').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button',{ name: 'Aprobar foto' })).toBeNull();
    expect(screen.queryByLabelText('Seleccionar nueva foto')).toBeNull();
  });
  it('exige observación para rechazar y envía el ID de la versión revisada',async()=>{
    render(<RundPhotoPanel docenteId="docente" canValidate />);
    fireEvent.load(await screen.findByAltText('Foto propuesta para revisión'));
    const reject=screen.getByRole('button',{ name: 'Rechazar foto' }) as HTMLButtonElement;
    expect(reject.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'),{ target: { value: 'El rostro no está centrado.' } });
    fireEvent.click(reject);
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta/fotos-perfil/docentes/docente/versiones/new/decision',
      { estado: 'RECHAZADA',observacion: 'El rostro no está centrado.' },{ retries: 0 }));
    expect(await screen.findByText(/Foto rechazada/)).toBeTruthy();
  });
  it('no ofrece aprobación si no pudo mostrar la imagen',async()=>{
    vi.mocked(apiClient.get).mockImplementation(async(url: string)=>{ if (url.includes('/versiones/')) throw new Error('sin imagen'); return status; });
    render(<RundPhotoPanel docenteId="docente" canValidate />);
    await screen.findByText(/No se pudo cargar la imagen/);
    expect((screen.getByRole('button',{ name: 'Aprobar foto' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('en PTA la carga permanece pendiente y no muestra acciones del grupo',async()=>{
    vi.mocked(apiClient.upload).mockResolvedValue({});
    render(<RundPhotoPanel own name="Docente" />);
    const input=await screen.findByLabelText('Seleccionar nueva foto');
    fireEvent.change(input,{ target: { files: [new File(['test'],'nueva.png',{ type: 'image/png' })] } });
    await screen.findByText(/Foto enviada/);
    expect(apiClient.upload).toHaveBeenCalledWith('/pta/api/v1/pta/fotos-perfil/mia',expect.any(FormData));
    expect(screen.queryByRole('button',{ name: 'Aprobar foto' })).toBeNull();
    expect(screen.getByTestId('published')).toBeTruthy();
  });
  it('Actualizar reintenta una vista previa fallida sin exigir otra versión de foto',async()=>{
    let attempts=0;
    vi.mocked(apiClient.get).mockImplementation(async(url: string)=>{
      if(url.includes('/versiones/')) { if(++attempts===1) throw new Error('temporal'); return {url:'data:image/png;base64,AAAA'}; }
      return status;
    });
    render(<RundPhotoPanel docenteId="docente" canValidate />);
    await screen.findByText(/No se pudo cargar la imagen/);
    fireEvent.click(screen.getByRole('button',{name:'Actualizar foto y solicitud'}));
    fireEvent.load(await screen.findByAltText('Foto propuesta para revisión'));
    await waitFor(()=>expect((screen.getByRole('button',{name:'Aprobar foto'}) as HTMLButtonElement).disabled).toBe(false));
    expect(attempts).toBe(2);
  });
  it('una imagen ilegible puede rechazarse con motivo y nunca aprobarse',async()=>{
    render(<RundPhotoPanel docenteId="docente" canValidate />);
    fireEvent.error(await screen.findByAltText('Foto propuesta para revisión'));
    await screen.findByText(/No se pudo leer la imagen/);
    expect((screen.getByRole('button',{name:'Aprobar foto'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'El archivo de imagen está dañado.'}});
    fireEvent.click(screen.getByRole('button',{name:'Rechazar foto'}));
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({estado:'RECHAZADA'}),expect.anything()));
  });
  it('al cambiar de docente, una respuesta anterior no cambia su foto ni sus acciones',async()=>{
    let resolveOld!: (value: unknown)=>void;
    vi.mocked(apiClient.get).mockImplementation(async(url:string)=>url.endsWith('/anterior') ? new Promise(resolve=>{resolveOld=resolve;}) : {...status,personaId:'actual',solicitud:null});
    const view=render(<RundPhotoPanel docenteId="anterior" canValidate />);
    view.rerender(<RundPhotoPanel docenteId="actual" canValidate />);
    await waitFor(()=>expect(screen.getByTestId('published').textContent).toContain('actual'));
    await act(async()=>resolveOld(status));
    expect(screen.getByTestId('published').textContent).toContain('actual');
    expect(screen.queryByRole('button',{name:'Aprobar foto'})).toBeNull();
  });
  it('una respuesta atrasada no restaura solicitudes antiguas en la bandeja',async()=>{
    let resolveOld!: (value: unknown)=>void;
    const row={id:'latest',persona_id:'person',nombre_persona:'Solicitud vigente',origen:'PTA',creado_en:pending.creado_en};
    vi.mocked(apiClient.get).mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValue({items:[row],total:1});
    render(<RundPhotoInbox />);
    await act(async()=>{await vi.mocked(onPhotoChanged).mock.calls[0][0]();});
    await screen.findByText('Solicitud vigente');
    await act(async()=>resolveOld({items:[{...row,nombre_persona:'Solicitud anterior'}],total:1}));
    expect(screen.getByText('Solicitud vigente')).toBeTruthy();
    expect(screen.queryByText('Solicitud anterior')).toBeNull();
  });
});
