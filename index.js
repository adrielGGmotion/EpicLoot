const fs = require('fs');
const path = require('path');
const client = require('./main');
require('./bot');
require('./shiva');
const { selectDeviceInteraction } = require('./commands/utility/device');

const loadEventHandlers = () => {
    const colors = require('./UI/colors/colors');

    const logSystem = (system, status = '✅') => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(
            `${colors.gray}[${timestamp}]${colors.reset}`,
            `${colors.cyan}[${system.padEnd(15)}]${colors.reset}`,
            `${colors.green}${status}${colors.reset}`
        );
    };

    console.clear();
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 19);

    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.yellow}${colors.bright}             🤖 BOT SYSTEMS INITIALIZATION 🤖${colors.reset}`);
    console.log('═'.repeat(60) + '\n');

    console.log(`\n${colors.magenta}${colors.bright}📡 CORE SYSTEMS${colors.reset}`);
    console.log('─'.repeat(40));

    const guildMemberAddHandler = require('./events/guildMemberAdd');
    guildMemberAddHandler(client);
    logSystem('WELCOME');

    const ticketHandler = require('./events/ticketHandler');
    ticketHandler(client);
    logSystem('TICKET');

    const voiceChannelHandler = require('./events/voiceChannelHandler');
    voiceChannelHandler(client);
    logSystem('VOICE');

    console.log(`\n${colors.magenta}${colors.bright}🎮 ENGAGEMENT SYSTEMS${colors.reset}`);
    console.log('─'.repeat(40));

    const giveawayHandler = require('./events/giveaway');
    giveawayHandler(client);
    logSystem('GIVEAWAY');

    const autoroleHandler = require('./events/autorole');
    autoroleHandler(client);
    logSystem('AUTOROLE');

    const reactionRoleHandler = require('./events/reactionroles');
    reactionRoleHandler(client);
    logSystem('REACTION ROLES');

    console.log(`\n${colors.magenta}${colors.bright}😀 EMOJI & AFK SYSTEMS${colors.reset}`);
    console.log('─'.repeat(40));

    const nqnHandler = require('./events/nqn');
    nqnHandler(client);
    const emojiHandler = require('./events/emojiHandler');
    emojiHandler(client);
    logSystem('NQN');
    logSystem('EMOJI');

    const afkHandler = require('./events/afkHandler');
    afkHandler(client);
    logSystem('AFK');

    const newsHandler = require('./events/newsHandler');
    newsHandler(client);
    logSystem('NEWS');

    console.log(`\n${colors.magenta}${colors.bright}🔔 NOTIFICATION SYSTEMS${colors.reset}`);
    console.log('─'.repeat(40));

    const startYouTubeNotifications = require('./events/youTubeHandler');
    const startTwitchNotifications = require('./events/twitchHandler');
    const startFacebookNotifications = require('./events/facebookHandler');
    const startInstagramNotifications = require('./events/instagramHandler');

    startYouTubeNotifications(client);
    logSystem('YOUTUBE');

    startTwitchNotifications(client);
    logSystem('TWITCH');

    startFacebookNotifications(client);
    logSystem('FACEBOOK');

    startInstagramNotifications(client);
    logSystem('INSTAGRAM');

    console.log(`\n${colors.magenta}${colors.bright}🎵 MUSIC SYSTEM${colors.reset}`);
    console.log('─'.repeat(40));
    require('./events/music')(client);
    logSystem('LAVALINK MUSIC');

    require('./shiva');

    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.green}${colors.bright}             ✨ ALL SYSTEMS INITIALIZED ✨${colors.reset}`);
    console.log('═'.repeat(60) + '\n');

    console.log(`${colors.green}${colors.bright}Status: ${colors.reset}${colors.green}All systems operational${colors.reset}`);
    console.log(`${colors.gray}Last checked: ${colors.reset}${colors.cyan}${new Date().toLocaleTimeString()}${colors.reset}\n`);

    const interactionCreateHandler = (interaction) => {
        selectDeviceInteraction(interaction);
    };
    client.on('interactionCreate', interactionCreateHandler);
};

const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            if (typeof command === 'function') {
                command(client);
            } else if (typeof command.execute === 'function') {
                client.commands.set(command.data.name, command);
            }
        }
    }
};

const refreshCommands = () => {
    const commandsPath = path.join(__dirname, 'commands');
    loadCommands(commandsPath);
    console.log('Commands have been refreshed');
};

loadEventHandlers();
refreshCommands();
