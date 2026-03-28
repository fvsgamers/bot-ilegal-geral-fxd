const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const config = require('../config.json');

const CAMINHO = './atas.json';

// cargos que podem usar
const cargosPermitidos = [
  '1485779006325395606',
  '1485783504250867803'
];

// canal permitido
const CANAL_ATA = '1485775547723284571';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ata')
    .setDescription('Criar uma ata')

    .addStringOption(opt =>
      opt.setName('familia')
        .setDescription('Família')
        .setRequired(true)
        .setAutocomplete(true))

    .addStringOption(opt =>
      opt.setName('cargo')
        .setDescription('Cargo responsável')
        .setRequired(true)
        .setAutocomplete(true))

    .addStringOption(opt =>
      opt.setName('assuntos')
        .setDescription('Assuntos')
        .setRequired(true))

    .addStringOption(opt =>
      opt.setName('decisoes')
        .setDescription('Decisões')
        .setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'familia') {
      const escolhas = Object.values(config.familias).map(f => f.nome);

      const filtrado = escolhas.filter(f =>
        f.toLowerCase().includes(focused.value.toLowerCase())
      ).slice(0, 25);

      return interaction.respond(
        filtrado.map(f => ({ name: f, value: f }))
      );
    }

    if (focused.name === 'cargo') {
      const cargos = ['Dono', 'Braço Direito', 'Gerente', 'Membro'];

      const filtrado = cargos.filter(c =>
        c.toLowerCase().includes(focused.value.toLowerCase())
      );

      return interaction.respond(
        filtrado.map(c => ({ name: c, value: c }))
      );
    }
  },

  async execute(interaction) {

    // 🔒 canal
    if (interaction.channel.id !== CANAL_ATA) {
      return interaction.reply({
        content: '❌ Use apenas no canal de atas!',
        ephemeral: true
      });
    }

    // 🔒 cargos
    const temPermissao = interaction.member.roles.cache.some(r =>
      cargosPermitidos.includes(r.id)
    );

    if (!temPermissao) {
      return interaction.reply({
        content: '❌ Você não tem permissão!',
        ephemeral: true
      });
    }

    // 📊 contador
    const dataFile = JSON.parse(fs.readFileSync(CAMINHO));
    dataFile.contador += 1;
    fs.writeFileSync(CAMINHO, JSON.stringify(dataFile, null, 2));

    const numero = String(dataFile.contador).padStart(3, '0');

    // dados
    const familia = interaction.options.getString('familia');
    const cargo = interaction.options.getString('cargo');
    const assuntos = interaction.options.getString('assuntos');
    const decisoes = interaction.options.getString('decisoes');

    const embed = new EmbedBuilder()
      .setTitle(`📄 ATA #${numero}`)
      .setColor('#0f172a')
      .addFields(
        { name: '👨‍👩‍👧 Família', value: familia },
        { name: '🏷️ Responsável', value: cargo },
        { name: '📋 Assuntos', value: assuntos },
        { name: '✅ Decisões', value: decisoes },
        { name: '👤 Autor', value: interaction.member.displayName }
      )
      .setTimestamp();

    await interaction.reply({
      content: `✅ ATA #${numero} criada!`,
      ephemeral: true
    });

    await interaction.channel.send({ embeds: [embed] });
  }
};
