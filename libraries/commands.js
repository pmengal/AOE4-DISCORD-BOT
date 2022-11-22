var {getAOE4WorldData} = require('./dataGetters.js');
var {saveSetting} = require('./databaseMethods.js');
var {showLadder} = require('./mainMethods.js');
const { Client, Intents, MessageEmbed, Permissions } = require('discord.js');
bot.on('messageCreate', function (evt) {
    let user = evt.author.username;
    userID = evt.author.id;
    let channelID = evt.channelId;
    let guildID = evt.guildId;
    let message = evt.content;

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!' && booted) {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch (cmd) {
            // !gamesroom
            case 'gamesroom':
                if (evt.member.permissions.has("ADMINISTRATOR")) {
                    saveSetting(guildID, 'gamesroom', channelID);
                    evt.channel.send('This channel is now the games room.');
                }
                break;

            // !ladder
            case 'ladder':
                if (typeof playersPerServer !== 'undefined' && playersPerServer[guildID]) {
                    var playerData = [];
                    var countParses = 0;
                    for (var userID in playersPerServer[guildID]) {
                        var profileID = playersPerServer[guildID][userID]['aoe4_world_id'];
                        getAOE4WorldData(profileID).then(function (data) {
                            if (data && data.modes && (data.modes.rm_1v1 || data.modes.rm_team)) {
                                let playerScore = (((data.modes.rm_1v1 && data.modes.rm_1v1.rating) ? data.modes.rm_1v1.rating : 0) + (((data.modes.rm_team && data.modes.rm_team.rating) ? data.modes.rm_team.rating : 0)/2));
                                playerData.push({ 'name': data.name, 'score': playerScore });
                            }
                            countParses++;
                            if (countParses >= Object.keys(playersPerServer[guildID]).length) {
                                showLadder(playerData, evt.channel, guildID);
                            }
                        }, function (err) {
                            countParses++;
                            if (countParses >= Object.keys(playersPerServer[guildID]).length) {
                                showLadder(playerData, evt.channel, guildID);
                            }
                        })
                    };
                }

                break;

            case 'mystats':
                if (typeof playersPerServer !== 'undefined' && playersPerServer[guildID] && playersPerServer[guildID][userID] && playersPerServer[guildID][userID]['aoe4_world_id']) {
                    var profileID = playersPerServer[guildID][userID]['aoe4_world_id'];
                    var embedData = new MessageEmbed()
                        .setColor('#0099ff')
                        .setAuthor({ name: 'Ranked stats', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
                        .setTimestamp()
                        .setFooter({ text: 'AOE4 Companion', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

                    getAOE4WorldData(profileID).then(function (data) {
                        if (data && data.modes && (data.modes.rm_1v1 || data.modes.rm_team)) {
                            var rankString;
                            embedData.setTitle(data.name);
                            embedData.setURL(data.site_url);
                            embedData.setThumbnail(data.avatars.small);
                            var realRank;
                            
                            if (data.modes.rm_1v1) {
                                rankString = data.modes.rm_1v1.rank_level.replace('_', ' ');
                                realRank = rankString.charAt(0).toUpperCase() + rankString.slice(1);
                                embedData.addFields(
                                    { name: '1v1 Rank', value: '' + data.modes.rm_1v1.rank },
                                    { name: 'Current Elo', value: realRank + ' (' + data.modes.rm_1v1.rating + ')', inline: true },
                                    { name: 'Highest Elo', value: '' + data.modes.rm_1v1.max_rating, inline: true },
                                    { name: '\u200B', value: '\u200B' }
                                );
                            }
                            if (data.modes.rm_team) {
                                rankString = data.modes.rm_team.rank_level.replace('_', ' ');
                                realRank = rankString.charAt(0).toUpperCase() + rankString.slice(1);
                                embedData.addFields(
                                    { name: 'Team Rank', value: '' + data.modes.rm_team.rank },
                                    { name: 'Current Elo', value: realRank + ' (' + data.modes.rm_team.rating + ')', inline: true },
                                    { name: 'Highest Elo', value: '' + data.modes.rm_team.max_rating, inline: true },
                                    { name: '\u200B', value: '\u200B' }
                                );
                            }
                            
                            evt.channel.send({ embeds: [embedData] });
                        } else {
                            evt.channel.send('No Ranked Details found');
                        }
                    }, function (err) {
                        evt.channel.send('Invalid profile ID');
                    });
                } else {
                    evt.channel.send('No Ranked Details found');
                }
                break;

            // !help
            case 'help':
                var embedData = new MessageEmbed()
                    .setColor('#0099ff')
                    .setAuthor({ name: 'Help', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
                    .setTimestamp()
                    .setFooter({ text: 'AOE4 Companion', iconURL: 'https://i.imgur.com/AfFp7pu.png' });
                embedData.setTitle('Commands');
                embedData.addFields(
                    { name: '!signup [AOE4_PROFILE_ID]', value: 'Use this command to sign up your AOE4 profile ID in this discord server.' },
                    { name: '!mystats', value: 'Using this command you will see your AOE4 ranked stats' },
                    { name: '!ladder', value: 'Internal discord Ladder' },
                    { name: '\u200B', value: '\u200B' }
                );
                evt.channel.send({ embeds: [embedData] });
                break;

            // !signup
            case 'signup':
                if (typeof playersPerServer[guildID] == 'undefined') {
                    playersPerServer[guildID] = {};
                }

                //console.log('GUILD: ' + guildID);
                //console.log('USER: ' + userID);

                if (args.length === 0 || args[0] == '') {
                    evt.channel.send('Please use the following syntax: !signup [AOE4_PROFILEID]');
                    break;
                }
                let currentTimestamp = new Date();
                currentTimestamp = currentTimestamp.getTime();

                playersPerServer[guildID][userID] = { "discord_user_id": userID, "aoe4_world_id": args[0], "discord_guild_id": guildID, "last_game_checkup_at": currentTimestamp };
                var sanitizedAOE4WorldID = sanitizer.value(args[0], 'int');

                con.query(`INSERT INTO users (discord_user_id, aoe4_world_id, discord_guild_id, last_game_checkup_at) VALUES (` + userID + `, '` + sanitizedAOE4WorldID + `', '` + guildID + `', '` + currentTimestamp + `') ON DUPLICATE KEY UPDATE aoe4_world_id='` + sanitizedAOE4WorldID + `'`, (userErr, result) => { });

                evt.channel.send('Thank you for your registration!');
                break;
        }
    }
});