import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class BozonxPost implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Social Media Post',
        name: 'bozonxPost',
        icon: 'file:post.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Publish content to social media platforms via Bozonx microservice',
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
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Publish Post',
                        value: 'publish',
                        description: 'Publish content to a platform',
                        action: 'Publish content to a platform',
                    },
                    {
                        name: 'Preview Post',
                        value: 'preview',
                        description: 'Validate and preview without publishing',
                        action: 'Preview post without publishing',
                    },
                ],
                default: 'publish',
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

            // Authentication Mode
            {
                displayName: 'Authentication Mode',
                name: 'authMode',
                type: 'options',
                options: [
                    {
                        name: 'Use Channel from Config',
                        value: 'channel',
                        description: 'Use pre-configured channel from microservice config.yaml',
                    },
                    {
                        name: 'Use Inline Auth',
                        value: 'inline',
                        description: 'Provide authentication credentials directly',
                    },
                ],
                default: 'channel',
                required: true,
            },

            // Channel (when using channel mode)
            {
                displayName: 'Channel Name',
                name: 'channel',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        authMode: ['channel'],
                    },
                },
                description: 'Channel name from microservice config.yaml',
            },

            // Inline Auth (when using inline mode)
            {
                displayName: 'Inline Authentication',
                name: 'auth',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: false,
                },
                placeholder: 'Add Authentication',
                default: {},
                displayOptions: {
                    show: {
                        authMode: ['inline'],
                        platform: ['telegram'],
                    },
                },
                options: [
                    {
                        name: 'telegram',
                        displayName: 'Telegram Auth',
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
                        displayName: 'Post Type',
                        name: 'type',
                        type: 'options',
                        options: [
                            { name: 'Auto Detect', value: 'auto' },
                            { name: 'Text Post', value: 'post' },
                            { name: 'Image', value: 'image' },
                            { name: 'Video', value: 'video' },
                            { name: 'Audio', value: 'audio' },
                            { name: 'Album', value: 'album' },
                            { name: 'Document', value: 'document' },
                            { name: 'Article', value: 'article' },
                            { name: 'Short Video', value: 'short' },
                            { name: 'Story', value: 'story' },
                            { name: 'Poll', value: 'poll' },
                        ],
                        default: 'auto',
                        description: 'Type of post to create',
                    },
                    {
                        displayName: 'Body Format',
                        name: 'bodyFormat',
                        type: 'options',
                        options: [
                            { name: 'HTML', value: 'html' },
                            { name: 'Markdown', value: 'md' },
                            { name: 'Plain Text', value: 'text' },
                        ],
                        default: 'html',
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
                        displayName: 'Title',
                        name: 'title',
                        type: 'string',
                        default: '',
                        description: 'Post title (platform-specific)',
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
                        displayName: 'Cover Image',
                        name: 'cover',
                        type: 'string',
                        default: '',
                        description: 'Cover image URL or MediaInput object (JSON)',
                    },
                    {
                        displayName: 'Video',
                        name: 'video',
                        type: 'string',
                        default: '',
                        description: 'Video URL or MediaInput object (JSON)',
                    },
                    {
                        displayName: 'Audio',
                        name: 'audio',
                        type: 'string',
                        default: '',
                        description: 'Audio URL or MediaInput object (JSON)',
                    },
                    {
                        displayName: 'Document',
                        name: 'document',
                        type: 'string',
                        default: '',
                        description: 'Document URL or MediaInput object (JSON)',
                    },
                    {
                        displayName: 'Media Array',
                        name: 'media',
                        type: 'string',
                        typeOptions: { rows: 3 },
                        default: '',
                        description: 'JSON array of media URLs or MediaInput objects for albums (2-10 items)',
                    },
                    {
                        displayName: 'Platform Options',
                        name: 'options',
                        type: 'string',
                        typeOptions: { rows: 3 },
                        default: '',
                        description: 'Platform-specific options as JSON object',
                    },
                    {
                        displayName: 'Tags',
                        name: 'tags',
                        type: 'string',
                        default: '',
                        description: 'Comma-separated tags/hashtags',
                    },
                    {
                        displayName: 'Post Language',
                        name: 'postLanguage',
                        type: 'string',
                        default: '',
                        description: 'Content language code (e.g., en, ru)',
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
                        displayName: 'Scheduled At',
                        name: 'scheduledAt',
                        type: 'string',
                        default: '',
                        description: 'Scheduled publishing time (ISO 8601 format)',
                    },
                    {
                        displayName: 'Idempotency Key',
                        name: 'idempotencyKey',
                        type: 'string',
                        default: '',
                        description: 'Key to prevent duplicate posts',
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

        const operation = this.getNodeParameter('operation', 0) as string;
        const endpoint = operation === 'publish' ? '/api/v1/post' : '/api/v1/preview';

        for (let i = 0; i < items.length; i++) {
            try {
                const platform = this.getNodeParameter('platform', i) as string;
                const body = this.getNodeParameter('body', i) as string;
                const authMode = this.getNodeParameter('authMode', i) as string;
                const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as Record<
                    string,
                    any
                >;

                // Build request body
                const requestBody: Record<string, any> = {
                    platform,
                    body,
                };

                // Add authentication
                if (authMode === 'channel') {
                    requestBody.channel = this.getNodeParameter('channel', i) as string;
                } else if (authMode === 'inline') {
                    const authData = this.getNodeParameter('auth', i) as any;
                    if (authData?.telegram) {
                        requestBody.auth = {
                            botToken: authData.telegram.botToken,
                            chatId: authData.telegram.chatId,
                        };
                    }
                }

                // Add additional options
                for (const [key, value] of Object.entries(additionalOptions)) {
                    if (value !== '' && value !== undefined && value !== null) {
                        // Parse JSON fields
                        if (['cover', 'video', 'audio', 'document', 'media', 'options'].includes(key)) {
                            try {
                                // Try to parse as JSON, if fails - treat as string
                                if (typeof value === 'string' && value.trim().startsWith('{') || value.trim().startsWith('[')) {
                                    requestBody[key] = JSON.parse(value);
                                } else {
                                    requestBody[key] = value;
                                }
                            } catch {
                                requestBody[key] = value;
                            }
                        } else if (key === 'tags') {
                            // Convert comma-separated string to array
                            requestBody[key] = (value as string).split(',').map((tag) => tag.trim());
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

                const response = await this.helpers.httpRequest({
                    method: 'POST',
                    url: `${gatewayUrl}${endpoint}`,
                    headers,
                    body: requestBody,
                    json: true,
                });

                // Handle response
                if (response.success === false) {
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: {
                                error: response.error?.message || 'Unknown error',
                                code: response.error?.code,
                                details: response.error?.details,
                            },
                            pairedItem: { item: i },
                        });
                    } else {
                        throw new NodeOperationError(
                            this.getNode(),
                            response.error?.message || 'Request failed',
                            { itemIndex: i },
                        );
                    }
                } else {
                    returnData.push({
                        json: response.data || response,
                        pairedItem: { item: i },
                    });
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
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
