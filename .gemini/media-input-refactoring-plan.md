# План рефакторинга MediaInput

## Цель
Привести поле `media` и все медиа-поля (`cover`, `video`, `audio`, `document`) к единому виду - всегда ожидаем массив/объект с обязательным полем `src` и опциональными `type`, `hasSpoiler`.

## Текущее состояние
- `MediaInput = string | MediaInputObject` - можно передавать как строку, так и объект
- В документации указано "URL/fileId string or object with src"
- Это создает путаницу, так как для `hasSpoiler` и `type` всегда нужен объект

## Новое состояние
- `MediaInput = MediaInputObject` - всегда объект с `src`
- Для `media[]` объект должен содержать `type` для явного указания типа медиа
- Документация четко указывает что нужен объект

## Изменения

### 1. Типы (`src/common/types/media-input.type.ts`)
- [x] Изменить `MediaInput` с `string | MediaInputObject` на `MediaInputObject`
- [x] Оставить `MediaInputObject` с полями: `src`, `hasSpoiler?`, `type?`

### 2. Валидаторы (`src/common/validators/media-input.validator.ts`)
- [x] Убрать проверку на строку в `IsMediaInputConstraint.validate()`
- [x] Оставить только проверку объекта с обязательным `src`
- [x] Обновить сообщения об ошибках

### 3. Хелперы (`src/common/helpers/media-input.helper.ts`)
- [x] Убрать методы `isString()` (или оставить для обратной совместимости но не использовать)
- [x] Обновить `getUrl()`, `getFileId()` - убрать проверку на строку
- [x] Обновить `toTelegramInput()` - работать только с объектом
- [x] Обновить `isValidShape()` - проверять только объект
- [x] Убрать `sanitize()` и `sanitizeArray()` - они больше не нужны

### 4. DTO (`src/modules/post/dto/post-request.dto.ts`)
- [x] Убрать `@Transform` декораторы для медиа-полей (sanitize больше не нужен)
- [x] Оставить только `@IsMediaInput()` и `@IsMediaInputArray()`

### 5. Тесты
- [x] `test/unit/media-input.helper.spec.ts` - убрать тесты для строк
- [x] `test/unit/media-input.validator.spec.ts` - убрать тесты для строк
- [x] Обновить все тесты чтобы использовали объекты

### 6. Документация
- [x] `docs/api.md` - обновить описание MediaInput
  - Убрать упоминание "URL/fileId string"
  - Указать что всегда нужен объект с `src`
  - Обновить примеры
- [x] `README.md` - обновить примеры если есть

### 7. N8N нода
- [x] `n8n-nodes-bozonx-social-media-posting-microservice/nodes/Post/BozonxPost.node.ts`
  - Обновить `parseMediaField()` - всегда возвращать объект
  - Обновить описания полей
  - Обновить обработку `cover`, `video`, `audio`, `document`, `media`
- [x] `n8n-nodes-bozonx-social-media-posting-microservice/README.md` - обновить примеры

## Порядок выполнения
1. Типы
2. Валидаторы  
3. Хелперы
4. DTO
5. Тесты
6. Документация
7. N8N нода
8. Запуск тестов
9. Проверка работы
