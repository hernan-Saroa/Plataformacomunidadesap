import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from '@esap-mfe/shared-ui';
import { PTAModule } from './components/PTAModule';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <PTAModule />
      <Toaster />
    </div>
  </React.StrictMode>,
);
