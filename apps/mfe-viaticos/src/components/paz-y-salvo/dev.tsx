// Entrada aislada para comprobar la historia sin cambiar el shell compartido.
import ReactDOM from 'react-dom/client';
import '../../../../shell/src/index.css';
import PazYSalvoCoordinadora from './PazYSalvoCoordinadora';
ReactDOM.createRoot(document.getElementById('root')!).render(<PazYSalvoCoordinadora />);
