const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel-ata')
    .setDescription('Abrrir sistema de ATA'),

  async execute(interaction) {

    const temPermissao = interaction.member.roles.cache.some(role =>
      config.lideranca.includes(role.id)
    );

    if (!temPermissao) {
      return interaction.reply({
        content: '❌ Apenas líderes podem usar!',
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_ata')
        .setLabel('📄 Criar ATA')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: '📋 Sistema de ATA',
      components: [row]
    });
  }
};
