# Discord IA Programming Bot — Guía para Gemini Code Assist

Bot de Discord en TypeScript que actúa como profesor de programación, hecho con
fines educativos para compartir con compañeros de clase.

## Stack
- **Runtime**: Node.js + TypeScript
- **Discord**: discord.js v14
- **IA**: Groq (modelo `llama-3.1-8b-instant`)
- **Servidor**: Express (health check para Render)
- **Hosting**: Render (free tier)

## Estructura
- `bot-discord-ia/src/main.ts` — todo el bot vive aquí, comentado paso a paso.
- `bot-discord-ia/data/` — archivos `.md` con el contenido de cada clase.
- `bot-discord-ia/.env.example` — plantilla de variables de entorno.

## Cómo correrlo en local
```bash
cd bot-discord-ia
npm install
cp .env.example .env   # y edita .env con tus tokens reales
npm run dev
```

## Variables de entorno necesarias
- `DISCORD_TOKEN` — token del bot (Discord Developer Portal).
- `GROQ_API_KEY` — API key de Groq (https://console.groq.com/keys).
- `PORT` — opcional (Render lo asigna).

## Recomendaciones al sugerir código
- Mantén el bot en un solo archivo (`src/main.ts`) salvo que la complejidad lo justifique. Es código educativo: la legibilidad pesa más que la arquitectura.
- Conserva el estilo de comentarios en español orientado a explicar **qué hace cada bloque**, ya que es material de estudio.
- Antes de agregar dependencias nuevas, revisa si `discord.js`, `groq-sdk` o las built-ins de Node ya cubren la necesidad.
- No expongas secretos: `DISCORD_TOKEN` y `GROQ_API_KEY` siempre se leen desde `process.env`, nunca hardcoded.
- Ante errores de Discord/Groq, usa `try/catch` y loguea con `console.error` en lugar de dejar que el proceso muera.
