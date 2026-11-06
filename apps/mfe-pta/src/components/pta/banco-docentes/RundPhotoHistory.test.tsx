import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RundPhotoHistory, type RundProfilePhoto } from './RundPhotoHistory';
import { RundPhotoPanel } from './RundPhotoPanel';
import { apiClient } from '../../../../../shell/src/services/api';

vi.mock('../../../../../shell/src/services/api',()=>({apiClient:{get:vi.fn(),post:vi.fn(),upload:vi.fn()}}));
const base='/pta/api/v1/pta/fotos-perfil/docentes/teacher';
const photo:RundProfilePhoto={id:'version',nombre:'foto-aprobada.png',estado:'APROBADA',origen:'RUND',creado_en:'2026-10-28T12:00:00Z',revisado_en:'2026-10-28T13:00:00Z',creado_por:'author',revisado_por:'reviewer',creadoPorNombre:'Gestora del Grupo',revisadoPorNombre:'Revisora Académica',ancho:600,alto:600,observacion:'Foto conforme'};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(apiClient.get).mockResolvedValue({url:'data:image/png;base64,AAAA'});});
afterEach(cleanup);
describe('Historial visual de fotos y responsables',()=>{
  it('muestra miniatura, origen, autor y aprobación con fechas y observación',async()=>{
    render(<RundPhotoHistory base={base} photos={[photo]}/>);
    expect(await screen.findByAltText('Miniatura de foto-aprobada.png')).toBeTruthy();
    expect(screen.getByText('Módulo RUND')).toBeTruthy();expect(screen.getByText('Gestora del Grupo')).toBeTruthy();
    expect(screen.getByText('Aprobada por')).toBeTruthy();expect(screen.getByText('Revisora Académica')).toBeTruthy();
    expect(screen.getByText(/Foto conforme/)).toBeTruthy();
    expect(screen.getByText('Fecha de carga')).toBeTruthy();expect(screen.getByText('Fecha de revisión')).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledWith(`${base}/versiones/version`,undefined,expect.objectContaining({cache:'no-store',skipErrorToast:true}));
    fireEvent.click(screen.getByRole('button',{name:'Ver foto foto-aprobada.png'}));
    const dialog=await screen.findByRole('dialog');
    expect(within(dialog).getByAltText('Foto histórica: foto-aprobada.png')).toBeTruthy();
    expect(within(dialog).queryByRole('button',{name:/Aprobar/})).toBeNull();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('distingue portal del docente, carga masiva, rechazo y reemplazo sin revisión',async()=>{
    render(<RundPhotoHistory base={base} photos={[
      {...photo,id:'rejected',estado:'RECHAZADA',origen:'PTA'},
      {...photo,id:'replaced',estado:'REEMPLAZADA',origen:'MASIVA',revisado_por:null,revisado_en:null,revisadoPorNombre:null},
      {...photo,id:'archived',estado:'ARCHIVADA'},
    ]}/>);
    await screen.findAllByRole('img');
    expect(screen.getByText('Portal del docente (PTA)')).toBeTruthy();expect(screen.getByText('Carga masiva RUND')).toBeTruthy();
    expect(screen.getByText('Rechazada por')).toBeTruthy();expect(screen.getByText('Aprobada anteriormente')).toBeTruthy();
    expect(screen.getByText('Reemplazada antes de su validación')).toBeTruthy();
  });
  it('carga imágenes solo al abrir el historial y conserva el endpoint de propietario',async()=>{
    vi.mocked(apiClient.get).mockImplementation(async(url:string)=>url.endsWith('/mia') ? {personaId:'person',publicada:photo,solicitud:photo,historial:[photo]} : url.endsWith('/publicada') ? {url:null} : {url:'data:image/png;base64,AAAA'});
    render(<RundPhotoPanel own name="Docente"/>);
    const summary=await screen.findByText('Historial de fotos (1)');
    expect(vi.mocked(apiClient.get).mock.calls.some(([url])=>url.includes('/versiones/'))).toBe(false);
    const details=summary.closest('details')!;details.open=true;fireEvent(details,new Event('toggle'));
    await screen.findByAltText('Miniatura de foto-aprobada.png');
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/pta/fotos-perfil/mia/versiones/version',undefined,expect.anything());
    details.open=false;fireEvent(details,new Event('toggle'));
    expect(screen.queryByAltText('Miniatura de foto-aprobada.png')).toBeNull();
  });
  it('pide solo las seis fotos de la página visible y permite consultar las siguientes',async()=>{
    const photos=Array.from({length:7},(_,index)=>({...photo,id:`photo-${index}`,nombre:`foto-${index}.png`}));
    render(<RundPhotoHistory base={base} photos={photos}/>);
    await screen.findByAltText('Miniatura de foto-0.png');
    expect(apiClient.get).toHaveBeenCalledTimes(6);expect(screen.queryByText('foto-6.png')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Más fotos'}));
    await screen.findByAltText('Miniatura de foto-6.png');
    expect(apiClient.get).toHaveBeenCalledTimes(7);expect(screen.queryByText('foto-0.png')).toBeNull();
  });
  it('mantiene la trazabilidad si la imagen no está disponible y permite reintentar',async()=>{
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Forbidden')).mockResolvedValue({url:'data:image/png;base64,AAAA'});
    render(<RundPhotoHistory base={base} photos={[photo]}/>);
    await screen.findByText('Vista previa no disponible');expect(screen.getByText('Revisora Académica')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Reintentar vista previa de foto-aprobada.png'}));
    await screen.findByAltText('Miniatura de foto-aprobada.png');
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('no presenta referencias de auditoría como nombres cuando el directorio no los resuelve',async()=>{
    render(<RundPhotoHistory base={base} photos={[{...photo,creadoPorNombre:undefined,revisadoPorNombre:null}]}/>);
    await screen.findByAltText('Miniatura de foto-aprobada.png');
    expect(screen.getAllByText('Usuario no disponible')).toHaveLength(2);
    expect(screen.queryByText('author')).toBeNull();expect(screen.queryByText('reviewer')).toBeNull();
  });
});
