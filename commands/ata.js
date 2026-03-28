const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ata')
    .setDescription('Criar uma ata de reunião')
    .addStringOption(option =>
      option.setName('data')
        .setDescription('Data da reunião')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('participantes')
        .setDescription('Participantes')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('assuntos')
        .setDescription('Assuntos discutidos')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('decisoes')
        .setDescription('Decisões tomadas')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('punicoes')
        .setDescription('Punições')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const data = interaction.options.getString('data');
      const participantes = interaction.options.getString('participantes');
      const assuntos = interaction.options.getString('assuntos');
      const decisoes = interaction.options.getString('decisoes');
      const punicoes = interaction.options.getString('punicoes') || 'Nenhuma';

      const embed = new EmbedBuilder()
        .setTitle('📄 ATA DE REUNIÃO')
        .setColor('#0f172a')
        .addFields(
          { name: '📅 Data', value: data },
          { name: '👤 Autor', value: interaction.user.username },
          { name: '👥 Participantes', value: participantes },
          { name: '📋 Assuntos', value: assuntos },
          { name: '✅ Decisões', value: decisoes },
          { name: '⚠️ Punições', value: punicoes }
        )
        .setTimestamp();

      const canal = interaction.guild.channels.cache.get('1485775547723284571');

      if (!canal) {
        return interaction.reply({
          content: '❌ Canal não encontrado!',
          ephemeral: true
        });
      }

      await canal.send({ embeds: [embed] });

      await interaction.reply({
        content: '✅ Ata criada com sucesso!',
        ephemeral: true
      });

    } catch (error) {
      console.error(error);
      interaction.reply({
        content: '❌ Erro ao criar a ata.',
        ephemeral: true
      });
    }
  }
};
