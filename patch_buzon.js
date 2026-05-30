const fs = require('fs');
const file = 'apps/mfe-gestion-legal/src/components/modulos/ModuloBuzonNotificacionesV3.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace mock array with import
content = content.replace(/\/\/ DATOS MOCK INLINE[\s\S]*?\];/g, "import { correosJuridicosService } from '../../../../services/api/legal.service';");

// Insert State and useEffect
const stateInsertion = `  const [notificacionesData, setNotificacionesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotificaciones = async () => {
      setIsLoading(true);
      try {
        const correos = await correosJuridicosService.getCorreos();
        const mapped = correos.map(c => ({
          id: c.id,
          etapa: c.archivado ? 'ARCHIVADA' : c.leido ? 'DISTRIBUIDA' : 'PENDIENTE_VERIFICACIÓN',
          tipo: c.categoria || c.tipo || 'NUEVA_DEMANDA',
          tipoProceso: c.categoria || 'General',
          asunto: c.asunto,
          descripcion: c.cuerpoTexto || 'Sin descripción',
          fechaRadicacion: new Date(c.fechaRecepcion || Date.now()),
          remitente: c.remitenteNombre || c.remitenteEmail,
          despachoOrigen: 'Despacho',
          radicadoExterno: c.graphMessageId,
          urgente: c.urgente,
          leida: c.leido,
          documentosAdjuntos: c.tieneAdjuntos ? ['Adjunto'] : []
        }));
        setNotificacionesData(mapped);
      } catch (error) {
        console.error('Error fetching correos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotificaciones();
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);`;

content = content.replace(/const \[isMobile, setIsMobile\] = useState\(window\.innerWidth < 768\);/, stateInsertion);
content = content.replace(/notificacionesMock/g, 'notificacionesData');

fs.writeFileSync(file, content);
console.log('Patch applied successfully.');
