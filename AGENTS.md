# Discord IA Programming Bot — Guía para agentes (ChatGPT / Codex / otros)

Este archivo describe el proyecto para cualquier agente o asistente de IA
(ChatGPT, Codex CLI, Cursor, etc.). Para Claude Code y Gemini hay archivos
dedicados (`CLAUDE.md`, `GEMINI.md`).

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
npm run dev            # arranque en desarrollo (ts-node)
```

Para producción:
```bash
npm run build          # compila a dist/
npm start              # ejecuta dist/main.js
```

## Variables de entorno
- `DISCORD_TOKEN` — token del bot (Discord Developer Portal).
- `GROQ_API_KEY` — API key de Groq (https://console.groq.com/keys).
- `PORT` — opcional (Render lo asigna).

## Reglas para agentes que generen o modifiquen código
1. **Idioma**: comentarios y respuestas del bot en **español**. Identificadores en inglés.
2. **TypeScript estricto**: `strict: true`, sin `any`, tipos explícitos.
3. **Un solo archivo**: el bot vive en `src/main.ts`. No propongas reestructurar a módulos sin pedirlo el usuario; es material educativo.
4. **Comentarios didácticos**: los comentarios explican **qué hace cada parte** y **por qué**, dirigidos a estudiantes de programación.
5. **Errores nunca silenciosos**: cada llamada externa (Discord, Groq, FS) va en `try/catch` con `console.error` y un `message.reply` amigable.
6. **Secretos**: jamás hardcoded. Siempre `process.env.X`, validados al arrancar.
7. **Discord intents** (no quitar): `Guilds`, `GuildMessages`, `DirectMessages`, `MessageContent`. Más `Partials.Channel` y `Partials.Message` para DMs.
8. **Modelo IA**: usar `llama-3.1-8b-instant` en Groq. No volver a `llama3-8b-8192` (deprecado).
9. **No introducir tests sin pedirlo**: el alcance del proyecto es educativo y no se pidió cobertura.
10. **Commits** en español, descriptivos, con prefijo (`feat:`, `fix:`, `docs:`, `chore:`).
