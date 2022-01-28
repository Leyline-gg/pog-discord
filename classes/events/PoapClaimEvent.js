import { Collection } from 'discord.js';
import { EmbedBase } from '..';
import * as Firebase from '../../api';
import fs from 'node:fs/promises';

/**
 * An event that allows users to claim a POAP.
 */
export class PoapClaimEvent {
    constructor(bot, {
        id = '',
        title = '',
        description = '',
        duration = 0,   //milliseconds
        poap_filename = null,
        //total_poaps = 0,
        author = null,
        embed = null,
    }) {
        this.bot = bot;
        this.id = id.replace(' ', '-');
        this.title = title.trim(),
        this.description = description.trim();
        this.duration = duration;
        this.poap_filename = poap_filename;
        //this.total_poaps = total_poaps;
        this.author = bot.users.resolve(author);
        this.embed = new EmbedBase(this.bot, !!embed ? {
            ...embed.toJSON(),
            footer: `Created by ${this.author.tag}`,
        } : {
            title: this.title,
            description: this.description,
            //image: {
            //    url: this.poap.cloudinaryImageUrl,
            //},
            fields: [
                {
                    name: 'Claims',
                    value: '0',
                    inline: true,
                },
                {
                    name: 'Ends On',
                    value: bot.formatTimestamp(Date.now() + this.duration, 'F'),
                    inline: true,
                },
            ],
            footer: `Created by ${this.author?.tag}`,
        });
        this.claim_cache = new Collection();
    }

