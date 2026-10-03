import { en } from '../locales/en';
import { ru } from '../locales/ru';

export type Language = 'en' | 'ru';
export type TranslationKey = keyof typeof en;

export const translations: Record<Language, typeof en> = {
  en,
  ru,
};