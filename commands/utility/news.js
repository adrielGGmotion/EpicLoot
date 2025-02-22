const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://nextai:nextbotpass@cluster0.iuzzl.mongodb.net/newsBot?retryWrites=true&w=majority';
const DATABASE_NAME = 'newsBot';
const COLLECTION_NAME = 'userRequests';
const API_KEY = '337b6806debe4df1b083f92f768fe2bf';

async function buscarNoticias(topico) {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: topico,
                apiKey: API_KEY,
                language: 'pt',
                sortBy: 'publishedAt',
                pageSize: 1, // Limita a X resultados
            },
        });
        return response.data.articles;
    } catch (error) {
        console.error(`Erro ao buscar notícias sobre ${topico}:`, error.message);
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('Pesquise notícias sobre um assunto específico.')
        .addStringOption(option =>
            option.setName('assunto')
                .setDescription('O tema da notícia que deseja buscar.')
                .setRequired(true)),
    
    async execute(interaction) {
        const topico = interaction.options.getString('assunto');
        const userId = interaction.user.id;
        const mongoClient = new MongoClient(MONGO_URI);
        
        try {
            await mongoClient.connect();
            const db = mongoClient.db(DATABASE_NAME);
            const collection = db.collection(COLLECTION_NAME);

            // Verifica quantas vezes o usuário usou o comando nas últimas 24h
            const limite = 5;
            const agora = new Date();
            const dataLimite = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
            const usoAtual = await collection.countDocuments({
                userId: userId,
                timestamp: { $gte: dataLimite }
            });

            if (usoAtual >= limite) {
                await interaction.reply({ content: '⚠️ Você atingiu o limite de 5 pesquisas nas últimas 24 horas.', ephemeral: true });
                return;
            }

            const noticias = await buscarNoticias(topico);
            if (noticias.length === 0) {
                await interaction.reply({ content: '❌ Nenhuma notícia encontrada para esse assunto.', ephemeral: true });
                return;
            }

            const noticia = noticias[0]; // Pega apenas a primeira notícia
const embed = new EmbedBuilder()
    .setColor('#8a22d4')
    .setTitle(noticia.title)
    .setURL(noticia.url)
    .setDescription(noticia.description || 'Sem descrição disponível.')
    .setThumbnail(noticia.urlToImage || 'https://via.placeholder.com/300')
    .addFields(
        { name: 'Fonte', value: `[${noticia.source.name}](${noticia.url})`, inline: true },
        { name: 'Publicado em', value: new Date(noticia.publishedAt).toLocaleString(), inline: true }
    )
    .setFooter({ text: `Notícia sobre ${topico}` });

await interaction.reply({ embeds: [embed] });
            
            await interaction.reply({ embeds });

            // Registra o uso do comando no banco
            await collection.insertOne({ userId, timestamp: agora });

        } catch (error) {
            console.error('Erro ao processar comando /news:', error);
            await interaction.reply({ content: '❌ Erro ao buscar notícias. Tente novamente mais tarde.', ephemeral: true });
        } finally {
            await mongoClient.close();
        }
    }
};
