const { Command } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');
const ID_DO_CANAL = 1485775547723284571;

module.exports = class AtaCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'ata',
      description: 'Criar uma ata manualmente'
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('ata')
        .setDescription('Criar uma ata')

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
            .setDescription('Assuntos')
            .setRequired(true))

        .addStringOption(option =>
          option.setName('decisoes')
            .setDescription('Decisões')
            .setRequired(true))

        .addStringOption(option =>
          option.setName('punicoes')
            .setDescription('Punições')
            .setRequired(false))
    );
  }

  async chatInputRun(interaction) {

    const data = interaction.options.getString('data');
    const participantes = interaction.options.getString('participantes');
    const assuntos = interaction.options.getString('assuntos');
    const decisoes = interaction.options.getString('decisoes');
    const punicoes = interaction.options.getString('punicoes') || 'Nenhuma';

    const embed = new EmbedBuilder()
      .setTitle('📄 ATA DE REUNIÃO')
      .setColor('#0f172a')
      .addFields(
        { name: '📅 Data', value: data, inline: true },
        { name: '👤 Autor', value: interaction.user.username, inline: true },
        { name: '👥 Participantes', value: participantes },
        { name: '📋 Assuntos', value: assuntos },
        { name: '✅ Decisões', value: decisoes },
        { name: '⚠️ Punições', value: punicoes }
      )
      .setTimestamp();

    const canal = interaction.guild.channels.cache.get('ID_DO_CANAL');

    await canal.send({ embeds: [embed] });

    await interaction.reply({
      content: '✅ Ata criada com sucesso!',
      ephemeral: true
    });
  }
};
