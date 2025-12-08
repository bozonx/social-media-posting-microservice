import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import * as yaml from 'js-yaml';

/**
 * Universal YAML/JSON parser for options and media fields
 * - If value is a string: try YAML first, then JSON validation
 * - If any other type: convert to JSON using JSON.stringify
 */
function parseUniversalField(
	value: unknown,
	fieldName: string,
): Record<string, unknown> | unknown[] {
	if (!value) return {};

	// If value is a string, try YAML first, then JSON
	if (typeof value === 'string') {
		// First, try to parse as YAML
		try {
			const yamlResult = yaml.load(value);
			// Validate that result is object or array
			if (typeof yamlResult === 'object' && yamlResult !== null) {
				return yamlResult as Record<string, unknown> | unknown[];
			}
		} catch {
			// YAML parsing failed, try JSON
		}

		// Try to parse as JSON
		try {
			const jsonResult = JSON.parse(value);
			// Validate that result is object or array
			if (typeof jsonResult === 'object' && jsonResult !== null) {
				return jsonResult as Record<string, unknown> | unknown[];
			}
		} catch {
			throw new ApplicationError(`${fieldName} must be valid JSON or YAML`);
		}

		throw new ApplicationError(`${fieldName} must be an object or array`);
	}

	// If value is any other type (passed via expression), convert to JSON
	try {
		const stringified = JSON.stringify(value);
		const parsed = JSON.parse(stringified);
		if (typeof parsed === 'object' && parsed !== null) {
			return parsed as Record<string, unknown> | unknown[];
		}
		throw new ApplicationError(`${fieldName} must be an object or array`);
	} catch {
		throw new ApplicationError(`${fieldName} could not be converted to JSON`);
	}
}

/**
 * Parse media field using universal parser
 * Wraps the result in {src: value} if it's a plain string (URL or file_id)
 */
function parseMediaField(value: unknown): Record<string, unknown> | unknown[] | undefined {
	if (!value) return undefined;

	// If it's a string, try to parse as YAML/JSON first
	if (typeof value === 'string') {
		try {
			// Try to parse as structured data (YAML/JSON)
			const parsed = parseUniversalField(value, 'Media');
			// If parsing succeeded and result is object/array, return it
			return parsed;
		} catch {
			// Parsing failed - it's a plain URL or file_id, wrap it
			return { src: value };
		}
	}

	// Otherwise use universal parser for non-string values
	return parseUniversalField(value, 'Media');
}

