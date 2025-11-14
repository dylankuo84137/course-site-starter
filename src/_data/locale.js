module.exports = {
  default: 'zh-TW',
  available: ['zh-TW', 'en-US'],
  labels: {
    'zh-TW': '繁體中文',
    'en-US': 'English'
  },
  htmlLang: {
    'zh-TW': 'zh-Hant',
    'en-US': 'en-US'
  },
  // Routes that have dedicated localized files instead of relying on client-side rewriting
  langSpecificPages: ['/ai-guide/']
};
