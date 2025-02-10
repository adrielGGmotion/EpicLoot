const Discord = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'lrc',
  description: 'Obtém a letra sincronizada de uma música e envia um arquivo .lrc',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, forneça o nome da música e o artista. Exemplo: `$lrc Nome da Música - Artista`');
    }

    const input = args.join(' ').split(' - ');
    const trackName = input[0].trim();
    const artistName = input[1] ? input[1].trim() : null;

    if (!artistName) {
      return message.reply('Formato incorreto! Use: `$lrc Nome da Música - Artista`');
    }

    try {
      const apiUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
      const response = await axios.get(apiUrl);

      if (!response.data || !response.data.syncedLyrics) {
        return message.reply('Não encontrei a letra sincronizada dessa música.');
      }

      const lyrics = response.data.syncedLyrics;

      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 🆕 Verifica se o usuário anexou um arquivo
      let fileName = `${trackName} - ${artistName}.lrc`; // Nome padrão

      const attachment = message.attachments.first();
      if (attachment) {
        const originalName = path.parse(attachment.name).name; // Pega o nome sem extensão
        fileName = `${originalName}.lrc`; // Usa o mesmo nome do anexo
      }

      const filePath = `${tempDir}/${fileName}`;

      // Criar e salvar o arquivo .lrc
      fs.writeFileSync(filePath, lyrics, 'utf8');

      // Enviar no privado
      await message.author.send({
        content: `Aqui está o arquivo .lrc da música **${trackName} - ${artistName}** 🎶`,
        files: [filePath],
      });

      message.reply('Enviei a letra da música no seu privado! 📩');

      setTimeout(() => fs.unlinkSync(filePath), 5000);

    } catch (error) {
      console.error(error);
      message.reply('Ocorreu um erro ao obter a letra da música.');
    }
  }
};
