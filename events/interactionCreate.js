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

      // ===== MODAL =====
      if (interaction.isModalSubmit() && interaction.customId === 'formulario_registro') {

        const nome = interaction.fields.getTextInputValue('nome');
        const id = interaction.fields.getTextInputValue('id');
        const telefone = interaction.fields.getTextInputValue('telefone');
        const vulgo = interaction.fields.getTextInputValue('vulgo');

        if (!/^\d+$/.test(id)) {
          return interaction.reply({ content: '❌ ID inválido!', flags: 64 });
        }

        await interaction.guild.members.fetch();

        const recrutadores = [];

        for (const cargoId of config.cargosRecrutadores) {
          const role = interaction.guild.roles.cache.get(cargoId);
          if (!role) continue;
          role.members.forEach(m => recrutadores.push(m));
        }

        const unique = [...new Map(recrutadores.map(m => [m.id, m])).values()];

        const options = unique.slice(0, 25).map(m => ({
          label: m.displayName,
          value: m.id
        }));

        if (options.length === 0) {
          return interaction.reply({ content: '❌ Nenhum recrutador encontrado!', flags: 64 });
        }

        dadosTemp[interaction.user.id] = { nome, id, telefone, vulgo };

        const selectRecrutador = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_recrutador')
            .setPlaceholder('Selecione o recrutador')
            .addOptions(options)
        );

        // 🔥 AGORA USA FAMÍLIAS + LIDERANÇA
        const cargosOptions = [
          ...Object.entries(config.familias).map(([id, data]) => {
            const role = interaction.guild.roles.cache.get(id);
            return {
              label: role ? role.name : data.nome,
              value: id
            };
          }),

          ...config.lideranca.map(id => {
            const role = interaction.guild.roles.cache.get(id);
            return {
              label: role ? role.name : 'Liderança',
              value: id
            };
          })
        ];

        const selectCargo = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_cargo')
            .setPlaceholder('Selecione o cargo')
            .addOptions(cargosOptions)
        );

        return interaction.reply({
          content: 'Selecione recrutador e cargo:',
          components: [selectRecrutador, selectCargo],
          flags: 64
        });
      }

      // ===== SELECT =====
      if (interaction.isStringSelectMenu()) {

        const dados = dadosTemp[interaction.user.id];
        if (!dados) {
          return interaction.reply({ content: '❌ Dados expiraram.', flags: 64 });
        }

        if (interaction.customId === 'select_recrutador') {
          dados.recrutador = interaction.values[0];
          return interaction.reply({ content: '✅ Recrutador selecionado!', flags: 64 });
        }

        if (interaction.customId === 'select_cargo') {

          dados.cargo = interaction.values[0];

          const nomeCanal = `registro-${dados.nome.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

          const canal = await interaction.guild.channels.create({
            name: nomeCanal,
            topic: interaction.user.id,
            type: ChannelType.GuildText,
            parent: config.categoriaTickets,
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
              { name: 'Telefone', value: dados.telefone }
            );

          const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`aprovar_${dados.cargo}`)
              .setLabel('Aprovar')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('reprovar')
              .setLabel('Reprovar')
              .setStyle(ButtonStyle.Danger)
          );

          await canal.send({ embeds: [embed], components: [botoes] });

          delete dadosTemp[interaction.user.id];

          return interaction.reply({ content: '✅ Ticket criado!', flags: 64 });
        }
      }

      // ===== APROVAR =====
      if (interaction.isButton() && interaction.customId.startsWith('aprovar')) {

        const temPermissao = interaction.member.roles.cache.some(role =>
          config.cargosRecrutadores.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
        }

        await interaction.deferUpdate();

        const cargoEscolhido = interaction.customId.split('_')[1];
        const membro = interaction.guild.members.cache.get(interaction.channel.topic);

        if (!membro) return;

        const embed = interaction.message.embeds[0];
        const getField = (n) => embed.data.fields.find(f => f.name === n)?.value || '';

        const id = getField('ID');
        const vulgo = getField('Vulgo');
        const nome = getField('Nome');
        const telefone = getField('Telefone');

        let cargosAdicionar = [];
        let nomeCargo = 'Membro';

        // ===== FAMÍLIAS =====
        if (config.familias[cargoEscolhido]) {
          const familia = config.familias[cargoEscolhido];

          nomeCargo = familia.nome;

          cargosAdicionar = [
            cargoEscolhido,
            familia.base
          ];
        }

        // ===== LIDERANÇA =====
        else if (config.lideranca.includes(cargoEscolhido)) {

          nomeCargo = 'Alta Cúpula';

          cargosAdicionar = [
            cargoEscolhido,
            config.padrao.lideranca.base,
            ...config.padrao.lideranca.extra
          ];
        }

        else {
          console.log('⚠️ Cargo não configurado:', cargoEscolhido);
          return;
        }

        // 🔥 REMOVE FAMÍLIA ANTIGA
        const todasFamilias = Object.keys(config.familias);

        const remover = membro.roles.cache
          .filter(role => todasFamilias.includes(role.id))
          .map(role => role.id);

        if (remover.length > 0) {
          await membro.roles.remove(remover);
        }

        // 🔥 ADD CARGOS
        const faltando = cargosAdicionar.filter(c =>
          !membro.roles.cache.has(c)
        );

        if (faltando.length > 0) {
          await membro.roles.add(faltando);
        }

        // ===== APELIDO =====
        let nickname = `[${nomeCargo}] ${id} | ${vulgo}`;
        if (nickname.length > 32) nickname = `[${nomeCargo}] ${vulgo}`.slice(0, 32);

        await membro.setNickname(nickname).catch(() => {});

        await membro.roles.remove(config.cargoRemover);

        // ===== LOG CENTRAL =====
        const canalRegistro = interaction.guild.channels.cache.get('1485727631067451634');

        if (canalRegistro) {
          canalRegistro.send(`📜 **Batizado**\n\n👤 ${nome}\n🕶️ ${vulgo}\n🆔 ${id}\n📞 ${telefone}\n🏷️ ${nomeCargo}\n🧑‍💼 ${interaction.user.tag}`);
        }

        const log = interaction.guild.channels.cache.get(config.logAprovacoes);
        if (log) {
          log.send(`✅ ${membro.user.tag} aprovado por ${interaction.user.tag}\nCargo: ${nomeCargo}\nApelido: ${nickname}`);
        }

        await interaction.message.edit({ content: '✅ Aprovado!', components: [] });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

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

      // ===== MODAL =====
      if (interaction.isModalSubmit() && interaction.customId === 'formulario_registro') {

        const nome = interaction.fields.getTextInputValue('nome');
        const id = interaction.fields.getTextInputValue('id');
        const telefone = interaction.fields.getTextInputValue('telefone');
        const vulgo = interaction.fields.getTextInputValue('vulgo');

        if (!/^\d+$/.test(id)) {
          return interaction.reply({ content: '❌ ID inválido!', flags: 64 });
        }

        await interaction.guild.members.fetch();

        const recrutadores = [];

        for (const cargoId of config.cargosRecrutadores) {
          const role = interaction.guild.roles.cache.get(cargoId);
          if (!role) continue;
          role.members.forEach(m => recrutadores.push(m));
        }

        const unique = [...new Map(recrutadores.map(m => [m.id, m])).values()];

        const options = unique.slice(0, 25).map(m => ({
          label: m.displayName,
          value: m.id
        }));

        if (options.length === 0) {
          return interaction.reply({ content: '❌ Nenhum recrutador encontrado!', flags: 64 });
        }

        dadosTemp[interaction.user.id] = { nome, id, telefone, vulgo };

        const selectRecrutador = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_recrutador')
            .setPlaceholder('Selecione o recrutador')
            .addOptions(options)
        );

        // 🔥 AGORA USA FAMÍLIAS + LIDERANÇA
        const cargosOptions = [
          ...Object.entries(config.familias).map(([id, data]) => {
            const role = interaction.guild.roles.cache.get(id);
            return {
              label: role ? role.name : data.nome,
              value: id
            };
          }),

          ...config.lideranca.map(id => {
            const role = interaction.guild.roles.cache.get(id);
            return {
              label: role ? role.name : 'Liderança',
              value: id
            };
          })
        ];

        const selectCargo = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_cargo')
            .setPlaceholder('Selecione o cargo')
            .addOptions(cargosOptions)
        );

        return interaction.reply({
          content: 'Selecione recrutador e cargo:',
          components: [selectRecrutador, selectCargo],
          flags: 64
        });
      }

      // ===== SELECT =====
      if (interaction.isStringSelectMenu()) {

        const dados = dadosTemp[interaction.user.id];
        if (!dados) {
          return interaction.reply({ content: '❌ Dados expiraram.', flags: 64 });
        }

        if (interaction.customId === 'select_recrutador') {
          dados.recrutador = interaction.values[0];
          return interaction.reply({ content: '✅ Recrutador selecionado!', flags: 64 });
        }

        if (interaction.customId === 'select_cargo') {

          dados.cargo = interaction.values[0];

          const nomeCanal = `registro-${dados.nome.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

          const canal = await interaction.guild.channels.create({
            name: nomeCanal,
            topic: interaction.user.id,
            type: ChannelType.GuildText,
            parent: config.categoriaTickets,
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
              { name: 'Telefone', value: dados.telefone }
            );

          const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`aprovar_${dados.cargo}`)
              .setLabel('Aprovar')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('reprovar')
              .setLabel('Reprovar')
              .setStyle(ButtonStyle.Danger)
          );

          await canal.send({ embeds: [embed], components: [botoes] });

          delete dadosTemp[interaction.user.id];

          return interaction.reply({ content: '✅ Ticket criado!', flags: 64 });
        }
      }

      // ===== APROVAR =====
      if (interaction.isButton() && interaction.customId.startsWith('aprovar')) {

        const temPermissao = interaction.member.roles.cache.some(role =>
          config.cargosRecrutadores.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
        }

        await interaction.deferUpdate();

        const cargoEscolhido = interaction.customId.split('_')[1];
        const membro = interaction.guild.members.cache.get(interaction.channel.topic);

        if (!membro) return;

        const embed = interaction.message.embeds[0];
        const getField = (n) => embed.data.fields.find(f => f.name === n)?.value || '';

        const id = getField('ID');
        const vulgo = getField('Vulgo');
        const nome = getField('Nome');
        const telefone = getField('Telefone');

        let cargosAdicionar = [];
        let nomeCargo = 'Membro';

        // ===== FAMÍLIAS =====
        if (config.familias[cargoEscolhido]) {
          const familia = config.familias[cargoEscolhido];

          nomeCargo = familia.nome;

          cargosAdicionar = [
            cargoEscolhido,
            familia.base
          ];
        }

        // ===== LIDERANÇA =====
        else if (config.lideranca.includes(cargoEscolhido)) {

          nomeCargo = 'Alta Cúpula';

          cargosAdicionar = [
            cargoEscolhido,
            config.padrao.lideranca.base,
            ...config.padrao.lideranca.extra
          ];
        }

        else {
          console.log('⚠️ Cargo não configurado:', cargoEscolhido);
          return;
        }

        // 🔥 REMOVE FAMÍLIA ANTIGA
        const todasFamilias = Object.keys(config.familias);

        const remover = membro.roles.cache
          .filter(role => todasFamilias.includes(role.id))
          .map(role => role.id);

        if (remover.length > 0) {
          await membro.roles.remove(remover);
        }

        // 🔥 ADD CARGOS
        const faltando = cargosAdicionar.filter(c =>
          !membro.roles.cache.has(c)
        );

        if (faltando.length > 0) {
          await membro.roles.add(faltando);
        }

        // ===== APELIDO =====
        let nickname = `[${nomeCargo}] ${id} | ${vulgo}`;
        if (nickname.length > 32) nickname = `[${nomeCargo}] ${vulgo}`.slice(0, 32);

        await membro.setNickname(nickname).catch(() => {});

        await membro.roles.remove(config.cargoRemover);

        // ===== LOG CENTRAL =====
        const canalRegistro = interaction.guild.channels.cache.get('1485727631067451634');

        if (canalRegistro) {
          canalRegistro.send(`📜 **Batizado**\n\n👤 ${nome}\n🕶️ ${vulgo}\n🆔 ${id}\n📞 ${telefone}\n🏷️ ${nomeCargo}\n🧑‍💼 ${interaction.user.tag}`);
        }

        const log = interaction.guild.channels.cache.get(config.logAprovacoes);
        if (log) {
          log.send(`✅ ${membro.user.tag} aprovado por ${interaction.user.tag}\nCargo: ${nomeCargo}\nApelido: ${nickname}`);
        }

        await interaction.message.edit({ content: '✅ Aprovado!', components: [] });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

      // ===== REPROVAR =====
      if (interaction.isButton() && interaction.customId === 'reprovar') {

        const temPermissao = interaction.member.roles.cache.some(role =>
          config.cargosRecrutadores.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
        }

        await interaction.update({ content: '❌ Reprovado!', components: [] });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

    } catch (err) {
      console.error('💥 ERRO DETALHADO:', err);

      if (interaction && !interaction.replied) {
        interaction.reply({ content: `❌ Erro: ${err.message}`, flags: 64 }).catch(() => {});
      }
    }
  });
};
