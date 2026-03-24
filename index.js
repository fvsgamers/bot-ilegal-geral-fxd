require('dotenv').config();

console.log('ENV TOKEN:', process.env.TOKEN);

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

// comandos
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// eventos
const eventFiles = fs.readdirSync('./events');
for (const file of eventFiles) {
  require(`./events/${file}`)(client);
}

process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado:', error);
});

client.on('error', (error) => {
  console.error('Erro do client:', error);
});

// 🔥 TOKEN CORRETO
const token = process.env.TOKEN;

if (!token) {
  console.error('❌ TOKEN não definido!');
  process.exit(1);
}

console.log('🔑 Iniciando bot...');
console.log('TOKEN:', process.env.TOKEN);
client.login(token);