export class BozonxPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Social Media Post',
		name: 'bozonxPost',
		icon: 'file:post.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["platform"]}}',
		description:
			'Publish content to social media platforms (Telegram) via Social Media Posting microservice.',
		defaults: {
			name: 'Social Media Post',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'bozonxSocialMediaPostingApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			// Mode
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'UI', value: 'ui' },
					{ name: 'YAML/JSON', value: 'json' },
				],
				default: 'ui',
				description: 'Configuration mode: UI (user-friendly forms) or YAML/JSON config',
			},

			// JSON Configuration
			{
				displayName: 'YAML/JSON Configuration',
				name: 'jsonConfig',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						mode: ['json'],
					},
				},
				required: true,
				default: '',
				placeholder:
					'{\n  "body": "Post content",\n  "type": "post",\n  "channelId": "@mychannel"\n}',
				description:
					'Full request configuration in JSON or YAML format. The platform and auth fields will be automatically added (can be overridden).',
			},

			// Account
			{
				displayName: 'Account',
				name: 'account',
				type: 'string',
				default: '',
				placeholder: 'e.g., my-telegram-account',
				hint: 'Leave empty to configure platform and auth manually',
				description:
					'Account name from microservice config.yaml. If specified, platform and auth are taken from server config.',
				displayOptions: {
					show: {
						mode: ['ui'],
					},
				},
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
				description:
					'Social media platform to post to. Determines which API key from credentials to use.',
			},

			// Channel ID
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				description:
					'Channel/chat ID (e.g., @mychannel or -100123456789 for Telegram). Can override channel config.',
				displayOptions: {
					show: {
						mode: ['ui'],
						platform: ['telegram'],
					},
				},
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
				displayOptions: {
					show: {
						mode: ['ui'],
					},
				},
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
				displayOptions: {
					show: {
						mode: ['ui'],
					},
				},
			},

			// Cover Image
			{
				displayName: 'Cover Image',
				name: 'cover',
				type: 'string',
				default: '',
				description:
					'Cover image URL or Telegram file_id. Use "Cover has Spoiler" option to add spoiler effect.',
				displayOptions: {
					show: {
						mode: ['ui'],
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
					'Video URL or Telegram file_id. Use "Video has Spoiler" option to add spoiler effect.',
				displayOptions: {
					show: {
						mode: ['ui'],
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
				description: 'Audio URL or Telegram file_id.',
				displayOptions: {
					show: {
						mode: ['ui'],
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
				description: 'Document URL or Telegram file_id.',
				displayOptions: {
					show: {
						mode: ['ui'],
						type: ['auto', 'document'],
					},
				},
			},

			// Media Array
			{
				displayName: 'Media Array (YAML/JSON)',
				name: 'media',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description:
					'Array of media objects for albums. Accepts YAML or JSON (YAML is tried first). Each item can have: "src" (URL or file_id), "type" (image/video), "hasSpoiler" (boolean). Example: [{"src": "url1", "type": "image"}, {"src": "url2"}]',
				displayOptions: {
					show: {
						mode: ['ui'],
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
				displayOptions: {
					show: {
						mode: ['ui'],
					},
				},
			},

			// Additional Options
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						mode: ['ui'],
					},
				},
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
						displayName: 'Cover has Spoiler',
						name: 'coverHasSpoiler',
						type: 'boolean',
						default: false,
						description: 'Whether to hide the cover image behind a spoiler',
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
						displayName: 'Platform Options  (YAML/JSON)',
						name: 'options',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description:
							'Platform-specific options. Accepts YAML or JSON (YAML is tried first, then JSON).',
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
						description:
							'Maximum body length in characters (max 500,000). Overrides the maxBody value from account configuration in config.yaml.',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Post title (platform-specific, max 1000 characters)',
					},
					{
						displayName: 'Video has Spoiler',
						name: 'videoHasSpoiler',
						type: 'boolean',
						default: false,
						description: 'Whether to hide the video behind a spoiler',
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

				const mode = this.getNodeParameter('mode', i, 'ui') as string;
				const platform = this.getNodeParameter('platform', i, '') as string;

				let requestBody: IDataObject;

				if (mode === 'json') {
					// JSON mode - parse jsonConfig
					const jsonConfig = this.getNodeParameter('jsonConfig', i, '') as string;

					try {
						requestBody = parseUniversalField(jsonConfig, 'JSON Configuration') as IDataObject;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid JSON Configuration: ${(error as Error).message}`,
							{ itemIndex: i },
						);
					}

					// Platform always sent (priority to jsonConfig)
					if (!requestBody.platform && platform) {
						requestBody.platform = platform;
					}

					// Add auth if no account and no auth in jsonConfig
					if (!requestBody.account && !requestBody.auth && platform === 'telegram') {
						const telegramBotToken = credentials.telegramBotToken as string;
						if (telegramBotToken) {
							requestBody.auth = {
								apiKey: telegramBotToken,
							};
						}
					}
				} else {
					// UI mode - existing logic
					const account = this.getNodeParameter('account', i, '') as string;
					const channelId = this.getNodeParameter('channelId', i, '') as string;
					const body = this.getNodeParameter('body', i) as string;
					const type = this.getNodeParameter('type', i, 'auto') as string;
					const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as Record<
						string,
						string | boolean | number
					>;

					// Build request body
					requestBody = {
						body,
					};

					// Add account and/or platform (platform is always sent now)
					if (account) {
						requestBody.account = account;
					}

					// Always add platform
					if (platform) {
						requestBody.platform = platform;
					}

					// Add platform auth from credentials when using inline mode (no account)
					if (!account && platform === 'telegram') {
						const telegramBotToken = credentials.telegramBotToken as string;
						if (telegramBotToken) {
							requestBody.auth = {
								apiKey: telegramBotToken,
							};
						}
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

					if (cover) {
						let coverVal: any = parseMediaField(cover);
						if (additionalOptions.coverHasSpoiler) {
							if (typeof coverVal === 'string') {
								coverVal = { src: coverVal, hasSpoiler: true };
							} else if (
								typeof coverVal === 'object' &&
								coverVal !== null &&
								!Array.isArray(coverVal)
							) {
								coverVal = { ...coverVal, hasSpoiler: true };
							}
						}
						requestBody.cover = coverVal;
					}
					if (video) {
						let videoVal: any = parseMediaField(video);
						if (additionalOptions.videoHasSpoiler) {
							if (typeof videoVal === 'string') {
								videoVal = { src: videoVal, hasSpoiler: true };
							} else if (
								typeof videoVal === 'object' &&
								videoVal !== null &&
								!Array.isArray(videoVal)
							) {
								videoVal = { ...videoVal, hasSpoiler: true };
							}
						}
						requestBody.video = videoVal;
					}
					if (audio) requestBody.audio = parseMediaField(audio);
					if (document) requestBody.document = parseMediaField(document);
					if (media) requestBody.media = parseMediaField(media);
					if (idempotencyKey) requestBody.idempotencyKey = idempotencyKey;

					// Add channelId if provided
					if (channelId) {
						requestBody.channelId = channelId;
					}

					// Add additional options
					for (const [key, value] of Object.entries(additionalOptions)) {
						// Skip spoiler flags as they are handled above
						if (['coverHasSpoiler', 'videoHasSpoiler'].includes(key)) continue;

						// Skip empty strings but allow false boolean values
						if (value === '' || value === undefined || value === null) {
							continue;
						}
						// Parse JSON/YAML fields
						if (key === 'options') {
							try {
								requestBody[key] = parseUniversalField(value, 'Platform Options');
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
							// Convert comma-separated string to array, trim and remove empty
							requestBody[key] = value
								.split(',')
								.map((tag) => tag.trim())
								.filter((tag) => tag.length > 0);
						} else {
							requestBody[key] = value;
						}
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
					const err = error as {
						response?: {
							body?: Record<string, unknown>;
							statusCode?: number;
						};
						message?: string;
						cause?: any;
					};

					if (err.response?.body) {
						response = err.response.body as typeof response;

						// If response has error details, throw a more informative error
						if (response.success === false && response.error) {
							const errorMsg = response.error.message as string || 'Request failed';
							const errorCode = response.error.code as string || 'ERROR';
							const errorDetails = response.error.details as Record<string, unknown> | undefined;

							let detailsStr = '';
							if (errorDetails) {
								// Format validation errors nicely
								detailsStr = '\nDetails: ' + JSON.stringify(errorDetails, null, 2);
							}

							throw new NodeOperationError(
								this.getNode(),
								`[${errorCode}] ${errorMsg}${detailsStr}`,
								{ itemIndex: i },
							);
						}
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
