// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks'

export default [
    ...tseslint.config(
            eslint.configs.recommended,
            tseslint.configs.recommended,
       ),
   {
      plugins: {
        "react-hooks": reactHooks,
      },

      rules: {
        ...reactHooks.configs.recommended.rules,
        "react-hooks/immutability": "off",
        "react-hooks/set-state-in-effect": "off",
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": "off",
      },
   }
];

