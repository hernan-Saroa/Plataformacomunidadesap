-- Actualizar contraseña a 123456 para todos los usuarios
UPDATE auth."user" SET password_hash = '$2b$10$ofMAn3BaPnChEIFM0ms/6uXwBFMeQKJZsOAVW02spi7oj1gnhKDAa';
