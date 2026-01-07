/**
 * Example: Using social-media-posting-microservice as a library
 * This example demonstrates how to use the library mode
 */

import { createPostingClient, PostType, BodyFormat } from '../src/index.js';

// Configuration
const config = {
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
  logLevel: 'info' as const,
};

async function main() {
  console.log('Creating posting client...');
  
  // Create client
  const client = createPostingClient(config);

  try {
    // Example 1: Preview a post
    console.log('\n--- Example 1: Preview a post ---');
    const previewRequest = {
      platform: 'telegram',
      account: 'myTelegramBot',
      body: 'Hello from library mode! 🚀',
      bodyFormat: BodyFormat.TEXT,
      type: PostType.POST,
    };

    const previewResult = await client.preview(previewRequest);
    console.log('Preview result:', JSON.stringify(previewResult, null, 2));

    // Example 2: Publish a post (commented out - requires valid credentials)
    /*
    console.log('\n--- Example 2: Publish a post ---');
    const postRequest = {
      platform: 'telegram',
      account: 'myTelegramBot',
      body: 'This is a real post from library mode! 📝',
      bodyFormat: BodyFormat.MARKDOWN,
      type: PostType.POST,
      idempotencyKey: 'example-post-001', // Prevents duplicate posts
    };

    const postResult = await client.post(postRequest);
    console.log('Post result:', JSON.stringify(postResult, null, 2));
    */

    // Example 3: Post with media (commented out - requires valid credentials)
    /*
    console.log('\n--- Example 3: Post with image ---');
    const mediaRequest = {
      platform: 'telegram',
      account: 'myTelegramBot',
      body: 'Check out this image! 📸',
      type: PostType.IMAGE,
      cover: {
        src: 'https://example.com/image.jpg',
      },
    };

    const mediaResult = await client.post(mediaRequest);
    console.log('Media post result:', JSON.stringify(mediaResult, null, 2));
    */
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cleanup
    console.log('\nDestroying client...');
    await client.destroy();
    console.log('Done!');
  }
}

// Run example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
