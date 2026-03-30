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
const fs = require('fs');
const CAMINHO = './atas.json';

const CANAL_PERMITIDO = '1485775547723284571';

const CARGOS_PERMITIDOS = [
  '1485779006325395606',
  '1485783504250867803',
  '1485783736606916733',
  '1485784858591756420'
];

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
      // ================= BOTÃO =================
      if (interaction.isButton() && interaction.customId === 'abrir_ata') {

        const temPermissao = interaction.member.roles.cache.some(role =>
          CARGOS_PERMITIDOS.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({
            content: '❌ Sem permissão!',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ata')
          .setTitle('📄 Criar ATA');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('familia')
              .setLabel('Família')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('cargo')
              .setLabel('Responsável')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('assuntos')
              .setLabel('Assuntos')
              .setStyle(TextInputStyle.Paragraph)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('decisoes')
              .setLabel('Decisões')
              .setStyle(TextInputStyle.Paragraph)
          )
        );

        return interaction.showModal(modal);
      }

      // ================= MODAL =================
      if (interaction.isModalSubmit() && interaction.customId === 'modal_ata') {

        // 🔒 canal
        if (interaction.channel.id !== CANAL_PERMITIDO) {
          return interaction.reply({
            content: '❌ Use apenas no canal de atas!',
            ephemeral: true
          });
        }

        // 🔒 cargos
        const temPermissao = interaction.member.roles.cache.some(role =>
          CARGOS_PERMITIDOS.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({
            content: '❌ Sem permissão!',
            ephemeral: true
          });
        }

        // 📊 contador
        const data = JSON.parse(fs.readFileSync(CAMINHO));
        data.contador += 1;
        fs.writeFileSync(CAMINHO, JSON.stringify(data, null, 2));

        const numero = String(data.contador).padStart(3, '0');

        // 📥 dados
        const familia = interaction.fields.getTextInputValue('familia');
        const cargo = interaction.fields.getTextInputValue('cargo');
        const assuntos = interaction.fields.getTextInputValue('assuntos');
        const decisoes = interaction.fields.getTextInputValue('decisoes');

        // 📄 embed
        const embed = new EmbedBuilder()
          .setTitle(`📄 ATA #${numero}`)
          .setColor('#2b2d31')

          .addFields(
            { name: '👨‍👩‍👧 Família', value: familia, inline: true },
            { name: '🏷️ Responsável', value: cargo, inline: true },
            { name: '\u200B', value: '\u200B' },

            { name: '📋 Assuntos', value: assuntos },
            { name: '✅ Decisões', value: decisoes },

            {
              name: '👤 Autor',
              value: interaction.member.displayName
            }
          )

          .setFooter({
            text: `Sistema de Atas • ${interaction.guild.name}`
          })

          .setTimestamp();

        await interaction.reply({
          content: `✅ ATA #${numero} criada!`,
          ephemeral: true
        });

        await interaction.channel.send({ embeds: [embed] });
      }
      
      // 🧠 AUTOCOMPLETE (TEM QUE VIR PRIMEIRO)
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) {
          return command.autocomplete(interaction);
        }
      }
      // COMANDO SLASH
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return await command.execute(interaction);
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
      
        // 🔥 RESPONDE NA HORA (CRÍTICO)
        await interaction.deferUpdate();
      
        const dados = Object.values(dadosTemp).find(d => d.userId === canal.topic);
        if (!dados) return;
      
        // Permissão
        const temPermissao = interaction.member.roles.cache.some(role =>
          cargosAprovadores.includes(role.id)
        );
        if (!temPermissao) return;
      
        const membro = await interaction.guild.members.fetch(canal.topic).catch(() => null);
        if (!membro) return;
      
        // ===== CARGOS =====
        let cargosAdicionar = ['1485779730845270036', dados.cargo];
      
        if ([
          '1485783504250867803',
          '1485783736606916733',
          '1485784858591756420'
        ].includes(dados.cargo)) {
          cargosAdicionar.push('1485779006325395606', '1485784175742287983');
        }
      
        if (dados.familia && config.familias[dados.familia]) {
          cargosAdicionar.push(dados.familia, config.familias[dados.familia].base);
        }
      
        // ===== REMOVER FAMÍLIAS ANTIGAS =====
        const todasFamilias = Object.keys(config.familias);
        const remover = membro.roles.cache
          .filter(r => todasFamilias.includes(r.id))
          .map(r => r.id);
      
        if (remover.length) await membro.roles.remove(remover);
      
        // Remove cargo antigo
        if (membro.roles.cache.has(config.cargoRemover)) {
          await membro.roles.remove(config.cargoRemover);
        }
      
        // ===== ADICIONAR =====
        const faltando = cargosAdicionar.filter(c => !membro.roles.cache.has(c));
        if (faltando.length) await membro.roles.add(faltando);
      
        // ===== NICKNAME =====
        const apelido = apelidosCargos[dados.cargo] || 'Membro';
        const nickname = `[${apelido}] ${dados.id} | ${dados.vulgo}`;
      
        if (membro.manageable) {
          await membro.setNickname(nickname.slice(0, 32)).catch(() => {});
        }
      
        // ===== LOG =====
        const canalRegistro = interaction.guild.channels.cache.get('1487297164811046912');
      
        if (canalRegistro) {
          const mensagem = `
      📜 **Batizado**
      
      👤 **Nome:** ${dados.nome}
      🕶️ **Vulgo:** ${dados.vulgo}
      🆔 **ID:** ${dados.id}
      📞 **Telefone:** ${dados.telefone}
      🏷️ **Cargo:** ${apelidosCargos[dados.cargo]}
      👨‍👩‍👧 **Família:** ${config.familias[dados.familia]?.nome || 'Família'}
      🧑‍💼 **Aprovado por:** ${interaction.member.displayName}
          `;
      
          canalRegistro.send(mensagem);
        }
      
        // ===== EDITA MENSAGEM =====
        await interaction.message.edit({
          content: '✅ Aprovado!',
          components: []
        });
      
        // ===== LIMPA DADOS =====
        delete dadosTemp[dados.userId];
      
        // ===== DELETA CANAL =====
        setTimeout(() => {
          canal.delete().catch(() => {});
        }, 3000);
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
