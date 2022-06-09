import { Command, EmbedBase } from '../../classes';

class ping extends Command {
    constructor(bot) {
        super({
            name: 'ping',
            description: 'Get the latentcy of the bot and its connected APIs',
            category: 'general',
        });
    }

    async run({intr}) {
        
        //TODO: implement Pog API/Firebase API latency (choose a user-friendly label)
        const response = await bot.intrReply({intr, embed: new EmbedBase({
            description: 'Pinging...',
        }), fetchReply: true,});

		const latency = { //store latency variables
            self: response.createdTimestamp - intr.createdTimestamp, 
            discord: bot.ws.ping,
        };

        bot.intrReply({intr, embed: new EmbedBase({
            fields: [{
                name: `It took ${latency.self}ms to respond`,
                value: `Discord API Latency is ${latency.discord}ms`,
            }],
        })});
    }
}

export default ping;
