# План: Постинг в Telegram

**Дата:** 2025-12-01  
**Версия:** 1.0  
**Статус:** Draft

---

## 1. Обзор

Данный документ описывает детальный план реализации постинга в Telegram с поддержкой автоматического определения типа сообщения и расширенными медиа-возможностями.

---

## 2. Новые поля и типы

### 2.1. Добавление типа `auto`

**Описание:**  
Добавить новый тип поста `auto`, который будет значением по умолчанию для всех социальных сетей.

**Изменения в коде:**
- Добавить `AUTO = 'auto'` в enum `PostType` (`src/common/enums/post-type.enum.ts`)
- Установить `auto` как значение по умолчанию в DTO
- Обновить документацию (PRD.md, api.md)

**Поведение:**  
Для каждой социальной сети `auto` означает разную логику автоматического определения типа. Для Telegram — см. раздел 3.

---

### 2.2. Добавление полей `audio` и `document`

**Описание:**  
Добавить поля `audio` и `document` для социальных сетей, которые поддерживают эти типы медиа (включая Telegram).

**Изменения в коде:**

В `PostRequestDto` (`src/modules/post/dto/post-request.dto.ts`):

```typescript
// Медиа-поля могут быть строкой (URL) или объектом MediaInput
type MediaInput = string | {
  url?: string;        // URL медиа-файла
  fileId?: string;     // Telegram file_id (для уже загруженных файлов)
  hasSpoiler?: boolean; // Скрыть медиа спойлером (для шокирующего контента)
};

@IsOptional()
audio?: MediaInput;

@IsOptional()
document?: MediaInput;

@IsOptional()
cover?: MediaInput;

@IsOptional()
video?: MediaInput;

@IsOptional()
media?: MediaInput[];
```

**Примечание:**  
- `audio` - аудио-файл (MP3, M4A для музыки/подкастов)
- `document` - любой файл/документ (PDF, DOC, ZIP и т.д.)
- `cover` - обложка/изображение
- `video` - видео-файл
- `media` - массив медиа для альбома/группы

**Форматы передачи медиа:**
1. **Строка (URL):** `"https://example.com/file.pdf"`
2. **Объект с URL:** `{ "url": "https://example.com/file.pdf" }`
3. **Объект с fileId:** `{ "fileId": "AgACAgIAAxkBAAIC..." }` (Telegram file_id)
4. **Объект со спойлером:** `{ "url": "https://example.com/shock.jpg", "hasSpoiler": true }`

**Поле `hasSpoiler`:**
- Доступно для: `cover`, `video`, `media[]` (для фото и видео в Telegram)
- Скрывает медиа под спойлером (требует клик для просмотра)
- Используется для шокирующего или чувствительного контента
- Поддерживается с Telegram Bot API 5.6+

**Поддержка платформами:**
- ✅ Telegram - поддерживает `audio`, `document`, `hasSpoiler`, `fileId`
- ✅ VK - поддерживает `audio`, `document`
- ✅ Discord - поддерживает `document` (attachments)
- ❌ Instagram - не поддерживает
- ❌ Twitter/X - ограниченная поддержка

---

## 3. Логика автоматического определения типа для Telegram (type: auto)

### 3.1. Приоритет проверок

Когда `type = 'auto'` (или не указан), система должна автоматически определить метод отправки сообщения в Telegram, выполняя проверки в следующем порядке:

```
1. media[]       → Медиа-группа (sendMediaGroup)
2. document      → Приложенный файл (sendDocument)  
3. audio         → Аудио-сообщение (sendAudio)
4. video         → Видео-сообщение (sendVideo)
5. cover         → Сообщение-картинка (sendPhoto)
6. [нет медиа]   → Текстовое сообщение (sendMessage)
```

### 3.2. Детальное описание логики

#### 1. Проверка наличия `media` (медиа-группа)

**Условие:** `media && media.length > 0`

**Действие:**
- Использовать метод `sendMediaGroup` из Telegram Bot API
- `body` используется как `caption` для первого элемента группы
- Игнорируются: `cover`, `video`, `audio`, `document`
- Ограничение: максимум 10 элементов в группе

**Пример запроса:**
```json
{
  "platform": "telegram",
  "type": "auto",
  "body": "Описание альбома",
  "media": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg",
    "https://example.com/video.mp4"
  ]
}
```

---

#### 2. Проверка наличия `document` (приложенный файл)

**Условие:** `document && !media`

