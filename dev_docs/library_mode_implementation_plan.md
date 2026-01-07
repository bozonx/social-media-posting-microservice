# План внедрения режима библиотеки

## Цель
Добавить возможность использования `social-media-posting-microservice` в качестве TypeScript ESM библиотеки в других проектах, сохранив при этом возможность запуска как standalone микросервиса.

## Текущее состояние

### Архитектура
- **Framework**: NestJS с Fastify адаптером
- **Module system**: ESM (NodeNext)
- **Entry point**: `src/main.ts` - bootstrap функция для запуска HTTP сервера
- **Core module**: `src/app.module.ts` - корневой модуль NestJS
- **Build output**: `dist/src/main.js`
- **Package type**: `"type": "module"` в package.json

### Основные компоненты
- **PostingService** - основная логика публикации
- **PreviewService** - валидация и предпросмотр
- **Platform adapters** - адаптеры для различных платформ (Telegram)
- **Config system** - YAML конфигурация с подстановкой env переменных
- **Idempotency** - система предотвращения дубликатов
- **Retry logic** - автоматические повторы с jitter

## Требования к библиотечному режиму

### Функциональные требования
1. **Программный API** - возможность вызова функций публикации напрямую из кода
2. **Конфигурация** - программная настройка без YAML файлов
3. **Независимость от HTTP** - работа без запуска Fastify сервера
4. **TypeScript типы** - экспорт всех необходимых типов и интерфейсов
5. **ESM совместимость** - полная поддержка ES modules
6. **Сохранение функциональности** - все фичи микросервиса доступны в библиотеке

### Нефункциональные требования
1. **Обратная совместимость** - не ломать существующий микросервис
2. **Минимальные зависимости** - не тянуть Fastify/HTTP зависимости в library mode
3. **Tree-shaking** - возможность импорта только нужных частей
4. **Документация** - примеры использования как библиотеки
5. **Тестирование** - unit тесты для library API

## Этапы реализации

### Этап 1: Рефакторинг структуры экспортов

#### 1.1 Создание публичного API
**Файл**: `src/index.ts` (новый)

**Задачи**:
- Создать основной файл экспорта для библиотечного режима
- Экспортировать основные сервисы: `PostingService`, `PreviewService`
- Экспортировать все DTO и типы
- Экспортировать конфигурационные интерфейсы
- Экспортировать enum'ы (Platform, MediaType, BodyFormat и т.д.)
- Экспортировать error классы

**Пример структуры**:
```typescript
// Services
export { PostingService } from './modules/posting/posting.service.js';
export { PreviewService } from './modules/posting/preview.service.js';

// DTOs
export { PostRequestDto } from './modules/posting/dto/post-request.dto.js';
export { PostResponseDto } from './modules/posting/dto/post-response.dto.js';
// ... other DTOs

// Types
export type { AppConfig } from './config/app.config.js';
export type { ServiceConfig } from './config/service.config.js';
// ... other types

// Enums
export { Platform } from './common/enums/platform.enum.js';
// ... other enums

// Errors
export { PostingError } from './common/errors/posting.error.js';
// ... other errors
```

#### 1.2 Создание фабрики для library mode
**Файл**: `src/library.ts` (новый)

**Задачи**:
- Создать функцию `createPostingClient()` для инициализации без NestJS
- Реализовать упрощенную конфигурацию через объект
- Настроить DI контейнер вручную (без NestJS)
- Вернуть готовый к использованию API объект

**Интерфейс**:
```typescript
interface LibraryConfig {
  accounts: Record<string, AccountConfig>;
  requestTimeoutSecs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  idempotencyTtlMinutes?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

interface PostingClient {
  post(request: PostRequestDto): Promise<PostResponseDto>;
  preview(request: PostRequestDto): Promise<PreviewResponseDto>;
  destroy(): Promise<void>;
}

export function createPostingClient(config: LibraryConfig): PostingClient;
```

### Этап 2: Адаптация конфигурации

#### 2.1 Создание программного конфига
**Файл**: `src/config/library.config.ts` (новый)

**Задачи**:
- Создать класс `LibraryConfigService` как альтернативу `ConfigService`
- Реализовать валидацию конфигурации через class-validator
- Поддержать те же опции, что и в YAML конфиге
- Обеспечить type-safety через TypeScript