    end() {
        const { bot } = this;
        //log event expiration
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'POAP Event Ended',
                value: `The [poap event](${this.msg.url}) created by ${bot.formatUser(this.author)} with the title \`${this.title}\` just ended`,
            }],
        })});
        this.msg.disableComponents();
    }

    /**
     * Stores a claim interaction in the cloud & the local cache, and updates the claim embed
     * @param {ButtonInteraction} claim the claim interaction to store
     * @returns {Promise<void>} Resolves when claim has been stored and embed updated
     */
    async #storeClaim(claim) {
        //store the claim in firebase
        const data = await Firebase.storePoapEventClaim({event: this, claim});
        //locally store whatever was written to Firebase
        this.claim_cache.set(claim.user.id, data);

        //Update the embed field
        this.#updateEventEmbedClaims();
        //Publish changes
        await this.#updateMessageEmbed(); 

        return;
    }

    /**
     * Replaces the event message embed with `this.embed`
     * @returns {Promise<Message>} the updated message
     */
    #updateMessageEmbed() {
        return this.msg.edit({embeds: [this.embed]});
    }

    /**
     * Update the fields on the local embed object that display number of claims
     */
    #updateEventEmbedClaims() {
        this.embed.fields = this.embed.fields.map(obj => {
            switch (obj.name) {
                case 'Claims':
                    obj.value = this.claim_cache.size.toString();
                    break;
            }
            return obj;
        })
    }

    #awardPOAP({intr, user}) {
        const { bot, codes } = this;
        try {
            return bot.sendDM({user, embed: new EmbedBase(bot, {
                //thumbnail: { url: nft.thumbnailUrl },
                fields: [
                    {
                        name: `🎉 You Earned a POAP!`,
                        value: codes.shift(),
                    },
                ],	
            })});
        } catch (err) {
            bot.logger.error(`Error awarding POAP to user ${bot.formatUser(user)}`);
            bot.logger.error(err);
            bot.logDiscord({embed: new EmbedBase(bot, {
                title: 'POAP __NOT__ Awarded',
                description: `**Error**: ${err}`,
                fields: [
                    {
                        name: `Discord User`,
                        value: bot.formatUser(user),
                        inline: true
                    },
                ],
            }).Error()}).then(m => //chained so we can include the URL of the private log msg
                bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **I ran into an error, please check the log [message](${m.url}) for more information**`,
                }).Error(), ephemeral: true}));
            return false;
        }
    }
    
    /**
     * perform the whole POAP awardal process, including logs
     * @param {Object} params Destructured params
     * @param {Interaction} params.intr Discord.js `Interaction` that initiated the cmd
     * @param {Object} [params.poap] POAP object retrieved from Firestore
     * @param {User} params.user Discord.js User object, receipient of POAP
     * @param {PogUser} params.lluser User that will receive the POAP
     * @returns {Promise<boolean>} `true` if POAP was awarded and logs succesfully issued, `false` otherwise
     */
    async #awardPOAPOld({intr, poap=this.poap, user, lluser} = {}) {
        const { bot } = this;
        try {
            //Award POAP to LL user
            await Firebase.rewardPOAP(lluser.uid, poap.id);

            const reward_embed = new EmbedBase(bot, {
                thumbnail: { url: poap.cloudinaryImageUrl },
                title: 'POAP Awarded',
                fields: [
                    {
                        name: `Pog User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `POAP Info`,
                        value: `${poap.name} (\`${poap.id}\`)`,
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            });
            bot.logReward({embed: reward_embed});
            return true;
        } catch(err) {
            bot.logger.error(`Error awarding POAP with id ${poap.id} to LL user ${lluser.uid}`);
            bot.logger.error(err);
            bot.logDiscord({embed: new EmbedBase(bot, {
                thumbnail: { url: poap.cloudinaryImageUrl },
                title: 'POAP __NOT__ Awarded',
                description: `**Error**: ${err}`,
                fields: [
                    {
                        name: `Pog User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `POAP Info`,
                        value: `${poap.name} (\`${poap.id}\`)`,
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            }).Error()}).then(m => //chained so we can include the URL of the private log msg
                bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **I ran into an error, please check the log [message](${m.url}) for more information**`,
                }).Error(), ephemeral: true}));
            return false;
        }
    }

    /**
     * Checks the local cache to see if a user has already claimed
     * @param {User} user User to check for 
     * @returns {boolean}
     */
    hasUserClaimed(user) {
        return this.claim_cache.has(user.id);
    }

    createCollector(msg=this.msg) {
        const { bot } = this;
        this.msg ||= msg;
        this.id ||= msg.id;

        msg.createMessageComponentCollector({
            filter: (i) => i.customId === 'event-claim-btn',
            time: this.duration,
        }).on('collect', async (intr) => {
            await intr.deferReply({ ephemeral: true });
            
            const { user } = intr;
            if(this.hasUserClaimed(user))
                return bot.intrReply({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc('You have already claimed a POAP!'), 
                    ephemeral: true,
                });

            //TODO: all poaps have been claimed
            
            //state: user is already trying to claim, prevent them from clicking the button again
            
            //record claim
            await this.#storeClaim(intr);

            //award POAP and send log messages
            await this.#awardPOAP({intr, user});

            //log claim
            bot.logDiscord({embed: new EmbedBase(bot, {
                fields: [{
                    name: 'User Claimed POAP',
                    value: `${bot.formatUser(user)} claimed the POAP for the \`${this.title}\` event`,
                }],
            })});

            return bot.intrReply({
                intr,
                embed: new EmbedBase(bot, {
                    description: `✅ **POAP Claimed Successfully**`,
                }).Success(),
                ephemeral: true,
            });
        }).once('end', () => this.end());

        return this;
    }

    /**
     * Load information into the local cache from the Firestore doc for this event
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     * @returns {Promise<PoapClaimEvent>} the current class, for chaining
     */
    async importFirestoreData(doc) {
        const data = await doc.ref.collection('claims').get();
        for(const doc of data.docs)
            this.claim_cache.set(doc.id, doc.data());
        return this;
    }

    /**
     * Send an event and watch for claims
     * @returns {Promise<Message>} the event `Message` that was sent
     */
    async publish({channel}) {
        const { bot } = this;
        //send and store message
        const msg = await bot.channels.resolve(channel).send({
            embeds: [this.embed],
            components: [{
                components: [
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'event-claim-btn',
                        disabled: false,
                        label: 'Claim',
                        emoji: {
                            name: '🎁',
                        },
                    },
                ],
                type: 1,
            }],
        });

        this.msg = msg;
        this.id = msg.id;
        this.channel = channel.id;

        //store event in database
        await Firebase.createPoapEvent(this);

        //load poaps from file
        this.codes = (await fs.readFile(`cache/poap/${this.poap_filename}.txt`, 'utf8')).split('\n');
        
        this.createCollector(msg);

        //log event creation
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'POAP Event Started',
                value: `${bot.formatUser(this.author)} started a new [poap event](${this.msg.url}) called \`${this.title}\`, set to expire on ${bot.formatTimestamp(Date.now() + this.duration, 'F')}`,
            }],
        })});

        return this.msg;
    }
}
