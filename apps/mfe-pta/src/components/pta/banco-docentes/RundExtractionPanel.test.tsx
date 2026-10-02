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
const props={docenteId:'doc-1',revision:0,onConfirmed:vi.fn(),onView:vi.fn()};

beforeEach(()=>{vi.clearAllMocks();vi.mocked(getAppOnlineStatus).mockReturnValue(true);vi.mocked(apiClient.get).mockResolvedValue(data);});
afterEach(()=>{cleanup();vi.useRealTimers();});

const openAssistant=async()=>{
  await waitFor(()=>expect(screen.queryByText('Consultando análisis…')).toBeNull());
  fireEvent.click(await screen.findByRole('button',{name:'Revisar sugerencias'}));
};

describe('revisión humana de OCR',()=>{
  it('resume el análisis y mantiene ocultos los detalles hasta que se solicitan',async()=>{
    render(<RundExtractionPanel {...props}/>);
    expect(await screen.findByText(/1 dato por revisar/)).toBeTruthy();
    expect(screen.queryByText('Pregrado')).toBeNull();
    await openAssistant();
    expect(screen.getByText('Pregrado')).toBeTruthy();
    expect(screen.getByRole('button',{name:'Ocultar'}).getAttribute('aria-expanded')).toBe('true');
  });

  it('muestra únicamente las sugerencias de la pestaña RUND activa',async()=>{
    const identitySuggestion={...suggestion,id:'s-identity',campo:'documentNumber',label:'Número de documento',valor:'1118860393',valor_previo:'12630026'};
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],sugerencias:[identitySuggestion,suggestion]}]});
    const view=render(<RundExtractionPanel {...props} activeBlock="IDENTIDAD" activeBlockLabel="Identidad"/>);
    expect(await screen.findByText(/1 dato por revisar/)).toBeTruthy();
    expect(screen.getByText('Identidad')).toBeTruthy();
    await openAssistant();
    expect(screen.getByText('Número de documento')).toBeTruthy();
    expect(screen.queryByText('Pregrado')).toBeNull();

    view.rerender(<RundExtractionPanel {...props} activeBlock="CONTACTO" activeBlockLabel="Contacto"/>);
    expect(await screen.findByText('Sin sugerencias OCR para Contacto')).toBeTruthy();
    await waitFor(()=>expect(screen.queryByRole('button',{name:'Revisar sugerencias'})).toBeNull());
    expect(screen.queryByText('Número de documento')).toBeNull();
  });

  it('aplica la sugerencia exacta sin abrir el editor completo y recarga el perfil',async()=>{
    vi.mocked(apiClient.post).mockResolvedValue({success:true,data:{confirmed:true,changed:true}});
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    expect(screen.getByText('Revisar con cuidado')).toBeTruthy();
    const evidence=screen.getByText(/Ver evidencia/).closest('details') as HTMLDetailsElement;
    expect(evidence.open).toBe(false);
    fireEvent.click(screen.getByText(/Ver evidencia/));
    expect(evidence.open).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Aplicar al perfil'}));
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/doc-1/extracciones/sugerencias/s-1/confirmar',{},expect.anything()));
    await waitFor(()=>expect(props.onConfirmed).toHaveBeenCalledTimes(1));
    await waitFor(()=>expect(apiClient.get).toHaveBeenCalledTimes(2));
  });

  it('ofrece el PDF exacto de la versión de origen',async()=>{
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    fireEvent.click(screen.getByRole('button',{name:'Ver PDF'}));
    expect(props.onView).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/doc-1/documentos/d-1/contenido','diploma.pdf','Documento analizado');
  });

  it('advierte la diferencia, pero deja la decisión final al revisor',async()=>{
    const identitySuggestions=[
      {...suggestion,id:'s-doc',campo:'documentNumber',label:'Número de documento',valor:'1118860393',valor_previo:'12630026'},
      {...suggestion,id:'s-name',campo:'nombreCompleto',label:'Nombre completo',valor:'DANIELA PATRICIA PALENCIA MENDOZA',valor_previo:'ALVARO LUIS MERCADO SUAREZ'},
    ];
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],sugerencias:identitySuggestions}]});
    vi.mocked(apiClient.post).mockResolvedValue({success:true,data:{discarded:true}});
    render(<RundExtractionPanel {...props} activeBlock="IDENTIDAD"/>);
    await openAssistant();
    expect(screen.getByText('Datos principales distintos al perfil')).toBeTruthy();
    expect(screen.getAllByRole('button',{name:'Aplicar al perfil'})).toHaveLength(2);
    expect(screen.queryByText('Aplicación bloqueada')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Rechazar todas'}));
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/doc-1/extracciones/trabajos/j-1/descartar',{motivo:'El documento no corresponde al perfil revisado.'},expect.anything()));
  });

  it.each(['documentNumber','nombreCompleto'])('aplica %s aunque nombre y documento difieran del perfil',async campo=>{
    const identitySuggestions=[
      {...suggestion,id:'s-doc',campo:'documentNumber',label:'Número de documento',valor:'1118860393',valor_previo:'12630026'},
      {...suggestion,id:'s-name',campo:'nombreCompleto',label:'Nombre completo',valor:'DANIELA PATRICIA PALENCIA MENDOZA',valor_previo:'ALVARO LUIS MERCADO SUAREZ'},
      {...suggestion,id:'s-type',campo:'documentType',label:'Tipo de documento',valor:'CC',valor_previo:'CC'},
    ];
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],sugerencias:identitySuggestions}]});
    vi.mocked(apiClient.post).mockResolvedValue({success:true,data:{confirmed:true,changed:true}});
    render(<RundExtractionPanel {...props} activeBlock="IDENTIDAD"/>);
    await openAssistant();
    expect(screen.getByRole('button',{name:'Confirmar coincidencia'})).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled();
    const selected=identitySuggestions.find(item=>item.campo===campo)!;
    const card=screen.getByText(selected.label).closest('article')!;
    fireEvent.click(Array.from(card.querySelectorAll('button')).find(button=>button.textContent==='Aplicar al perfil')!);
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalledWith(`/pta/api/v1/pta/banco-docentes/doc-1/extracciones/sugerencias/${selected.id}/confirmar`,{},expect.anything()));
    await waitFor(()=>expect(props.onConfirmed).toHaveBeenCalledTimes(1));
  });

  it('descarta con motivo, bloquea duplicados y vuelve a consultar',async()=>{
    let resolve!:(value:any)=>void;
    vi.mocked(apiClient.post).mockImplementation(()=>new Promise(done=>{resolve=done;}));
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    fireEvent.click(screen.getByRole('button',{name:'Rechazar sugerencia'}));
    const input=screen.getByLabelText('Motivo de rechazo de Pregrado');
    const confirm=screen.getByRole('button',{name:'Confirmar rechazo'});
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input,{target:{value:'Título incorrecto'}});
    fireEvent.click(confirm);fireEvent.click(confirm);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    await act(async()=>resolve({success:true,data:{discarded:true}}));
    await waitFor(()=>expect(apiClient.get).toHaveBeenCalledTimes(2));
  });

  it('no permite aplicar una sugerencia cuyo PDF fue reemplazado',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],documento_estado:'REEMPLAZADO'}]});
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    expect(screen.queryByText('Aplicar al perfil')).toBeNull();
  });

  it('muestra claramente el dato confirmado por el operador',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],sugerencias:[{...suggestion,estado:'CORREGIDA',valor_confirmado:'Título corregido'}]}]});
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    expect(screen.getByText('Corregido y confirmado')).toBeTruthy();
    expect(screen.getByText('Título corregido')).toBeTruthy();
    expect(screen.queryByText('Aplicar al perfil')).toBeNull();
  });

  it('muestra el análisis vigente y oculta reprocesamientos históricos ya revisados',async()=>{
    const old={...data.jobs[0],id:'j-old',nombre_archivo:'resultado-anterior.pdf',sugerencias:[{...suggestion,id:'s-old',estado:'DESCARTADA'}]};
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[data.jobs[0],old]});
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    expect(screen.getByText(/diploma.pdf/)).toBeTruthy();
    expect(screen.queryByText(/resultado-anterior.pdf/)).toBeNull();
    expect(screen.getByText('Perfil actual')).toBeTruthy();
    expect(screen.getByText('Documento')).toBeTruthy();
  });

  it('el módulo desactivado no agrega controles al expediente',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({enabled:false,jobs:[],documents:[]});
    const {container}=render(<RundExtractionPanel {...props}/>);
    await waitFor(()=>expect(container.innerHTML).toBe(''));
  });

  it('conserva el motivo escrito cuando se refrescan las sugerencias',async()=>{
    const view=render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    fireEvent.click(screen.getByRole('button',{name:'Rechazar sugerencia'}));
    const input=screen.getByLabelText('Motivo de rechazo de Pregrado');
    fireEvent.change(input,{target:{value:'Revisando diploma'}});
    view.rerender(<RundExtractionPanel {...props} revision={1}/>);
    await waitFor(()=>expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText('Motivo de rechazo de Pregrado') as HTMLInputElement).value).toBe('Revisando diploma');
  });

  it('recupera la etapa persistida al volver al expediente y no cancela el trabajo al salir',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],estado:'PROCESANDO',etapa:'MODELO',iniciado_en:new Date(Date.now()-125000).toISOString(),sugerencias:[]}]});
    const view=render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    const progress=screen.getByRole('progressbar');
    expect(progress.getAttribute('aria-valuetext')).toBe('Extraer datos');
    expect(screen.getByText(/Puedes cambiar de módulo o cerrar sesión/)).toBeTruthy();
    view.unmount();expect(apiClient.post).not.toHaveBeenCalled();
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('Extraer datos');
  });

  it('distingue la espera de reintento del procesamiento activo',async()=>{
    vi.mocked(apiClient.get).mockResolvedValue({...data,jobs:[{...data.jobs[0],estado:'PENDIENTE',etapa:'REINTENTO',intentos:1,sugerencias:[]}]});
    render(<RundExtractionPanel {...props}/>);
    await openAssistant();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('Esperando reintento automático');
  });
});
