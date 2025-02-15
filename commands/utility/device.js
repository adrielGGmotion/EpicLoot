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
        const apiBaseUrl = 'https://gsmarena-api-lptq.onrender.com'; // Substitua pelo seu link real

        try {
            // Buscar dispositivos pelo nome
            const searchResponse = await axios.get(`${apiBaseUrl}/api/search?name=${encodeURIComponent(nome)}`);
            const { success, devices } = searchResponse.data;

            if (!success || !devices || devices.length === 0) {
                return interaction.editReply('Nenhum dispositivo encontrado.');
            }

            if (devices.length === 1) {
                return enviarEmbed(interaction, apiBaseUrl, devices[0]);
            }

            // Criar um menu de seleção com os dispositivos encontrados
            const options = devices.map(device => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(device.name)
                    .setValue(device.id) // Usamos o device_id diretamente
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
    await i.deferUpdate(); // Evita timeout na resposta do Discord

    const selectedDevice = devices.find(d => d.id === i.values[0]);
    if (selectedDevice) {
        await enviarEmbed(i, apiBaseUrl, selectedDevice);
    } else {
        await i.editReply({ content: 'Erro ao encontrar o dispositivo.', components: [] });
    }
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
async function enviarEmbed(interaction, apiBaseUrl, device) {
    try {
        // Busca as especificações do dispositivo
        const deviceResponse = await axios.get(`${apiBaseUrl}/api/device/${device.id}`);
        const deviceData = deviceResponse.data;

        // Formatar especificações principais
        const quickSpecs = deviceData.quickSpec.map(spec => `**${spec.name}:** ${spec.value}`).join('\n');

        // Criar Embed
        const embed = new EmbedBuilder()
            .setTitle(deviceData.name)
            .setThumbnail(deviceData.img || device.img)
            .setDescription(quickSpecs || "Nenhuma especificação rápida disponível.")
            .setColor('#0099ff');

        await interaction.editReply({ content: '', embeds: [embed], components: [] });

    } catch (error) {
        console.error(error);
        interaction.editReply('Erro ao buscar detalhes do dispositivo.');
    }
}


