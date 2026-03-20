import { useTranslation } from 'react-i18next';
import type { Namespace } from './types';

export function useTypedTranslation<N extends Namespace>(ns?: N | N[]) {
  return useTranslation(ns);
}
