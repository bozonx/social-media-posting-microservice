import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class TelegramApi implements ICredentialType {
	name = 'telegramApi';
	displayName = 'Telegram API';
	documentationUrl = 'https://core.telegram.org/bots/api';
	icon = 'file:../nodes/Post/post.svg' as unknown as Icon;
	properties: INodeProperties[] = [
		{
			displayName: 'Bot Token',
			name: 'botToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Telegram bot token from @BotFather',
		},
	];
}
