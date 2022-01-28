import parse from 'parse-duration';
import { Command, EmbedBase, PoapClaimEvent, } from '../../classes';
import fs from 'node:fs';
import https from 'node:https';

class poap extends Command {
    constructor(bot) {
        super(bot, {
            name: 'poap',
            description: 'POAP event actions',
            options: [
                {
                    type: 'SUB_COMMAND',
                    name: 'load',
                    description: 'Load a file of claim codes into the bot',
                },
                {
                    type: 'SUB_COMMAND',
                    name: 'drop',
                    description: 'Award a POAP claim code to all users in a voice channel',
                    options: [
                        {
                            type: 'CHANNEL',
                            name: 'channel',
                            description: 'The voice channel where all members inside it will receive a POAP',
                            required: true,
                            channelTypes: [
                                'GUILD_VOICE',
                                'GUILD_STAGE_VOICE',
                            ],
                        },
                    ],
                },
                {
                    type: 'SUB_COMMAND',
                    name: 'event',
                    description: 'Create a POAP claim event',
                    options: [
                        {
                            type: 'STRING',
                            name: 'title',
                            description: 'The title of the event',
                            required: true,
                        },
                        {
                            type: 'CHANNEL',
                            name: 'channel',
                            description: 'The text channel where the bot will send the claim embed. Defaults to the designated claim channel',
                            required: false,
                            channelTypes: [
                                'GUILD_TEXT',
                                'GUILD_NEWS',
                            ],
                        },
                        {
                            type: 'STRING',
                            name: 'duration',
                            description: 'The duration of the event, eg: 1h. Default duration is 30 minutes',
                            required: false,
                        },
                        {
                            type: 'STRING',
                            name: 'text',
                            description: 'The text to be displayed in the embed. \\n is a newline',
                            required: false,
                        },
                    ],
                },
            ],
            category: 'admin',
            deferResponse: true,
        });
    }

    parseInput(opts) {
        const { bot } = this;
        const [title, channel, duration, text] = [
            opts.getString('title'),
            opts.getChannel('channel') || bot.config.poap,
            opts.getString('duration') || '30min',
            opts.getString('text')?.replaceAll('\\n', '\n') || '',
        ];

        const parsed_dur = parse(duration); //ms
        if(!!duration && !parsed_dur)
            throw new Error(`That's not a valid duration`);

        //convert duration to epoch timestamp
        const expires = !!duration 
            ? Date.now() + parsed_dur 
            : null;

        return { title, channel, duration: parsed_dur, text, expires };
    }

    download(url, location) {
        return new Promise(async (resolve, reject) => {
            // ensure directory exists
            await fs.promises.mkdir(location.split('/').slice(0, -1).join('/'), {recursive: true});
            // Check file does not exist yet before hitting network
            fs.access(location, fs.constants.F_OK, (err) => {
                if (err === null) reject('File already exists');

                const request = https.get(url, (response) => {
                    if (response.statusCode === 200) {
                        const file = fs.createWriteStream(location, { flags: 'wx' });
                        file.on('finish', () => resolve());
                        file.on('error', (err) => {
                            file.close();
                            if (err.code === 'EEXIST') reject('File already exists');
                            else fs.unlink(location, () => reject(err.message)); // Delete temp file
                        });
                        response.pipe(file);
                    } else if (response.statusCode === 302 || response.statusCode === 301) {
                        //Recursively follow redirects, only a 200 will resolve.
                        download(response.headers.location, location).then(() => resolve());
                    } else {
                        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
                    }
                });

                request.on('error', (err) => {
                    reject(err.message);
                });
            });
        });
    };

    awardPOAP({user, code}) {
        const { bot } = this;
        console.log(code);
        return bot.sendDM({user, embed: new EmbedBase(bot, {
            //thumbnail: { url: nft.thumbnailUrl },
            fields: [
                {
                    name: `🎉 You Earned a POAP!`,
                    value: code,
                },
            ],	
        })}).then(() => true).catch((e) => {
            console.log(e);
            return false;
        });
    }

    msgFilter(intr) {
        return async function (msg) {
            const { bot, download } = this;
            if(msg.channel.id !== intr.channelId ||
                msg.author.id !== intr.user.id ||
                !msg.attachments?.first()?.url?.toLowerCase()?.endsWith('.txt')) return;
                
            //disable this watcher
            bot.off('messageCreate', this.msgFilter(intr));

            //delete the message
            msg.delete();

            this.poap_filename = Date.now();

            await download(msg.attachments.first().url, `cache/poap/${this.poap_filename}.txt`);

            bot.intrUpdate({
                intr, 
                embed: new EmbedBase(bot, {
                    description: 'Codes loaded successfully',
                }).Success(),
            });

            return;
        }   
    };