**Действие:**
- Использовать метод `sendDocument` из Telegram Bot API
- `body` используется как `caption`
- Игнорируются: `cover`, `video`, `audio`
- Поддерживаются любые типы файлов (PDF, DOC, ZIP и т.д.)
- Максимальный размер: 50 МБ

**Пример запроса:**
```json
{
  "platform": "telegram",
  "type": "auto",
  "body": "Вот документ",
  "document": "https://example.com/report.pdf"
}
```

---

#### 3. Проверка наличия `audio` (аудио-сообщение)

**Условие:** `audio && !media && !document`

**Действие:**
- Использовать метод `sendAudio` из Telegram Bot API
- `body` используется как `caption`
- Игнорируются: `cover`, `video`
- Telegram отображает плеер для аудио
- Поддерживаемые форматы: MP3, M4A, OGG
- Максимальный размер: 50 МБ

**Пример запроса:**
```json
{
  "platform": "telegram",
  "type": "auto",
  "body": "Новый подкаст",
  "audio": "https://example.com/podcast.mp3"
}
```

---

#### 4. Проверка наличия `video` (видео-сообщение)

**Условие:** `video && !media && !document && !audio`

**Действие:**
- Использовать метод `sendVideo` из Telegram Bot API
- `body` используется как `caption`
- Игнорируется: `cover`
- Поддерживаемые форматы: MP4, MOV
- Максимальный размер: 50 МБ

**Пример запроса:**
```json
{
  "platform": "telegram",
  "type": "auto",
  "body": "Видео инструкция",
  "video": "https://example.com/tutorial.mp4"
}
```

---

#### 5. Проверка наличия `cover` (сообщение-картинка)

**Условие:** `cover && !media && !document && !audio && !video`

**Действие:**
- Использовать метод `sendPhoto` из Telegram Bot API
- `body` используется как `caption`
- Поддерживаемые форматы: JPG, PNG, WEBP
- Максимальный размер: 10 МБ

**Пример запроса:**
```json
{
  "platform": "telegram",
  "type": "auto",
  "body": "Красивая картинка",
  "cover": "https://example.com/image.jpg"
}
```

---

#### 6. Текстовое сообщение (по умолчанию)

**Условие:** нет `cover`, `video`, `audio`, `document`, `media`

**Действие:**
- Использовать метод `sendMessage` из Telegram Bot API
- Отправляется только `body`
- Максимальная длина: 4096 символов

**Пример запроса:**
```json
{
  "platform": "telegram",
  "type": "auto",
  "body": "Текстовое сообщение без медиа"
}
```

---

### 3.3. Таблица приоритетов (для быстрого понимания)

| Медиа-поля                                      | Метод Telegram API | Игнорируемые поля                  |
|-------------------------------------------------|--------------------|------------------------------------|
| `media[]`                                       | sendMediaGroup     | cover, video, audio, document      |
| `document` (без media)                          | sendDocument       | cover, video, audio                |
| `audio` (без media, document)                   | sendAudio          | cover, video                       |
| `video` (без media, document, audio)            | sendVideo          | cover                              |
| `cover` (без media, document, audio, video)     | sendPhoto          | -                                  |
| нет медиа                                       | sendMessage        | -                                  |

---

## 4. Использование поля `body` для медиа-сообщений

**Важно:**  
Для всех типов медиа-сообщений (фото, видео, аудио, документ, медиа-группа) поле `body` используется как `caption` (подпись к медиа).

**Ограничения caption в Telegram:**
- Максимальная длина: 1024 символа
- Поддерживаются те же форматы разметки, что и для обычных сообщений (HTML, Markdown)

**Обработка:**
- Если `body.length > 1024` для медиа-сообщений → **вернуть ошибку валидации**
- Если `body.length > 4096` для текстовых сообщений → **вернуть ошибку валидации**
- Применяется конвертация формата (если `convertBody = true`)

