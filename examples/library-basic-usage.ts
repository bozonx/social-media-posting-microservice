/**
 * Example: Using social-media-posting-microservice as a library
 * This example demonstrates various library mode features
 */

import { createPostingClient, ILogger, BodyFormat, PostType } from '../src/index.js';

// Example 1: Using default console logger
async function basicUsage() {
  console.log('\n--- Example 1: Basic Usage with Default Logger ---');

  const client = createPostingClient({
    accounts: {
      myTelegramBot: {
        platform: 'telegram',
        auth: {
          botToken: 'YOUR_BOT_TOKEN_HERE', // Replace with actual bot token
        },
        channelId: '@yourchannelname', // Replace with your channel
      },
    },
    requestTimeoutSecs: 30,
    retryAttempts: 3,
    retryDelayMs: 1000,
    logLevel: 'info',
  });

  try {
    // Preview a post
    const previewResult = await client.preview({
      platform: 'telegram',
      account: 'myTelegramBot',
      body: 'Hello from library mode! 🚀',
      bodyFormat: BodyFormat.TEXT,
      type: PostType.POST,
    });

    console.log('Preview result:', JSON.stringify(previewResult, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.destroy();
  }
}

// Example 2: Using custom logger
async function customLoggerUsage() {
  console.log('\n--- Example 2: Custom Logger ---');

  // Implement custom logger (e.g., Winston, Pino, etc.)
  const customLogger: ILogger = {
    debug: (message, context) => {
      console.log(`[DEBUG] ${context ? `[${context}] ` : ''}${message}`);
    },
    log: (message, context) => {
      console.log(`[INFO] ${context ? `[${context}] ` : ''}${message}`);
    },
    warn: (message, context) => {
      console.warn(`[WARN] ${context ? `[${context}] ` : ''}${message}`);
    },
    error: (message, trace, context) => {
      console.error(`[ERROR] ${context ? `[${context}] ` : ''}${message}`);
      if (trace) console.error(trace);
    },
  };

  const client = createPostingClient({
    accounts: {
      myBot: {
        platform: 'telegram',
        auth: {
          botToken: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
        },
        channelId: '@yourchannel',
      },
    },
    logger: customLogger, // Use custom logger
  });

  try {
    const result = await client.preview({
      account: 'myBot',
      platform: 'telegram',
      body: '**Bold text** and _italic text_',
      bodyFormat: BodyFormat.MARKDOWN,
    });

    console.log('Preview successful:', 'detectedType' in result);
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await client.destroy();
  }
}

// Example 3: Multiple accounts
async function multipleAccountsUsage() {
  console.log('\n--- Example 3: Multiple Accounts ---');

  const client = createPostingClient({
    accounts: {
      marketing: {
        platform: 'telegram',
        auth: {
          botToken: process.env.MARKETING_BOT_TOKEN || 'TOKEN1',
        },
        channelId: '@marketing_channel',
      },
      support: {
        platform: 'telegram',
        auth: {
          botToken: process.env.SUPPORT_BOT_TOKEN || 'TOKEN2',
        },
        channelId: '@support_channel',
      },
    },
    logLevel: 'error',
  });

  try {
    // Post to marketing channel
    const marketingPreview = await client.preview({
      account: 'marketing',
      platform: 'telegram',
      body: '🎉 New product launch!',
    });

    // Post to support channel
    const supportPreview = await client.preview({
      account: 'support',
      platform: 'telegram',
      body: '📞 Support hours: 9 AM - 5 PM',
    });

    console.log('Marketing preview:', 'detectedType' in marketingPreview);
    console.log('Support preview:', 'detectedType' in supportPreview);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.destroy();
  }
}

// Example 4: Error handling
async function errorHandlingUsage() {
  console.log('\n--- Example 4: Error Handling ---');

  const client = createPostingClient({
    accounts: {
      test: {
        platform: 'telegram',
        auth: {
          botToken: 'test_token',
        },
        channelId: '123',
      },
    },
    logLevel: 'error',
  });

  try {
    // Try to use non-existent account
    const result = await client.preview({
      account: 'nonExistent',
      platform: 'telegram',
      body: 'Test',
    });

    if ('error' in result) {
      console.error('Validation error:', result.error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    await client.destroy();
  }
}

// Run all examples
async function main() {
  await basicUsage();
  await customLoggerUsage();
  await multipleAccountsUsage();
  await errorHandlingUsage();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
