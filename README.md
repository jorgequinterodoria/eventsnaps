# EventSnaps

Aplicación para compartir fotos de eventos con código de acceso de 6 caracteres, subida en tiempo real, galería y modo carrusel y almacenamiento en Supabase. Acceso abierto sin autenticación.

## Características
- Creación de eventos con duración 24h/72h y código único de 6 caracteres
- Unirse a eventos por código y compartir fotos
- Subida de imágenes a Supabase Storage (bucket `photos`)
- Galería y modo carrusel con reproducción automática (5s), pausa y navegación
- Moderación opcional (base preparada para Gemini)
- Interfaz en español y diseño responsivo

## Stack
- Frontend: React 18 + TypeScript + Vite
- UI: Tailwind CSS, Lucide Icons
- Acceso abierto (sin login)
- Backend-as-a-Service: Supabase (PostgreSQL + Storage)
- IA opcional: Google Gemini (pendiente de integración vía función de servidor)

## Requisitos
- Node.js 18+
- pnpm (recomendado)
- Cuenta de Supabase

## Variables de entorno
Crear `.env.local` en la raíz del proyecto con:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
GEMINI_API_KEY=<gemini-key>
```

`SUPABASE_SECRET_KEY` solo se usa para tareas administrativas locales y nunca debe
usarse en código del navegador.

## Base de datos y Storage
- Tablas principales: `events`, `photos`, `moderation_queues`, `moderation_actions`
- Bucket de Storage: `photos`
- El bucket público de Storage debe llamarse `photos`.
- Para preparar un proyecto Supabase nuevo, ejecuta `supabase/migrations/20260918000000_eventsnaps_schema.sql` en el SQL Editor.
- Después importa los datos del backup con:

```bash
set -a; source .env.local; set +a
node scripts/import-backup-to-supabase.mjs
```

Si necesitas recrear el esquema, revisa los archivos en `supabase/migrations/` y aplícalos con la CLI de Supabase o el panel.

## Scripts
- Instalar dependencias: `pnpm install`
- Desarrollo: `pnpm run dev`

## Rutas principales
- `/` Inicio
- `/create` Crear evento
- `/join` Unirse a evento
- `/event/:code` Página del evento (galería, subida y carrusel)
- `/moderate/:code` Moderación abierta (panel de revisión)

## Carrusel de fotos
- Botón “Ver presentación” disponible cuando el evento tiene fotos
- Controles: Pausar/Reproducir, Anterior/Siguiente, Cerrar
- Transición: desvanecimiento suave entre imágenes

## Notas de desarrollo
- Durante el desarrollo se muestran todas las fotos del evento (sin filtrar por estado). En producción, se puede reactivar el filtro por `status='approved'` en `src/lib/database.ts:getEventPhotos`.
- Moderación con Gemini está prevista para integrarse vía función de servidor (Edge Function) usando `service_role` para cumplir políticas.

## Problemas comunes
- “Bucket not found”: asegúrate de que el bucket `photos` exista en Supabase Storage
- “RLS violation”: en desarrollo se deshabilitó RLS; si lo reactivas, revisa permisos y políticas de INSERT/SELECT

## Licencia
Proyecto para demostración y uso interno. Ajusta la licencia según tus necesidades.
