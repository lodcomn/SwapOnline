import modals from './modals'
import loader from './loader'
import notifications from './notifications'

import user from './user'
import history from './history'
import feed from './feed'
import core from './core'
import ui from './ui'
import filter from './filter'
import oneinch from './oneinch'
import btc from './btc'
import ghost from './ghost'
import next from './next'
import btcmultisig from './btcmultisig'
import EthLikeAction from './ethLikeAction'
import Erc20LikeAction from './erc20LikeAction'

import api from './api'
import pairs from './pairs'
import analytics from './analytics'

import pubsubRoom from './pubsubRoom'

import invoices from './invoices'
import comments from './comments'

import backupManager from './backupManager'

import multisigTx from './multisigTx'

const config = {
  filter,
  modals,
  loader,
  notifications,
  user,
  history,
  core,
  ui,
  oneinch,
  btc,
  btcmultisig,
  erc20: Erc20LikeAction.erc20,
  bep20: Erc20LikeAction.bep20,
  erc20matic: Erc20LikeAction.erc20matic,
  ghost,
  next,

  feed,
  analytics,
  pubsubRoom,
  api,
  pairs,
  invoices,
  comments,

  // Local storage backups manager
  backupManager,

  multisigTx,
}

Object.values(EthLikeAction).forEach((evmInstance: { ticker: string }) => {
  config[evmInstance.ticker.toLowerCase()] = evmInstance
})

export default config
