import { uz } from './uz';
import { ru } from './ru';
import { getLanguage } from './context';

export function t(key: string, params?: Record<string, string | number>): string {
    const lang = getLanguage();
    const currentLocale: any = lang === 'ru' ? ru : uz;

    const keys = key.split('.');
    let value: any = currentLocale;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return key; // Return key if translation not found
        }
    }

    let result = String(value);

    // Replace parameters
    if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
            result = result.replace(`{${paramKey}}`, String(paramValue));
        });
    }

    return result;
}

export { uz, ru };


