// =============================================================================
//  BOT DE DISCORD CON IA — Punto de entrada del programa
// =============================================================================
//  ¿Qué hace este archivo?
//    1. Se conecta a Discord usando un token secreto.
//    2. Escucha los mensajes que la gente escribe en el servidor o por DM.
//    3. Si el mensaje empieza con "!" lo trata como un COMANDO (!help, !class...).
//    4. Si es texto normal, le pasa el mensaje a la IA de Groq y devuelve
//       la respuesta como un profe de programación.
//    5. Levanta también un mini servidor web que Render usa para mantener
//       el bot despierto (un "health check").
//
//  Tecnologías que se usan:
//    - discord.js : librería oficial para hablar con Discord.
//    - groq-sdk   : cliente para llamar al modelo de IA Llama 3.1 hosteado en Groq.
//    - express    : servidor web mínimo para el health check de Render.
//    - dotenv     : carga las variables del archivo .env (token, api key).
// =============================================================================

// --- 0. Importaciones ---
// Traemos las herramientas que vamos a usar de cada librería.
import {
  Client,             // Representa al bot conectado a Discord.
  GatewayIntentBits,  // Permisos que el bot necesita activar (qué eventos quiere recibir).
  Message,            // Tipo de TypeScript para un mensaje de Discord.
  ActivityType,       // Tipos de "estado" del bot: Watching, Playing, Listening...
  PermissionFlagsBits,// Banderas de permisos (Admin, gestión de mensajes, etc.).
  Events,             // Constantes con los nombres de eventos ('ready', 'messageCreate'...).
  Partials,           // Objetos parciales que Discord nos manda incompletos (necesario para DMs).
} from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';     // Sistema de archivos (leer/escribir archivos).
import * as path from 'path'; // Para construir rutas de archivos sin romper en distintos SO.
import express from 'express';
import Groq from 'groq-sdk';

// Lee el archivo .env y carga sus variables a process.env.
// El .env nunca se sube a GitHub (está en .gitignore) porque tiene secretos.
dotenv.config();

// --- 1. Configuración leída del entorno ---
// process.env son las variables de entorno: en local vienen del .env,
// en producción (Render) las defines en el dashboard.
const TOKEN = process.env.DISCORD_TOKEN;          // Token secreto del bot de Discord.
const GROQ_API_KEY = process.env.GROQ_API_KEY;    // Llave para usar la IA de Groq.
const PREFIX = '!';                               // Prefijo que distingue un comando de texto normal.
const PORT = process.env.PORT || 3000;            // Render asigna el puerto; si no, usamos 3000.

// Validación temprana: si falta el token de Discord, el bot no puede arrancar.
// Mejor fallar de inmediato con un mensaje claro que romperse silenciosamente.
if (!TOKEN) {
  console.error('CRITICAL: DISCORD_TOKEN no está definido en las variables de entorno.');
  process.exit(1);
}
if (!GROQ_API_KEY || GROQ_API_KEY === 'tu_api_key_de_groq_aqui') {
  console.warn('AVISO: GROQ_API_KEY no está configurada. La IA no responderá hasta que la definas en Render.');
}

// --- 2. Cliente de la IA (Groq) ---
// Creamos una instancia del SDK de Groq con nuestra API key.
// Si la key no está, igual creamos el cliente con un valor dummy para evitar
// que la app crashee al arrancar; ya bloqueamos el uso de la IA más abajo.
const groq = new Groq({ apiKey: GROQ_API_KEY || 'dummy_key' });

// --- 3. Memoria de conversación a corto plazo ---
// Para que el bot recuerde los últimos turnos por canal usamos un Map en memoria.
// Clave: id del canal. Valor: lista de mensajes intercambiados.
// IMPORTANTE: esto vive solo en RAM. Si el bot se reinicia, se pierde la memoria.
interface ChatContext {
  role: 'user' | 'assistant' | 'system'; // Quién dijo el mensaje.
  content: string;                        // Texto del mensaje.
}
const conversationMemory = new Map<string, ChatContext[]>();
const MAX_HISTORY = 8; // Cuántos mensajes recordamos como máximo (para no exceder el contexto del modelo).

