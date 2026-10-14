import React from 'react';
import {createRundInlineClient,defaultProfile,profileDocuments,RundProfile} from './rundInlineClient';
import {useRundInline} from './useRundInline';
import {RundInlineSelector} from '../../shared-ui/src/rund-inline-selector';

export function runRundInlineCases(k:any) {
 const {describe,it,expect,vi,afterEach,render,screen,fireEvent,waitFor,cleanup}=k;
 const person='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 const p=(id:string,propietario:'rund'|'pta'='rund',periodo_carga='2026-2'):RundProfile=>({id,clave:`${propietario}:${id}`,persona_id:person,propietario,periodo_carga,estado:'ACTIVO'});
 const catalog=(perfiles=[p('PROFILE-1')],propietario_predeterminado='rund')=>({persona_id:person,complete:true,propietario_predeterminado,perfiles});
 const receipt={id:'file-new',docenteId:'PROFILE-1',bloque:'IDENTIDAD',tipoSoporte:'documento_identidad',version:1,estado:'ACTIVO',documentoLogicoId:'logical'};
 const document={id:'rund-service:documento:file-old',rund_documento_id:'file-old',rund_perfil_id:'PROFILE-1',rund_perfil_propietario:'rund',
  servicio_propietario:'rund',tipo_soporte_rund:'documento_identidad',documento_logico_id:'logical',version_actual:1};
 const file=()=>new File(['PDF ficticio'],'Original.pdf',{type:'application/pdf'});
 afterEach(()=>{cleanup();vi.restoreAllMocks();});
 describe('contrato de perfil y cargas según propietario',()=>{
  it('el catálogo se consulta con transporte sin reintentos, no mediante tarjeta por persona',async()=>{
   const api={get:vi.fn().mockResolvedValue({success:true,data:catalog()}),post:vi.fn()};
   const value=await createRundInlineClient(api).catalog('persona:'+person);expect(defaultProfile(value)).toBe('rund:PROFILE-1');
   expect(api.get).toHaveBeenCalledWith(`/auth/api/v1/carpeta-digital/persona/${person}/perfiles-rund`,undefined,expect.objectContaining({retries:0,preserveResponse:true}));
   expect(api.post).not.toHaveBeenCalled();
  });
  it('varios periodos requieren selección y un vacío RUND no elige PTA',()=>{
   expect(defaultProfile(catalog([p('A'),p('B','rund','2027-1')]) as any)).toBe('');
   expect(defaultProfile(catalog([p('A','pta')]) as any)).toBe('');
   expect(defaultProfile(catalog([p('A'),p('A','pta')]) as any)).toBe('rund:A');
  });
  it.each([{complete:false},{success:false},{perfiles:[{...p('A'),persona_id:other}]},{perfiles:[p('A'),p('A')]},{perfiles:[p('../escape')]}])('rechaza un catálogo parcial o ajeno: %j',async(changes:any)=>{
   const api={get:vi.fn().mockResolvedValue({...catalog(),...changes}),post:vi.fn()};await expect(createRundInlineClient(api).catalog(person)).rejects.toThrow();
  });
  it.each(['rund','pta'])('crea únicamente en %s y no envía actores declarados por el navegador',async(owner:'rund'|'pta')=>{
   const api={get:vi.fn(),post:vi.fn().mockResolvedValue({success:true,data:receipt})};
   await createRundInlineClient(api).upload(p('PROFILE-1',owner),'IDENTIDAD','documento_identidad',file());
   const [path,form,options]=api.post.mock.calls[0];expect(path).toBe(`/${owner}/api/v1/pta/banco-docentes/PROFILE-1/documentos`);
   expect(form.get('categoria')).toBe('IDENTIDAD');expect(form.get('cargadoPor')).toBeNull();expect(form.get('aprobadorId')).toBeNull();expect(options.retries).toBe(0);
  });
  it('reemplaza la versión vista sin buscar automáticamente la última',async()=>{
   const api={get:vi.fn(),post:vi.fn().mockResolvedValue({...receipt,version:2})};
   await createRundInlineClient(api).upload(p('PROFILE-1'),'IDENTIDAD','documento_identidad',file(),document);
   expect(api.post.mock.calls[0][0]).toContain('/file-old/reemplazo');expect(api.get).not.toHaveBeenCalled();
  });
  it.each([{success:false},null,{...receipt,docenteId:'otro'},{...receipt,version:0}])('no confirma una carga sin recibo persistido válido: %j',async(value:any)=>{
   const api={get:vi.fn(),post:vi.fn().mockResolvedValue(value)};
   await expect(createRundInlineClient(api).upload(p('PROFILE-1'),'IDENTIDAD','documento_identidad',file())).rejects.toThrow();expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('un fallo RUND no se reenvía a PTA ni a Auth',async()=>{
   const api={get:vi.fn(),post:vi.fn().mockRejectedValue(new Error('503 ficticio'))};
   await expect(createRundInlineClient(api).upload(p('PROFILE-1'),'IDENTIDAD','documento_identidad',file())).rejects.toThrow('503');expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('rechaza reemplazar un original ajeno, restringido o una copia Auth',async()=>{
   const api={get:vi.fn(),post:vi.fn()};
   for(const change of [{rund_perfil_id:'otro'},{contenido_restringido:true},{servicio_propietario:'auth'}])
    await expect(createRundInlineClient(api).upload(p('PROFILE-1'),'IDENTIDAD','documento_identidad',file(),{...document,...change})).rejects.toThrow();
   expect(api.post).not.toHaveBeenCalled();
  });
  it('asocia requisitos por perfil y propietario sin fabricar documentos',()=>{
   const rows=[document,{...document,rund_perfil_id:'otro'},{...document,rund_perfil_propietario:'pta'},{...document,pendiente_de_guardar:true}];
   expect(profileDocuments(rows,p('PROFILE-1'))).toEqual([document]);expect(rows).toHaveLength(4);
  });
 });
 function Harness({api,person:target=person,documents=[],refresh=()=>{}}:any){
  const panel=useRundInline(api,target,documents,refresh);
  return <><RundInlineSelector panel={panel} person={target}/><button onClick={()=>void panel.upload(file(),'IDENTIDAD','documento_identidad','rund:PROFILE-1').catch(()=>{})}>Cargar requisito</button>
   <span data-testid="associated">{panel.selectedDocs.length}</span></>;
 }
 describe('selección y respuestas concurrentes',()=>{
  it('cambiar periodo impide usar un diálogo pendiente del perfil anterior',async()=>{
   const api={get:vi.fn().mockResolvedValue(catalog([p('PROFILE-1'),p('PROFILE-2','rund','2027-1')])),post:vi.fn()};
   render(<Harness api={api}/>);const select=await screen.findByLabelText('Perfil y periodo RUND');
   expect((select as HTMLSelectElement).value).toBe('');fireEvent.change(select,{target:{value:'rund:PROFILE-2'}});
   fireEvent.click(screen.getByText('Cargar requisito'));await waitFor(()=>expect(api.post).not.toHaveBeenCalled());
  });
  it('una respuesta atrasada de otra persona no reemplaza el catálogo actual',async()=>{
   let resolve:any;const first=new Promise(r=>{resolve=r;});
   const api={get:vi.fn().mockReturnValueOnce(first).mockResolvedValue({...catalog([p('OTHER')]),persona_id:other,
    perfiles:[{...p('OTHER'),persona_id:other}]}),post:vi.fn()};
   const view=render(<Harness api={api}/>);view.rerender(<Harness api={api} person={other}/>);
   await screen.findByText(/OTHER/);resolve(catalog());await waitFor(()=>expect(screen.queryByText(/PROFILE-1/)).toBeNull());
  });
  it('asocia únicamente el archivo del periodo seleccionado',async()=>{
   const api={get:vi.fn().mockResolvedValue(catalog([p('PROFILE-1'),p('PROFILE-2')])),post:vi.fn()};
   render(<Harness api={api} documents={[document]}/>);const select=await screen.findByLabelText('Perfil y periodo RUND');
   fireEvent.change(select,{target:{value:'rund:PROFILE-1'}});expect(screen.getByTestId('associated').textContent).toBe('1');
   fireEvent.change(select,{target:{value:'rund:PROFILE-2'}});expect(screen.getByTestId('associated').textContent).toBe('0');
  });
  it('una caída muestra error y permite reintentar el mismo propietario',async()=>{
   const api={get:vi.fn().mockRejectedValueOnce(new Error('Propietario no disponible')).mockResolvedValue(catalog()),post:vi.fn()};
   render(<Harness api={api}/>);expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('Propietario no disponible'));
   fireEvent.click(screen.getByText('Reintentar perfiles'));await screen.findByLabelText('Perfil y periodo RUND');expect(api.get).toHaveBeenCalledTimes(2);
  });
  it('dos clics producen una carga y la recarga espera al refresco del listado',async()=>{
   let saved:any,refreshed:any;
   const api={get:vi.fn().mockResolvedValue(catalog()),post:vi.fn().mockImplementation(()=>new Promise(r=>{saved=r;}))};
   const refresh=vi.fn().mockImplementation(()=>new Promise(r=>{refreshed=r;}));
   render(<Harness api={api} refresh={refresh}/>);await screen.findByLabelText('Perfil y periodo RUND');
   fireEvent.click(screen.getByText('Cargar requisito'));fireEvent.click(screen.getByText('Cargar requisito'));expect(api.post).toHaveBeenCalledTimes(1);
   saved(receipt);await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));expect(api.get).toHaveBeenCalledTimes(1);
   refreshed();await waitFor(()=>expect(api.get).toHaveBeenCalledTimes(2));
  });
  if(k.Component) it('la vista real consulta solo el catálogo y conserva un único archivo al elegir perfil',async()=>{
   const api=k.api;api.get.mockReset();api.post.mockReset();api.get.mockResolvedValue(catalog([p('PROFILE-1'),p('PROFILE-2','rund','2027-1')]));
   const Component=k.Component;
   render(<Component personaId={person} persona={{nombre:'Persona ficticia'}} documentos={[{...document,nombre:'Confirmado.pdf',
    categoria:'rund',estado:'pendiente',fecha_subida:'2026-10-13T12:00:00Z',tipo_archivo:'pdf',tamano_bytes:10}]}
    tiposDocumentos={[]} isLoading={false} mode="admin"/>);
   const select=await screen.findByLabelText('Perfil y periodo RUND');expect((select as HTMLSelectElement).value).toBe('');
   fireEvent.change(select,{target:{value:'rund:PROFILE-1'}});
   expect(screen.getByText('GUARDADOS').closest('button')?.textContent).toContain('1');
   expect(api.get).toHaveBeenCalledTimes(1);expect(api.get.mock.calls[0][0]).toContain('/perfiles-rund');expect(api.post).not.toHaveBeenCalled();
  });
 });
}
