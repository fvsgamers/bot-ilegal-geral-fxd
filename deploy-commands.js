require('dotenv').config(); // 🔑 importa o .env
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

// lê todos os comandos da pasta commands
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`⚡ Registrando ${commands.length} comandos...`);

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error('💥 ERRO AO REGISTRAR COMANDOS:', error);
  }
})();