// --- 4. Inicialización del cliente de Discord ---
// El bot necesita declarar qué eventos quiere recibir mediante "intents".
// Algunos son privilegiados y hay que activarlos también en el Developer Portal.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,          // Eventos del servidor (canales, roles...).
    GatewayIntentBits.GuildMessages,   // Mensajes en canales del servidor.
    GatewayIntentBits.DirectMessages,  // Mensajes privados (DMs) al bot.
    GatewayIntentBits.MessageContent,  // PRIVILEGIADO: poder leer el texto del mensaje.
  ],
  // Los DMs llegan como canales "parciales" (Discord no los manda completos).
  // Sin estos partials, el evento messageCreate no se dispara para DMs.
  partials: [Partials.Channel, Partials.Message],
});

// --- 5. Tabla de comandos ---
// Cada comando es una función que recibe el mensaje y los argumentos.
// Para agregar un comando nuevo, basta con añadir una entrada aquí.
const commands: Record<string, (message: Message, args: string[]) => Promise<void>> = {

  // !help → Muestra los comandos disponibles y los temas guardados.
  help: async (message) => {
    // __dirname apunta a donde se ejecuta el archivo compilado (dist/),
    // por eso subimos un nivel para llegar a la carpeta /data.
    const dataDir = path.join(__dirname, '../data');

    // Si la carpeta data no existe o está vacía, avisamos.
    if (!fs.existsSync(dataDir) || fs.readdirSync(dataDir).length === 0) {
      await message.reply('No hay temas registrados todavía.');
      return;
    }

    // Leemos los archivos .md de la carpeta y nos quedamos solo con el nombre del tema.
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.md'));
    const topics = files.map(file => file.replace('.md', '')).join(', ');

    // Mensaje de ayuda. El \` activa el formato de código en Discord.
    const response = `**Comandos disponibles:**\n` +
      `- \`!class <tema>\`: Ver contenido de una clase guardada.\n` +
      `- \`!addclass <tema> <contenido>\`: Agregar nuevo tema (Solo Admin).\n` +
      `- \`!help\`: Ver esta lista.\n\n` +
      `**Cómo hablar con la IA:**\n` +
      `- Mándame un **DM** (mensaje privado), o\n` +
      `- Escribe en un canal cuyo nombre contenga "bot" (ej: #charla-bot), o\n` +
      `- Mencióname con **@Programming Bot** en cualquier canal.\n\n` +
      `**Temas en biblioteca:** ${topics || 'Ninguno'}`;

    await message.reply(response);
  },

  // !class <tema> → Lee y muestra el contenido del archivo data/<tema>.md.
  class: async (message, args) => {
    // Unimos los args para soportar temas con espacios y pasamos a minúscula
    // para que !class POO sea igual que !class poo.
    const topic = args.join(' ').toLowerCase();
    if (!topic) {
      await message.reply('Uso: !class <tema>');
      return;
    }

    const filePath = path.join(__dirname, '../data', `${topic}.md`);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      await message.reply(`**${topic.toUpperCase()}**\n${content}`);
    } catch (error) {
      // Si el archivo no existe, readFileSync lanza error: lo capturamos y
      // respondemos con un mensaje amistoso en lugar de crashear.
      await message.reply(`No encontré información sobre: ${topic}`);
    }
  },

  // !addclass <tema> <contenido> → Crea/actualiza un archivo data/<tema>.md.
  // Solo administradores del servidor pueden usarlo.
  addclass: async (message, args) => {
    // Verificamos permisos antes de hacer nada para evitar abusos.
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply('No tienes permiso para agregar clases.');
      return;
    }

    const topic = args[0]?.toLowerCase();           // Primer argumento = nombre del tema.
    const content = args.slice(1).join(' ');        // Resto = contenido de la clase.

    if (!topic || !content) {
      await message.reply('Uso: !addclass <tema> <contenido>');
      return;
    }

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir); // Crea la carpeta si no existe.
    fs.writeFileSync(path.join(dataDir, `${topic}.md`), content);
    await message.reply(`Clase "${topic}" guardada.`);
  },
};

