const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('device')
        .setDescription('Busca especificações de um dispositivo')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do dispositivo')
                .setRequired(true)),
    
    async execute(interaction) {
        const deviceName = interaction.options.getString('nome');
        const apiUrl = `https://gsmarena-api-lptq.onrender.com/api/search?name=${encodeURIComponent(deviceName)}`;
        
        await interaction.deferReply();
        
        try {
            const response = await axios.get(apiUrl);
            const devices = response.data.devices;
            
            if (!devices || devices.length === 0) {
                return interaction.editReply('Nenhum dispositivo encontrado.');
            }
            
            if (devices.length === 1) {
                return sendDeviceEmbed(interaction, devices[0]);
            }
            
            const options = devices.slice(0, 25).map(device => ({
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
            console.error("Erro ao buscar dispositivos:", error);
            interaction.editReply('Ocorreu um erro ao buscar o dispositivo.');
        }
    }
};

// Captura a interação com a lista de seleção
this.interactionHandler = async (interaction) => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'select_device') return;
    
    await interaction.deferUpdate();
    console.log(`Usuário selecionou: ${interaction.values[0]}`);
    
    const deviceId = interaction.values[0];
    const apiUrl = `https://gsmarena-api-lptq.onrender.com/api/devices/${deviceId}`;
    
    try {
        const response = await axios.get(apiUrl);
        const device = response.data.device;
        await sendDeviceEmbed(interaction, device);
    } catch (error) {
        console.error("Erro ao buscar detalhes do dispositivo:", error);
        interaction.followUp({ content: 'Ocorreu um erro ao buscar o dispositivo.', ephemeral: true });
    }
};

async function sendDeviceEmbed(interaction, device) {
    const embed = new EmbedBuilder()
        .setTitle(device.name)
        .setURL(device.url)
        .setThumbnail(device.img)
        .setDescription(`**Marca:** ${device.brand}\n[Ver especificações completas](${device.url})`)
        .setColor('#9900FF')
        .setFooter({ text: 'Powered by Next AI & GSMArena2API' });
    
    interaction.editReply({ embeds: [embed], components: [] });

} 

module.exports = { data, execute, selectDeviceInteraction };
