
import { AsyncLocalStorage } from 'async_hooks';

export const i18nContext = new AsyncLocalStorage<{ language: string }>();

export function getLanguage(): string {
    const store = i18nContext.getStore();
    return store?.language || 'uz';
}

export function runWithLanguage<T>(language: string, callback: () => T): T {
    return i18nContext.run({ language }, callback);
}
