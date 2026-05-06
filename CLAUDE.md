# Discord IA Programming Bot

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