**Пример ошибки:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Caption exceeds maximum length of 1024 characters (current: 1500)",
    "field": "body"
  }
}
```

---

## 5. Неиспользуемые поля для Telegram

Следующие поля **не используются** и **игнорируются** для Telegram:

| Поле           | Причина                                                   |
|----------------|-----------------------------------------------------------|
| `title`        | Telegram не поддерживает отдельные заголовки              |
| `description`  | Telegram не имеет поля описания (используется только body)|
| `postLanguage` | Telegram не требует указания языка контента               |
| `tags`         | Telegram не имеет встроенной системы тегов (хештеги можно добавить в body) |
| `mode`         | Telegram не поддерживает черновики через Bot API          |
| `scheduledAt`  | Telegram Bot API не поддерживает нативный scheduled posting |

**Рекомендация:**  
При валидации для Telegram можно выводить предупреждение (warning) в логи, если эти поля заданы, но они будут проигнорированы.

---

## 6. Явное указание типа поста (валидация)

### 6.1. Общие правила

Если поле `type` **явно задано** (не `auto`), система должна:
1. Валидировать данные именно для этого типа поста
2. Проверить наличие требуемых полей
3. Вернуть ошибку валидации, если данные не соответствуют типу

### 6.2. Поддерживаемые типы для Telegram

#### `post` - текстовое сообщение

**Требования:**
- `body` обязательно
- Медиа-поля (`cover`, `video`, `audio`, `document`, `media`) должны отсутствовать

**Валидация:**
- Если есть медиа-поля → вернуть ошибку: `"For type 'post', media fields must not be provided"`
- Если `body.length > 4096` → вернуть ошибку: `"Text message exceeds maximum length of 4096 characters"`

**Метод API:** `sendMessage`

---

#### `image` - сообщение-картинка

**Требования:**
- `cover` обязательно
- Остальные медиа-поля игнорируются

**Валидация:**
- Если `cover` отсутствует → вернуть ошибку: `"Field 'cover' is required for type 'image'"`
- Если есть `media`, `video`, `audio`, `document` → **предупреждение** (они будут проигнорированы)

**Метод API:** `sendPhoto`

---

#### `album` - медиа-группа

**Требования:**
- `media` обязательно, должно содержать от 2 до 10 элементов
- Остальные медиа-поля игнорируются

**Валидация:**
- Если `media` отсутствует или пустой → вернуть ошибку: `"Field 'media' is required for type 'album'"`
- Если `media.length < 2` → вернуть ошибку: `"Album must contain at least 2 media items"`
- Если `media.length > 10` → вернуть ошибку: `"Album cannot contain more than 10 media items"`
- Если есть `cover`, `video`, `audio`, `document` → **предупреждение** (они будут проигнорированы)

**Метод API:** `sendMediaGroup`

---

#### `video` - видео-сообщение

**Требования:**
- `video` обязательно
- Остальные медиа-поля игнорируются

**Валидация:**
- Если `video` отсутствует → вернуть ошибку: `"Field 'video' is required for type 'video'"`
- Если есть `media`, `cover`, `audio`, `document` → **предупреждение** (они будут проигнорированы)

**Метод API:** `sendVideo`

---

#### `audio` - аудио-сообщение

**Требования:**
- `audio` обязательно
- Остальные медиа-поля игнорируются

**Валидация:**
- Если `audio` отсутствует → вернуть ошибку: `"Field 'audio' is required for type 'audio'"`
- Если есть `media`, `cover`, `video`, `document` → **предупреждение** (они будут проигнорированы)

**Метод API:** `sendAudio`

---

#### `document` - приложенный файл

**Требования:**
- `document` обязательно
- Остальные медиа-поля игнорируются

**Валидация:**
- Если `document` отсутствует → вернуть ошибку: `"Field 'document' is required for type 'document'"`
- Если есть `media`, `cover`, `video`, `audio` → **предупреждение** (они будут проигнорированы)

**Метод API:** `sendDocument`

---

### 6.3. Неподдерживаемые типы для Telegram

Следующие типы **не поддерживаются** для Telegram и должны возвращать ошибку:

| Тип        | Причина                                                          |
|------------|------------------------------------------------------------------|
| `article`  | Telegram не поддерживает формат article через Bot API (есть Telegraph, но это отдельный сервис) |
| `short`    | Нет отдельного типа для коротких видео (используется обычный `video`) |
| `story`    | Stories API пока не поддерживается в Bot API                     |
| `poll`     | Пока не реализовано (можно добавить в будущих версиях)           |

**Валидация:**
- Если `type` = один из вышеперечисленных → вернуть ошибку: `"Post type '{type}' is not supported for Telegram"`

---

## 7. Валидация неоднозначных медиа-полей

### 7.1. Проблема

Если пользователь передает несколько взаимоисключающих медиа-полей одновременно (например, `audio` и `video`), система не может однозначно определить, какой тип сообщения отправить.

### 7.2. Решение

При `type = 'auto'` необходимо проверять, что переданы медиа-поля только для **одного** типа сообщения.

**Правило:** Если обнаружено более одного медиа-поля из разных категорий, вернуть ошибку валидации.

**Категории медиа-полей:**
1. **Медиа-группа:** `media[]`
2. **Документ:** `document`
3. **Аудио:** `audio`
4. **Видео:** `video`
5. **Изображение:** `cover`

**Примеры ошибок:**

```json
// ❌ ОШИБКА: audio и video одновременно
{
  "platform": "telegram",
  "body": "Контент",
  "audio": "https://example.com/song.mp3",
  "video": "https://example.com/clip.mp4"
}
// Ошибка: "Ambiguous media fields: cannot use 'audio' and 'video' together. Please specify only one media type or set explicit 'type'."
```

```json
// ❌ ОШИБКА: cover и video одновременно
{
  "platform": "telegram",
  "body": "Контент",
  "cover": "https://example.com/image.jpg",
  "video": "https://example.com/clip.mp4"
}
// Ошибка: "Ambiguous media fields: cannot use 'cover' and 'video' together. Please specify only one media type or set explicit 'type'."
```

```json
// ❌ ОШИБКА: document и audio одновременно
{
  "platform": "telegram",
  "body": "Контент",
  "document": "https://example.com/file.pdf",
  "audio": "https://example.com/song.mp3"
}
// Ошибка: "Ambiguous media fields: cannot use 'document' and 'audio' together. Please specify only one media type or set explicit 'type'."
```

**Исключения:**

`media[]` имеет наивысший приоритет и игнорирует остальные поля (без ошибки):

```json
// ✅ OK: media[] игнорирует остальные поля
{
  "platform": "telegram",
  "body": "Альбом",
  "media": ["url1", "url2"],
  "cover": "url3",  // Будет проигнорирован
  "video": "url4"   // Будет проигнорирован
}
```

### 7.3. Алгоритм валидации

```typescript
function validateMediaFields(request: PostRequest): void {
  if (request.type !== 'auto') {
    return; // Валидация только для auto
  }

  const mediaFields = [];
  
  if (request.media && request.media.length > 0) {
    // media[] имеет наивысший приоритет, остальные игнорируются
    return;
  }
  
  if (request.document) mediaFields.push('document');
  if (request.audio) mediaFields.push('audio');
  if (request.video) mediaFields.push('video');
  if (request.cover) mediaFields.push('cover');
  
  if (mediaFields.length > 1) {
    throw new ValidationError(
      `Ambiguous media fields: cannot use ${mediaFields.map(f => `'${f}'`).join(' and ')} together. ` +
      `Please specify only one media type or set explicit 'type'.`
    );
  }
}
```

---

## 8. Принятые решения

### 8.1. Naming: `document` (не `attachment`)

**Решение:** Использовать имя `document` для поля с приложенными файлами.

**Обоснование:**
- Соответствует методу Telegram API `sendDocument`
- Более понятное и специфичное название
- Избегает путаницы с другими типами вложений

---

### 8.2. Валидация форматов файлов

**Решение:** Не валидировать форматы файлов на стороне микросервиса.

**Обоснование:**
- Telegram API сам вернет понятную ошибку при неподдерживаемом формате
- Экономия времени и ресурсов
- Уменьшение нагрузки на микросервис
- Избежание дублирования логики валидации

---

### 8.3. Смешанные медиа в `media[]`

**Решение:** Разрешить смешивание фото и видео в одной медиа-группе.

**Обоснование:**
- Telegram поддерживает смешанные медиа-группы (фото + видео)
- Нет необходимости ограничивать функциональность платформы
- Добавлено примечание в документацию

---

### 8.4. Поле `scheduledAt`

**Решение:** Игнорировать поле `scheduledAt` для Telegram.

**Обоснование:**
- Telegram Bot API не поддерживает нативный scheduled posting
- Scheduling должен реализовываться на уровне выше (оркестратор, планировщик задач)
- Соответствует архитектуре stateless микросервиса
- Добавить предупреждение в логи, если поле указано

---

### 8.5. Обработка длинного `body` для caption

**Решение:** Возвращать ошибку валидации, если `body.length > 1024` для медиа-сообщений.

**Обоснование:**
- Более предсказуемое поведение
- Клиент сам решает, как обрабатывать длинный текст
- Избегание потери данных при автоматическом обрезании
- Явное указание на проблему

**Ошибка:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Caption exceeds maximum length of 1024 characters (current: 1500)",
    "field": "body"
  }
}
```

