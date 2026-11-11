import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RolesAdministrationModulePremium } from './RolesAdministrationModulePremium';
import { localRolesService } from '../../services/api';

vi.mock('../../services/api',()=>({localRolesService:{getRoles:vi.fn(),getStats:vi.fn(),updateRole:vi.fn()}}));
vi.mock('../../hooks',()=>({useAuth:()=>({isSuperUser:true,userRole:'SUPER_ADMIN',hasRole:(role:string)=>role==='SUPER_ADMIN'})}));
vi.mock('./CreateRoleModal',()=>({CreateRoleModal:()=>null}));
vi.mock('./RolePermissionsEditor',()=>({RolePermissionsEditor:()=>null}));
vi.mock('./ScopeConfigModal',()=>({ScopeConfigModal:()=>null}));
vi.mock('./ConfirmationModal',()=>({useConfirmation:()=>({confirm:vi.fn(),ConfirmationDialog:()=>null})}));
vi.mock('@esap-mfe/shared-ui/dropdown-menu',()=>({DropdownMenu:({children}:any)=><div>{children}</div>,DropdownMenuContent:({children}:any)=><div>{children}</div>,DropdownMenuTrigger:({children}:any)=>children,DropdownMenuItem:({children,onClick}:any)=><button onClick={onClick}>{children}</button>,DropdownMenuSeparator:()=>null}));
vi.mock('motion/react',async()=>{
  const React=await import('react');
  return {motion:new Proxy({}, {get:(_,tag:string)=>React.forwardRef(({children,initial,animate,exit,transition,layout,whileHover,whileTap,...props}:any,ref:any)=>React.createElement(tag,{...props,ref},children))}),AnimatePresence:({children}:any)=>children};
});
let stored:any;
beforeEach(()=>{
  vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
  vi.clearAllMocks();stored={id:'role-1',code:'APROBADOR_VERIFICACION_TITULOS',name:'Aprobador Verificación Títulos',description:'Emite preconceptos y observaciones.',type:'personalizado',sistema_destino:'Backoffice',color:'#003DA5',icon:'Shield',is_active:true,usuarios_count:1,permisos_count:8};
  vi.mocked(localRolesService.getRoles).mockImplementation(async()=>({roles:[stored],total:1}));
  vi.mocked(localRolesService.getStats).mockResolvedValue({total_roles:1,roles_sistema:0,usuarios_asignados:1,permisos_disponibles:8});
  vi.mocked(localRolesService.updateRole).mockImplementation(async(_id,body)=>{stored={...stored,...body};return stored;});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('El nombre visible del rol respeta el texto guardado',()=>{
  it.each(['Aprobador Verificacion Titulos','aprobador VERIFICACIÓN TÍTULOS','Secretaria Academica - Equipo 2'])('muestra literalmente el nombre %s al consultar Roles',async name=>{
    stored.name=name;
    render(<RolesAdministrationModulePremium/>);
    expect((await screen.findAllByText(name)).length).toBeGreaterThan(0);
  });
  it('editar sin tildes conserva el nombre al guardar y abrir de nuevo, sin cambiar código ni permisos',async()=>{
    render(<RolesAdministrationModulePremium/>);
    await screen.findAllByText(stored.name);
    fireEvent.click(screen.getAllByRole('button',{name:'Editar Rol',exact:true})[0]);
    const input=await screen.findByDisplayValue(stored.name);
    fireEvent.change(input,{target:{value:'Aprobador Verificacion Titulos'}});
    fireEvent.click(screen.getByRole('button',{name:'Guardar Cambios'}));
    await waitFor(()=>expect(localRolesService.updateRole).toHaveBeenCalledWith('role-1',expect.objectContaining({name:'Aprobador Verificacion Titulos'})));
    await waitFor(()=>expect(screen.queryByRole('button',{name:'Guardar Cambios'})).toBeNull());
    await waitFor(()=>expect(screen.queryByText('Aprobador Verificación Títulos')).toBeNull());
    expect(stored.code).toBe('APROBADOR_VERIFICACION_TITULOS');expect(stored.permisos_count).toBe(8);
    fireEvent.click(screen.getAllByRole('button',{name:'Editar Rol',exact:true})[0]);
    expect(await screen.findByDisplayValue('Aprobador Verificacion Titulos')).toBeTruthy();
  });
});
