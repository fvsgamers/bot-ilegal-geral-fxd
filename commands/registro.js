const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registro')
    .setDescription('Abrir painel de recrutamento'),

  async execute(interaction) {

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_formulario')
        .setLabel('📋 Fazer Registro')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: 'Clique abaixo para iniciar seu recrutamento:',
      components: [button]
    });
  }
};
