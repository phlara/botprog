# Discord IA Programming Bot

Bot de Discord asistido por IA, enfocado en responder dudas de **programación**.

## ¿Qué hace?
- Responde preguntas técnicas con IA (Groq + Llama 3.1) recordando el contexto de los últimos turnos por canal.
- Soporta comandos manuales:
  - `!help` — muestra los comandos y los temas guardados.
  - `!class <tema>` — devuelve el contenido de una clase guardada en `data/<tema>.md`.
  - `!addclass <tema> <contenido>` — guarda una nueva clase (solo administradores).
- Funciona tanto en canales del servidor como en mensajes directos (DMs).

## Stack
- Node.js + TypeScript
- [discord.js](https://discord.js.org/) v14
- [groq-sdk](https://www.npmjs.com/package/groq-sdk)
- Express (mini servidor para el health check de Render)

## Instalación
```bash
npm install
cp .env.example .env  # y edita el .env con tus tokens reales
```

## Ejecutar
```bash
# Desarrollo (recarga automática con ts-node):
npm run dev

# Producción (compila y ejecuta):
npm run build
npm start
```

## Variables de entorno (`.env`)
```
DISCORD_TOKEN=tu_token_de_discord
GROQ_API_KEY=tu_api_key_de_groq
PORT=3000
```

- `DISCORD_TOKEN`: lo obtienes en https://discord.com/developers/applications → tu app → Bot → **Reset Token**.
- `GROQ_API_KEY`: lo obtienes en https://console.groq.com/keys.

## Configuración importante en Discord
En el Developer Portal, dentro de **Bot → Privileged Gateway Intents**, debe estar
activado **MESSAGE CONTENT INTENT**. Sin eso, el bot no podrá leer el texto de los
mensajes y todo quedará en silencio.

## Estructura del proyecto
```
bot-discord-ia/
├── src/
│   └── main.ts          # Punto de entrada (comentado paso a paso).
├── data/                # Archivos .md con el contenido de las clases.
├── dist/                # Salida compilada (se genera con `npm run build`).
├── .env                 # Secretos locales (NO se sube a Git).
├── .env.example         # Plantilla del .env.
├── tsconfig.json
└── package.json
```

## Despliegue en Render
1. Crea un servicio de tipo **Web Service** apuntando al repo.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Define las variables de entorno (`DISCORD_TOKEN`, `GROQ_API_KEY`) en el dashboard.
5. (Opcional) Configura un servicio tipo UptimeRobot para hacer ping al `/` y evitar que Render duerma el servicio en plan free.
