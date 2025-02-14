const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('device')
        .setDescription('Busca especificações de um dispositivo')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do dispositivo')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply(); // Evita timeout

        const nome = interaction.options.getString('nome');
        const apiBaseUrl = 'https://seu-api-render.onrender.com/api'; // Substitua pelo seu link real

        try {
            // Buscar dispositivos pelo nome
            const searchResponse = await axios.get(`${apiBaseUrl}/search?name=${encodeURIComponent(nome)}`);
            const devices = searchResponse.data;

            if (!devices || devices.length === 0) {
                return interaction.editReply('Nenhum dispositivo encontrado.');
            }

            if (devices.length === 1) {
                return enviarEmbed(interaction, apiBaseUrl, devices[0].device_id);
            }

            // Se houver múltiplos dispositivos, cria um menu de seleção
            const options = devices.map(device => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(device.name)
                    .setValue(device.device_id)
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_device')
                .setPlaceholder('Selecione um dispositivo')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({ content: 'Selecione o dispositivo correto:', components: [row] });

            // Criando um coletor para capturar a resposta do usuário
            const filter = i => i.customId === 'select_device' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                await i.deferUpdate();
                await enviarEmbed(i, apiBaseUrl, i.values[0]);
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'Tempo esgotado! Nenhum dispositivo selecionado.', components: [] });
                }
            });

        } catch (error) {
            console.error(error);
            interaction.editReply('Erro ao buscar informações. Tente novamente mais tarde.');
        }
    }
};

// Função para buscar as especificações e enviar o embed
async function enviarEmbed(interaction, apiBaseUrl, deviceId) {
    try {
        const deviceResponse = await axios.get(`${apiBaseUrl}/device?device_id=${deviceId}`);
        const device = deviceResponse.data;

        const embed = new EmbedBuilder()
            .setTitle(device.name)
            .setThumbnail(device.img)
            .setDescription(device.quickSpec.map(spec => `**${spec.name}:** ${spec.value}`).join('\n'))
            .setColor('#0099ff');

        await interaction.editReply({ content: '', embeds: [embed], components: [] });

    } catch (error) {
        console.error(error);
        interaction.editReply('Erro ao buscar detalhes do dispositivo.');
    }
}
