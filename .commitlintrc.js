const conventional = require('@commitlint/config-conventional')

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: ['commitlint-plugin-function-rules'],
  helpUrl:
    'https://storybook.vezham.com/?path=/docs/guidelines-contribution--overview#commit-convention',
  rules: {
    ...conventional.rules,
    'function-rules/header-max-length': [0],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'mocks',
        // 'stories',
        'test',
        'docs',
        'i18n',
        'ci',
        'chore',
        'build'
      ]
    ],
    'scope-empty': [2, 'never'],
    'header-max-length': [2, 'always', 120],
    'subject-case': [2, 'never', []],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'body-max-length': [2, 'always', 2500],
    'body-max-line-length': [2, 'always', 2500],
    'footer-max-line-length': [2, 'always', 250]
  }
}