// --- 6. Eventos del cliente de Discord ---

// Se dispara UNA sola vez cuando el bot ya está conectado y autenticado.
client.once(Events.ClientReady, (c) => {
  console.log(`Bot listo: ${client.user?.tag}`);
  // Cambia el estado del bot para que se vea "Viendo Clases de Programación".
  client.user?.setActivity('Clases de Programación', { type: ActivityType.Watching });
});

// Logs de errores y warnings de la conexión a Discord (útiles para debug en Render).
client.on(Events.Error, (err) => console.error('Discord client error:', err));
client.on(Events.Warn, (info) => console.warn('Discord client warn:', info));

// Evento principal: se ejecuta CADA VEZ que llega un mensaje que el bot puede ver.
client.on('messageCreate', async (message) => {
  // Ignoramos mensajes de cualquier bot (incluido nosotros) para evitar bucles.
  if (message.author.bot) return;

  const content = message.content.trim();

  // Log de cada mensaje recibido. Si esta línea no aparece en Render, significa
  // que el bot no está recibiendo el evento (problema de intents o permisos).
  console.log(
    `[msg] #${(message.channel as any).name ?? message.channel.id} ` +
    `<${message.author.tag}>: "${content}" (len=${content.length})`
  );

  // Mensajes vacíos suelen ser stickers/adjuntos sin texto, los ignoramos.
  if (!content) return;

  // ----- Caso A: el mensaje empieza con "!" → es un comando manual -----
  if (content.startsWith(PREFIX)) {
    // Quitamos el "!" y separamos por espacios. shift() saca el primer
    // elemento (el nombre del comando) y deja el resto como argumentos.
    const args = content.slice(PREFIX.length).split(/ +/);
    const commandName = args.shift()?.toLowerCase() || '';

    if (commands[commandName]) {
      try {
        // Ejecutamos el comando. Si lanza excepción, la atrapamos para
        // que el bot no se caiga y avisamos al usuario.
        await commands[commandName](message, args);
      } catch (err) {
        console.error(`Error ejecutando comando "${commandName}":`, err);
        await message.reply('Hubo un error ejecutando ese comando.').catch(() => {});
      }
    } else {
      await message.reply('Comando desconocido. Usa `!help` para ver los comandos disponibles.');
    }
    return; // Terminamos: no queremos que un comando dispare también la IA.
  }

  // ----- Caso B: texto normal → preguntamos a la IA de Groq -----
  // Filtro mínimo: ignoramos mensajes muy cortos ("ok", "x") para no spamear la IA.
  if (content.length <= 2) return;

  // ----- Filtro de canales para no spamear el servidor -----
  // En DMs siempre respondemos. En canales del servidor solo si:
  //   (a) nos mencionan explícitamente con @bot, O
  //   (b) el canal tiene la palabra "bot" en el nombre (ej: #charla-bot).
  // Así la gente puede seguir conversando en #general sin que el bot se meta.
  const isDm = !message.guild;
  const wasMentioned = client.user ? message.mentions.has(client.user) : false;
  const channelName = ((message.channel as any).name ?? '').toLowerCase();
  const isBotChannel = channelName.includes('bot');

  if (!isDm && !wasMentioned && !isBotChannel) return;

  // Si nos mencionaron, le quitamos la mención al texto para que la IA reciba
  // solo la pregunta limpia (sin el "<@123456...>" que mete Discord).
  const cleanContent = wasMentioned && client.user
    ? content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim()
    : content;

  if (cleanContent.length === 0) return; // si solo nos mencionaron sin texto, ignoramos.

  // Si no hay API key configurada, avisamos en lugar de fallar silenciosamente.
  if (!GROQ_API_KEY || GROQ_API_KEY === 'tu_api_key_de_groq_aqui') {
    await message.reply('La IA no está configurada (falta GROQ_API_KEY en el servidor).');
    return;
  }

  try {
    // Indicador "está escribiendo..." para que el usuario sepa que estamos pensando.
    await message.channel.sendTyping();

    // Recuperamos el historial de ESTE canal (o lista vacía si es la primera).
    const history = conversationMemory.get(message.channel.id) || [];
    history.push({ role: 'user', content: cleanContent });

    // Llamada al modelo de IA. La estructura es la estándar de OpenAI/Groq:
    //  - system: instrucciones de "personalidad" (qué debe hacer y qué no).
    //  - user/assistant: turnos de conversación intercalados.
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Eres un experto profesor de programación. Tu ÚNICO objetivo es ayudar ' +
            'con dudas de código, algoritmos y desarrollo de software. Si el usuario ' +
            'pregunta algo ajeno a la programación, responde amablemente que solo ' +
            'puedes ayudar con temas técnicos de programación. Responde de forma ' +
            'concisa en español.',
        },
        ...history, // Adjuntamos el historial para que recuerde el contexto.
      ],
      model: 'llama-3.1-8b-instant', // Modelo gratuito y rápido de Groq.
    });

    // Tomamos la primera respuesta del modelo. Si por algo viene vacía, fallback.
    const assistantResponse =
      completion.choices[0]?.message?.content ||
      'No pude generar una respuesta para tu pregunta.';

    // Guardamos la respuesta del bot al historial para mantener la coherencia.
    history.push({ role: 'assistant', content: assistantResponse });

    // Recortamos el historial: borramos los 2 mensajes más viejos (1 user + 1 bot)
    // cuando se pasa del límite. Así la conversación "rueda" sin crecer infinito.
    if (history.length > MAX_HISTORY) history.splice(0, 2);
    conversationMemory.set(message.channel.id, history);

    // Discord rechaza mensajes >2000 chars. Partimos en chunks respetando saltos
    // de línea para no cortar a la mitad un bloque de código.
    await sendChunked(message, assistantResponse);
  } catch (error: any) {
    // Logueamos el error completo en consola (Render lo verá),
    // pero al usuario solo le mandamos un mensaje amigable.
    console.error('Error llamando a Groq:', error?.status, error?.message, error?.error ?? '');
    await message.reply('Lo siento, tuve un problema al procesar tu pregunta. Revisa los logs del servidor.');
  }
});

