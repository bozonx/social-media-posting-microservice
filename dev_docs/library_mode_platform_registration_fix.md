# Отчет об исправлении бага в Library Mode

## Проблема

Библиотека `bozonx-social-media-posting` имела баг в library mode — она не регистрировала платформы при вызове `createPostingClient()`. Это приводило к ошибке "Platform not supported" при попытке использовать библиотеку программно.

## Причина

В NestJS режиме платформы регистрируются в методе `onModuleInit()` модуля `PlatformsModule`:

```typescript
onModuleInit(): void {
  // Register platforms
  this.platformRegistry.register(this.telegramPlatform);

  // Register auth validators
  this.authValidatorRegistry.register(this.telegramAuthValidator);
}
```

Однако в library mode функция `createPostingClient()` создавала пустые `PlatformRegistry` и `AuthValidatorRegistry` без регистрации платформ.

## Решение

Добавлена регистрация платформ в функцию `createPostingClient()` в файле `src/library.ts`:

1. **Импортированы необходимые зависимости:**
   - `TelegramPlatform`
   - `TelegramAuthValidator`
   - `TelegramTypeDetector`
   - `MediaService`

2. **Создание экземпляров зависимостей:**
   ```typescript
   // Create platform dependencies
   const mediaService = new MediaService();
   const telegramTypeDetector = new TelegramTypeDetector();
   ```

3. **Создание экземпляров платформ:**
   ```typescript
   // Create platform instances
   const telegramPlatform = new TelegramPlatform(mediaService, telegramTypeDetector);
   const telegramAuthValidator = new TelegramAuthValidator();
   ```

4. **Регистрация платформ:**
   ```typescript
   // Register platforms and auth validators
   platformRegistry.register(telegramPlatform);
   authValidatorRegistry.register(telegramAuthValidator);
   ```

## Проверка

1. **Все существующие тесты проходят:**
   - Unit тесты: 7/7 passed
   - Integration тесты: 6/6 passed
   - Все тесты: 263/263 passed

2. **Создан тестовый скрипт** `examples/test-platform-registration.ts`, который проверяет:
   - Создание клиента
   - Работу preview (без реального API вызова)
   - Корректное определение типа поста
   - Graceful shutdown

3. **Сборка проходит успешно:**
   ```bash
   npm run build
   ```

## Изменения в документации

1. **CHANGELOG.md** — добавлена запись в раздел "Fixed":
   ```markdown
   - **Library Mode Platform Registration**: Fixed bug where platforms were not being 
     registered when using `createPostingClient()`, causing "Platform not supported" 
     errors. Now properly instantiates and registers TelegramPlatform and 
     TelegramAuthValidator with their dependencies.
   ```

## Результат

Теперь библиотека корректно работает в library mode. Пользователи могут использовать `createPostingClient()` для программного доступа к функциональности без запуска HTTP сервера.

**Пример использования:**

```typescript
import { createPostingClient, PostType } from 'bozonx-social-media-posting';

const client = createPostingClient({
  accounts: {
    myTelegram: {
      platform: 'telegram',
      auth: {
        apiKey: '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      },
    },
  },
});

const result = await client.preview({
  account: 'myTelegram',
  platform: 'telegram',
  body: 'Test message',
  type: PostType.POST,
});

console.log(result);
// { success: true, data: { valid: true, detectedType: 'post', ... } }

await client.destroy();
```
