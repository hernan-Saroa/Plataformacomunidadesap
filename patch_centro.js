const fs = require('fs');
const file = 'apps/mfe-gestion-legal/src/components/modulos/CentroComunicacionesJuridicasV3.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace mock array with import
content = content.replace(/\/\/ DATOS MOCK UNIFICADOS[\s\S]*?\];/g, "import { correosJuridicosService } from '../../../../services/api/legal.service';");

// Insert State and useEffect
const stateInsertion = `  const [comunicacionesUnificadasData, setComunicacionesUnificadasData] = useState<ComunicacionUnificada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComunicaciones = async () => {
      setIsLoading(true);
      try {
        const correos = await correosJuridicosService.getCorreos();
        const mapped = correos.map(c => ({
          id: c.id,
          tipo: c.tipo === 'JUDICIAL' ? 'JUDICIAL' : c.tipo === 'OFICIO' ? 'CONCEPTO_OFICIO' : 'OTRO',
          tipoProceso: c.categoria || 'General',
          asunto: c.asunto,
          descripcion: c.cuerpoTexto || 'Sin descripción',
          remitente: c.remitenteNombre || c.remitenteEmail,
          remitenteEmail: c.remitenteEmail,
          despachoOrigen: 'Despacho',
          radicadoExterno: c.graphMessageId,
          fechaRadicacion: new Date(c.fechaRecepcion || Date.now()),
          urgente: c.urgente,
          leida: c.leido,
          estado: c.archivado ? 'ARCHIVADO' : c.leido ? 'ATENDIDO' : 'NUEVO',
          documentosAdjuntos: c.tieneAdjuntos ? ['Adjunto'] : []
        })) as any[];
        setComunicacionesUnificadasData(mapped);
      } catch (error) {
        console.error('Error fetching comunicaciones:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchComunicaciones();
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);`;

content = content.replace(/const \[isMobile, setIsMobile\] = useState\(window\.innerWidth < 768\);/, stateInsertion);
content = content.replace(/comunicacionesUnificadas/g, 'comunicacionesUnificadasData');

// Fix an issue where TypeScript might complain about 'comunicacionesUnificadasDataData' if it replaced twice, but it should only hit the usage, not the declaration since we replaced the declaration entirely.
// Actually, in the UI code, they probably map over `comunicacionesUnificadas`.
// Let's just make sure.

fs.writeFileSync(file, content);
console.log('Patch applied successfully to CentroComunicaciones.');
