# Discord IA Programming Bot — Instrucciones para GitHub Copilot

Bot de Discord en TypeScript que actúa como profesor de programación, hecho con
fines educativos para compartir con compañeros de clase.

## Stack
- **Runtime**: Node.js + TypeScript
- **Discord**: discord.js v14
- **IA**: Groq (modelo `llama-3.1-8b-instant`)
- **Servidor**: Express (health check para Render)
- **Hosting**: Render (free tier)

## Estructura
- `bot-discord-ia/src/main.ts` — punto de entrada único, comentado paso a paso.
- `bot-discord-ia/data/` — archivos `.md` con el contenido de cada clase.
- `bot-discord-ia/.env.example` — plantilla de variables de entorno.

## Cómo correrlo en local
```bash
cd bot-discord-ia
npm install
cp .env.example .env   # y edita .env con tus tokens reales
npm run dev
```

## Variables de entorno
- `DISCORD_TOKEN` — token del bot (Discord Developer Portal).
- `GROQ_API_KEY` — API key de Groq (https://console.groq.com/keys).
- `PORT` — opcional (Render lo asigna).

## Convenciones que Copilot debe respetar al autocompletar
- **Idioma**: comentarios y mensajes al usuario final en **español** (es código educativo en Colombia).
- **Tipos**: TypeScript con `strict: true`. Evita `any`; usa tipos explícitos o `unknown`.
- **Naming**: `camelCase` para variables/funciones, `PascalCase` para clases/tipos, `UPPER_SNAKE_CASE` para constantes.
- **Estructura**: el bot está intencionalmente en un solo archivo. No propongas extraer a módulos salvo que la función crezca mucho.
- **Manejo de errores**: cualquier llamada a la API de Discord o Groq va dentro de `try/catch`, con `console.error` para diagnóstico y un `message.reply` amigable para el usuario.
- **Secretos**: nunca incluyas tokens o keys en el código. Siempre `process.env.X`.
- **Discord intents**: si modificas la creación del `Client`, mantén `Guilds`, `GuildMessages`, `DirectMessages`, `MessageContent` y los `Partials.Channel` y `Partials.Message` (necesarios para DMs).
- **Modelo Groq**: el modelo en producción es `llama-3.1-8b-instant`. No vuelvas a `llama3-8b-8192` (está deprecado).
