import { useNavigate, useParams } from 'react-router-dom';
import { VerificarCertificado } from '../certificados-laborales/VerificarCertificado';
import ValidarCertificadoGraduado from './ValidarCertificadoGraduado';

export function VerificarCertificadoPublico() {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();

  if (codigo && codigo.startsWith('QR-GR-')) {
    return (
      <ValidarCertificadoGraduado
        codigoInicial={codigo}
        onVolver={() => navigate('/')}
      />
    );
  }

  return <VerificarCertificado />;
}