#### 2.2 Рефакторинг существующих сервисов
**Файлы**: 
- `src/modules/posting/posting.service.ts`
- `src/modules/posting/preview.service.ts`
- Другие сервисы, использующие ConfigService

**Задачи**:
- Сделать сервисы независимыми от NestJS ConfigService
- Использовать абстракцию для конфигурации
- Поддержать оба режима: microservice и library

### Этап 3: Управление зависимостями

#### 3.1 Разделение зависимостей в package.json
**Файл**: `package.json`

**Задачи**:
- Переместить HTTP-специфичные зависимости в `optionalDependencies`:
  - `@nestjs/platform-fastify`
  - `fastify`
  - `nestjs-pino` (частично)
- Оставить в `dependencies` только core зависимости:
  - `@nestjs/common`
  - `@nestjs/core`
  - `grammy` (для Telegram)
  - `class-validator`
  - `class-transformer`
- Добавить `peerDependencies` для опциональных зависимостей

#### 3.2 Условный импорт модулей
**Файлы**: 
- `src/app.module.ts`
- `src/main.ts`

**Задачи**:
- Сделать HTTP-модули опциональными
- Проверять наличие Fastify перед использованием
- Graceful degradation при отсутствии HTTP зависимостей

### Этап 4: Обновление package.json

#### 4.1 Настройка экспортов
**Файл**: `package.json`

**Задачи**:
- Обновить поле `exports` для поддержки множественных entry points:
```json
{
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",
      "import": "./dist/src/index.js"
    },
    "./library": {
      "types": "./dist/src/library.d.ts",
      "import": "./dist/src/library.js"
    },
    "./types": {
      "types": "./dist/src/types/index.d.ts"
    }
  }
}
```

#### 4.2 Обновление метаданных
**Задачи**:
- Обновить `description` для упоминания library mode
- Добавить `keywords`: `["social-media", "posting", "telegram", "library", "microservice"]`
- Убедиться что `"type": "module"` присутствует
- Проверить `files` поле для включения только необходимых файлов

### Этап 5: TypeScript конфигурация

#### 5.1 Обновление tsconfig.json
**Файл**: `tsconfig.json`

**Задачи**:
- Убедиться что `declaration: true` включен
- Добавить `declarationMap: true` для source maps типов
- Проверить что `outDir` корректно настроен
- Обновить `include` для включения новых файлов

#### 5.2 Создание отдельного tsconfig для библиотеки
**Файл**: `tsconfig.lib.json` (новый, опционально)

**Задачи**:
- Создать специфичную конфигурацию для сборки библиотеки
- Исключить `main.ts` и другие microservice-specific файлы
- Оптимизировать для library использования

### Этап 6: Логирование

#### 6.1 Абстракция логгера
**Файл**: `src/common/logger/logger.interface.ts` (новый)

**Задачи**:
- Создать интерфейс `ILogger` независимый от Pino
- Реализовать адаптер для Pino (microservice mode)
- Реализовать простой консольный логгер (library mode)
- Добавить возможность передачи custom логгера

**Интерфейс**:
```typescript
interface ILogger {
  debug(message: string, context?: string): void;
  log(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
}
```

#### 6.2 Рефакторинг использования логгера
**Файлы**: Все сервисы использующие Logger

**Задачи**:
- Заменить прямое использование Pino на ILogger
- Поддержать injection custom логгера
- Обеспечить backward compatibility

### Этап 7: Тестирование

#### 7.1 Unit тесты для library API
**Директория**: `test/unit/library/`

**Задачи**:
- Создать тесты для `createPostingClient()`
- Протестировать конфигурацию через объект
- Протестировать основные операции (post, preview)
- Протестировать error handling
- Протестировать cleanup (destroy)

#### 7.2 Integration тесты
**Директория**: `test/integration/library/`

**Задачи**:
- Создать тесты использования как библиотеки
- Протестировать совместимость с различными TypeScript проектами
- Протестировать tree-shaking
- Протестировать работу без HTTP зависимостей

#### 7.3 Пример проекта
**Директория**: `examples/library-usage/` (новая)

**Задачи**:
- Создать минимальный TypeScript ESM проект
- Показать установку и настройку
- Примеры использования основных функций
- Примеры error handling
- README с инструкциями

