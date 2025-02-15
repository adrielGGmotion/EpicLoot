const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wallpaper')
        .setDescription('Envie um wallpaper com informações detalhadas.')
        .addStringOption(option => 
            option.setName('nome')
                .setDescription('Nome do wallpaper')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('link')
                .setDescription('Link para download do wallpaper')
                .setRequired(true))
        .addAttachmentOption(option => 
            option.setName('imagem')
                .setDescription('Anexe a imagem do wallpaper')
                .setRequired(true)),
    
    async execute(interaction) {
        const allowedRoles = ['1284871020087476266', '1311633633697861703'];
        
        // Verifica se o usuário tem um dos cargos permitidos
        if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
        }

        const nome = interaction.options.getString('nome');
        const link = interaction.options.getString('link');
        const imagem = interaction.options.getAttachment('imagem');

        // Verifica se o anexo é uma imagem
        if (!imagem.contentType || !imagem.contentType.startsWith('image/')) {
            return interaction.reply({ content: 'O anexo precisa ser uma imagem.', ephemeral: true });
        }

        // Obtém a resolução automaticamente
        const dimensoes = imagem.width && imagem.height ? `${imagem.width}x${imagem.height}` : 'Desconhecida';

        // Criação do embed
        const embed = new EmbedBuilder()
            .setTitle(nome)
            .setDescription(`📥 [Baixar Wallpaper](${link})`)
            .addFields({ name: '📏 Resolução', value: dimensoes, inline: true })
            .setImage(imagem.url)
            .setColor('Random');

        await interaction.reply({ embeds: [embed] });
    }
};
