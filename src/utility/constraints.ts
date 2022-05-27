import type { ClientCommand } from '../@types/Module';
import { cleanRound } from './utility';
import { CommandConstraintErrorHandler } from '../errors/CommandInteractionConstraintErrorHandler';
import {
    CommandInteraction,
    Collection,
} from 'discord.js';
import { constants } from './constants';
import { ConstraintError } from '../errors/ConstraintError';
import { setTimeout } from 'node:timers/promises';

const owners = JSON.parse(process.env.OWNERS!) as string[];

export async function devModeConstraint(
    interaction: CommandInteraction,
) {
    const { devMode } = interaction.client.config;

    if (
        devMode === true &&
        owners.includes(interaction.user.id) === false
    ) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintDevModeTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintDevModeDescription',
            ),
        );

        throw new ConstraintError('devMode');
    }
}

export async function ownerConstraint(
    interaction: CommandInteraction,
    command: ClientCommand,
) {
    const { ownerOnly } = command.properties;

    if (
        ownerOnly === true &&
        owners.includes(interaction.user.id) === false
    ) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintOwnerTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintOwnerDescription',
            ),
        );

        throw new ConstraintError('owner');
    }
}

export async function dmConstraint(
    interaction: CommandInteraction,
    command: ClientCommand,
) {
    const { noDM } = command.properties;

    if (
        noDM === true &&
        !interaction.inCachedGuild()
    ) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintDMTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintDMDescription',
            ),
        );

        throw new ConstraintError('dm');
    }
}

export async function userPermissionsConstraint(
    interaction: CommandInteraction,
    command: ClientCommand,
) {
    if (!interaction.inCachedGuild()) {
        return;
    }

    const permissions = command.properties.permissions.user;

    const global = interaction.member.permissions.missing(
        permissions.global,
    );

    if (global.length > 0) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintUserGlobalPermissionsTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintUserGlobalPermissionsDescription', [
                    global.join(' '),
                ],
            ),
        );
    }

    const user = interaction.member.permissions.missing(
        permissions.local,
    );

    if (user.length > 0) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintUserLocalPermissionsTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintUserLocalPermissionsDescription', [
                    user.join(' '),
                ],
            ),
        );

        throw new ConstraintError('userPermissions');
    }
}

export async function botPermissionsConstraint(
    interaction: CommandInteraction,
    command: ClientCommand,
) {
    if (!interaction.inCachedGuild()) {
        return;
    }

    const permissions = command.properties.permissions.bot;

    const global = interaction.guild.me!.permissions.missing(
        permissions.global,
    );

    if (global.length > 0) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintBotGlobalPermissionsTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintBotGlobalPermissionsDescription', [
                    global.join(' '),
                ],
            ),
        );

        throw new ConstraintError('botPermissions');
    }

    const user = interaction.guild.me!.permissions.missing(
        permissions.local,
    );

    if (user.length > 0) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintBotLocalPermissionsTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintBotLocalPermissionsDescription', [
                    user.join(' '),
                ],
            ),
        );

        throw new ConstraintError('botPermissions');
    }
}

export async function cooldownConstraint(
    interaction: CommandInteraction,
    command: ClientCommand,
) {
    const { client: { cooldowns }, user } = interaction;
    const { name, cooldown } = command.properties;

    const timestamps = cooldowns.get(name);

    if (typeof timestamps === 'undefined') {
        cooldowns.set(name, new Collection());
        cooldowns.get(name)!.set(user.id, Date.now());
        return;
    }

    const expireTime = Number(timestamps.get(user.id)) + cooldown;
    const isCooldown = expireTime > (constants.ms.second * 2.5) + Date.now();
    const timeLeft = expireTime - Date.now();

    if (isCooldown === true) {
        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintCooldownWaitingTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintCooldownWaitingDescription', [
                    command?.properties.cooldown / 1000,
                    cleanRound(timeLeft / 1000, 1),
                ],
            ),
        );

        await setTimeout(timeLeft);

        await CommandConstraintErrorHandler.resolveConstraint(
            interaction,
            interaction.i18n.getMessage(
                'errorsInteractionConstraintCooldownCooldownOverTitle',
            ),
            interaction.i18n.getMessage(
                'errorsInteractionConstraintCooldownCooldownOverDescription', [
                    command.properties.name,
            ]),
            constants.colors.on,
        );

        throw new ConstraintError('cooldown');
    }

    timestamps.set(user.id, Date.now());
}