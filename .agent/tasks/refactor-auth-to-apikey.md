# Рефакторинг auth: замена botToken на apiKey

## Цель
Заменить специфичное для Telegram поле `botToken` на универсальное поле `apiKey`, которое будет использоваться всеми провайдерами. Для Telegram в это поле нужно указывать токен бота.

## Изменения

### 1. Конфигурация (config.yaml)
- Заменить `auth.botToken` на `auth.apiKey`
- Добавить комментарий, что для Telegram это токен бота от @BotFather

### 2. Документация (docs/api.md)
- Добавить подробное описание поля `auth` в разделе Request Body
- Указать, что это то же самое, что и в config.yaml
- Обновить примеры использования

### 3. Код
- **telegram-auth.validator.ts**: заменить проверку `botToken` на `apiKey`
- **telegram.platform.ts**: использовать `auth.apiKey` вместо `auth.botToken`
- **telegram-bot-cache.service.ts**: параметры и комментарии обновить (остается работа с токеном, но называется apiKey)

### 4. Логика объединения auth
Убедиться, что во всем проекте:
- Поля `auth` из запроса накладываются на `auth` канала (если канал указан)
- В запросе поля `auth` необязательные
- Проверка полноты auth происходит после объединения с auth канала
- Валидация проверяет, что все необходимые поля для провайдера присутствуют

### 5. N8N нода
- Заменить поле `botToken` на `apiKey` в секции Telegram authentication
- Сделать поля auth необязательными (они могут быть взяты из конфига микросервиса)
- Обновить описания полей

### 6. Тесты
- Обновить все моки и тестовые данные
- Заменить `botToken` на `apiKey` во всех тестах
- Убедиться, что тесты проверяют логику объединения auth

## Файлы для изменения

### Конфигурация
- `/mnt/disk2/workspace/social-media-posting-microservice/config.yaml`

### Документация
- `/mnt/disk2/workspace/social-media-posting-microservice/docs/api.md`
- `/mnt/disk2/workspace/social-media-posting-microservice/README.md` (если там упоминается auth)

### Код
- `src/modules/platforms/telegram/telegram-auth.validator.ts`
- `src/modules/platforms/telegram/telegram.platform.ts`
- `src/modules/platforms/telegram/telegram-bot-cache.service.ts`
- `src/modules/post/post.service.ts` (проверить логику объединения auth)

### N8N
- `n8n-nodes-bozonx-social-media-posting-microservice/nodes/Post/BozonxPost.node.ts`

### Тесты
- `test/unit/preview.service.spec.ts`
- `test/unit/app-config.service.spec.ts`
- `test/unit/post.service.spec.ts`
- `test/unit/telegram.platform.spec.ts`
- `test/e2e/post.e2e-spec.ts`

## Проверка
1. Все тесты должны пройти
2. Приложение должно запуститься без ошибок
3. Документация должна быть согласована с кодом
4. N8N нода должна корректно работать с новыми полями
