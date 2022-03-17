// Bot configuration settings
export default {
    get production() {
        return {
            // Which users/roles get access to all commands
            command_perms: {
                categories: {
                    moderator: [
                        {   // Admin
                            id: '917806303194263634',
                            type: 'ROLE',
                            permission: true,
                        },
                        {   // Moderator
                            id: '917806303194263633',
                            type: 'ROLE',
                            permission: true,
                        },
                        {
                            // Ollog10
                            id: '139120967208271872',
                            type: 'USER',
                            permission: true,
                        },
                    ],
                    admin: [
                        {   // Admin
                            id: '917806303194263634',
                            type: 'ROLE',
                            permission: true,
                        },
                        {   // Moderator
                            id: '917806303194263633',
                            type: 'ROLE',
                            permission: true,
                        },
                        {
                            // Ollog10
                            id: '139120967208271872',
                            type: 'USER',
                            permission: true,
                        },
                        {   // Pog staff
                            id: '917806303173283879',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                },
                names: {
                    awardnft: [
                        {
                            // *drops
                            id: '917806303156523070',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                    poap: [
                        {
                            // *drops
                            id: '917806303156523070',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                },
            },
            pog_guild_id: '917806303156523069',
            channels: {
                private_log: '933539353538486422',
                public_log: '933539277298610206',
                mod_log: '917806304515473425',
            },
            events: {
                goodActs: {
                    target_channel: '840679701118189579',
                },
                kindWords: {
                    target_channel: '830163592803254352',
                },
                addAlphaTesterRole: {
                    alpha_role: '751919744528941126',
                },
            },
            emoji: {
                pog_logo: '<:PogLogo:846152082226282506>',
                deafened: '<:deafened:948609937355997195>',
            },
            // PogBot.checkMod() returns true if user has any of these roles
            mod_roles: [
                '917806303194263634',   //Admin
                '917806303194263633',   //Mod
            ],
            // Can be self-assigned using a command
            self_roles: [
                '853414453206188063',   //do good alerts
                '874704370103615559',   //Bot Updates
            ],
            muted_role: '917806303156523073',
        };
    },
    get development() {
        return {
			// Which users/roles get access to all commands
			command_perms: {
				categories: {
					moderator: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
					],
					admin: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
						{
							// Pog staff
							id: '858144532318519326',
							type: 'ROLE',
							permission: true,
						},
					],
				},
                names: {
                    awardnft: [
                        {
                            // *drops
                            id: '914642168939962378',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                },
			},
			pog_guild_id: '857839180608307210',
			channels: {
				private_log: '858141871788392448',
				public_log: '858141914841481246',
				reward_log: '904081593029759006',
				mod_log: '892268882285457439', //private mod log
				submission_log: '903055896173764659', //private submission log
				ama_vc: '869993145499287604',
				polls: '877229054456107069',
			},
			events: {
				goodActs: {
					target_channel: '877229121086840912',
				},
				kindWords: {
					target_channel: '877229143786422323',
				},
				addAlphaTesterRole: {
					alpha_role: '879817566799925298',
				},
			},
			emoji: {
				pog_logo: '<:PogLogo:859111140696391680>',
                deafened: '<:deafened:945042605438279723>',                
			},
			mod_roles: [
				'858144532318519326', //Pog Staff
			],
			self_roles: ['873234204706631720', '865629785015320608'],
			muted_role: '894741083186139156',
		};
    },
    get staging() {
        return {
            ...this.development,
        };
    },
};
