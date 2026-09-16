# Migraciones del esquema `hiring`, desde la 077

Las migraciones **001–076** están en `db/migrations/hiring/` (ver su README ahí
para la historia de numeraciones que chocaron). Desde la **077** las nuevas se
crean aquí, junto al microservicio, como en los demás micrositios
(`backend/travel-expenses-service/db/migrations/`,
`backend/auth-service/db/migrations/`, etc.).

Mismo criterio de siempre: sin runner ni tabla de control propia, se aplican a
mano con `psql`, en orden de número, siguiendo de corrido la numeración de la
carpeta anterior. `migrate.local.sh` ya busca en las dos rutas para el target
`hiring` / `hiring-service`, así que no necesita cambios.
