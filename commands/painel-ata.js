const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const CARGOS_PERMITIDOS = [
  '1485779006325395606',
  '1485783504250867803',
  '1485783736606916733',
  '1485784858591756420'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel-ata')
    .setDescription('Abrir painel de ATA'),

  async execute(interaction) {

    const temPermissao = interaction.member.roles.cache.some(role =>
      CARGOS_PERMITIDOS.includes(role.id)
    );

    if (!temPermissao) {
      return interaction.reply({
        content: '❌ Apenas líderes podem acessar!',
        ephemeral: true
      });
    }

    const botao = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_ata')
        .setLabel('📄 Criar ATA')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: '📋 Painel de ATA',
      components: [botao]
    });
  }
};
