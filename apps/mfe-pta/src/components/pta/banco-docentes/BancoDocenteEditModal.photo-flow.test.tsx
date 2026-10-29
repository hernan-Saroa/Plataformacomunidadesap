import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';
import { createBancoDocente, updateBancoDocente } from '../../../services/api/ptaApi';
import { apiClient } from '../../../../../shell/src/services/api';
import { validatePhotoFile } from '../../../../../shared/profile-photos';

const auth=vi.hoisted(()=>({canUpload:true}));
vi.mock('../../../contexts/AuthContext',()=>({useAuth:()=>({isSuperUser:false,userPersonId:'SYNTHETIC_OPERATOR',hasAnyPermission:(codes:string[])=>auth.canUpload && codes.includes('banco-docentes.rund.photos.manage')})}));
vi.mock('../../../services/api/ptaApi',()=>({createBancoDocente:vi.fn(),updateBancoDocente:vi.fn(),vincularRundSoporte:vi.fn()}));
vi.mock('../../../../../shell/src/services/api',()=>({apiClient:{upload:vi.fn()}}));
vi.mock('../../../../../shared/profile-photos',()=>({PHOTO_ACCEPT:'image/png,image/jpeg',PHOTO_API:'/pta/api/v1/pta/fotos-perfil',PHOTO_HELP:'PNG o JPEG, máximo 2 MB.',PHOTO_MANAGE:'banco-docentes.rund.photos.manage',photoChanged:vi.fn(),validatePhotoFile:vi.fn()}));
vi.mock('./RundPhotoPanel',()=>({RundPhotoPanel:({docenteId}:any)=><div data-testid="photo-retry" data-docente={docenteId}>Panel de foto del docente registrado</div>}));

beforeEach(()=>{
  vi.clearAllMocks();auth.canUpload=true;
  vi.mocked(createBancoDocente).mockResolvedValue({success:true,data:{docenteId:'CREATED_TEACHER',personaId:'CREATED_PERSON'}});
  vi.mocked(apiClient.upload).mockResolvedValue({solicitud:{estado:'PENDIENTE'}});
  vi.mocked(validatePhotoFile).mockResolvedValue(undefined);
});
afterEach(cleanup);

// Exercise the real form validators and controls; only network and image decoding
// are simulated. No existing account, profile or document is written.
function changeField(name:string,value?:string) {
  const label=[...document.querySelectorAll('label')].find(node=>node.textContent?.trim().startsWith(name));
  if(!label) throw new Error(`Missing field: ${name}`);
  const control=label.parentElement?.querySelector<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea');
  if(!control) throw new Error(`Missing control: ${name}`);
  const next=value ?? [...(control as HTMLSelectElement).options].find(option=>option.value && option.value.toLowerCase()!=='visitante')?.value;
  fireEvent.change(control,{target:{value:next}});
}
function completeRegistration() {
  changeField('Documento de Identidad','123456789');changeField('Nombre Completo','DOCENTE SINTETICO');
  changeField('Territorial');changeField('Categoría / Escalafón');changeField('Acto Administrativo','Acto de prueba');changeField('Inicio Vinculación','2026-01-01');
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}));
  changeField('Nivel de Formación');changeField('Núcleo Temático','Administración pública');changeField('Perfil Académico','Perfil sintético para validación');changeField('Pregrado','Administración pública');
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}));
  changeField('Correo Institucional','synthetic.photo@esap.edu.co');
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}));
  changeField('Género','Masculino');changeField('Fecha de Nacimiento','1985-01-01');
}
async function selectPhoto() {
  fireEvent.change(screen.getByLabelText('Foto de perfil del nuevo docente'),{target:{files:[new File(['synthetic'],'synthetic.png',{type:'image/png'})]}});
  await screen.findByText('synthetic.png');
}
describe('Registro del docente y su foto sin alterar el flujo existente',()=>{
  it('permite registrar sin foto y conserva los datos obligatorios y el periodo',async()=>{
    const onSaved=vi.fn();render(<BancoDocenteEditModal docente={null} periodoSeleccionado="2026-2" onClose={vi.fn()} onSaved={onSaved}/>);
    completeRegistration();fireEvent.click(screen.getByRole('button',{name:'Guardar Docente'}));
    await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createBancoDocente).toHaveBeenCalledWith(expect.objectContaining({documentNumber:'123456789',nombreCompleto:'DOCENTE SINTETICO',periodoCarga:'2026-2',correoInstitucional:'synthetic.photo@esap.edu.co'}));
    expect(apiClient.upload).not.toHaveBeenCalled();expect(updateBancoDocente).not.toHaveBeenCalled();
  });
  it('carga la foto después de crear el docente usando el identificador confirmado',async()=>{
    const onSaved=vi.fn();render(<BancoDocenteEditModal docente={null} periodoSeleccionado="2026-2" onClose={vi.fn()} onSaved={onSaved}/>);
    await selectPhoto();completeRegistration();fireEvent.click(screen.getByRole('button',{name:'Guardar Docente'}));
    await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createBancoDocente).toHaveBeenCalledTimes(1);
    expect(apiClient.upload).toHaveBeenCalledWith('/pta/api/v1/pta/fotos-perfil/docentes/CREATED_TEACHER',expect.any(FormData));
    expect(vi.mocked(createBancoDocente).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(apiClient.upload).mock.invocationCallOrder[0]);
  });
  it('si falla la foto, conserva el registro creado y ofrece continuar sin duplicarlo',async()=>{
    vi.mocked(apiClient.upload).mockRejectedValueOnce(new Error('Carga interrumpida'));
    const onSaved=vi.fn();render(<BancoDocenteEditModal docente={null} periodoSeleccionado="2026-2" onClose={vi.fn()} onSaved={onSaved}/>);
    await selectPhoto();completeRegistration();fireEvent.click(screen.getByRole('button',{name:'Guardar Docente'}));
    await screen.findByText(/El docente se guardó correctamente/);
    expect(screen.getByTestId('photo-retry').getAttribute('data-docente')).toBe('CREATED_TEACHER');
    expect(screen.queryByRole('button',{name:'Guardar Docente'})).toBeNull();
    expect(createBancoDocente).toHaveBeenCalledTimes(1);expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Finalizar registro'}));
    expect(onSaved).toHaveBeenCalledTimes(1);expect(createBancoDocente).toHaveBeenCalledTimes(1);
  });
  it('sin permiso de fotos mantiene disponible el registro y oculta el cargador',async()=>{
    auth.canUpload=false;const onSaved=vi.fn();
    render(<BancoDocenteEditModal docente={null} periodoSeleccionado="2026-2" onClose={vi.fn()} onSaved={onSaved}/>);
    expect(screen.queryByLabelText('Foto de perfil del nuevo docente')).toBeNull();
    completeRegistration();fireEvent.click(screen.getByRole('button',{name:'Guardar Docente'}));
    await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1));expect(apiClient.upload).not.toHaveBeenCalled();
  });
  it('un error al crear el docente no carga una foto huérfana ni confirma el registro',async()=>{
    vi.mocked(createBancoDocente).mockResolvedValueOnce({success:false,data:null,message:'Registro rechazado'});
    const onSaved=vi.fn();render(<BancoDocenteEditModal docente={null} periodoSeleccionado="2026-2" onClose={vi.fn()} onSaved={onSaved}/>);
    await selectPhoto();completeRegistration();fireEvent.click(screen.getByRole('button',{name:'Guardar Docente'}));
    await screen.findByText('Registro rechazado');expect(apiClient.upload).not.toHaveBeenCalled();expect(onSaved).not.toHaveBeenCalled();
  });
});