### Этап 8: Документация

#### 8.1 Обновление README.md
**Файл**: `README.md`

**Задачи**:
- Добавить секцию "Library Usage"
- Примеры установки: `pnpm add social-media-posting-microservice`
- Базовые примеры использования
- Ссылка на полную документацию

#### 8.2 Создание library guide
**Файл**: `docs/library-usage.md` (новый)

**Задачи**:
- Детальное описание library API
- Все доступные опции конфигурации
- Примеры для различных use cases
- Best practices
- Troubleshooting
- Migration guide (если используется микросервис)

#### 8.3 API Reference
**Файл**: `docs/api-reference.md` (новый)

**Задачи**:
- Автогенерация из TypeScript типов (опционально)
- Описание всех экспортируемых типов
- Описание всех методов
- Параметры и возвращаемые значения
- Примеры для каждого метода

#### 8.4 Обновление CHANGELOG
**Файл**: `docs/CHANGELOG.md`

**Задачи**:
- Добавить запись о новой фиче
- Описать breaking changes (если есть)
- Упомянуть новые зависимости

### Этап 9: CI/CD и публикация

#### 9.1 Обновление build процесса
**Файлы**: 
- `package.json` (scripts)
- `.github/workflows/` (если есть)

**Задачи**:
- Убедиться что build включает все необходимые файлы
- Проверить генерацию .d.ts файлов
- Добавить проверку размера bundle
- Настроить публикацию в npm (если планируется)

#### 9.2 Версионирование
**Задачи**:
- Определить версию для релиза (например, 2.0.0 если breaking changes)
- Обновить package.json version
- Создать git tag
- Подготовить release notes

### Этап 10: Оптимизация и улучшения

#### 10.1 Bundle size оптимизация
**Задачи**:
- Анализ размера bundle
- Удаление неиспользуемых зависимостей
- Оптимизация импортов
- Проверка tree-shaking

#### 10.2 Performance
**Задачи**:
- Профилирование library mode
- Оптимизация инициализации
- Lazy loading где возможно
- Кеширование конфигурации

#### 10.3 Developer Experience
**Задачи**:
- Улучшение error messages
- Добавление debug режима
- Валидация конфигурации с понятными сообщениями
- TypeScript strict mode compatibility

## Риски и митигация

### Риск 1: Breaking changes для существующих пользователей
**Митигация**: 
- Сохранить полную обратную совместимость для microservice режима
- Использовать semantic versioning
- Детальная документация миграции

### Риск 2: Увеличение сложности кодовой базы
**Митигация**:
- Четкое разделение microservice и library кода
- Хорошая документация архитектуры
- Code review процесс

### Риск 3: Проблемы с зависимостями
**Митигация**:
- Тщательное тестирование с различными конфигурациями
- Использование peerDependencies
- Документирование требований к зависимостям

### Риск 4: Сложность поддержки двух режимов
**Митигация**:
- Максимальное переиспользование кода
- Автоматизированное тестирование обоих режимов
- CI/CD проверки

## Критерии успеха

1. ✅ Возможность установки через npm/pnpm
2. ✅ Работа в TypeScript ESM проекте без дополнительной настройки
3. ✅ Все фичи микросервиса доступны в library mode
4. ✅ Размер bundle не более 2MB (без platform-specific зависимостей)
5. ✅ 100% покрытие тестами library API
6. ✅ Полная документация с примерами
7. ✅ Обратная совместимость microservice режима
8. ✅ TypeScript типы экспортируются корректно

## Оценка трудозатрат

- **Этап 1**: 8 часов
- **Этап 2**: 6 часов
- **Этап 3**: 4 часа
- **Этап 4**: 2 часа
- **Этап 5**: 2 часа
- **Этап 6**: 6 часов
- **Этап 7**: 12 часов
- **Этап 8**: 8 часов
- **Этап 9**: 4 часа
- **Этап 10**: 6 часов

**Итого**: ~58 часов (~7-8 рабочих дней)

## Следующие шаги

1. Review плана с командой
2. Утверждение архитектурных решений
3. Создание задач в issue tracker
4. Начало реализации с Этапа 1
5. Итеративная разработка с регулярными reviews
