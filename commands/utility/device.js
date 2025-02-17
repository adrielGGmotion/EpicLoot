const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const axios = require('axios');

const API_BASE_URL = 'https://gsmarena2api.onrender.com/gsm';

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
        await interaction.deferReply();
        const nome = interaction.options.getString('nome');

        try {
            const searchResponse = await axios.get(`${API_BASE_URL}/search?q=${encodeURIComponent(nome)}`);
            const devices = searchResponse.data;

            if (!devices || devices.length === 0) {
                return interaction.editReply('Nenhum dispositivo encontrado.');
            }

            if (devices.length === 1) {
                return enviarEmbed(interaction, devices[0]);
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
                    await enviarEmbed(i, selectedDevice);
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

async function enviarEmbed(interaction, device) {
    try {
        const [deviceResponse, imagesResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/info/${device.id}`),
            axios.get(`${API_BASE_URL}/images/${device.id}`)
        ]);

        const deviceData = deviceResponse.data;
        const images = imagesResponse.data.images;

        const embed = new EmbedBuilder()
            .setTitle(deviceData.name)
            .setURL(`https://www.gsmarena.com/${device.id}`)
            .setThumbnail(device.image)
            .setImage(images.length > 0 ? images[0] : device.image)
            .setDescription(`**Tela:** ${deviceData.display?.size || 'N/A'}\n**Processador:** ${deviceData.chipset || 'N/A'}\n**Câmera:** ${deviceData.main_camera?.features || 'N/A'}\n**Bateria:** ${deviceData.battery?.type || 'N/A'}`)
            .setColor('#9900ff');

        await interaction.editReply({ content: '', embeds: [embed], components: [] });
    } catch (error) {
        console.error(error);
        interaction.editReply('Erro ao buscar detalhes do dispositivo.');
    }
}
