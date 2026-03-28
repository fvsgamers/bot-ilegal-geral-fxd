const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registro')
    .setDescription('Abrir painel de recrutamento'),

  async execute(interaction) {

    // IDs dos cargos que PODEM usar o comando
    const cargosPermitidos = [
      '1485779006325395606',
      '1485783504250867803',
      '1485783736606916733',
      '1485784858591756420'
    ];

    const membro = interaction.member;

    // Verifica se o usuário tem algum dos cargos
    const temPermissao = membro.roles.cache.some(role => 
      cargosPermitidos.includes(role.id)
    );

    if (!temPermissao) {
      return interaction.reply({
        content: '❌ Você não tem permissão para usar este comando.',
        ephemeral: true
      });
    }

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
