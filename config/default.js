import path from 'path'


const rootPath = path.resolve(process.cwd(), '../')
const basePath = path.resolve(__dirname, '../')

const config = {
  propENV: process.env.CONFIG, // from package.json

  paths: {
    root:     (file = '') => path.join(rootPath, file),
    base:     (file = '') => path.join(basePath, file),
    shared:   (file = '') => path.join(basePath, 'shared', file),
    client:   (file = '') => path.join(basePath, 'client', file),
    swapCore: (file = '') => path.join(rootPath, 'swap.core', file),
  },
  referral: {
    url:'https://wiki.swap.online/affiliate.php'
  },

  publicPath: '/',

  http: {
    host: 'localhost',
    port: process.env.PORT || 9001,
  },

  i18nDate: {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  },

  exchangeRates: {
    'swapeth': 1,
    'ethswap': 1,
    'swapnoxon': 1,
    'noxonswap': 1,
    'swapbtc': 0.07,
    'btcswap': 14,
    'etheth': 1,
    'ethbtc': 0.07,
    'btceth': 14,
    'ethnoxon': 1,
    'noxoneth': 1,
    'btcnoxon': 14,
    'noxonbtc': 0.07,
  },
}


export default config
