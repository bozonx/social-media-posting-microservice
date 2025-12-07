import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';
import * as yaml from 'js-yaml';

function parsePlatformOptions(value: string): Record<string, unknown> {
	if (!value) return {};
	let result: unknown;
	try {
		result = JSON.parse(value);
	} catch {
		try {
			result = yaml.load(value);
		} catch {
			throw new ApplicationError('Platform Options must be valid JSON or YAML');
		}
	}

	if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
		return result as Record<string, unknown>;
	}
	throw new ApplicationError('Platform Options must be an object');
}

function parseMediaField(value: string): string | Record<string, unknown> | unknown[] {
	if (!value) return value;
	try {
		// Try to parse as JSON, if fails - treat as string
		if (
			typeof value === 'string' &&
			(value.trim().startsWith('{') || value.trim().startsWith('['))
		) {
			return JSON.parse(value);
		}
		return value;
	} catch {
		return value;
	}
}

export class BozonxPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Social Media Post',
		name: 'bozonxPost',
		icon: 'file:post.svg',
		group: ['transform'],
		version: 1.2,
		subtitle: '={{$parameter["platform"]}}',
		description:
			'Publish content to social media platforms (Telegram, VK, Instagram) via Social Media Posting microservice.',
		defaults: {
			name: 'Social Media Post',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'bozonxSocialMediaPostingApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			// Channel
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				default: '',
				description:
					'Channel name from microservice config.yaml. If specified, platform and auth are taken from server config.',
			},

			// Platform
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: [
					{
						name: 'Telegram',
						value: 'telegram',
					},
				],
				default: 'telegram',
				required: true,
				description: 'Social media platform to post to',
				displayOptions: {
					show: {
						channel: [''],
					},
				},
			},

			// Telegram Authentication
			{
				displayName: 'Telegram Auth',
				name: 'telegramAuth',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Telegram Auth',
				default: {},
				description:
					'Telegram authentication credentials. Required if channel is not specified. If channel is specified, these values override server config.',
				displayOptions: {
					show: {
						platform: ['telegram'],
					},
				},
				options: [
					{
						name: 'auth',
						displayName: 'Auth',
						values: [
							{
								displayName: 'API Key',
								name: 'apiKey',
								type: 'string',
								typeOptions: { password: true },
								default: '',
								required: false,
								description: 'Telegram bot token (from @BotFather)',
								displayOptions: {
									show: {
										'/channel': [''],
									},
								},
							},
							{
								displayName: 'Chat ID',
								name: 'chatId',
								type: 'string',
								default: '',
								required: false,
								description: 'Telegram channel/chat ID (e.g., @mychannel or -100123456789)',
							},
						],
					},
				],
			},

			// Body
			{
				displayName: 'Post Content',
				name: 'body',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Main content of the post',
			},

			// Post Type
			{
				displayName: 'Post Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Album', value: 'album' },
					{ name: 'Article', value: 'article' },
					{ name: 'Audio', value: 'audio' },
					{ name: 'Auto Detect', value: 'auto' },
					{ name: 'Document', value: 'document' },
					{ name: 'Image', value: 'image' },
					{ name: 'Poll', value: 'poll' },
					{ name: 'Short Video', value: 'short' },
					{ name: 'Story', value: 'story' },
					{ name: 'Text Post', value: 'post' },
					{ name: 'Video', value: 'video' },
				],
				default: 'auto',
				description: 'Type of post to create',
			},

			// Cover Image
			{
				displayName: 'Cover Image',
				name: 'cover',
				type: 'string',
				default: '',
				description:
					'Cover image URL, file_id (Telegram), or MediaInput object as JSON (URL/fileId max 500 characters)',
				displayOptions: {
					show: {
						type: ['auto', 'post', 'image', 'article', 'story'],
					},
				},
			},

			// Video
			{
				displayName: 'Video',
				name: 'video',
				type: 'string',
				default: '',
				description:
					'Video URL, file_id (Telegram), or MediaInput object as JSON (URL/fileId max 500 characters)',
				displayOptions: {
					show: {
						type: ['auto', 'video', 'short', 'story'],
					},
				},
			},

			// Audio
			{
				displayName: 'Audio',
				name: 'audio',
				type: 'string',
				default: '',
				description:
					'Audio URL, file_id (Telegram), or MediaInput object as JSON (URL/fileId max 500 characters)',
				displayOptions: {
					show: {
						type: ['auto', 'audio'],
					},
				},
			},

			// Document
			{
				displayName: 'Document',
				name: 'document',
				type: 'string',
				default: '',
				description:
					'Document URL, file_id (Telegram), or MediaInput object as JSON (URL/fileId max 500 characters)',
				displayOptions: {
					show: {
						type: ['auto', 'document'],
					},
				},
			},

			// Media Array
			{
				displayName: 'Media Array',
				name: 'media',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description:
					'JSON array of media URLs, file_ids (Telegram), or MediaInput objects for albums (2-10 items)',
				displayOptions: {
					show: {
						type: ['auto', 'album'],
					},
				},
			},

			// Idempotency Key
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description: 'Key to prevent duplicate posts',
			},

			// Additional Options
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Body Format',
						name: 'bodyFormat',
						type: 'options',
						options: [
							{ name: 'Plain Text', value: 'text' },
							{ name: 'HTML', value: 'html' },
							{ name: 'Markdown', value: 'md' },
						],
						default: 'text',
						description:
							'Format of the post content. Can also be platform-specific (e.g., "MarkdownV2" for Telegram). Max 50 characters.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: { rows: 2 },
						default: '',
						description:
							'Post description/summary (used by platforms that support it, max 5000 characters)',
					},
					{
						displayName: 'Disable Notification',
						name: 'disableNotification',
						type: 'boolean',
						default: false,
						description:
							'Whether to send the message silently (users will receive a notification with no sound)',
					},
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Publish', value: 'publish' },
							{ name: 'Draft', value: 'draft' },
						],
						default: 'publish',
						description: 'Publishing mode (only for supported platforms)',
					},
					{
						displayName: 'Platform Options',
						name: 'options',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Platform-specific options as JSON or YAML object',
					},
					{
						displayName: 'Post Language',
						name: 'postLanguage',
						type: 'string',
						default: '',
						description:
							'Content language code (e.g., en, ru). Passed as-is to supported platforms. Max 50 characters.',
					},
					{
						displayName: 'Scheduled At',
						name: 'scheduledAt',
						type: 'string',
						default: '',
						description: 'Scheduled publishing time (ISO 8601 format, max 50 characters)',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description:
							'Comma-separated tags/hashtags without # symbol. Passed as-is to supported platforms. Max 200 items, each max 300 characters.',
					},
					{
						displayName: 'Max Body Length',
						name: 'maxBody',
						type: 'number',
						default: 500000,
						description: 'Maximum body length in characters (max 500,000)',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Post title (platform-specific, max 1000 characters)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('bozonxSocialMediaPostingApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		for (let i = 0; i < items.length; i++) {
			try {
				const endpoint = '/post';

				const channel = this.getNodeParameter('channel', i, '') as string;
				const platform = this.getNodeParameter('platform', i, '') as string;
				const body = this.getNodeParameter('body', i) as string;
				const type = this.getNodeParameter('type', i, 'auto') as string;
				const telegramAuth = this.getNodeParameter('telegramAuth', i, {}) as {
					auth?: { apiKey: string; chatId: string };
				};
				const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as Record<
					string,
					string | boolean | number
				>;

				// Build request body
				const requestBody: IDataObject = {
					body,
				};

				// Add channel or platform
				if (channel) {
					requestBody.channel = channel;
				} else if (platform) {
					requestBody.platform = platform;
				}

				// Add main fields
				if (type) requestBody.type = type;

				// Add optional top-level fields
				const cover = this.getNodeParameter('cover', i, '') as string;
				const video = this.getNodeParameter('video', i, '') as string;
				const audio = this.getNodeParameter('audio', i, '') as string;
				const document = this.getNodeParameter('document', i, '') as string;
				const media = this.getNodeParameter('media', i, '') as string;
				const idempotencyKey = this.getNodeParameter('idempotencyKey', i, '') as string;

				if (cover) requestBody.cover = parseMediaField(cover);
				if (video) requestBody.video = parseMediaField(video);
				if (audio) requestBody.audio = parseMediaField(audio);
				if (document) requestBody.document = parseMediaField(document);
				if (media) requestBody.media = parseMediaField(media);
				if (idempotencyKey) requestBody.idempotencyKey = idempotencyKey;

				// Add Telegram auth if provided (can override channel config or be used standalone)
				if (telegramAuth.auth) {
					const auth: Record<string, string> = {};
					if (telegramAuth.auth.apiKey) {
						auth.apiKey = telegramAuth.auth.apiKey;
					}
					if (telegramAuth.auth.chatId) {
						auth.chatId = telegramAuth.auth.chatId;
					}
					if (Object.keys(auth).length > 0) {
						requestBody.auth = auth;
					}
				}

				// Add additional options
				for (const [key, value] of Object.entries(additionalOptions)) {
					// Skip empty strings but allow false boolean values
					if (value === '' || value === undefined || value === null) {
						continue;
					}
					// Parse JSON fields
					if (key === 'options') {
						try {
							requestBody[key] = parsePlatformOptions(value as string);
						} catch (error) {
							if (this.continueOnFail()) {
								throw error; // Let the outer try/catch handle it or return error item
							}
							throw new NodeOperationError(
								this.getNode(),
								`Invalid Platform Options: ${(error as Error).message}`,
								{ itemIndex: i },
							);
						}
					} else if (key === 'tags' && typeof value === 'string') {
						// Convert comma-separated string to array
						requestBody[key] = value.split(',').map((tag) => tag.trim());
					} else {
						requestBody[key] = value;
					}
				}

				// Make HTTP request
				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};

				let response: {
					success?: boolean;
					data?: Record<string, unknown>;
					error?: Record<string, unknown>;
				};
				try {
					response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'bozonxSocialMediaPostingApi',
						{
							method: 'POST',
							url: `${baseUrl}${endpoint}`,
							headers,
							body: requestBody,
							json: true,
						},
					);
				} catch (error: unknown) {
					// Handle HTTP errors
					const err = error as { response?: { body?: Record<string, unknown> }; message?: string };
					if (err.response?.body) {
						response = err.response.body as typeof response;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`HTTP request failed: ${err.message || 'Unknown error'}`,
							{ itemIndex: i },
						);
					}
				}

				// Handle response
				if (response.success === false) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: (response.error?.message as string) || 'Unknown error',
								code: response.error?.code as string,
								details: response.error?.details as Record<string, unknown>,
								requestId: response.error?.requestId as string,
							},
							pairedItem: { item: i },
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`[${(response.error?.code as string) || 'ERROR'}] ${(response.error?.message as string) || 'Request failed'}`,
							{ itemIndex: i },
						);
					}
				} else {
					returnData.push({
						json: (response.data || response) as IDataObject,
						pairedItem: { item: i },
					});
				}
			} catch (error: unknown) {
				const err = error as { message?: string };
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: err.message || 'Unknown error',
						},
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}
