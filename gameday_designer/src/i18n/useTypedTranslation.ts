import { useTranslation } from 'react-i18next';

export function useTypedTranslation<N extends string>(ns?: N | N[]) {
  return useTranslation(ns as string | string[] | undefined);
}
