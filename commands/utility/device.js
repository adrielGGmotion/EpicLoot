const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('device')
        .setDescription('Busca especificações de um dispositivo Android.')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do dispositivo')
                .setRequired(true)
        ),

    async execute(interaction) {
        const deviceName = interaction.options.getString('nome');
        await interaction.deferReply();

        try {
            // Faz a busca na API hospedada no Render
            const searchResponse = await axios.get(`${process.env.API_URL}/gsm/search?q=${encodeURIComponent(deviceName)}`);
            const results = searchResponse.data;

            if (!results || results.length === 0) {
                return interaction.editReply('Nenhum dispositivo encontrado.');
            }

            if (results.length === 1) {
                return sendDeviceDetails(interaction, results[0].id);
            }

            // Criando menu de seleção
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_device')
                        .setPlaceholder('Selecione um dispositivo')
                        .addOptions(results.map(device => ({
                            label: device.title,
                            value: device.id
                        })))
                );
            
            await interaction.editReply({ content: 'Selecione o dispositivo desejado:', components: [row] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Erro ao buscar o dispositivo.');
        }
    }
};

async function sendDeviceDetails(interaction, deviceId) {
    try {
        const infoResponse = await axios.get(`${process.env.API_URL}/gsm/info/${deviceId}`);
        const device = infoResponse.data;

        const embed = new EmbedBuilder()
            .setTitle(device.title)
            .setURL(device.url)
            .setThumbnail(device.image)
            .addFields(
                { name: 'Tela', value: device.specs.display || 'N/A', inline: true },
                { name: 'Processador', value: device.specs.chipset || 'N/A', inline: true },
                { name: 'RAM', value: device.specs.ram || 'N/A', inline: true },
                { name: 'Bateria', value: device.specs.battery || 'N/A', inline: true },
                { name: 'Câmera', value: device.specs.camera || 'N/A', inline: true }
            )
            .setColor('Blue');

        await interaction.editReply({ embeds: [embed], components: [] });
    } catch (error) {
        console.error(error);
        await interaction.editReply('Erro ao obter detalhes do dispositivo.');
    }
}