/**
 * Envía un texto largo respetando el límite de 2000 caracteres de Discord.
 * Parte en bloques de ~1900, prefiriendo cortar en saltos de línea para no
 * romper un bloque de código a la mitad. La primera parte usa reply (notifica
 * al usuario), las siguientes van como mensajes normales para no re-pingear.
 */
async function sendChunked(message: Message, text: string) {
  const MAX = 1900;
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > MAX) {
    // Buscamos un salto de línea cerca del límite para cortar "limpio".
    let cutAt = remaining.lastIndexOf('\n', MAX);
    if (cutAt < MAX * 0.5) cutAt = MAX; // si no hay newline cerca, cortamos duro.
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);

  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) await message.reply(chunks[i]);
    else await (message.channel as any).send(chunks[i]);
  }
}

// Captura de seguridad: cualquier promesa rechazada que no manejamos manualmente
// se loguea en lugar de tirar el proceso silenciosamente.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// --- 7. Health check para Render ---
// Render (en plan free) necesita una URL HTTP que responda 200 OK para considerar
// el servicio "vivo". Si nadie hace requests por un rato, lo apaga. Por eso es
// común configurar un servicio externo (UptimeRobot) que pingue cada N minutos.
const app = express();
app.get('/', (_, res) => {
  console.log('Ping de mantenimiento recibido: Manteniendo el bot despierto.');
  res.send('Bot Online');
});
app.listen(PORT, () => console.log(`Puerto ${PORT} abierto`));

// --- 8. Login a Discord (último paso, ya con todo configurado) ---
// Si el login falla (token inválido, sin internet, etc.) salimos con código 1
// para que Render marque el deploy como fallido en lugar de quedarse colgado.
client.login(TOKEN).catch(error => {
  console.error('CRITICAL ERROR: Failed to login to Discord.');
  console.error(error.message);
  process.exit(1);
});
