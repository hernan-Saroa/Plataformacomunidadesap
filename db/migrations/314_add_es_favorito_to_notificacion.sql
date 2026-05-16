ALTER TABLE notifications.notificacion ADD COLUMN IF NOT EXISTS es_favorito BOOLEAN NOT NULL DEFAULT false;