    subcommands = {
        load: ({intr}) => {
            const { bot, download } = this;
            const msgFilter = async function (msg) {
                if(msg.channel.id !== intr.channelId ||
                    msg.author.id !== intr.user.id ||
                    !msg.attachments?.first()?.url?.toLowerCase()?.endsWith('.txt')) return;
                    
                //disable this watcher
                bot.off('messageCreate', msgFilter);

                //delete the message
                msg.delete();

                await download(msg.attachments.first().url, `cache/poap/${Date.now()}.txt`);

                bot.intrUpdate({
                    intr, 
                    embed: new EmbedBase(bot, {
                        description: 'Codes loaded successfully. You may now run `/poap drop`',
                    }).Success(),
                });
            };

            bot.intrReply({
                intr, 
                embed: new EmbedBase(bot, {
                    description: 'Please upload the text file containing the POAP codes',
                }),
            });

            bot.on('messageCreate', msgFilter);
        },
        drop: async ({intr, opts}) => {
            const { bot } = this;
            const files = await fs.promises.readdir('cache/poap');
            const file = files.sort((a, b) => Number(b.split('.')[0]) - Number(a.split('.')[0]))[0];
            const codes = (await fs.promises.readFile(`cache/poap/${file}`, 'utf8')).split('\n');

            const ch = opts.getChannel('channel');
            const members = [...(await bot.channels.fetch(ch.id, {force: true})).members.values()];
            if(!members.length)
                return bot.intrReply({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc(`There are no users in the ${ch.toString()} voice channel!`),
                });
            if(codes.length < members.length)
                return bot.intrReply({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc(`There are not enough codes for the number of users in the ${ch.toString()} voice channel!`),
                });

            //start typing in channel because award process will take some time
            //this improves user experience
            intr.channel.sendTyping();

            for(const member of members) {
                member.awarded = await this.awardPOAP({
                    user: member,
                    code: codes.shift(),
                });
            }
            
            //sort award results into arrays for the follow-up response
            const [awarded, unawarded] = [
                members.filter(m => m.awarded),
                members.filter(m => !m.awarded)
            ];

            const embed = new EmbedBase(bot, {
                description: `**${awarded.length} out of ${members.length} POAPs** were awarded`,
                //thumbnail: { url: nft.thumbnailUrl },
                fields: [
                    ...(!!awarded.length ? [
                        {
                            name: '✅ Users Awarded',
                            value: awarded.map(m => bot.formatUser(m.user)).join('\n'),
                            inline: false
                        }
                    ] : []),
                    ...(!!unawarded.length ? [
                        {
                            name: '❌ Users NOT Awarded',
                            value: unawarded.map(m => bot.formatUser(m.user)).join('\n'),
                            inline: false
                        }
                    ] : []),
                ],
            });
            !unawarded.length ? embed.Success() : embed.Warn();
            bot.intrReply({intr, embed});

            return;
        },
        event: async ({intr, opts}) => {
            const { bot, msgFilter } = this;

            bot.intrReply({
                intr, 
                embed: new EmbedBase(bot, {
                    description: 'Please upload the text file containing the POAP codes',
                }),
            });

            bot.on('messageCreate', msgFilter(intr));

            const { title, channel, duration, text, expires } = this.parseInput(opts);

            //generate and send event preview
            const event = new PoapClaimEvent(bot, {
                title,
                description: text,
                duration,
                author: intr.user,
                poap_filename: this.poap_filename,
            });

            if(!(await bot.intrConfirm({intr, embed: event.embed, content: `Confirm this is the embed that will be sent to ${channel}`})))
                return bot.intrReply({intr, embed: new EmbedBase(bot).ErrorDesc('POAP Event canceled'), content: '\u200b'});

            //send poll
            await event.publish({channel});

            //edit response with msg id
            bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `✅ **POAP Event Published Succesfully** ([Click to view](${event.msg.url}))`,
            }).Success(), content: '\u200b'});
        },
    }

    async run({intr, opts}) {
        this.subcommands[opts.getSubcommand()]({intr, opts});
    }
}

export default poap;
