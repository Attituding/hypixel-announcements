import {
    type ApplicationCommandRegistry,
    BucketScope,
    RegisterBehavior,
} from '@sapphire/framework';
import { type CommandInteraction } from 'discord.js';
import { BetterEmbed } from '../structures/BetterEmbed';
import { Command } from '../structures/Command';
import { Options } from '../utility/Options';

export class LinkCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: 'link',
            description: 'Links/unlinks a message ID to an ID',
            cooldownLimit: 0,
            cooldownDelay: 0,
            cooldownScope: BucketScope.User,
            preconditions: [
                'Base',
                'DevMode',
                'OwnerOnly',
            ],
            requiredUserPermissions: [],
            requiredClientPermissions: [],
        });
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
        registry.registerChatInputCommand({
            name: 'link',
            description: 'Links/unlinks a message ID to an ID',
            options: [
                {
                    name: 'link',
                    type: 1,
                    description: 'Links a message ID to an ID',
                    options: [
                        {
                            name: 'category',
                            description: 'Used for the link option',
                            type: 3,
                            required: true,
                            choices: [
                                {
                                    name: 'News and Announcements',
                                    value: 'News and Announcements',
                                },
                                {
                                    name: 'SkyBlock Patch Notes',
                                    value: 'SkyBlock Patch Notes',
                                },
                                {
                                    name: 'Moderation Information and Changes',
                                    value: 'Moderation Information and Changes',
                                },
                            ],
                        },
                        {
                            name: 'id',
                            description: 'The ID to link the message to',
                            type: 3,
                            required: true,
                        },
                        {
                            name: 'message',
                            description: 'The message to link to the ID',
                            type: 3,
                            required: true,
                        },
                    ],
                },
                {
                    name: 'unlink',
                    description: 'Unlinks a message ID from an ID',
                    type: 1,
                    options: [
                        {
                            name: 'category',
                            description: 'Used for the link option',
                            type: 3,
                            required: true,
                            choices: [
                                {
                                    name: 'News and Announcements',
                                    value: 'News and Announcements',
                                },
                                {
                                    name: 'SkyBlock Patch Notes',
                                    value: 'SkyBlock Patch Notes',
                                },
                                {
                                    name: 'Moderation Information and Changes',
                                    value: 'Moderation Information and Changes',
                                },
                            ],
                        },
                        {
                            name: 'id',
                            description: 'The ID to link the message to',
                            type: 3,
                            required: true,
                        },
                    ],
                },
            ],
        }, {
            guildIds: this.options.preconditions?.find(
                (condition) => condition === 'OwnerOnly',
            )
                ? this.container.config.ownerGuilds
                : undefined,
            registerCommandIfMissing: true,
            behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        });
    }

    public async chatInputRun(interaction: CommandInteraction) {
        const { i18n } = interaction;

        const category = interaction.options.getString('category', true);
        const id = interaction.options.getString('id', true);
        const message = interaction.options.getString('message', false);

        await this.container.database.query(
            `UPDATE "${category}" SET message = $1 WHERE id = $2`,
            [message, id],
        );

        const linkEmbed = new BetterEmbed(interaction)
            .setColor(Options.colorsNormal);

        if (interaction.options.getSubcommand() === 'link') {
            linkEmbed
                .setTitle(i18n.getMessage('commandsLinkLinkedTitle'))
                .setDescription(
                    i18n.getMessage(
                        'commandsLinkLinkedDescription', [
                            id,
                            message!,
                        ],
                    ),
                );
        } else {
            linkEmbed
                .setTitle(i18n.getMessage('commandsLinkUnlinkedTitle'))
                .setDescription(
                    i18n.getMessage(
                        'commandsLinkUnlinkedDescription', [
                            id,
                        ],
                    ),
                );
        }

        this.container.logger.info(
            this.logContext(interaction),
            `${this.constructor.name}:`,
            interaction.options.getSubcommand() === 'link'
                ? `Linked the ID ${id} to ${message}.`
                : `Unlinked the ID ${id} from a message.`,
        );

        await interaction.editReply({ embeds: [linkEmbed] });
    }
}