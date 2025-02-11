const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('device')
    .setDescription('Obtém especificações de um dispositivo Android')
    .addStringOption(option =>
      option.setName('dispositivo')
        .setDescription('Nome do dispositivo')
        .setRequired(true)),

  async execute(interaction) {
    const deviceName = interaction.options.getString('dispositivo');
    
    try {
      // Requisição para o proxy
      const response = await axios.get(`https://teu-proxy-no-render.onrender.com/device?q=${encodeURIComponent(deviceName)}`);
      const data = response.data;

      if (data.error) {
        return interaction.reply(`Erro: ${data.error}`);
      }

      // Verifica se há múltiplas variantes
      if (data.length > 1) {
        // Cria uma lista de seleção para o usuário escolher
        const options = data.map(device => ({
          label: device.name,   // Nome do dispositivo (ex: Galaxy S23 Ultra)
          value: device.id,     // ID único da variante
        }));

        // Envia uma mensagem com uma lista de seleção (menu)
        return interaction.reply({
          content: 'Escolha a variante do dispositivo:',
          components: [{
            type: 1, // Tipo "Action Row"
            components: [{
              type: 3, // Tipo "Select Menu"
              custom_id: 'device_select', // ID do componente
              options: options, // Opções com as variantes
              placeholder: 'Escolha a variante...',
            }],
          }],
        });
      }

      // Se não houver variantes, mostra as especificações diretamente
      const specs = data[0].specs.slice(0, 5); // Exemplo, ajuste conforme a estrutura dos dados
      let specString = '';

      specs.forEach(spec => {
        specString += `**${spec.title}:** ${spec.value}\n`;
      });

      // Criar Embed
      const embed = {
        title: `${deviceName} - Especificações`,
        description: specString,
        color: 0x00ff00,  // Cor do embed
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      interaction.reply('Ocorreu um erro ao buscar as especificações do dispositivo.');
    }
  },
};
