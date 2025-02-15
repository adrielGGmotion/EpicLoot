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
        const apiBaseUrl = 'https://gsmarena-api-lptq.onrender.com';

        try {
            const searchResponse = await axios.get(`${apiBaseUrl}/api/search?name=${encodeURIComponent(nome)}`);
            const { success, devices } = searchResponse.data;

            if (!success || !devices || devices.length === 0) {
                return interaction.editReply('Nenhum dispositivo encontrado.');
            }

            if (devices.length === 1) {
                return enviarEmbed(interaction, apiBaseUrl, devices[0]);
            }

            const options = devices.map(device => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(device.name)
                    .setValue(device.id) 
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_device')
                .setPlaceholder('Selecione um dispositivo')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({ content: 'Selecione o dispositivo correto:', components: [row] });

            const filter = i => i.customId === 'select_device' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                await i.deferUpdate();
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

async function enviarEmbed(interaction, apiBaseUrl, device) {
    try {
        const deviceResponse = await axios.get(`${apiBaseUrl}/api/device/${device.id}`);
        const deviceData = deviceResponse.data;

        const traducao = {
            'Display size': 'Tamanho da tela',
            'Display resolution': 'Resolução da tela',
            'Camera pixels': 'Câmera principal',
            'Video pixels': 'Resolução de vídeo',
            'RAM size': 'Memória RAM',
            'Chipset': 'Processador',
            'Battery size': 'Bateria',
            'Battery type': 'Tipo de bateria'
        };

        const quickSpecs = deviceData.quickSpec.map(spec => `**${traducao[spec.name] || spec.name}:** ${spec.value}`).join('\n');
        const gsmaLink = `https://www.gsmarena.com/${deviceData.slug || device.slug}.php`;

        const embed = new EmbedBuilder()
            .setTitle(deviceData.name)
            .setURL(gsmaLink)
            .setThumbnail(deviceData.img || device.img)
            .setDescription(quickSpecs || 'Nenhuma especificação disponível.')
            .setColor('#9900ff');

        await interaction.editReply({ content: '', embeds: [embed], components: [] });

    } catch (error) {
        console.error(error);
        interaction.editReply('Erro ao buscar detalhes do dispositivo.');
    }
}
