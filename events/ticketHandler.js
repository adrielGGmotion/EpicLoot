const {
    ticketsCollection
} = require('../mongodb');
const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionsBitField,
    ChannelType,
    MessageFlagsBits
} = require('discord.js');
const ticketIcons = require('../UI/icons/ticketicons');

let config = {};

async function loadConfig() {
    try {
        const tickets = await ticketsCollection.find({}).toArray();
        config.tickets = tickets.reduce((acc, ticket) => {
            acc[ticket.serverId] = {
                ticketChannelId: ticket.ticketChannelId,
                adminRoleId: ticket.adminRoleId,
                status: ticket.status
            };
            return acc;
        }, {});
    } catch (err) {
        console.error('Error loading config from MongoDB:', err);
    }
}

setInterval(loadConfig, 5000);

module.exports = (client) => {
    client.on('ready', async () => {
        try {
            await loadConfig();
            monitorConfigChanges(client);
        } catch (error) {
            console.error('Error during client ready event:', error);
        }
    });

    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
                handleSelectMenu(interaction, client);
            } else if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
                handleCloseButton(interaction, client);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
        }
    });
};

async function monitorConfigChanges(client) {
    let previousConfig = JSON.parse(JSON.stringify(config));

    setInterval(async () => {
        try {
            await loadConfig();
            if (JSON.stringify(config) !== JSON.stringify(previousConfig)) {
                for (const guildId of Object.keys(config.tickets)) {
                    const settings = config.tickets[guildId];
                    const previousSettings = previousConfig.tickets[guildId];

                    if (
                        settings &&
                        settings.status &&
                        settings.ticketChannelId &&
                        (!previousSettings || settings.ticketChannelId !== previousSettings.ticketChannelId)
                    ) {
                        const guild = client.guilds.cache.get(guildId);
                        if (!guild) continue;

                        const ticketChannel = guild.channels.cache.get(settings.ticketChannelId);
                        if (!ticketChannel) continue;

                        const embed = new EmbedBuilder()
                            .setAuthor({
                                name: "Welcome to Ticket Support",
                                iconURL: ticketIcons.mainIcon,
                                url: "https://dsc.gg/nextech"
                            })
                            .setDescription(
                                '- Please click below menu to create a new ticket.\n\n' +
                                '**Ticket Guidelines:**\n' +
                                '- Empty tickets are not permitted.\n' +
                                '- Please be patient while waiting for a response from our support team.'
                            )
                            .setFooter({ text: 'We are here to Help!', iconURL: ticketIcons.modIcon })
                            .setColor('#00FF00')
                            .setTimestamp();

                        const menu = new StringSelectMenuBuilder()
                            .setCustomId('select_ticket_type')
                            .setPlaceholder('Choose ticket type')
                            .addOptions([
                                { label: '🆘 Support', value: 'support' },
                                { label: '📂 Suggestion', value: 'suggestion' },
                                { label: '💜 Feedback', value: 'feedback' },
                                { label: '⚠️ Report', value: 'report' }
                            ]);

                        const row = new ActionRowBuilder().addComponents(menu);

                        try {
                            await ticketChannel.send({
                                embeds: [embed],
                                components: [row]
                            });
                        } catch (sendError) {
                            console.error("Error sending ticket menu message:", sendError);
                        }

                        previousConfig = JSON.parse(JSON.stringify(config));
                    }
                }
            }
        } catch (error) {
            console.error("Error in monitorConfigChanges:", error);
        }
    }, 5000);
}

