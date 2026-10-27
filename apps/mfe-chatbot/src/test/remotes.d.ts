// El test del contenedor del shell resuelve este remoto al módulo local del chatbot.
declare module 'chatbot/Module' {
  const Module: typeof import('../components/ChatbotModule').ChatbotModule;
  export default Module;
}