---

## 9. Предложения по улучшению

### 9.1. Поддержка `voice` (голосовые сообщения)

**Статус:** Отклонено

**Обоснование:**
- `voice` в Telegram - это тот же `sendAudio`, но с форматом OGG/OPUS
- Различие только в отображении (плеер vs голосовое сообщение)
- Можно использовать поле `audio` для обоих случаев
- Telegram сам определяет тип по формату файла

**Альтернатива:**
Если в будущем потребуется явное различие, можно добавить параметр в `options`:
```typescript
{
  "audio": "file.ogg",
  "options": {
    "audioType": "voice" // или "music"
  }
}
```

---

### 9.2. Поддержка `animation` (GIF файлы)

**Статус:** Отклонено для MVP

**Обоснование:**
- `sendAnimation` в Telegram - это отдельный метод для GIF и беззвучных видео
- Можно использовать `video` для GIF файлов
- Telegram сам определяет тип по формату
- Добавление отдельного поля усложнит API без значительной пользы

**Альтернатива:**
В будущих версиях можно добавить автоматическое определение по расширению `.gif` и использовать `sendAnimation`.

---

### 9.3. Детализация ошибок валидации

**Предложение:**  
Для упрощения отладки, возвращать структурированные ошибки:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "media",
      "constraint": "minLength",
      "expected": 2,
      "actual": 1,
      "help": "Album must contain at least 2 media items"
    }
  }
}
```

**Приоритет:** Средний

---

### 9.4. Режим предпросмотра (preview mode)

**Предложение:**  
Реализовать endpoint `POST /preview`, который:
- Принимает те же параметры, что и `/post`
- Выполняет всю валидацию
- Определяет тип сообщения (при `auto`)
- Формирует структуру запроса к Telegram API
- **НЕ отправляет** сообщение
- Возвращает информацию о том, что будет отправлено

**Польза:**  
Клиент может проверить корректность данных перед фактической отправкой.

**Приоритет:** Высокий

---

### 9.5. Поддержка Telegram-специфичных фич

**Описание:**  
Некоторые возможности Telegram можно вынести в `options`:

```typescript
interface TelegramOptions {
  // Уже поддерживаются:
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
  inlineKeyboard?: InlineKeyboardButton[][];
  disableWebPagePreview?: boolean;
  replyToMessageId?: number;
  protectContent?: boolean;
  