async function handleSelectMenu(interaction, client) {
    try {
        await interaction.deferReply({ flags: 64 });
    } catch (error) {
        console.error("Error deferring reply:", error);
    }

    const { guild, user, values } = interaction;
    if (!guild || !user) return;

    const guildId = guild.id;
    const userId = user.id;
    const ticketType = values[0];
    const settings = config.tickets[guildId];
    if (!settings) return;

    try {
        const ticketExists = await ticketsCollection.findOne({ guildId, userId });
        if (ticketExists) {
            return interaction.followUp({
                content: 'Você já tem um ticket aberto!!! >:V',
                flags: 64
            });
        }
    } catch (error) {
        console.error("Error checking for existing ticket:", error);
    }

    let ticketChannel;
    try {
        ticketChannel = await guild.channels.create({
            name: `${user.username}-${ticketType}-ticket`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: userId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: settings.adminRoleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("Error creating ticket channel:", error);
        return interaction.followUp({
            content: "Não conseguir criar o ticket, contate um administrador :(",
            flags: 64
        });
    }

    const ticketId = `${guildId}-${ticketChannel.id}`;
    try {
        await ticketsCollection.insertOne({ id: ticketId, channelId: ticketChannel.id, guildId, userId, type: ticketType });
    } catch (error) {
        console.error("Error inserting ticket into the database:", error);
    }

    const ticketEmbed = new EmbedBuilder()
        .setAuthor({
            name: "Support Ticket",
            iconURL: ticketIcons.modIcon,
            url: "https://dsc.gg/nextech"
        })
        .setDescription(
            `Hello ${user}, Bem-vindo ao seu ticket!\n- Por favor, nos descreva seu problema\n- Você receberá uma resposta em breve.\n- Sinta-se livre para abrir outro ticket se esse for fechado.`
        )
        .setFooter({ text: 'Sua satisfação é nossa prioridade.', iconURL: ticketIcons.heartIcon })
        .setColor('#9900FF')
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(closeButton);

    try {
        await ticketChannel.send({
            content: `${user}`,
            embeds: [ticketEmbed],
            components: [actionRow]
        });
    } catch (error) {
        console.error("Error sending message in the ticket channel:", error);
    }

    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setImage('https://media.discordapp.net/attachments/1335584527413809172/1337940563202146324/193_Sem_Titulo_20250208211747.png?ex=67ab4000&is=67a9ee80&hm=5c1b0d32b946bc60b6e00c0f2c3801b0592501d8a662ad0de09d0cd96b4c5d6c&=&width=812&height=397')
        .setAuthor({
            name: "Ticket Criado!",
            iconURL: ticketIcons.correctIcon,
            url: "https://dsc.gg/nextech"
        })
        .setDescription(`- Seu ticket de ${ticketType} foi criado.`)
        .addFields(
            { name: 'Canal de Ticket', value: `${ticketChannel.url}` },
            { name: 'Instruções', value: 'Por favor, detalhe seu problema.' }
        )
        .setTimestamp()
        .setFooter({ text: 'Obrigado por nos contatar :P', iconURL: ticketIcons.modIcon });

    try {
        await user.send({
            content: `Seu ticket de ${ticketType} foi criado.`,
            embeds: [embed]
        });
    } catch (error) {
        console.error("Error sending DM to user:", error);
    }

    try {
        await interaction.followUp({
            content: 'Ticket created!',
            flags: 64
        });
    } catch (error) {
        console.error("Error sending follow-up message:", error);
    }
}

async function handleCloseButton(interaction, client) {
    try {
        await interaction.deferReply({ flags: 64 });
    } catch (error) {
        console.error("Error deferring reply in close button:", error);
    }

    const ticketId = interaction.customId.replace('close_ticket_', '');
    const { guild, user } = interaction;
    if (!guild || !user) return;

    let ticket;
    try {
        ticket = await ticketsCollection.findOne({ id: ticketId });
    } catch (error) {
        console.error("Error finding ticket in the database:", error);
    }
    if (!ticket) {
        return interaction.followUp({
            content: 'Ticket não encontrado, reporte o bug para o Administrador.',
            flags: 64
        });
    }

    const ticketChannel = guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) {
        try {
            await ticketChannel.permissionOverwrites.edit(ticket.userId, {
                VIEW_CHANNEL: false
            });

            await interaction.followUp({
                content: 'Ticket closed and user permissions removed.',
                flags: 64
            });
        } catch (error) {
            console.error("Error removing permissions from ticket creator:", error);
            return interaction.followUp({
                content: 'Error closing ticket. Please try again.',
                flags: 64
            });
        }
    }
}
}
