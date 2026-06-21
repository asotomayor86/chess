# Ajedrez — Hub de Juegos en Familia

Ajedrez **online por turnos** para dos jugadores, integrado con el hub
*One Page to Rule Them All* (Family Hub). Comparte el mismo inicio de sesión (SSO)
que los demás juegos (assemble, hangman, murciakingdom): se entra desde una **sala**
creada en el hub, se juega en tiempo real y el resultado se devuelve al hub.

Stack: **Next.js 14 · React 18 · TypeScript · Tailwind · Zustand · Neon (Postgres)**.
Reglas de ajedrez con [`chess.js`](https://github.com/jhlywa/chess.js). Despliegue en Vercel.

## Cómo funciona

1. En el hub se crea una **sala** (juego + 2 jugadores) y se obtiene un **código**.
2. El hub abre el juego en `…/ajedrez/?sala=CÓDIGO`.
3. El juego pide login con la cuenta del hub (email+contraseña, Neon Auth) y fija una
   cookie de identidad firmada (HMAC).
4. `GET /api/sala-hub/{código}` resuelve el asiento (0/1) del jugador y los nombres.
5. El anfitrión (asiento 0) elige color (o lo sortea) y crea la partida; el invitado
   (asiento 1) espera y se une.
6. Cada jugada se valida en el cliente (`chess.js`), se guarda como FEN + historial y
   se sincroniza en tiempo real por **SSE** (sondeo de una columna `version` en Neon).
7. Al terminar (jaque mate, ahogado, tablas, abandono u oferta de tablas aceptada), el
   backend envía el resultado al hub con `HUB_RESULT_SECRET` y la sala se cierra.

## Estructura

```
lib/
  ajedrez.ts     Envoltura sobre chess.js (movimientos legales, jaque/mate/tablas, material)
  tipos.ts       EstadoPartida (lo que se guarda como JSONB y viaja por SSE)
  store.ts       Zustand: estado + acciones (selección, mover, tablas, abandono)
  online.ts      Cliente de red (crear/leer/actualizar sala, SSE, hub, resultado)
  db.ts          Cliente Neon (solo servidor)
  hubUser.ts     Firma/verificación de la cookie de identidad (HMAC, Web Crypto)
  clienteHub.ts  Login Neon Auth contra el proxy del hub
  rutas.ts       Prefijo de basePath para fetch/EventSource
app/
  acceso/        Login con la cuenta del hub
  online/[codigo]/  Sala: config del anfitrión / espera / juego / fin
  local/         Tablero hotseat de prueba (sin hub ni BD) — se puede borrar
  admin/         Reiniciar una partida atascada (protegido por ADMIN_PASSWORD)
  api/sso, api/salas, api/sala-hub, api/admin
components/       Tablero, Pieza, Promocion, Capturas, Historial, Partida
scripts/init-db.mjs   Crea la tabla `partidas`
```

## Puesta en marcha (local)

```bash
npm install
cp .env.local.example .env.local   # y rellena los valores
npm run db:init                    # crea la tabla `partidas` en Neon
npm run dev                        # http://localhost:3000/ajedrez
```

> Para probar solo el tablero y las reglas sin el hub: `http://localhost:3000/ajedrez/local`.

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL` | servidor | Conexión a Neon (la inyecta Vercel al crear la BD). |
| `NEXT_PUBLIC_HUB_URL` | cliente+servidor | URL base del hub (login SSO, leer sala, resultado). |
| `HUB_RESULT_SECRET` | servidor | **El mismo** secreto que el hub. Devolver el resultado. |
| `SESSION_SECRET` | servidor | Firma de la cookie de identidad (32+ chars). Cae a `HUB_RESULT_SECRET`. |
| `ADMIN_PASSWORD` | servidor | Clave del panel `/admin`. Sin ella, admin deshabilitado. |

## Despliegue en Vercel

1. Crea el proyecto en Vercel desde este repo.
2. En **Storage**, crea/conecta una base de datos **Neon** → inyecta `DATABASE_URL`.
3. Define el resto de variables de entorno (tabla de arriba).
4. Ejecuta `npm run db:init` una vez (en local con la `DATABASE_URL` de producción, o
   con `vercel env pull`).

## Registro en el hub (lado administrador)

Para que el hub abra este juego en una sala:

1. Añade el juego a la tabla `games` del hub con un `slug` (p. ej. `ajedrez`), su
   nombre y la URL del despliegue en Vercel.
2. Añade el **rewrite** `/ajedrez/:path*` → la URL del juego (igual que se hizo con
   `murciakingdom`). El `basePath` de este proyecto es **`/ajedrez`**: si cambias el
   slug, cámbialo también en [`next.config.js`](next.config.js) y
   [`lib/rutas.ts`](lib/rutas.ts).
3. Da acceso al juego a los jugadores (tabla `user_games`).

Con eso, crear una sala de ajedrez en el hub y abrirla lleva a los jugadores aquí.
