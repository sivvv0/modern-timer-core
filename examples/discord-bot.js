const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const ModernTimerCore = require('../src/index');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize timer core
const timerCore = new ModernTimerCore(client, {
    enableLogging: true,
    logLevel: 'info',
    enableMetrics: true,
    enableGroups: true,
    enablePersistence: true,
    persistencePath: './timers-data.json',
    enableQueue: true,
    queueConcurrency: 3,
    enableRateLimiting: true,
    maxRateLimit: 50,
    rateLimitWindow: 60000,
    maxTimers: 500
});

// Initialize
timerCore.initialize();

// Ready event
client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`📊 Discord.js version: ${client.constructor.version}`);
    console.log(`⏱️ Timer Core initialized\n`);
});

// Message handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!timer')) return;

    const args = message.content.slice(7).trim().split(' ');
    const command = args[0]?.toLowerCase();

    // Create a timer
    if (command === 'create') {
        const duration = parseInt(args[1]);
        const channel = message.channel;
        
        if (!duration || duration < 1) {
            return message.reply('❌ Please provide a valid duration in seconds.');
        }

        try {
            const timer = timerCore.createTimeout(
                async () => {
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle('⏰ Timer Completed')
                            .setDescription(`Timer created by ${message.author.tag} has finished!`)
                            .setColor(0x00ff00)
                            .setTimestamp();
                        
                        await channel.send({ embeds: [embed] });
                    } catch (error) {
                        console.error('Timer callback error:', error);
                    }
                },
                duration * 1000,
                {
                    metadata: {
                        author: message.author.tag,
                        authorId: message.author.id,
                        channelId: channel.id,
                        guildId: message.guild?.id,
                        duration: duration
                    },
                    tags: ['user-timer', message.author.id],
                    group: `user_${message.author.id}`,
                    priority: 'normal',
                    persistent: true
                }
            );

            const embed = new EmbedBuilder()
                .setTitle('✅ Timer Created')
                .setDescription(`Timer will execute in ${duration} seconds`)
                .addFields(
                    { name: 'Timer ID', value: `\`${timer.id}\``, inline: true },
                    { name: 'Type', value: 'Timeout', inline: true },
                    { name: 'Status', value: '⏳ Pending', inline: true }
                )
                .setColor(0x0099ff)
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            await message.reply(`❌ Failed to create timer: ${error.message}`);
        }
    }

    // List timers
    else if (command === 'list') {
        const allTimers = timerCore.getAllTimers();
        
        if (allTimers.length === 0) {
            return message.reply('📭 No timers currently active.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Active Timers')
            .setColor(0x0099ff)
            .setTimestamp();

        // Group timers
        const grouped = {};
        for (const timer of allTimers) {
            const group = timer.group || 'ungrouped';
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(timer);
        }

        let description = '';
        for (const [group, timers] of Object.entries(grouped)) {
            description += `**${group}** (${timers.length} timers)\n`;
            for (const timer of timers.slice(0, 5)) {
                const age = Math.floor((Date.now() - timer.createdAt) / 1000);
                description += `• \`${timer.id}\` - ${timer.type} - ${age}s old\n`;
            }
            if (timers.length > 5) {
                description += `• ... and ${timers.length - 5} more\n`;
            }
            description += '\n';
        }

        embed.setDescription(description || 'No timers found');
        await message.reply({ embeds: [embed] });
    }

    // Cancel a timer
    else if (command === 'cancel') {
        const timerId = parseInt(args[1]);
        
        if (!timerId) {
            return message.reply('❌ Please provide a timer ID.');
        }

        const success = timerCore.clearTimer(timerId);
        
        if (success) {
            await message.reply(`✅ Timer ${timerId} cancelled successfully.`);
        } else {
            await message.reply(`❌ Timer ${timerId} not found.`);
        }
    }

    // Get stats
    else if (command === 'stats') {
        const stats = timerCore.getStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Timer Statistics')
            .addFields(
                { name: 'Total Created', value: stats.totalCreated.toString(), inline: true },
                { name: 'Active Timers', value: stats.active.toString(), inline: true },
                { name: 'Total Executed', value: stats.totalExecuted.toString(), inline: true },
                { name: 'Total Errors', value: stats.totalErrors.toString(), inline: true },
                { name: 'Total Retries', value: stats.totalRetries.toString(), inline: true },
                { name: 'Uptime', value: `${Math.floor(stats.uptime / 1000)}s`, inline: true },
                { name: 'Groups', value: stats.byGroup.size.toString(), inline: true },
                { name: 'Version', value: stats.versionStats.v14 > 0 ? 'v14' : 'v13', inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    // Create repeating timer
    else if (command === 'repeat') {
        const interval = parseInt(args[1]);
        const duration = parseInt(args[2]) || 0;
        
        if (!interval || interval < 1) {
            return message.reply('❌ Please provide a valid interval in seconds.');
        }

        try {
            let count = 0;
            const timer = timerCore.createInterval(
                async () => {
                    count++;
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle('🔄 Repeating Timer')
                            .setDescription(`Execution #${count}`)
                            .setColor(0x00ff00)
                            .setTimestamp();
                        
                        await message.channel.send({ embeds: [embed] });
                        
                        if (duration > 0 && count >= duration) {
                            timerCore.clearTimer(timer.id);
                            await message.channel.send('⏹️ Repeating timer stopped.');
                        }
                    } catch (error) {
                        console.error('Timer callback error:', error);
                    }
                },
                interval * 1000,
                {
                    metadata: {
                        author: message.author.tag,
                        authorId: message.author.id,
                        channelId: message.channel.id,
                        interval: interval,
                        duration: duration
                    },
                    tags: ['user-timer', 'repeating', message.author.id],
                    group: `user_${message.author.id}`,
                    priority: 'normal',
                    persistent: true
                }
            );

            const embed = new EmbedBuilder()
                .setTitle('✅ Repeating Timer Created')
                .setDescription(`Timer will execute every ${interval} seconds`)
                .addFields(
                    { name: 'Timer ID', value: `\`${timer.id}\``, inline: true },
                    { name: 'Type', value: 'Interval', inline: true },
                    { name: 'Status', value: '🔄 Running', inline: true }
                )
                .setColor(0x0099ff)
                .setTimestamp();

            if (duration > 0) {
                embed.addFields({ name: 'Duration', value: `${duration} executions`, inline: true });
            }

            await message.reply({ embeds: [embed] });
        } catch (error) {
            await message.reply(`❌ Failed to create timer: ${error.message}`);
        }
    }

    // Help command
    else if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('📚 Timer Commands')
            .setDescription('Manage timers in your server')
            .addFields(
                { name: '!timer create <seconds>', value: 'Create a timer that triggers after X seconds', inline: false },
                { name: '!timer repeat <interval> [duration]', value: 'Create a repeating timer (optional duration in executions)', inline: false },
                { name: '!timer list', value: 'List all active timers', inline: false },
                { name: '!timer cancel <id>', value: 'Cancel a specific timer', inline: false },
                { name: '!timer stats', value: 'Show timer statistics', inline: false },
                { name: '!timer help', value: 'Show this help message', inline: false }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
});

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Login
client.login('YOUR_BOT_TOKEN');
