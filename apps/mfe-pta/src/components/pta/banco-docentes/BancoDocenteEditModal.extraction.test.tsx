import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';
import { updateBancoDocente } from '../../../services/api/ptaApi';
vi.mock('../../../services/api/ptaApi',()=>({updateBancoDocente:vi.fn(),createBancoDocente:vi.fn(),vincularRundSoporte:vi.fn()}));
vi.mock('../../../contexts/AuthContext',()=>({useAuth:()=>({isSuperUser:true,userPersonId:'OPERADOR_FICTICIO'})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('prellenado experimental del editor de perfil',()=>{
  it.each([
    ['nombreCompleto','DOCENTE DE PRUEBA'],
    ['fechaNacimiento','1985-06-15'],
    ['pregrado','Administración Pública'],
  ])('abre el paso donde se revisa %s sin guardar automáticamente',async(campo,valor)=>{
    const onClose=vi.fn();
    render(<BancoDocenteEditModal docente={{id:'docente-ficticio'}} onClose={onClose} onSaved={vi.fn()}
      suggestion={{id:'suggestion',campo,valor,label:campo,valor_previo:'',pagina:1,evidencia:'Documento ficticio',estado:'PENDIENTE',baja_confianza:true}}/>);
    expect(await screen.findByDisplayValue(valor)).toBeTruthy();
    expect(screen.getByText(/Baja confianza: contraste/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    expect(onClose).toHaveBeenCalledOnce();expect(updateBancoDocente).not.toHaveBeenCalled();
  });
});
