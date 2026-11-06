import React from 'react';
import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { GraduatesManagementModule } from './GraduatesManagementModule';
import graduadosService from '../../services/api/graduados.service';
import estructuraService from '../../services/estructuraService';

let grants:Set<string>;
vi.mock('../../services/api/authService',()=>({authService:{hasPermission:(permission:string)=>grants.has(permission),getCurrentUser:()=>({fullName:'Aprobador de prueba'})}}));
vi.mock('../../services/estructuraService',()=>({default:{obtenerEstructura:vi.fn().mockRejectedValue(new Error('Catálogo territorial no disponible'))}}));
vi.mock('../../services/api/graduados.service',()=>({default:{graduados:{listarRegistroAcademico:vi.fn().mockResolvedValue([])},programas:{listar:vi.fn().mockResolvedValue([{id:'program-1',name:'Administración Pública'}])},certificados:{listar:vi.fn().mockResolvedValue([])}}}));
vi.mock('./BulkGraduatesUploadModal',()=>({BulkGraduatesUploadModal:({open,programOptions}:any)=>open?<div role="dialog" aria-label="Carga de Graduados">{programOptions.join(', ')}</div>:null}));
vi.mock('./GraduateProgramsModal',()=>({GraduateProgramsModal:()=>null}));
vi.mock('./registro-academico/ValidarCertificadoGrado',()=>({ValidarCertificadoGrado:()=>null}));
vi.mock('@esap-mfe/shared-ui',()=>({Container4K:({children}:any)=><div>{children}</div>}));
vi.mock('motion/react',async()=>{
  const React=await import('react');const components=new Map();
  return {motion:new Proxy({}, {get:(_,tag:string)=>{if(!components.has(tag))components.set(tag,React.forwardRef(({children,initial,animate,exit,transition,layout,whileHover,whileTap,...props}:any,ref:any)=>React.createElement(tag,{...props,ref},children)));return components.get(tag);}}),AnimatePresence:({children}:any)=>children};
});
beforeEach(()=>{grants=new Set(['graduates.verify_certificate']);});
afterEach(cleanup);
describe('Permiso propio de carga masiva en Graduados',()=>{
  it('carga sus títulos aunque la consulta territorial no haya respondido',async()=>{
    grants.add('graduates.bulk_upload');
    vi.mocked(estructuraService.obtenerEstructura).mockImplementationOnce(()=>new Promise(()=>{}));
    render(<GraduatesManagementModule/>);
    fireEvent.click(screen.getByRole('button',{name:'Carga Masiva'}));
    await waitFor(()=>expect(screen.getByRole('dialog',{name:'Carga de Graduados'}).textContent).toContain('Administración Pública'));
  });
  it('un aprobador con graduates.bulk_upload puede abrir la carga sin permisos ni catálogos de PTA',async()=>{
    grants.add('graduates.bulk_upload');
    render(<GraduatesManagementModule/>);
    await waitFor(()=>expect(graduadosService.programas.listar).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button',{name:'Carga Masiva'}));
    expect(await screen.findByRole('dialog',{name:'Carga de Graduados'})).toBeTruthy();
    expect(grants.has('graduates.edit')).toBe(false);
  });
  it('ser verificador sin carga masiva no habilita el botón',()=>{
    render(<GraduatesManagementModule/>);
    expect(screen.queryByRole('button',{name:'Carga Masiva'})).toBeNull();
  });
  it('retirar el permiso oculta también una carga que estaba abierta',async()=>{
    grants.add('graduates.bulk_upload');
    const view=render(<GraduatesManagementModule/>);
    fireEvent.click(screen.getByRole('button',{name:'Carga Masiva'}));
    await screen.findByRole('dialog',{name:'Carga de Graduados'});
    grants.delete('graduates.bulk_upload');view.rerender(<GraduatesManagementModule/>);
    expect(screen.queryByRole('dialog',{name:'Carga de Graduados'})).toBeNull();
  });
});
