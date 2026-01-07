import { createPostingClient } from '../../src/index.js';

describe('Library Mode', () => {
  it('should create posting client', async () => {
    const client = createPostingClient({
      accounts: {
        test: {
          platform: 'telegram',
          auth: {
            botToken: 'token',
            chatId: '123',
          },
        },
      },
      logLevel: 'error',
    });

    expect(client).toBeDefined();
    expect(client.post).toBeDefined();
    expect(client.preview).toBeDefined();
    expect(client.destroy).toBeDefined();

    await client.destroy();
  });
});
