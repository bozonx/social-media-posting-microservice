import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
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
			throw new Error('Platform Options must be valid JSON or YAML');
		}
	}

	if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
		return result as Record<string, unknown>;
	}
	throw new Error('Platform Options must be an object');
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
			'Publish content to social media platforms (Telegram, VK, Instagram) via Social Media Posting microservice',
		defaults: {
			name: 'Social Media Post',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'bozonxMicroservicesApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Base Path',
				name: 'basePath',
				type: 'string',
				default: 'post/api/v1',
				description:
					'API base path appended to the Gateway URL. Default: post/api/v1. Leading and trailing slashes are automatically handled.',
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
					{ name: 'Auto Detect', value: 'auto' },
					{ name: 'Text Post', value: 'post' },
					{ name: 'Image', value: 'image' },
					{ name: 'Video', value: 'video' },
					{ name: 'Album', value: 'album' },
					{ name: 'Audio', value: 'audio' },
					{ name: 'Document', value: 'document' },
					{ name: 'Article', value: 'article' },
					{ name: 'Poll', value: 'poll' },
					{ name: 'Short Video', value: 'short' },
					{ name: 'Story', value: 'story' },
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
				description: 'Cover image URL or MediaInput object (JSON)',
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
				description: 'Video URL or MediaInput object (JSON)',
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
				description: 'Audio URL or MediaInput object (JSON)',
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
				description: 'Document URL or MediaInput object (JSON)',
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
				description: 'JSON array of media URLs or MediaInput objects for albums (2-10 items)',
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

			// Authentication (optional)
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Authentication',
				default: {},
				description: 'Optional authentication. If not provided, uses config from microservice',
				options: [
					{
						name: 'channel',
						displayName: 'Channel',
						values: [
							{
								displayName: 'Channel Name',
								name: 'channelName',
								type: 'string',
								default: '',
								required: true,
								description: 'Channel name from microservice config.yaml',
							},
						],
					},
					{
						name: 'telegram',
						displayName: 'Telegram',
						values: [
							{
								displayName: 'Bot Token',
								name: 'botToken',
								type: 'string',
								typeOptions: { password: true },
								default: '',
								required: true,
								description: 'Telegram bot token',
							},
							{
								displayName: 'Chat ID',
								name: 'chatId',
								type: 'string',
								default: '',
								required: true,
								description: 'Telegram channel/chat ID (e.g., @mychannel or -100123456789)',
							},
						],
					},
				],
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
						description: 'Format of the post content',
					},
					{
						displayName: 'Convert Body',
						name: 'convertBody',
						type: 'boolean',
						default: true,
						description: 'Whether to convert body to platform-specific format',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: { rows: 2 },
						default: '',
						description: 'Post description (platform-specific)',
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
						description: 'Publishing mode',
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
						description: 'Content language code (e.g., en, ru)',
					},
					{
						displayName: 'Scheduled At',
						name: 'scheduledAt',
						type: 'string',
						default: '',
						description: 'Scheduled publishing time (ISO 8601 format)',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated tags/hashtags',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Post title (platform-specific)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('bozonxMicroservicesApi');
		const gatewayUrl = (credentials.gatewayUrl as string).replace(/\/$/, '');
		const apiToken = credentials.apiToken as string | undefined;

		for (let i = 0; i < items.length; i++) {
			try {
				const basePath = (this.getNodeParameter('basePath', i, 'post/api/v1') as string)
					.replace(/^\/+/, '')
					.replace(/\/+$/, '');
				const endpoint = `/${basePath}/post`;

				const platform = this.getNodeParameter('platform', i) as string;
				const body = this.getNodeParameter('body', i) as string;
				const type = this.getNodeParameter('type', i, 'auto') as string;
				const authentication = this.getNodeParameter('authentication', i, {}) as {
					channel?: { channelName: string };
					telegram?: { botToken: string; chatId: string };
				};
				const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as Record<
					string,
					string | boolean | number
				>;

				// Build request body
				const requestBody: IDataObject = {
					platform,
					body,
				};

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

				// Add authentication if provided
				if (authentication.channel?.channelName) {
					requestBody.channel = authentication.channel.channelName;
				} else if (authentication.telegram) {
					requestBody.auth = {
						botToken: authentication.telegram.botToken,
						chatId: authentication.telegram.chatId,
					};
				}

				// Add additional options
				for (const [key, value] of Object.entries(additionalOptions)) {
					if (value !== '' && value !== undefined && value !== null) {
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
				}

				// Make HTTP request
				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};

				if (apiToken) {
					headers['Authorization'] = `Bearer ${apiToken}`;
				}

				let response: {
					success?: boolean;
					data?: Record<string, unknown>;
					error?: Record<string, unknown>;
				};
				try {
					response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${gatewayUrl}${endpoint}`,
						headers,
						body: requestBody,
						json: true,
					});
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
