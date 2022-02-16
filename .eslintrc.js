const { resolve } = require('path')

const baseRules = {
	'@typescript-eslint/array-type': 2,
	'@typescript-eslint/ban-ts-comment': 0,
	'@typescript-eslint/consistent-type-definitions': [2, 'type'],
	'@typescript-eslint/consistent-type-imports': 2,
	'@typescript-eslint/explicit-member-accessibility': [2, { accessibility: 'no-public' }],
	'@typescript-eslint/explicit-module-boundary-types': 0,
	'@typescript-eslint/member-ordering': [2, { classes: ['constructor', 'field', 'method'] }],
	'@typescript-eslint/no-dynamic-delete': 2,
	'@typescript-eslint/no-explicit-any': 0,
	'@typescript-eslint/no-extraneous-class': 2,
	'@typescript-eslint/no-non-null-assertion': 0,
	'@typescript-eslint/no-var-requires': 0,
	'@typescript-eslint/prefer-function-type': 2,
	'import/newline-after-import': 2,
	'import/order': [2, { alphabetize: { order: 'asc', caseInsensitive: true } }],
	'no-useless-escape': 0,
	'object-shorthand': 2,
}

module.exports = {
	env: { es2021: true, node: true },
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: { sourceType: 'module' },
	plugins: ['@typescript-eslint', 'import', 'prettier'],
	rules: baseRules,

	overrides: [
		{
			files: 'src/**/*.ts',
			extends: [
				'eslint:recommended',
				'plugin:@typescript-eslint/recommended',
				'plugin:@typescript-eslint/recommended-requiring-type-checking',
				'plugin:prettier/recommended',
			],
			parserOptions: {
				project: resolve(__dirname, 'src/tsconfig.json'),
			},
			rules: {
				...baseRules,
				'@typescript-eslint/no-floating-promises': 0,
				'@typescript-eslint/no-misused-promises': 0,
				'@typescript-eslint/no-unnecessary-qualifier': 2,
				'@typescript-eslint/no-unsafe-argument': 0,
				'@typescript-eslint/no-unsafe-assignment': 0,
				'@typescript-eslint/no-unsafe-call': 0,
				'@typescript-eslint/no-unsafe-member-access': 0,
				'@typescript-eslint/no-unsafe-return': 0,
				'@typescript-eslint/restrict-plus-operands': 0,
				'@typescript-eslint/restrict-template-expressions': 0,
				'@typescript-eslint/unbound-method': 0,
			},
		},
	],
}
