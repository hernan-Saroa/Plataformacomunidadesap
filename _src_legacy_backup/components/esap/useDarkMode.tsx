import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Verificar preferencia guardada - SIEMPRE por defecto en tema claro
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    // IMPORTANTE: Tema claro por defecto, sin importar preferencia del sistema
    return false;
  });

  useEffect(() => {
    // Guardar preferencia
    localStorage.setItem('darkMode', isDarkMode.toString());

    // Aplicar clase al documento
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return { isDarkMode, toggleDarkMode };
}
