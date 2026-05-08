
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

const _cspNonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content ?? '';
if (_cspNonce) {
  const _origCreate = document.createElement.bind(document);
  document.createElement = function(tag: string, opts?: ElementCreationOptions) {
    const el = _origCreate(tag as 'div', opts);
    if (tag.toLowerCase() === 'style') el.setAttribute('nonce', _cspNonce);
    return el;
  } as typeof document.createElement;
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
  
