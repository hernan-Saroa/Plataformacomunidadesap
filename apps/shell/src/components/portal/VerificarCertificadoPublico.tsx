import { useNavigate, useParams } from 'react-router-dom';
import { VerificarCertificado } from '../certificados-laborales/VerificarCertificado';
import ValidarCertificadoGraduado from './ValidarCertificadoGraduado';

export function VerificarCertificadoPublico() {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();

  if (codigo) {
    const codigoUpper = codigo.toUpperCase();
    const isLaboral = codigoUpper.startsWith('QR-CERT-');

    if (!isLaboral) {
      return (
        <ValidarCertificadoGraduado
          codigoInicial={codigo}
          onVolver={() => navigate('/')}
        />
      );
    }
  }

  return <VerificarCertificado />;
}
