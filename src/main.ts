import 'dotenv/config';
import type {
    ClientCommand,
    ClientEvent,
    Config,
} from './@types/client';
import {
    Client,
    Collection,
    Intents,
    Options,
    Sweepers,
} from 'discord.js';
import { Core } from './core/core';
import { Database } from './utility/database';
import { ErrorHandler } from './errors/ErrorHandler';
import { Log } from './utility/Log';
import fs from 'node:fs/promises';
import process from 'node:process';

process.on('exit', code => {
    Log.log(`Exiting with code ${code}`);
    Database.close();
});

process.on('unhandledRejection', async error => {
    Log.error('unhandledRejection');
    await ErrorHandler.init(error);
    process.exit(1);
});

process.on('uncaughtException', async error => {
    Log.error('uncaughtException');
    await ErrorHandler.init(error);
    process.exit(1);
});

const client = new Client({
    allowedMentions: {
        parse: ['users'],
        repliedUser: true,
    },
    failIfNotExists: false,
    intents: [Intents.FLAGS.GUILDS],
    makeCache: Options.cacheWithLimits({
        GuildBanManager: 0,
        GuildInviteManager: 0,
        GuildMemberManager: 25,
        GuildEmojiManager: 0,
        GuildScheduledEventManager: 0,
        GuildStickerManager: 0,
        MessageManager: 50,
        PresenceManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        StageInstanceManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
        VoiceStateManager: 0,
    }),
    presence: {
        status: 'online',
    },
    sweepers: {
        guildMembers: {
            interval: 600,
            filter: Sweepers.filterByLifetime({
                lifetime: 60,
            }),
        },
        messages: {
            interval: 600,
            lifetime: 60,
        },
        threadMembers: {
            interval: 600,
            filter: Sweepers.filterByLifetime({
                lifetime: 1,
            }),
        },
        threads: {
            interval: 600,
            lifetime: 30,
        },
        users: {
            interval: 3600,
            filter: Sweepers.filterByLifetime({
                lifetime: 3600,
            }),
        },
    },
});

(async () => {
    client.commands = new Collection();

    client.config = (
        await Database.query(
            'SELECT * FROM config WHERE index = 0',
        )
    ).rows[0] as Config;

    client.cooldowns = new Collection();
    client.core = new Core(client);
    client.customPresence = null;
    client.events = new Collection();

    const folders = (
        await Promise.all([
            fs.readdir(`${__dirname}/commands`),
            fs.readdir(`${__dirname}/events`),
        ])
    );

    const commandPromises: Promise<ClientCommand>[] = [];
    const eventPromises: Promise<ClientEvent>[] = [];

    for (const file of folders[0]) {
        commandPromises.push(import(`${__dirname}/commands/${file}`));
    }

    for (const file of folders[1]) {
        eventPromises.push(import(`${__dirname}/events/${file}`));
    }

    const resolvedPromises = await Promise.all([
        Promise.all(commandPromises),
        Promise.all(eventPromises),
    ]);

    for (const command of resolvedPromises[0]) {
        client.commands.set(command.properties.name, command);
    }

    for (const event of resolvedPromises[1]) {
        client.events.set(event.properties.name, event);
    }

    for (const {
        properties: { name, once },
    } of client.events.values()) {
        const execute = (...parameters: unknown[]) =>
            client.events.get(name)!.execute(...parameters);

        if (once === false) {
            client.on(name, execute);
        } else {
            client.once(name, execute);
        }
    }

    await client.login();
})();