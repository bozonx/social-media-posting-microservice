# План исправления проблем Graceful Shutdown

## Проблемы для исправления

1. **Race Condition в ShutdownService** - Добавить атомарность операций
2. **Утечка памяти в IdempotencyService** - Добавить периодическую очистку
3. **Отсутствие отмены таймеров в PostService** - Добавить AbortSignal
6. **Неполное логирование процесса shutdown** - Улучшить логи
7. **Нелогичная обработка ошибок в shutdown** - Использовать exit(0)
8. **Отсутствие cleanup в ShutdownService** - Добавить OnModuleDestroy
9. **Потенциальная проблема с Promise в onApplicationShutdown** - Добавить timeout
10. **Неоптимальная работа с асинхронностью** - Проверять shutdown в retry
12. **Неявная зависимость от порядка выполнения** - Переместить регистрацию handlers

## Шаги реализации

### 1. ShutdownService - исправление race condition и добавление cleanup
- Использовать мутекс-подобный подход для атомарности
- Добавить OnModuleDestroy
- Добавить timeout для Promise в onApplicationShutdown
- Улучшить логирование

### 2. IdempotencyService - исправление утечки памяти
- Добавить периодическую очистку истекших записей
- Добавить OnModuleDestroy для очистки интервала
- Добавить логирование очистки

### 3. PostService - добавление поддержки AbortSignal
- Добавить AbortSignal в методы retry и sleep
- Проверять shutdown перед retry
- Отменять таймеры при abort

### 4. main.ts - улучшение shutdown логики
- Переместить регистрацию signal handlers до listen
- Улучшить логирование (количество запросов, прогресс)
- Использовать exit(0) вместо exit(1) при ошибках shutdown

### 5. PostController - передача AbortSignal
- Получать AbortSignal из ShutdownService
- Передавать в PostService.publish()
