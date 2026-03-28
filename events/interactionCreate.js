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
const CARGO_PARTICIPANTE = '1485779730845270036';
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
      if (interaction.isStringSelectMenu() && interaction.customId === 'ata_select_familia') {

        await interaction.deferUpdate();
      
        const familiaId = interaction.values[0];
      
        await interaction.guild.members.fetch();
      
        const membros = interaction.guild.members.cache.filter(m =>
          m.roles.cache.some(r => config.lideranca.includes(r.id))
        );
      
        if (!membros.size) {
          return interaction.editReply({
            content: '❌ Nenhum líder encontrado.',
            components: []
          });
        }
      
        const select = new StringSelectMenuBuilder()
          .setCustomId(`ata_select_responsavel_${familiaId}`)
          .setPlaceholder('Selecionar responsável')
          .addOptions(
            membros.map(m => ({
              label: m.displayName,
              value: m.id
            })).slice(0, 25)
          );
      
        await interaction.editReply({
          content: '🏷️ Escolha o responsável:',
          components: [new ActionRowBuilder().addComponents(select)]
        });
      }
      // ================= FAMÍLIA =================
      if (interaction.isButton() && interaction.customId === 'abrir_ata') {

        if (interaction.channel.id !== CANAL_PERMITIDO)
          return interaction.reply({ content: '❌ Canal incorreto.', ephemeral: true });
      
        if (!interaction.member.roles.cache.some(r => CARGOS_PERMITIDOS.includes(r.id)))
          return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
      
        // 🔥 RESPONDE IMEDIATAMENTE
        await interaction.deferReply({ ephemeral: true });
      
        const select = new StringSelectMenuBuilder()
          .setCustomId('ata_select_familia')
          .setPlaceholder('Escolher família')
          .addOptions(
            Object.entries(config.familias).map(([id, f]) => ({
              label: f.nome,
              value: id
            })).slice(0, 25)
          );
      
        await interaction.editReply({
          content: '👨‍👩‍👧 Escolha a família:',
          components: [new ActionRowBuilder().addComponents(select)]
        });
      }

      // ================= RESPONSÁVEL =================
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ata_select_responsavel_')) {

        const familiaId = interaction.customId.split('_')[2];
        const responsavel = interaction.values[0];

        const membros = interaction.guild.members.cache.filter(m =>
          m.roles.cache.has(CARGO_PARTICIPANTE)
        );

        const select = new StringSelectMenuBuilder()
          .setCustomId(`ata_select_participantes_${familiaId}_${responsavel}`)
          .setPlaceholder('Selecionar participantes')
          .setMinValues(1)
          .setMaxValues(5)
          .addOptions(
            membros.map(m => ({
              label: m.displayName,
              value: m.id
            })).slice(0, 25)
          );

        return interaction.update({
          content: '👥 Escolha os participantes:',
          components: [new ActionRowBuilder().addComponents(select)]
        });
      }

      // ================= PARTICIPANTES =================
      
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ata_select_participantes_')) {

        const [, , familiaId, responsavel] = interaction.customId.split('_');
        const participantes = interaction.values;
      
        const chave = `${interaction.user.id}_${Date.now()}`;
        dadosTemp[chave] = { familiaId, responsavel, participantes };
      
        const modal = new ModalBuilder()
          .setCustomId(`modal_ata_${chave}`)
          .setTitle('📄 Finalizar ATA');
      
        modal.addComponents(
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
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ata_modal_')) {
        
        const parts = interaction.customId.split('_');

        const familiaId = parts[2];
        const responsavel = parts[3];
        const participantes = parts[4].split(',');

        const nomeFamilia = config.familias[familiaId].nome;

        const data = JSON.parse(fs.readFileSync(CAMINHO));
        data.contador++;
        fs.writeFileSync(CAMINHO, JSON.stringify(data, null, 2));
      
        const numero = String(data.contador).padStart(3, '0');
      
        const embed = new EmbedBuilder()
          .setTitle(`📄 ATA #${numero}`)
          .setColor('#2b2d31')
          .addFields(
            { name: '👨‍👩‍👧 Família', value: nomeFamilia },
            { name: '🏷️ Responsável', value: `<@${responsavel}>`}
          );
            const chunks = [];
            let temp = '';
            
            for (const id of participantes) {
              const mention = `<@${id}>, `;
            
              if ((temp + mention).length > 1024) {
                chunks.push(temp);
                temp = '';
              }
            
              temp += mention;
            }
            
            if (temp) chunks.push(temp);
            
            chunks.forEach((chunk, i) => {
              embed.addFields({
                name: `👥 Participantes ${i + 1}`,
                value: chunk
              });
            });
            //{ name: '👥 Participantes', value: participantes.map(id => `<@${id}>`).join(', ') },
            embed.addFields(
            { name: '📋 Assuntos', value: interaction.fields.getTextInputValue('assuntos') },
            { name: '✅ Decisões', value: interaction.fields.getTextInputValue('decisoes') },
            { name: '👤 Autor', value: interaction.member.displayName },
            { name: '📅 Data', value: `<t:${Math.floor(Date.now()/1000)}:f>` }
          );
          .setTimestamp();
      
        await interaction.reply({ content: '✅ ATA criada!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed] });
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
            .setCustomId('registro_select_familia')
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

        if (interaction.customId === 'registro_select_familia') {
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

        // ===== REGISTRO CENTRAL =====
        const canalRegistro = interaction.guild.channels.cache.get('1487297164811046912');

        if (canalRegistro) {
          const linha = `| ----------------------------------------------------------------|`;

          const mensagem = `\n📜 **Batizado**\n\n👤 **Nome:** ${dados.nome}\n🕶️ **Vulgo:** ${dados.vulgo}\n🆔 **ID:** ${dados.id}\n📞 **Telefone:** ${dados.telefone}\n🏷️ **Cargo:** ${apelidosCargos[dados.cargo]}\n👨‍👩‍👧 **Família:** ${config.familias[dados.familia]?.nome || 'Família'}\n🧑‍💼 **Aprovado por:** ${interaction.member.displayName}\n\n${linha}\n`;

          canalRegistro.send(mensagem);
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