  // Предложения к добавлению:
  allowSendingWithoutReply?: boolean;
  messageThreadId?: number;  // Для тем (Topics)
  hasSpoiler?: boolean;      // Спойлер для медиа (уже реализовано через MediaInput)
}
```

**Приоритет:** Низкий (для будущих версий)

---

## 10. Этапы реализации

### Этап 1: Базовая поддержка новых полей
- [ ] Добавить `AUTO` в enum `PostType`
- [ ] Добавить поля `audio`, `document` в DTO
- [ ] Добавить тип `MediaInput` для поддержки объектов с `url`, `fileId`, `hasSpoiler`
- [ ] Обновить валидацию
- [ ] Обновить документацию (PRD, API docs)

### Этап 2: Реализация логики `auto` для Telegram
- [ ] Реализовать метод определения типа сообщения
- [ ] Реализовать валидацию неоднозначных медиа-полей
- [ ] Реализовать отправку через правильный метод API
- [ ] Добавить поддержку `hasSpoiler` для медиа
- [ ] Добавить unit-тесты для логики определения типа

### Этап 3: Валидация для явных типов
- [ ] Реализовать валидацию для каждого типа (`post`, `image`, `video`, и т.д.)
- [ ] Добавить проверку обязательных полей
- [ ] Добавить предупреждения для игнорируемых полей
- [ ] Добавить unit-тесты для валидации

### Этап 4: Обработка edge cases
- [ ] Обработка длинного caption (> 1024 символов) - возврат ошибки
- [ ] Обработка неподдерживаемых типов
- [ ] Обработка игнорируемых полей (с предупреждениями)
- [ ] Обработка `scheduledAt` (игнорировать с предупреждением)

### Этап 5: E2E тестирование
- [ ] Создать тестовый Telegram канал
- [ ] Протестировать все типы сообщений
- [ ] Протестировать режим `auto`
- [ ] Протестировать валидацию неоднозначных полей
- [ ] Протестировать `hasSpoiler`
- [ ] Протестировать валидацию

### Этап 6: Документация и примеры
- [ ] Обновить API documentation с примерами
- [ ] Добавить примеры использования `MediaInput`
- [ ] Добавить примеры в README
- [ ] Создать Postman/Thunder Client коллекцию

---

## 11. Примеры использования

### Пример 1: Автоматическое определение (текст)

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Это обычное текстовое сообщение"
  }'
```

