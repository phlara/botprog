import { Client, GatewayIntentBits, Message, ActivityType, PermissionFlagsBits, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import Groq from 'groq-sdk';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PREFIX = '!';
const PORT = process.env.PORT || 3000;

// Initialize IA SDK
const groq = new Groq({ apiKey: GROQ_API_KEY });

// Configuración de Memoria de corto plazo
interface ChatContext { role: 'user' | 'assistant' | 'system'; content: string }
const conversationMemory = new Map<string, ChatContext[]>();
const MAX_HISTORY = 8;

// 1. Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 2. Command Handlers
const commands: Record<string, (message: Message, args: string[]) => Promise<void>> = {
  // Command to list all available topics
  help: async (message) => {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir) || fs.readdirSync(dataDir).length === 0) {
      await message.reply('No hay temas registrados todavía.');
      return;
    }

    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.md'));
    const topics = files.map(file => file.replace('.md', '')).join(', ');

    const response = `**Comandos disponibles:**\n` +
      `- \`!class <tema>\`: Ver contenido de una clase guardada.\n` +
      `- \`!addclass <tema> <contenido>\`: Agregar nuevo tema (Solo Admin).\n` +
      `- \`!help\`: Ver esta lista.\n\n` +
      `**O simplemente háblame:**\n` +
      `Si me preguntas algo sobre programación, te responderé usando mi IA. 🤖\n\n` +
      `**Temas en biblioteca:** ${topics || 'Ninguno'}`;

    await message.reply(response);
  },

  class: async (message, args) => {
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
      await message.reply(`No encontré información sobre: ${topic}`);
    }
  },

  addclass: async (message, args) => {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply('No tienes permiso para agregar clases.');
      return;
    }
    const topic = args[0]?.toLowerCase();
    const content = args.slice(1).join(' ');
    if (!topic || !content) return void message.reply('Uso: !addclass <tema> <contenido>');

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    fs.writeFileSync(path.join(dataDir, `${topic}.md`), content);
    await message.reply(`Clase "${topic}" guardada.`);
  }
};

// 3. Event Handling
client.once(Events.ClientReady, (c) => {
  console.log(`Bot listo: ${client.user?.tag}`);
  // This makes the bot look "active" in the sidebar
  client.user?.setActivity('Clases de Programación', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignorar mensajes de otros bots (incluido el propio)

  const content = message.content.trim();
  
  // Caso A: El mensaje empieza con el prefijo (Comandos manuales)
  if (content.startsWith(PREFIX)) {
    const args = content.slice(PREFIX.length).split(/ +/);
    const commandName = args.shift()?.toLowerCase() || '';

    if (commands[commandName]) {
      await commands[commandName](message, args);
    } else {
      await message.reply('Comando desconocido. Usa `!help` para ver los comandos disponibles.');
    }
    return;
  }

  // Caso B: Conversación natural (IA Groq)
  if (content.length > 2) {
    if (!GROQ_API_KEY) return void message.reply('La IA no está configurada (falta GROQ_API_KEY).');

    try {
      await message.channel.sendTyping();
      
      // Obtener historial o inicializarlo
      const history = conversationMemory.get(message.channel.id) || [];
      history.push({ role: 'user', content: content });

      const completion = await groq.chat.completions.create({ 
        messages: [
          { 
            role: 'system', 
            content: 'Eres un experto profesor de programación. Tu ÚNICO objetivo es ayudar con dudas de código, algoritmos y desarrollo de software. Si el usuario pregunta algo ajeno a la programación, responde amablemente que solo puedes ayudar con temas técnicos de programación. Responde de forma concisa en español.' 
          },
          ...history 
        ], 
        model: 'llama3-8b-8192' 
      });

      const assistantResponse = completion.choices[0]?.message?.content || 'No pude generar una respuesta para tu pregunta.';
      
      // Save the response to history
      history.push({ role: 'assistant', content: assistantResponse });

      // Keep history within limits to avoid context window issues
      if (history.length > MAX_HISTORY) history.splice(0, 2); 
      conversationMemory.set(message.channel.id, history);

      await message.reply(assistantResponse);
    } catch (error) {
      await message.reply('Lo siento, tuve un problema al procesar tu pregunta.');
    }
  }
});

// 4. Health Check for Render
const app = express();
app.get('/', (_, res) => {
  console.log('Ping de mantenimiento recibido: Manteniendo el bot despierto.');
  res.send('Bot Online');
});
app.listen(PORT, () => console.log(`Puerto ${PORT} abierto`));

client.login(TOKEN).catch(error => {
  console.error('CRITICAL ERROR: Failed to login to Discord.');
  console.error(error.message);
  process.exit(1);
});