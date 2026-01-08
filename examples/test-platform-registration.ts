/**
 * Simple test to verify platform registration in library mode
 */

import { createPostingClient, PostType } from '../src/index.js';

async function testPlatformRegistration() {
  console.log('Testing platform registration in library mode...\n');

  const client = createPostingClient({
    accounts: {
      myTelegram: {
        platform: 'telegram',
        auth: {
          apiKey: '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        },
      },
    },
    logLevel: 'debug',
  });

  console.log('✅ Client created successfully');

  // Test preview (should work without actual API call)
  const previewResult = await client.preview({
    account: 'myTelegram',
    platform: 'telegram',
    body: 'Test message',
    type: PostType.POST,
  });

  console.log('\n📋 Preview result:');
  console.log(JSON.stringify(previewResult, null, 2));

  if (previewResult.success) {
    console.log('\n✅ Platform registration works correctly!');
    console.log(`   Detected type: ${previewResult.data.detectedType}`);
    console.log(`   Valid: ${previewResult.data.valid}`);
  } else {
    console.log('\n❌ Preview failed');
    console.log(`   Errors: ${JSON.stringify(previewResult.data.errors)}`);
  }

  await client.destroy();
  console.log('\n✅ Client destroyed successfully');
}

testPlatformRegistration().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