**Результат:** `sendMessage`

---

### Пример 2: Автоматическое определение (фото)

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Красивый закат",
    "cover": "https://example.com/sunset.jpg"
  }'
```

**Результат:** `sendPhoto`

---

### Пример 3: Автоматическое определение (медиа-группа)

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Фото с мероприятия",
    "media": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
      "https://example.com/photo3.jpg"
    ]
  }'
```

**Результат:** `sendMediaGroup`

---

### Пример 4: Явное указание типа

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "type": "video",
    "body": "Новый видео-урок",
    "video": "https://example.com/tutorial.mp4"
  }'
```

**Результат:** `sendVideo` (с валидацией наличия поля `video`)

---

### Пример 5: Аудио-сообщение

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "type": "auto",
    "body": "Новый выпуск подкаста",
    "audio": "https://example.com/episode-42.mp3"
  }'
```

**Результат:** `sendAudio`

---

### Пример 6: Приложенный файл

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Отчет за ноябрь",
    "document": "https://example.com/report-november.pdf"
  }'
```

**Результат:** `sendDocument`

---

### Пример 7: Фото со спойлером (шокирующий контент)

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "⚠️ Внимание! Шокирующий контент",
    "cover": {
      "url": "https://example.com/shocking-image.jpg",
      "hasSpoiler": true
    }
  }'
```

**Результат:** `sendPhoto` с параметром `has_spoiler: true`

---

### Пример 8: Использование Telegram file_id

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Повторная отправка ранее загруженного видео",
    "video": {
      "fileId": "BAACAgIAAxkBAAIC4mF9..."
    }
  }'
```

**Результат:** `sendVideo` с использованием существующего file_id (без повторной загрузки)

---

### Пример 9: Медиа-группа со спойлерами

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Альбом с чувствительным контентом",
    "media": [
      {
        "url": "https://example.com/photo1.jpg",
        "hasSpoiler": true
      },
      "https://example.com/photo2.jpg",
      {
        "url": "https://example.com/photo3.jpg",
        "hasSpoiler": true
      }
    ]
  }'
```

**Результат:** `sendMediaGroup` где первое и третье фото скрыты спойлером

---

### Пример 10: Ошибка - неоднозначные медиа-поля

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Контент",
    "audio": "https://example.com/song.mp3",
    "video": "https://example.com/clip.mp4"
  }'
```

**Результат:** Ошибка валидации
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ambiguous media fields: cannot use 'audio' and 'video' together. Please specify only one media type or set explicit 'type'."
  }
}
```

---

## 12. Выводы

Данный план описывает полную реализацию постинга в Telegram с поддержкой:
- ✅ Автоматического определения типа сообщения (`type: auto`)
- ✅ Новых медиа-полей (`audio`, `document`)
- ✅ Поддержки объектов `MediaInput` с полями `url`, `fileId`, `hasSpoiler`
- ✅ Приоритезированной логики определения метода API
- ✅ Валидации для явно заданных типов
- ✅ Валидации неоднозначных медиа-полей
- ✅ Обработки неиспользуемых/игнорируемых полей
- ✅ Поддержки спойлеров для медиа (`hasSpoiler`)

**Принятые решения:**
1. ✅ Использовать имя `document` (не `attachment`)
2. ✅ Не валидировать форматы файлов
3. ✅ Разрешить смешанные медиа в `media[]` (фото + видео)
4. ✅ Игнорировать `scheduledAt` с предупреждением
5. ✅ Возвращать ошибку при длинном caption (> 1024 символов)
6. ✅ Валидировать неоднозначные медиа-поля (audio + video и т.д.)
7. ✅ Не добавлять отдельные поля `voice` и `animation` в MVP

**Ключевые особенности:**
- Поддержка Telegram `file_id` для переиспользования загруженных файлов
- Поддержка спойлеров для шокирующего контента
- Гибкая валидация с понятными сообщениями об ошибках
- Приоритетная система определения типа сообщения
- Совместимость с будущими расширениями API

