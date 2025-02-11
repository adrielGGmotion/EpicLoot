const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lrc')
    .setDescription('Obtém a letra sincronizada de uma música e envia um arquivo .lrc')
    .addStringOption(option =>
      option.setName('musica')
        .setDescription('Nome da música')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('artista')
        .setDescription('Nome do artista')
        .setRequired(true)
    ),

  async execute(interaction) {
    const trackName = interaction.options.getString('musica').trim();
    const artistName = interaction.options.getString('artista').trim();

    try {
      const apiUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
      const response = await axios.get(apiUrl);

      if (!response.data || !response.data.syncedLyrics) {
        return interaction.reply('Não encontrei a letra sincronizada dessa música.');
      }

      const lyrics = response.data.syncedLyrics;

      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const sanitizedTrackName = sanitize(trackName);
      const sanitizedArtistName = sanitize(artistName);
      const fileName = `${sanitizedTrackName} - ${sanitizedArtistName}.lrc`;
      const filePath = path.join(tempDir, fileName);

      fs.writeFileSync(filePath, lyrics, 'utf8');

      await interaction.user.send({
        content: `Aqui está o arquivo .lrc da música **${trackName} - ${artistName}** 🎶`,
        files: [filePath],
      });

      interaction.reply('Enviei a letra da música no seu privado! 📩');

      setTimeout(() => fs.unlinkSync(filePath), 5000);

    } catch (error) {
      console.error(error);
      interaction.reply('Ocorreu um erro ao obter a letra da música.');
    }
  }
};
