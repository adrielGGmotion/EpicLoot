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
        console.log(`Comando recebido: /device ${deviceName}`);
        
        try {
            const response = await axios.get(apiUrl);
            console.log(`Resposta da API:`, response.data);
            const devices = response.data.devices;
            
            if (!devices || devices.length === 0) {
                console.log("Nenhum dispositivo encontrado.");
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
            
            console.log("Lista de seleção enviada.");
            interaction.editReply({ content: 'Selecione um dispositivo:', components: [row] });
        } catch (error) {
            console.error("Erro ao buscar dispositivos:", error);
            interaction.editReply('Ocorreu um erro ao buscar o dispositivo.');
        }
    },
    
    async selectDeviceInteraction(interaction) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'select_device') return;
        
        await interaction.deferUpdate();
        console.log(`Usuário selecionou um dispositivo: ${interaction.values[0]}`);
        
        const deviceId = interaction.values[0];
        const apiUrl = `https://gsmarena-api-lptq.onrender.com/api/devices/${deviceId}`;
        
        try {
            const response = await axios.get(apiUrl);
            console.log("Resposta da API para o dispositivo selecionado:", response.data);
            const device = response.data.device;
            await sendDeviceEmbed(interaction, device);
        } catch (error) {
            console.error("Erro ao buscar detalhes do dispositivo:", error);
            interaction.followUp({ content: 'Ocorreu um erro ao buscar o dispositivo.', ephemeral: true });
        }
    }
};

async function sendDeviceEmbed(interaction, device) {
    console.log(`Enviando embed para: ${device.name}`);
    const embed = new EmbedBuilder()
        .setTitle(device.name)
        .setURL(device.url)
        .setThumbnail(device.img)
        .setDescription(`**Marca:** ${device.brand}\n[Ver especificações completas](${device.url})`)
        .setColor('#9900FF')
        .setFooter({ text: 'Powered by Next AI & GSMArena2API' });
    
    interaction.editReply({ embeds: [embed], components: [] });
} 
