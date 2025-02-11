const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('device')
        .setDescription('Busca especificações de um dispositivo Android')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do dispositivo')
                .setRequired(true)),
    
    async execute(interaction) {
        const deviceName = interaction.options.getString('nome').toLowerCase();
        const baseUrl = 'https://gsmarena2api.onrender.com/api';
        
        await interaction.deferReply();
        
        try {
            // 1. Buscar todas as marcas
            const brandsResponse = await axios.get(`${baseUrl}/brands`);
            const brands = brandsResponse.data.brands;
            
            let foundDevices = [];
            
            // 2. Buscar dispositivos dentro de cada marca
            for (const brand of brands) {
                const brandDevicesResponse = await axios.get(`${baseUrl}/brands/${brand.id}`);
                const devices = brandDevicesResponse.data.devices;
                
                // 3. Filtrar dispositivos pelo nome
                const matchedDevices = devices.filter(device => device.name.toLowerCase().includes(deviceName));
                foundDevices = foundDevices.concat(matchedDevices);
            }
            
            if (foundDevices.length === 0) {
                return interaction.editReply('Nenhum dispositivo encontrado com esse nome.');
            }
            
            if (foundDevices.length === 1) {
                return sendDeviceEmbed(interaction, foundDevices[0]);
            }
            
            // Se houver múltiplos dispositivos, criar um menu de seleção
            const options = foundDevices.map(device => ({
                label: device.name,
                value: device.id
            }));
            
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_device')
                    .setPlaceholder('Selecione um dispositivo')
                    .addOptions(options)
            );
            
            interaction.editReply({ content: 'Selecione um dispositivo:', components: [row] });
        } catch (error) {
            console.error(error);
            interaction.editReply('Ocorreu um erro ao buscar o dispositivo.');
        }
    },
    
    async selectDeviceInteraction(interaction) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'select_device') return;
        
        await interaction.deferUpdate();
        
        const deviceId = interaction.values[0];
        const apiUrl = `https://gsmarena2api.onrender.com/api/devices/${deviceId}`;
        
        try {
            const response = await axios.get(apiUrl);
            const device = response.data.device;
            await sendDeviceEmbed(interaction, device);
        } catch (error) {
            console.error(error);
            interaction.followUp({ content: 'Ocorreu um erro ao buscar o dispositivo.', ephemeral: true });
        }
    }
};

async function sendDeviceEmbed(interaction, device) {
    const embed = new EmbedBuilder()
        .setTitle(device.name)
        .setURL(device.url)
        .setThumbnail(device.thumbnail)
        .setDescription(device.summary)
        .setColor('#9900FF')
        .setFooter({ text: 'Powered by Next AI & GSMArena2API' });
    
    interaction.editReply({ embeds: [embed], components: [] });
}
