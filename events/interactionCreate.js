const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const config = require('../config.json');

const dadosTemp = {};

// Cargos autorizados a aprovar/reprovar
const cargosAprovadores = [
  '1485795028424196176',
  '1485779006325395606',
  '1485783504250867803',
  '1485784858591756420',
  '1485783736606916733'
];

// Mapping para apelidos
const apelidosCargos = {
  '1485783504250867803': 'Dono',
  '1485783736606916733': 'Braço Direito',
  '1485784858591756420': 'Braço Esquerdo',
  '1487292502095429653': 'Gerente',
  '1487292693250834562': 'Sub Gerente',
  '1485785011931316224': 'Membro'
};

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      // ===== COMANDOS =====
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
        return;
      }

      // ===== ABRIR FORM =====
      if (interaction.isButton() && interaction.customId === 'abrir_formulario') {
        const modal = new ModalBuilder()
          .setCustomId('formulario_registro')
          .setTitle('📋 Recrutamento');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('nome')
              .setLabel('Nome e Sobrenome')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('id')
              .setLabel('ID (somente números)')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('telefone')
              .setLabel('Telefone')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('vulgo')
              .setLabel('Vulgo')
              .setStyle(TextInputStyle.Short)
          )
        );

        return interaction.showModal(modal);
      }

      // ===== MODAL SUBMIT =====
      if (interaction.isModalSubmit() && interaction.customId === 'formulario_registro') {
        const nome = interaction.fields.getTextInputValue('nome');
        const id = interaction.fields.getTextInputValue('id');
        const telefone = interaction.fields.getTextInputValue('telefone');
        const vulgo = interaction.fields.getTextInputValue('vulgo');

        if (!/^\d+$/.test(id)) return interaction.reply({ content: '❌ ID inválido!', flags: 64 });

        await interaction.guild.members.fetch();
        dadosTemp[interaction.user.id] = { nome, id, telefone, vulgo };

        // ===== CARGOS =====
        const cargosOptions = Object.entries(apelidosCargos).map(([id, nome]) => ({
          label: nome,
          value: id
        }));

        const selectCargo = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_cargo')
            .setPlaceholder('Selecione o cargo')
            .addOptions(cargosOptions)
        );

        // ===== FAMÍLIAS =====
        const familiasOptions = Object.entries(config.familias).map(([id, data]) => ({
          label: data.nome,
          value: id
        })).slice(0, 25);

        const selectFamilia = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_familia')
            .setPlaceholder('Selecione a família')
            .addOptions(familiasOptions)
        );

        return interaction.reply({
          content: 'Selecione cargo e família:',
          components: [selectCargo, selectFamilia],
          flags: 64
        });
      }

      // ===== SELECT MENU =====
      if (interaction.isStringSelectMenu()) {
        const dados = dadosTemp[interaction.user.id];
        if (!dados) return interaction.reply({ content: '❌ Dados expiraram.', flags: 64 });

        if (interaction.customId === 'select_cargo') {
          dados.cargo = interaction.values[0];
          return interaction.reply({ content: `✅ Cargo selecionado!`, flags: 64 });
        }

        if (interaction.customId === 'select_familia') {
          dados.familia = interaction.values[0];

          const nomeCanal = `registro-${dados.nome.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

          const canal = await interaction.guild.channels.create({
            name: nomeCanal,
            topic: interaction.user.id,
            type: ChannelType.GuildText,
            parent: '1485793846649552957',
            permissionOverwrites: [
              { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
              { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
              ...config.cargosRecrutadores.map(c => ({
                id: c,
                allow: [PermissionsBitField.Flags.ViewChannel]
              }))
            ]
          });

          const embed = new EmbedBuilder()
            .setTitle('📋 Novo Registro')
            .addFields(
              { name: 'Nome', value: dados.nome },
              { name: 'Vulgo', value: dados.vulgo },
              { name: 'ID', value: dados.id },
              { name: 'Telefone', value: dados.telefone },
              { name: 'Cargo', value: apelidosCargos[dados.cargo] },
              { name: 'Família', value: config.familias[dados.familia]?.nome || 'Família' }
            );

          const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('aprovar')
              .setLabel('Aprovar')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('reprovar')
              .setLabel('Reprovar')
              .setStyle(ButtonStyle.Danger)
          );

          await canal.send({ embeds: [embed], components: [botoes] });

          return interaction.reply({ content: `✅ Canal criado em registros!`, flags: 64 });
        }
      }

      // ===== APROVAR =====
      if (interaction.isButton() && interaction.customId === 'aprovar') {
        const canal = interaction.channel;
        const dados = dadosTemp[canal.topic];
        if (!dados) return interaction.reply({ content: '❌ Dados expiraram.', flags: 64 });

        // Permissão para aprovar apenas cargos autorizados
        const temPermissao = interaction.member.roles.cache.some(role => cargosAprovadores.includes(role.id));
        if (!temPermissao) return interaction.reply({ content: '❌ Você não pode aprovar.', flags: 64 });

        const membro = interaction.guild.members.cache.get(canal.topic);
        if (!membro) return;

        // ===== CARGOS =====
        let cargosAdicionar = [ '1485779730845270036', dados.cargo ];

        if (['1485783504250867803','1485783736606916733','1485784858591756420'].includes(dados.cargo)) {
          cargosAdicionar.push('1485779006325395606', '1485784175742287983');
        }

        if (dados.familia) {
          cargosAdicionar.push(dados.familia, config.familias[dados.familia].base);
        }

        const todasFamilias = Object.keys(config.familias);
        const remover = membro.roles.cache.filter(r => todasFamilias.includes(r.id)).map(r => r.id);
        if (remover.length > 0) await membro.roles.remove(remover);

        if (membro.roles.cache.has('1485783096250077246')) {
          await membro.roles.remove('1485783096250077246');
        }

        const faltando = cargosAdicionar.filter(c => !membro.roles.cache.has(c));
        if (faltando.length > 0) await membro.roles.add(faltando);

        // ===== Nickname com formato exato =====
        const apelido = apelidosCargos[dados.cargo] || 'Membro';
        const nickname = `[${apelido}] ${dados.id} | ${dados.vulgo}`;
        await membro.setNickname(nickname.slice(0,32)).catch(() => {});

        await interaction.update({ content: '✅ Aprovado!', components: [] });
        delete dadosTemp[membro.id];

        setTimeout(() => canal.delete().catch(() => {}), 5000);
      }

      // ===== REPROVAR =====
      if (interaction.isButton() && interaction.customId === 'reprovar') {
        const canal = interaction.channel;
        const dados = dadosTemp[canal.topic];
        delete dadosTemp[canal.topic];

        const temPermissao = interaction.member.roles.cache.some(role => cargosAprovadores.includes(role.id));
        if (!temPermissao) return interaction.reply({ content: '❌ Você não pode reprovar.', flags: 64 });

        await interaction.update({ content: '❌ Reprovado!', components: [] });
        setTimeout(() => canal.delete().catch(() => {}), 5000);
      }

    } catch (err) {
      console.error('💥 ERRO DETALHADO:', err);
      if (interaction && !interaction.replied) {
        interaction.reply({ content: `❌ Erro: ${err.message}`, flags: 64 }).catch(() => {});
      }
    }
  });
};
