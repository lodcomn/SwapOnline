import React, { PureComponent, Fragment } from 'react'

import Link from 'local_modules/sw-valuelink'

import ThemeTooltip from '../../components/ui/Tooltip/ThemeTooltip'
import CSSModules from 'react-css-modules'
import styles from './Exchange.scss'

import { connect } from 'redaction'
import actions from 'redux/actions'
import { BigNumber } from 'bignumber.js'
import { Redirect } from 'react-router-dom'
import { getState } from 'redux/core'
import reducers from 'redux/core/reducers'

import SelectGroup from './SelectGroup/SelectGroup'
import { Button } from 'components/controls'
import Promo from './Promo/Promo'
import Quote from './Quote'
import HowItWorks from './HowItWorks/HowItWorks'
import VideoAndFeatures from './VideoAndFeatures/VideoAndFeatures'
import InlineLoader from 'components/loaders/InlineLoader/InlineLoader'
import { FormattedMessage, injectIntl } from 'react-intl'
import { localisedUrl } from 'helpers/locale'
import config from 'helpers/externalConfig'
import SwapApp from 'swap.app'

import helpers, { localStorage, getPairFees, constants, metamask, feedback, links } from 'helpers'
import { animate } from 'helpers/domUtils'
import Switching from 'components/controls/Switching/Switching'
import AddressSelect from './AddressSelect/AddressSelect'
import { AddressType, AddressRole } from 'domain/address'
import { SwapMode } from 'domain/swap'
import NetworkStatus from 'components/NetworkStatus/NetworkStatus'
import Orders from './Orders/Orders'

import turboSwap from 'common/helpers/turboSwap'
import Toggle from 'components/controls/Toggle/Toggle'
import TurboIcon from 'shared/components/ui/TurboIcon/TurboIcon'

import { COIN_DATA, COIN_MODEL, COIN_TYPE } from 'swap.app/constants/COINS'

type CurrencyObj = {
  addAssets?: boolean
  fullTitle: string
  icon: string
  name: string
  title: string
  value: string
}

type ExchangeProps = {
  isOnlyForm: boolean
  activeFiat: string
  intl: IUniversalObj
  match: IUniversalObj
  location: IUniversalObj
  history: IUniversalObj
  usersData: IUniversalObj[]
  currenciesData: IUniversalObj[]
  tokensData: IUniversalObj[]
  currencies: { [key: string]: string }[]
  allCurrencyies: CurrencyObj[]
  addSelectedItems: CurrencyObj[]
  hiddenCoinsList: string[]
  decline: string[]
}

type Address = {
  currency: string
  type: AddressType
  value: string
}

type ExchangeState = {
  haveAmount: number
  goodRate: number
  maxAmount: number
  haveFiat: number
  getFiat: number
  maxBuyAmount: BigNumber

  getAmount: string
  haveCurrency: string
  haveType: string
  getCurrency: string
  getType: string
  peer: string

  extendedControls: boolean
  isLowAmount: boolean
  isNonOffers: boolean
  isWaitForPeerAnswer: boolean
  isDeclinedOffer: boolean
  haveBalance: boolean
  isTurbo: boolean
  isPending: boolean

  isNoAnyOrders?: boolean
  isFullLoadingComplite?: boolean
  exHaveRate?: string
  exGetRate?: string
  orderId?: string
  redirectToSwap: null | SwapMode

  balances: any
  pairFees: any
  directionOrders: IUniversalObj[]
  filteredOrders: IUniversalObj[]
  desclineOrders: string[]

  fromAddress: Address
  toAddress: Address
}

const allowedCoins = [
  ...(!config.opts.curEnabled || config.opts.curEnabled.btc ? ['BTC'] : []),
  ...(!config.opts.curEnabled || config.opts.curEnabled.eth ? ['ETH'] : []),
  ...(!config.opts.curEnabled || config.opts.curEnabled.ghost ? ['GHOST'] : []),
  ...(!config.opts.curEnabled || config.opts.curEnabled.next ? ['NEXT'] : []),
]

const isDark = localStorage.getItem(constants.localStorage.isDark)

const isExchangeAllowed = (currencies) =>
  currencies.filter((c) => {
    const isErc = Object.keys(config.erc20)
      .map((i) => i.toLowerCase())
      .includes(c.value.toLowerCase())

    const isAllowedCoin = allowedCoins.map((i) => i.toLowerCase()).includes(c.value.toLowerCase())

    return isAllowedCoin || isErc
  })

const filterIsPartial = (orders) =>
  orders
    .filter((order) => order.isPartial && !order.isProcessing && !order.isHidden)
    .filter((order) => order.sellAmount !== 0 && order.sellAmount.isGreaterThan(0)) // WTF sellAmount can be not BigNumber
    .filter((order) => order.buyAmount !== 0 && order.buyAmount.isGreaterThan(0)) // WTF buyAmount can be not BigNumber too - need fix this


const subTitle = (sell, sellTicker, buy, buyTicker) => (
  <div>
    <FormattedMessage id="ExchangeTitleTag1" defaultMessage="Fastest cross-chain swaps" />
  </div>
)

const isWidgetBuild = config && config.isWidget
const bannedPeers = {} // rejected swap peers

@connect(
  ({
    currencies,
    rememberedOrders,
    core: { orders },
    user: { ethData, btcData, ghostData, nextData, tokensData, activeFiat, ...rest },
  }) => ({
    currencies: isExchangeAllowed(currencies.partialItems),
    allCurrencyies: currencies.items,
    addSelectedItems: isExchangeAllowed(currencies.addPartialItems),
    orders: filterIsPartial(orders),
    currenciesData: [ethData, btcData, ghostData, nextData],
    tokensData: [...Object.keys(tokensData).map((k) => tokensData[k])],
    decline: rememberedOrders.savedOrders,
    activeFiat,
    usersData: [
      ethData,
      btcData,
      ghostData,
      nextData,
      ...Object.values(tokensData).filter(({ address }) => address),
      ...Object.values(rest)
        .filter((coinData) => coinData && coinData.address)
        .filter(({ address }) => address),
    ],
  })
)
@CSSModules(styles, { allowMultiple: true })
class Exchange extends PureComponent<any, any> {  
  props: ExchangeProps
  state: ExchangeState

  private _mounted = false

  static defaultProps = {
    orders: [],
  }

  timer: boolean
  promoContainer: Element
  fiatRates: { [key: string]: number }
  onRequestAnswer: (newOrder: IUniversalObj, isAccepted: boolean) => void
  scrollTrigger: any // undefined | ?

  static getDerivedStateFromProps(props, state) {
    const { orders } = props
    const { haveCurrency, getCurrency, isTurbo } = state

    if (!orders.length) {
      return null
    }

    const directionOrders = orders.filter(order =>
      !order.isMy &&
      order.sellCurrency === getCurrency.toUpperCase() &&
      order.buyCurrency === haveCurrency.toUpperCase()
    )

    const filteredOrders = directionOrders.filter(order =>
      Boolean(order.isTurbo) === Boolean(isTurbo)
    )

    return {
      directionOrders,
      filteredOrders,
    }
  }

  constructor(props) {
    super(props)

    const {
      allCurrencyies,
      intl: { locale },
      location,
      history,
      match,
    } = props

    this.fiatRates = {}
    this.onRequestAnswer = (newOrder, isAccepted) => {}

    const isRootPage = history.location.pathname === '/' || history.location.pathname === '/ru'
    const {
      url,
      params: { buy, sell },
    } = match || { params: { buy: 'btc', sell: 'usdt' } }

    if (sell && buy && !isRootPage) {
      if (
        !allCurrencyies.map((item) => item.name).includes(sell.toUpperCase()) ||
        !allCurrencyies.map((item) => item.name).includes(buy.toUpperCase())
      ) {
        history.push(localisedUrl(locale, `${links.exchange}/eth-to-btc`))
      }
    }

    let haveCurrency = sell || 'btc'
    let getCurrency = buy || (!isWidgetBuild ? 'eth' : config.erc20token)

    const exchangeDataStr = localStorage.getItem(constants.localStorage.exchangeSettings)
    const exchangeSettings = exchangeDataStr && JSON.parse(exchangeDataStr)
    // to get data from last session
    if (exchangeSettings && exchangeSettings.currency) {
      haveCurrency = exchangeSettings.currency.sell || haveCurrency
      getCurrency = exchangeSettings.currency.buy || getCurrency
    }

    this.returnNeedCurrency(haveCurrency, getCurrency)

    if (!(buy && sell) && !props.location.hash.includes('#widget') && !isRootPage) {
      if (url !== '/wallet') {
        history.push(localisedUrl(locale, `${links.exchange}/${haveCurrency}-to-${getCurrency}`))
      }
    }

    const haveType = this.getDefaultWalletType(haveCurrency.toUpperCase())
    const getType = this.getDefaultWalletType(getCurrency.toUpperCase())

    this.state = {
      haveCurrency,
      haveType,
      getCurrency,
      getType,
      haveAmount: 0,
      getAmount: '',
      haveFiat: 0,
      getFiat: 0,
      isLowAmount: false,
      maxAmount: 0,
      maxBuyAmount: new BigNumber(0),
      peer: '',
      goodRate: 0,
      directionOrders: [],
      filteredOrders: [],
      isNonOffers: false,
      isDeclinedOffer: false,
      extendedControls: false,
      isWaitForPeerAnswer: false,
      desclineOrders: [],
      pairFees: false,
      balances: false,
      haveBalance: false,
      fromAddress: this.makeAddressObject(haveType, haveCurrency.toUpperCase()),
      toAddress: this.makeAddressObject(getType, getCurrency.toUpperCase()),
      isTurbo: false,
      redirectToSwap: null,
      isPending: true,
    }

    if (config.isWidget) {
      this.state.getCurrency = config.erc20token
    }
  }

  makeAddressObject(type, currency) {
    const wallet =
      type !== AddressType.Custom
        ? actions.core.getWallet({
            currency,
            addressType: type,
          })
        : false

    switch (type) {
      case AddressType.Internal:
        return {
          type: AddressType.Internal,
          currency,
          value: wallet ? wallet.address : '',
        }
      case AddressType.Metamask:
        return {
          type: AddressType.Metamask,
          currency,
          value: wallet ? wallet.address : '',
        }
      case AddressType.Custom:
        return {
          type: AddressType.Internal,
          currency,
          value: ``,
        }
    }
    return null
  }

  getExchangeSettingsFromLocalStorage() {
    const exchangeSettingsStr = localStorage.getItem(constants.localStorage.exchangeSettings)

    if (exchangeSettingsStr) {
      return JSON.parse(exchangeSettingsStr)
    }
    return {}
  }

  setDefaultCurrencyType(currency, type) {
    const exchangeSettings = this.getExchangeSettingsFromLocalStorage()
    const userWalletTypes = exchangeSettings.userWalletTypes || {}

    userWalletTypes[currency] = type

    const newExchangeData = {
      currency: exchangeSettings.currency,
      userWalletTypes,
    }

    localStorage.setItem(
      constants.localStorage.exchangeSettings,
      JSON.stringify(newExchangeData)
    )
  }

  getLocalStorageWalletType = (currency) => {
    const exchangeSettings = this.getExchangeSettingsFromLocalStorage()
    const { userWalletTypes } = exchangeSettings

    if (userWalletTypes && userWalletTypes[currency]) {
      return userWalletTypes[currency]
    }

    return false
  }

  getDefaultWalletType(currency) {
    const storageType = this.getLocalStorageWalletType(currency)

    if (storageType) {
      return storageType
    }
    
    let resultType = 'Internal'

    if (COIN_DATA[currency]) {
      if (COIN_DATA[currency].model === COIN_MODEL.UTXO) {
        resultType = AddressType.Custom
      } else if (
        COIN_DATA[currency].type === COIN_TYPE.ETH_TOKEN ||
        COIN_DATA[currency].model === COIN_MODEL.AB
      ) {
        resultType = AddressType.Metamask
      }
    } else {
      console.group('Exchange > %c getDefaultWalletType', 'color: yellow;')
      console.warn(`Unknown coin ${currency}`)
      console.groupEnd()
    }

    return resultType
  }

  componentDidMount() {
    this._mounted = true

    const { haveCurrency, getCurrency } = this.state

    actions.core.updateCore()
    this.returnNeedCurrency(haveCurrency, getCurrency)
    this.checkPair()
    this.getFiatBalance()

    this.timer = true
    const timerProcess = () => {
      if (!this.timer) return
      this.setOrders()
      this.checkUrl()
      this.getCorrectDecline()
      setTimeout(timerProcess, 2000)
    }
    timerProcess()

    SwapApp.onInit(() => {
      SwapApp.shared().services.room.on('new orders', () => this.checkPair())
    })

    document.addEventListener('scroll', this.rmScrollAdvice)

    setTimeout(() => {
      if (this._mounted) {
        this.setState({
          isFullLoadingComplite: true,
        })
      }
    }, 60 * 1000) // 1 minute
    
    this.getInfoAboutCurrency()
    this.fetchPairFeesAndBalances()
    metamask.web3connect.on('updated', this.fetchPairFeesAndBalances)
  }

  getInfoAboutCurrency = async () => {
    const { currencies } = this.props
    const currencyNames = currencies.map(({ name }) => name)

    await actions.user.getInfoAboutCurrency(currencyNames)
  }

  getBalance(currency) {
    const { balances } = this.state

    return balances && balances[currency.toUpperCase()] ? balances[currency.toUpperCase()] : 0
  }

  fetchPairFeesAndBalances = async () => {
    await this.fetchPairFees()
    this.fetchBalances()
  }

  updateFees = () => {
    const updateCacheValue = true

    this.fetchPairFees(updateCacheValue)
  }

  fetchPairFees = async (updateCacheValue = false) => {
    const { haveCurrency: sell, getCurrency: buy } = this.state

    this.setState(() => ({ isPending: true }))

    const pairFees = await getPairFees({
      sellCurrency: sell,
      buyCurrency: buy,
      updateCacheValue,
    })

    const buyExRate = await this.fetchFiatExRate(pairFees.buy.coin)
    const sellExRate = await this.fetchFiatExRate(pairFees.sell.coin)

    if (!this._mounted) return

    this.setState(() => ({
      isPending: false,
      pairFees: {
        ...pairFees,
        buyExRate,
        sellExRate,
      }
    }))
  }

  fetchBalances = async () => {
    const {
      haveCurrency: sellCurrency,
      getCurrency: buyCurrency,
      pairFees,
    } = this.state

    if (!pairFees || !this._mounted) return

    this.setState(() => ({ isPending: true }))

    const buyWallet = actions.core.getWallet({ currency: buyCurrency })
    const sellWallet = actions.core.getWallet({ currency: sellCurrency })
    const feeBuyWallet = actions.core.getWallet({ currency: pairFees.buy.coin })
    const feeSellWallet = actions.core.getWallet({ currency: pairFees.sell.coin })

    const balances = {}
    balances[`${buyWallet.currency}`] = await actions.core.fetchWalletBalance(buyWallet)
    balances[`${sellWallet.currency}`] = await actions.core.fetchWalletBalance(sellWallet)

    if (balances[`${feeBuyWallet.currency}`] === undefined) {
      balances[`${feeBuyWallet.currency}`] = await actions.core.fetchWalletBalance(
        feeBuyWallet
      )
    }

    if (balances[`${feeSellWallet.currency}`] === undefined) {
      balances[`${feeSellWallet.currency}`] = await actions.core.fetchWalletBalance(
        feeSellWallet
      )
    }

    this.setState(() => ({
      isPending: false,
      balances,
    }))

    this.checkBalanceOnAllCurrency()
  }

  checkBalanceOnAllCurrency() {
    const { balances } = this.state

    if (Object.keys(balances).length) {
      for (let currency in balances) {
        if (balances[currency] > 0) {
          this.setState({
            haveBalance: true,
          })
          break
        }
      }
    }
  }

  rmScrollAdvice = () => {
    if (window.scrollY > window.innerHeight * 0.7 && this.scrollTrigger) {
      this.scrollTrigger.classList.add('hidden')
      document.removeEventListener('scroll', this.rmScrollAdvice)
    }
  }

  componentWillUnmount() {
    this.updateExchangeSettings()
    this._mounted = false
    this.timer = false

    metamask.web3connect.off('updated', this.fetchPairFeesAndBalances)
  }

  updateExchangeSettings = () => {
    const exchangeSettings = this.getExchangeSettingsFromLocalStorage()
    const { haveCurrency, getCurrency, haveType, getType } = this.state

    const newExchangeSettings = {
      ...exchangeSettings,
      userWalletTypes: {
        [haveCurrency.toUpperCase()]: haveType,
        [getCurrency.toUpperCase()]: getType,
      },
      currency: {
        sell: haveCurrency,
        buy: getCurrency,
      },
    }

    localStorage.setItem(
      constants.localStorage.exchangeSettings,
      JSON.stringify(newExchangeSettings)
    )
  }

  checkUrl = () => {
    const {
      match: {
        params: { buy: buyValue, sell: sellValue },
      },
    } = this.props

    const { getCurrency, haveCurrency } = this.state

    if (haveCurrency && sellValue && sellValue !== haveCurrency) {
      this.handleSetHaveValue({ value: sellValue })
    }

    if (getCurrency && sellValue && buyValue && buyValue !== getCurrency) {
      this.checkValidUrl(sellValue, buyValue)
    }
  }

  checkValidUrl = (sellValue, buyValue) => {
    const avaliablesBuyCurrency = actions.pairs.selectPairPartial(sellValue).map((el) => el.value)
    if (avaliablesBuyCurrency.includes(buyValue)) {
      return this.handleSetGetValue({ value: buyValue })
    }
    if (avaliablesBuyCurrency.includes(sellValue)) {
      const filterSameVale = avaliablesBuyCurrency.filter((el) => el !== sellValue)
      if (filterSameVale.includes('btc')) {
        this.handleSetGetValue({ value: 'btc' })
      } else {
        this.handleSetGetValue({ value: filterSameVale[0] })
      }
    }
  }

  changeUrl = (sell, buy) => {
    const {
      intl: { locale },
      isOnlyForm,
    } = this.props

    if (!this.props.location.hash.includes('#widget') && !isOnlyForm) {
      this.props.history.push(localisedUrl(locale, `${links.exchange}/${sell}-to-${buy}`))
    }
  }

  fetchFiatExRate = async (coin) => {
    const { activeFiat } = this.props

    try {
      if (this.fiatRates[coin]) {
        return this.fiatRates[coin]
      } else {
        const exRate = await actions.user.getExchangeRate(coin, activeFiat)
        this.fiatRates[coin] = exRate
        return exRate
      }
    } catch (err) {
      console.error(`Cryptonator offline: Fail fetch ${coin} exRate for fiat ${activeFiat}`, err)
      return 0
    }
  }

  getFiatBalance = async () => {
    const { haveCurrency, getCurrency } = this.state

    const exHaveRate = await this.fetchFiatExRate(haveCurrency)
    const exGetRate = await this.fetchFiatExRate(getCurrency)
    this.setState({
      exHaveRate,
      exGetRate,
    })
  }

  createOffer = async () => {
    feedback.createOffer.started()

    const { haveCurrency, getCurrency } = this.state

    actions.modals.open(constants.modals.Offer, {
      sellCurrency: haveCurrency,
      buyCurrency: getCurrency,
    })
    // actions.analytics.dataEvent('orderbook-click-createoffer-button')
  }

  getEthBalance() {
    const {
      balances,
    } = this.state

    return (balances && balances[`ETH`]) ? balances[`ETH`] : 0
  }
  /* Refactoring
   * Проверка возможности начать свап по указанной паре
   * Проверяет балан, фи, если свап не возможен - показывает сообщение
   */
  checkSwapAllow = (checkParams) => {
    const { sellCurrency, buyCurrency, amount, balance, fromType, isSilentError } = checkParams

    const { pairFees, balances } = this.state

    // todo: improve calculation much more
    // !!! Если ПРОДАЕМ токены, у нас должны быть И ТОКЕНЫ И ЭФИР !!!
    // !!! Если мы ПОКУПАЕМ ТОКЕНЫ, у нас должен быть ТОЛЬКО ЭФИР И ТОЛЬКО БИТОК (UTXO) !!!
    const isTokenBuy = helpers.ethToken.isEthToken({ name: buyCurrency })
    const isTokenSell = helpers.ethToken.isEthToken({ name: sellCurrency })
    const ethBalance = this.getEthBalance()
    // Достаточно ли у нас эфира для совершения транзакции
    const isEthEnoghtForFee = (
      pairFees
      && ethBalance
      && pairFees.byCoins
      && pairFees.byCoins.ETH
      && pairFees.byCoins.ETH.fee
      && new BigNumber(ethBalance).isGreaterThanOrEqualTo(pairFees.byCoins.ETH.fee)
    )
    // Если мы продаем токены - достаточно ли у нас их
    const isTokenBalanceEnought = (
      isTokenSell
      && balances
      && balances[sellCurrency]
      && new BigNumber(balances[sellCurrency]).isGreaterThanOrEqualTo(amount)
    )
    // Достаточно ли у нас продаваемой валюты для оплаты вместе с фи 
    // Если это не токены - то это будет или эфир или биток (utxo)
    // Если мы покумаем токены - то это будет биток (utxo)
    const isSellEnoughtWithFee = (
      (
        pairFees
        && balances
        && pairFees.byCoins
        && pairFees.byCoins[sellCurrency]
        && pairFees.byCoins[sellCurrency].fee
        && balances[sellCurrency]
        && new BigNumber(balances[sellCurrency]).isGreaterThanOrEqualTo(new BigNumber(amount).plus(pairFees.byCoins[sellCurrency].fee))
      ) || (fromType === AddressType.Custom)
    )

    // Если это не токены (isTokenBuy == false и isTokenSell == false) - проверяем балансы с фии
    let balanceIsOk = false
    if (
      (
        /* Продаем токены, должно хватать на фи эфира, баланса токенов должно хватать */
        isTokenSell
        && isEthEnoghtForFee
        && new BigNumber(balances[sellCurrency]).isGreaterThanOrEqualTo(amount)
      ) || (
        /* Покупаем токены, должно хватать на фи эфира, должно хватать UTXO (sell) на фи и на сумму ордера */
        isTokenBuy
        && isEthEnoghtForFee
        && isSellEnoughtWithFee
      ) || (
        /* Это не токены, должно хватать на фи эфира. Должно хватать UTXO (sell) на фи и сумму ордера */
        /* Получается если мы продаем эфир, isEthEnoghtForFee = isSellEnoughtWithFee = true, тоесть у нас есть эфира на размер ордера и на фии */
        /* Если мы покупаем эфир - isEthEnoghtForFee = true, isSellEnoughtWithFee = true, есть эфир для контракта, есть utxo на сумму ордера и фи */
        !isTokenBuy
        && !isTokenSell
        && isEthEnoghtForFee
        && isSellEnoughtWithFee
      )
    ) {
      balanceIsOk = true
    }
    let needEthFee = false
    if (
      isTokenBuy
      && pairFees
      && pairFees.byCoins
      && pairFees.byCoins.ETH
      && new BigNumber(this.getEthBalance()).isLessThan(pairFees.byCoins.ETH.fee)
    ) needEthFee = true

    if (isSilentError) return balanceIsOk
    if (!balanceIsOk) {
      const { address } = actions.core.getWallet({ currency: sellCurrency })
      const {
        sell: { fee: sellFee, coin: sellCoin },
        buy: { fee: buyFee, coin: buyCoin },
      } = pairFees

      const alertMessage = (
        <Fragment>
          <FormattedMessage
            id="AlertOrderNonEnoughtBalance"
            defaultMessage="Please top up your balance before you start the swap."
          />
          <br />
          {(isTokenSell || (isTokenBuy && needEthFee)) && (
            <FormattedMessage
              id="Swap_NeedEthFee"
              defaultMessage="На вашем балансе должно быть не менее {buyFee} {buyCoin} для оплаты коммисии майнера"
              values={{
                buyFee,
                buyCoin,
              }}
            />
          )}
          {!isTokenSell && !needEthFee && (
            <FormattedMessage
              id="Swap_NeedMoreAmount"
              defaultMessage="На вашем балансе должно быть не менее {amount} {currency}. {br}Коммисия майнера {sellFee} {sellCoin} и {buyFee} {buyCoin}"
              values={{
                amount: amount.toNumber(),
                currency: sellCurrency.toUpperCase(),
                sellFee,
                sellCoin,
                buyFee,
                buyCoin,
                br: <br />,
              }}
            />
          )}
        </Fragment>
      )
      actions.modals.open(constants.modals.AlertWindow, {
        title: (
          <FormattedMessage
            id="AlertOrderNonEnoughtBalanceTitle"
            defaultMessage="Not enough balance."
          />
        ),
        message: alertMessage,
        canClose: true,
        currency: buyCurrency,
        address,
        actionType: 'deposit',
      })
      return false
    }
    return true
  }

  // @ToDo - need refactiong without BTC
  initSwap = async () => {
    const { decline, usersData } = this.props

    const { haveCurrency, haveAmount, getCurrency, haveType } = this.state
    const haveTicker = haveCurrency.toUpperCase()
    const getTicker = getCurrency.toUpperCase()

    feedback.exchangeForm.requestedSwap(`${haveTicker}->${getTicker}`)

    if (
      !this.checkSwapAllow({
        sellCurrency: haveCurrency,
        buyCurrency: getCurrency,
        amount: haveAmount,
        balance: this.getBalance(haveCurrency),
        fromType: haveType,
      })
    ) {
      return false
    }

    if (decline.length === 0) {
      this.sendRequestForPartial()
    } else {
      const declinedExistedSwapIndex = helpers.handleGoTrade.getDeclinedExistedSwapIndex({
        currency: haveCurrency,
        decline,
      })
      if (declinedExistedSwapIndex !== false) {
        this.openModalDeclineOrders(declinedExistedSwapIndex)
      } else {
        this.sendRequestForPartial()
      }
    }
  }

  openModalDeclineOrders = (indexOfDecline) => {
    const orders = SwapApp.shared().services.orders.items
    const declineSwap = actions.core.getSwapById(this.props.decline[indexOfDecline])

    if (declineSwap !== undefined) {
      actions.modals.open(constants.modals.DeclineOrdersModal, {
        declineSwap,
      })
    }
  }

  sendRequestForPartial = () => {
    const {
      peer,
      orderId,
      fromAddress,
      toAddress,
      haveAmount,
      getAmount,
      maxAmount,
      maxBuyAmount,
    } = this.state

    console.group('Exchange > sendRequestForPartial')
    console.log(`${haveAmount} FROM ${fromAddress.value}`)
    console.log(`${getAmount} TO ${toAddress.value}`)
    console.groupEnd()

    if (!String(getAmount) || !peer || !orderId || !String(haveAmount)) {
      return
    }

    const newValues = {
      sellAmount: maxBuyAmount.isEqualTo(haveAmount) ? maxAmount : getAmount,
    }

    const destination = {
      address: toAddress.value,
    }

    this.setState(() => ({ isWaitForPeerAnswer: true }))

    // wait until not skip and ban peer
    const requestTimeoutSec = config && config.isWidgetBuild ? 60 : 30

    const requestTimeout = setTimeout(() => {
      this.banPeer(peer)
      this.getLinkToDeclineSwap()
      this.setDeclinedOffer()
    }, requestTimeoutSec * 1000)

    this.onRequestAnswer = (newOrder, isAccepted) => {
      clearTimeout(requestTimeout)
      if (isAccepted) {
        this.setState(() => ({
          redirectToSwap: newOrder.isTurbo ? SwapMode.Turbo : SwapMode.Atomic,
          orderId: newOrder.id,
          isWaitForPeerAnswer: false,
        }))
      } else {
        this.banPeer(peer)
        this.getLinkToDeclineSwap()
        this.setDeclinedOffer()
      }
    }

    actions.core.sendRequestForPartial(orderId, newValues, destination, this.onRequestAnswer)
  }

  getLinkToDeclineSwap = () => {
    const orders = SwapApp.shared().services.orders.items

    const unfinishedOrder = orders
      .filter((item) => item.isProcessing === true)
      .filter((item) => item.participant)
      .filter((item) => item.participant.peer === this.state.peer)
      .filter((item) => item.sellCurrency === this.state.getCurrency.toUpperCase())[0]

    if (!unfinishedOrder) return

    this.setState(() => ({
      wayToDeclinedOrder: `swaps/${unfinishedOrder.sellCurrency}-${unfinishedOrder.sellCurrency}/${unfinishedOrder.id}`,
    }))
  }

  returnNeedCurrency = (haveCurrency, getCurrency) => {
    const partialItems = Object.assign(getState().currencies.partialItems) // eslint-disable-line

    const partialCurrency = getState().currencies.partialItems.map((item) => item.name)
    const allCurrencyies = getState().currencies.items.map((item) => item.name)
    let partialItemsArray = [...partialItems]
    let currenciesOfUrl = []
    currenciesOfUrl.push(haveCurrency, getCurrency)

    currenciesOfUrl.forEach((item) => {
      if (allCurrencyies.includes(item.toUpperCase())) {
        if (!partialCurrency.includes(item.toUpperCase())) {
          partialItemsArray.push({
            name: item.toUpperCase(),
            title: item.toUpperCase(),
            icon: item.toLowerCase(),
            value: item.toLowerCase(),
          })
          reducers.currencies.updatePartialItems(partialItemsArray)
        }
      } else {
        this.setState(() => ({
          haveCurrency: config && config.isWidget ? config.erc20token : 'swap',
        }))
      }
    })
  }

  setDeclinedOffer = () => {
    this.setState(() => ({
      haveAmount: '',
      isWaitForPeerAnswer: false,
      isDeclinedOffer: true,
    }))

    setTimeout(() => {
      this.setState(() => ({
        isDeclinedOffer: false,
      }))
    }, 7 * 1000)
  }

  setNoOfferState = () => {
    this.setState(() => ({ isNonOffers: true }))
  }

  setAmountOnState = (maxAmount, getAmount, buyAmount) => {
    const { getCurrency, haveAmount } = this.state
    const decimalPlaces = constants.tokenDecimals[getCurrency.toLowerCase()]

    this.setState(() => ({
      maxAmount: Number(maxAmount),
      getAmount: new BigNumber(getAmount).dp(decimalPlaces).toString(),
      maxBuyAmount: buyAmount,
    }))

    return (
      new BigNumber(getAmount).isLessThanOrEqualTo(maxAmount) ||
      new BigNumber(haveAmount).isEqualTo(buyAmount)
    )
  }

  setAmount = (value) => {
    this.setState(() => ({ haveAmount: value, maxAmount: 0 }))
  }

  setOrders = async () => {
    const { filteredOrders, haveAmount, exHaveRate, exGetRate } = this.state

    if (!filteredOrders.length) {
      this.setState(() => ({
        isNonOffers: true,
        isNoAnyOrders: true,
        maxAmount: 0,
        getAmount: 0,
        maxBuyAmount: new BigNumber(0),
      }))
      return
    }

    const sortedOrders = filteredOrders
      .sort(
        (a, b) =>
          Number(b.buyAmount.dividedBy(b.sellAmount)) - Number(a.buyAmount.dividedBy(a.sellAmount))
      )
      .map((item, index) => {
        const exRate = item.buyAmount.dividedBy(item.sellAmount)
        const getAmount = new BigNumber(haveAmount).dividedBy(exRate).toString()

        return {
          sellAmount: item.sellAmount,
          buyAmount: item.buyAmount,
          exRate,
          getAmount,
          orderId: item.id,
          peer: item.owner.peer,
        }
      })

    const didFound = await this.setOrderOnState(sortedOrders)

    if (didFound) {
      this.setState(() => ({
        isNoAnyOrders: false,
      }))
    }
  }

  setOrderOnState = (orders) => {
    const { haveAmount, getCurrency } = this.state

    let maxAllowedSellAmount = new BigNumber(0)
    let maxAllowedGetAmount = new BigNumber(0)
    let maxAllowedBuyAmount = new BigNumber(0)

    let isFound = false
    let newState = {}

    const findGoodOrder = (inOrders) => {
      inOrders.forEach((item) => {
        maxAllowedSellAmount = maxAllowedSellAmount.isLessThanOrEqualTo(item.sellAmount)
          ? item.sellAmount
          : maxAllowedSellAmount
        maxAllowedBuyAmount = maxAllowedBuyAmount.isLessThanOrEqualTo(item.buyAmount)
          ? item.buyAmount
          : maxAllowedBuyAmount

        if (new BigNumber(haveAmount).isLessThanOrEqualTo(item.buyAmount)) {
          maxAllowedGetAmount = maxAllowedGetAmount.isLessThanOrEqualTo(item.getAmount)
            ? new BigNumber(item.getAmount)
            : maxAllowedGetAmount

          isFound = true

          newState = {
            isNonOffers: false,
            goodRate: item.exRate,
            peer: item.peer,
            orderId: item.orderId,
          }
        }
      })
    }

    findGoodOrder(orders.filter((order) => !this.isPeerBanned(order.peer)))

    if (!isFound) {
      // check banned peers
      findGoodOrder(orders.filter((order) => this.isPeerBanned(order.peer)))
    }

    if (isFound) {
      this.setState(() => newState)
    } else {
      this.setState(() => ({
        isNonOffers: true,
        getFiat: Number(0).toFixed(2),
      }))
    }

    const checkAmount = this.setAmountOnState(
      maxAllowedSellAmount,
      maxAllowedGetAmount,
      maxAllowedBuyAmount
    )

    if (!checkAmount) {
      this.setNoOfferState()
    }

    return true
  }

  isPeerBanned(peerID) {
    if (bannedPeers[peerID] && bannedPeers[peerID] > Math.floor(new Date().getTime() / 1000)) {
      return true
    }
    return false
  }

  banPeer(peerID) {
    const bannedPeersTimeout = 180 // 3 mins
    bannedPeers[peerID] = Math.floor(new Date().getTime() / 1000) + bannedPeersTimeout
  }

  handleSetGetValue = ({ value }) => {
    const { haveCurrency, getCurrency } = this.state

    if (value === haveCurrency) {
      this.flipCurrency()
    } else {
      this.setState(
        {
          getCurrency: value,
          getType: this.getDefaultWalletType(value.toUpperCase()),
          haveCurrency,
          haveType: this.getDefaultWalletType(haveCurrency.toUpperCase()),
          pairFees: false,
        },
        () => {
          this.fetchPairFeesAndBalances()
          this.changeUrl(haveCurrency, value)
          actions.analytics.dataEvent({
            action: 'exchange-click-selector',
            label: `${haveCurrency}-to-${getCurrency}`,
          })
        }
      )
    }
  }

  handleSetHaveValue = async ({ value }) => {
    const { haveCurrency, getCurrency } = this.state

    if (value === getCurrency) {
      this.flipCurrency()
    } else {
      this.setState(
        {
          haveCurrency: value,
          haveType: this.getDefaultWalletType(value.toUpperCase()),
          getCurrency,
          getType: this.getDefaultWalletType(getCurrency.toUpperCase()),
          pairFees: false,
        },
        () => {
          this.fetchPairFeesAndBalances()
          this.changeUrl(value, getCurrency)
          actions.analytics.dataEvent({
            action: 'exchange-click-selector',
            label: `${haveCurrency}-to-${getCurrency}`,
          })

          this.checkPair()
        }
      )
    }
  }

  applyAddress = (addressRole, addressData) => {
    // address value or missing either already validated
    const { type, value, currency } = addressData

    this.setDefaultCurrencyType(currency.toUpperCase(), type)
    feedback.exchangeForm.selectedAddress(`${addressRole} ${currency.toUpperCase()} ${type}`)

    if (addressRole === AddressRole.Send) {
      this.setState({
        fromAddress: addressData,
        haveType: type,
      })
    }
    if (addressRole === AddressRole.Receive) {
      this.setState({
        toAddress: addressData,
        getType: type,
      })
    }
  }

  flipCurrency = async () => {
    const {
      haveCurrency,
      haveType,
      getCurrency,
      getType,
      exHaveRate,
      exGetRate,
      pairFees,
      fromAddress,
      toAddress,
    } = this.state

    feedback.exchangeForm.flipped(
      `${haveCurrency}->${getCurrency} => ${getCurrency}->${haveCurrency}`
    )

    this.resetState()
    this.changeUrl(getCurrency, haveCurrency)
    this.setState(
      {
        haveCurrency: getCurrency,
        getCurrency: haveCurrency,
        haveType: getType,
        getType: haveType,
        exHaveRate: exGetRate,
        exGetRate: exHaveRate,
        pairFees: {
          ...(pairFees
            ? {
                // flip pair fees and exRates
                ...pairFees,
                buy: pairFees.sell,
                sell: pairFees.buy,
                have: pairFees.get,
                get: pairFees.have,
                buyExRate: pairFees.sellExRate,
                sellExRate: pairFees.buyExRate,
              }
            : []),
        },
        // todo: flip values
        fromAddress: toAddress,
        toAddress: fromAddress,
      },
      () => {
        actions.analytics.dataEvent({
          action: 'exchange-click-selector',
          label: `${haveCurrency}-to-${getCurrency}`,
        })
        this.fetchPairFeesAndBalances()
        this.checkPair()
      }
    )
  }

  resetState = () => {
    this.setState(() => ({
      haveAmount: 0,
      haveHeat: 0,
      getHeat: 0,
      getAmount: '',
      maxAmount: 0,
      maxBuyAmount: new BigNumber(0),
      peer: '',
      isNonOffers: false,
      isWaitForPeerAnswer: false,
      isDeclinedOffer: false,
    }))
  }

  checkPair = () => {
    const { getCurrency, haveCurrency } = this.state

    const noPairToken = config && config.isWidget ? config.erc20token : 'swap'

    const checkingValue = this.props.allCurrencyies
      .map((item) => item.name)
      .includes(haveCurrency.toUpperCase())
        ? haveCurrency
        : noPairToken

    const selected = actions.pairs.selectPairPartial(checkingValue)
    const check = selected.map((item) => item.value).includes(getCurrency)
    this.getFiatBalance()

    if (!check) {
      this.chooseCurrencyToRender(selected)
    } else if (getCurrency === checkingValue) {
      this.chooseCurrencyToRender(selected)
    }
  }

  chooseCurrencyToRender = (selected) => {
    this.setState(
      () => ({
        getCurrency: selected[0].value,
      }),
      () => {
        this.getFiatBalance()
      }
    )
  }

  checkoutLowAmount() {
    return (
      this.doesComissionPreventThisOrder() &&
      new BigNumber(this.state.getAmount).isGreaterThan(0) &&
      this.state.haveAmount &&
      this.state.getAmount
    )
  }

  extendedControlsSet = (value) => {
    const { extendedControls } = this.state

    if (typeof value !== 'boolean') {
      return this.setState({ extendedControls: false })
    }
    if (extendedControls === value) {
      return false
    }
    return this.setState({ extendedControls: value })
  }

  doesComissionPreventThisOrder = () => {
    const { pairFees, haveAmount, getAmount, isPending } = this.state

    if (!isPending && pairFees) {
      // @ToDo
      // Возможно нужно брать за расчет коммисию умноженную на два
      // Если минимум будет размер коммисии, то по факту
      // При выводе из скрипта покупатель получит ноль монет
      // (При списании со скрипта берется коммисия)
      const feeMultipler = 1
      if (
        pairFees.have.isUTXO &&
        new BigNumber(pairFees.have.fee).times(feeMultipler).isGreaterThanOrEqualTo(haveAmount)
      )
        return true
      if (
        pairFees.get.isUTXO &&
        new BigNumber(pairFees.get.fee).times(feeMultipler).isGreaterThanOrEqualTo(getAmount)
      )
        return true
    } else {
      /* No information for fee... wait - disable swap */
      return true
    }
    return false
  }

  goDeclimeFaq = () => {
    const faqLink = links.getFaqLink('requestDeclimed')
    if (faqLink) {
      window.location.href = faqLink
    }
  }

  getCorrectDecline = () => {
    const { decline } = this.props
    const localSavedOrders = localStorage.getItem(constants.localStorage.savedOrders)

    if (!localSavedOrders || localSavedOrders.length !== decline.length) {
      return
    }

    const desclineOrders = decline
      .map((swapId) => actions.core.getSwapById(swapId))
      .filter((swap) => {
        const { isFinished, isRefunded, isStoppedSwap } = swap.flow.state
        // if timeout - skip this swap. for refund, if need - use history page
        const lifeTimeout = swap.checkTimeout(60 * 60 * 3) // 3 hours
        return isFinished || isRefunded || isStoppedSwap || lifeTimeout
      })

    this.setState({
      desclineOrders,
    })
  }

  getCoinData = (coin) => {
    const { currenciesData, tokensData } = this.props
    const currencyData = currenciesData.find((item) => item.currency === coin)
    const tokenData = tokensData.find((item) => item.currency === coin)
    return currencyData || tokenData
  }

  getCoinFullName = (coin) => {
    const coinData = this.getCoinData(coin)
    return coinData ? coinData.fullName : coin
  }

  showIncompleteSwap = () => {
    const { desclineOrders } = this.state
    actions.modals.open(constants.modals.IncompletedSwaps, {
      desclineOrders,
    })
  }

  render() {
    const {
      currencies,
      activeFiat,
      addSelectedItems,
      match: {
        params: { linkedOrderId },
      },
    } = this.props

    const {
      haveCurrency,
      haveType,
      getCurrency,
      getType,
      fromAddress,
      toAddress,
      orderId,
      isNonOffers,
      maxAmount,
      exHaveRate,
      exGetRate,
      maxBuyAmount,
      getAmount,
      goodRate,
      haveAmount,
      isNoAnyOrders,
      isFullLoadingComplite,
      redirectToSwap,
      isWaitForPeerAnswer,
      directionOrders,
      desclineOrders,
      isDeclinedOffer,
      pairFees,
      balances,
      haveBalance,
      isTurbo,
      isPending,
    } = this.state

    const sellCoin = haveCurrency.toUpperCase()
    const buyCoin = getCurrency.toUpperCase()
    const balance = this.getBalance(sellCoin)

    if (redirectToSwap) {
      const swapUri = ({
        [SwapMode.Atomic]: `${links.atomicSwap}/${orderId}`,
        [SwapMode.Turbo]: `${links.turboSwap}/${orderId}`
      })[redirectToSwap]

      if (!swapUri) {
        throw new Error('Wrong swap redirect')
      }
      console.log(`Redirect to swap: ${swapUri}`)
      return <Redirect to={swapUri} push />
    }

    let balanceTooltip = null

    if (pairFees && pairFees.byCoins) {
      const sellCoinFee = pairFees.byCoins[sellCoin] || false
      
      balanceTooltip = (
        <p styleName="maxAmount">
          {new BigNumber(balance).toNumber() === 0 ||
          (sellCoinFee &&
            new BigNumber(balance).minus(sellCoinFee.fee).isLessThanOrEqualTo(0)) ? null : (
            <>
              {sellCoinFee ? (
                <FormattedMessage id="Exchange_AvialableBalance" defaultMessage="Available: " />
              ) : (
                <FormattedMessage id="partial767" defaultMessage="Your balance: " />
              )}
              {sellCoinFee && sellCoinFee.fee
                ? new BigNumber(balance)
                    .minus(sellCoinFee.fee)
                    .dp(5, BigNumber.ROUND_FLOOR)
                    .toString()
                : new BigNumber(balance).dp(5, BigNumber.ROUND_FLOOR).toString()}
              {'  '}
              {sellCoin}
            </>
          )}
        </p>
      )
    }

    const haveFiat = new BigNumber(exHaveRate).times(haveAmount).dp(2, BigNumber.ROUND_CEIL)

    const getFiat = new BigNumber(exGetRate).times(getAmount).dp(2, BigNumber.ROUND_CEIL)

    const fiatFeeCalculation =
      pairFees && pairFees.buy && pairFees.sell
        ? new BigNumber(pairFees.buyExRate)
            .times(pairFees.buy.fee)
            .plus(new BigNumber(pairFees.sellExRate).times(pairFees.sell.fee))
            .dp(2, BigNumber.ROUND_CEIL)
            .toNumber()
        : 0

    const oneCryptoCost = maxBuyAmount.isLessThanOrEqualTo(0)
      ? new BigNumber(0)
      : new BigNumber(goodRate)

    const linked = Link.all(this, 'haveAmount', 'getAmount')

    const availableAmount =
      pairFees &&
      pairFees.byCoins &&
      pairFees.byCoins[sellCoin] &&
      new BigNumber(pairFees.byCoins[sellCoin].fee).isGreaterThan(0)
        ? new BigNumber(haveAmount).minus(pairFees.byCoins[sellCoin].fee)
        : 0

    const isLowAmount = this.checkoutLowAmount()

    const sellTokenFullName = this.getCoinFullName(sellCoin)
    const buyTokenFullName = this.getCoinFullName(buyCoin)

    // temporary: show atomic/turbo switch if only there are turbo offers
    const isShowSwapModeSwitch = directionOrders.filter(offer => offer.isTurbo).length > 0

    const isTurboAllowed = (
      turboSwap.isAssetSupported(buyCoin) &&
      turboSwap.isAssetSupported(sellCoin) &&
      // temporarily: no external addresses support at the turboswaps-alpha stage
      // see https://github.com/swaponline/MultiCurrencyWallet/issues/3875
      fromAddress.type === AddressType.Internal &&
      toAddress.type === AddressType.Internal
    )


    const isPrice = oneCryptoCost.isGreaterThan(0) && oneCryptoCost.isFinite() && !isNonOffers

    const isErrorNoOrders = isNoAnyOrders && linked.haveAmount.value > 0 && isFullLoadingComplite

    const isErrorLowLiquidity =
      !isNoAnyOrders && maxAmount > 0 && isNonOffers && linked.haveAmount.value > 0

    const isErrorLowAmount =
      this.doesComissionPreventThisOrder() &&
      new BigNumber(getAmount).isGreaterThan(0) &&
      haveAmount &&
      getAmount

    // temporarly disable some combinations (need test)
    const isErrorExternalDisabled =
      (fromAddress &&
        ![AddressType.Internal, AddressType.Metamask, AddressType.Custom].includes(
          fromAddress.type
        )) ||
      (toAddress &&
        ![AddressType.Internal, AddressType.Metamask, AddressType.Custom].includes(toAddress.type))

    const canStartSwap =
      !isErrorExternalDisabled &&
      !isNonOffers &&
      fromAddress &&
      toAddress &&
      toAddress.value &&
      new BigNumber(getAmount).isGreaterThan(0) &&
      !this.doesComissionPreventThisOrder() &&
      (new BigNumber(haveAmount).isGreaterThan(balance) ||
        new BigNumber(balance).isGreaterThanOrEqualTo(availableAmount) ||
        fromAddress.type === AddressType.Custom) &&
      !isWaitForPeerAnswer

    const isIncompletedSwaps = !!desclineOrders.length

    const Form = (
      <div styleName="section">
        <div styleName="formExchange">
          <div styleName="userSendAndGet">
            <div>
              <SelectGroup
                activeFiat={activeFiat}
                inputValueLink={linked.haveAmount.pipe(this.setAmount)}
                selectedValue={haveCurrency}
                onSelect={this.handleSetHaveValue}
                label={<FormattedMessage id="partial243" defaultMessage="You send" />}
                id="Exchange456"
                placeholder="0.00000000"
                fiat={maxAmount > 0 && isNonOffers ? 0 : haveFiat}
                currencies={currencies}
                onFocus={() => this.extendedControlsSet(true)}
                onBlur={() => setTimeout(() => this.extendedControlsSet(false), 200)}
                inputToolTip={balanceTooltip}
              />

              <AddressSelect
                label={<FormattedMessage id="Exchange_FromAddress" defaultMessage="From address" />}
                isDark={isDark}
                currency={haveCurrency}
                selectedType={haveType}
                role={AddressRole.Send}
                hasError={false}
                placeholder="From address"
                onChange={(addrData) => this.applyAddress(AddressRole.Send, addrData)}
              />
            </div>

            <div styleName="switchButton">
              <Switching noneBorder onClick={this.flipCurrency} />
            </div>

            <div>
              <SelectGroup
                activeFiat={activeFiat}
                dataTut="get"
                inputValueLink={linked.getAmount}
                selectedValue={getCurrency}
                onSelect={this.handleSetGetValue}
                disabled={true} // value calculated from market price
                label={<FormattedMessage id="partial255" defaultMessage="You get" />}
                id="Exchange472"
                currencies={addSelectedItems}
                fiat={getFiat}
                error={isLowAmount}
              />

              <AddressSelect
                label={<FormattedMessage id="Exchange_ToAddress" defaultMessage="To address" />}
                isDark={isDark}
                role={AddressRole.Receive}
                currency={getCurrency}
                selectedType={getType}
                hasError={false}
                placeholder="To address"
                onChange={(addrData) => this.applyAddress(AddressRole.Receive, addrData)}
              />
            </div>
          </div>

          {isShowSwapModeSwitch &&
            <div styleName={`swapModeSelector ${isTurboAllowed ? '' : 'disabled'}`}>
              <div styleName="toggle">
                <div styleName="toggleText">
                  <FormattedMessage id="AtomicSwap_Title" defaultMessage="Atomic swap" />
                </div>
                {/*
                //@ts-ignore */}
                <Toggle checked={isTurbo} isDisabled={!isTurboAllowed} onChange={() => this.setState((state) => ({ isTurbo: !state.isTurbo }))} />
                <div styleName="toggleText">
                  <TurboIcon />
                  <span>
                    <FormattedMessage id="TurboSwap_Title" defaultMessage="Turbo swap" />
                    &nbsp;
                    <a href="https://github.com/swaponline/MultiCurrencyWallet/blob/master/docs/TURBO_SWAPS.md" target="_blank">(?)</a>
                  </span>
                </div>
              </div>
            </div>
          }

          <div styleName="errors">
            {isErrorNoOrders && (
              <Fragment>
                <p styleName="error">
                  <FormattedMessage
                    id="PartialPriceNoOrdersReduce"
                    defaultMessage="No orders found, try later or change the currency pair"
                  />
                </p>
              </Fragment>
            )}

            {isErrorLowLiquidity && (
              <Fragment>
                <p styleName="error">
                  <FormattedMessage
                    id="PartialPriceNoOrdersReduceAllInfo"
                    defaultMessage="This trade amount is too high for present market liquidity. Please reduce amount to {maxForSell}."
                    values={{
                      maxForBuy: `${maxAmount} ${getCurrency.toUpperCase()}`,
                      maxForSell: `${maxBuyAmount.toFixed(8)} ${haveCurrency.toUpperCase()}`,
                    }}
                  />
                </p>
              </Fragment>
            )}

            {isErrorLowAmount && (
              <p styleName="error">
                <FormattedMessage
                  id="ErrorBtcLowAmount"
                  defaultMessage="This amount is too low"
                  values={{
                    btcAmount:
                      this.state.haveCurrency === 'btc'
                        ? this.state.haveAmount
                        : this.state.getAmount,
                  }}
                />
              </p>
            )}

            {isDeclinedOffer && (
              <p styleName="error link" onClick={this.goDeclimeFaq}>
                {' '}
                {/* eslint-disable-line */}
                <FormattedMessage
                  id="PartialOfferCantProceed1"
                  defaultMessage="Request rejected, possibly you have not complete another swap {br}{link}"
                  values={{
                    link: (
                      <a className="errorLink" role="button" onClick={this.goDeclimeFaq}>
                        {' '}
                        {/* eslint-disable-line */}
                        <FormattedMessage
                          id="PartialOfferCantProceed1_1"
                          defaultMessage="Check here"
                        />
                      </a>
                    ),
                    br: <br />,
                  }}
                />
              </p>
            )}

            {isErrorExternalDisabled && (
              <p styleName="error">
                The exchange is temporarily disabled for some external addresses (under maintenance)
              </p>
            )}
          </div>

          <div styleName="conditions">
            <div styleName={`price ${isDark ? '--dark' : ''}`}>
              <FormattedMessage id="Exchange_BestPrice" defaultMessage="Best price:" />{' '}
              {!isPrice && !isErrorNoOrders && <InlineLoader />}
              {isPrice &&
                `1 ${getCurrency.toUpperCase()} = ${oneCryptoCost.toFixed(
                  5
                )} ${haveCurrency.toUpperCase()}`}
              {isErrorNoOrders && '?'}
            </div>

            <div styleName="fees">
              <div styleName="serviceFee">
                <span>
                  <FormattedMessage id="Exchange_ServiceFee" defaultMessage="Service fee" />:
                </span>
                &nbsp;
                <span>0</span>
              </div>

              <div styleName="minerFee">
                <span>
                  <FormattedMessage id="Exchange_MinerFees" defaultMessage="Miner fee" />:
                </span>
                &nbsp;
                
                {/* Fees info */}
                <>
                  {isPending || !pairFees ? (
                    <span>
                      <InlineLoader />
                    </span>
                  ) : (
                    <span>
                      {pairFees.sell.fee} {pairFees.sell.coin} + {pairFees.buy.fee} {pairFees.buy.coin}
                      {' ≈ '}
                      {fiatFeeCalculation > 0 ? <>${fiatFeeCalculation}</> : 0}
                      {' '}
                    </span>
                  )}       
                  <button 
                    className="fas fa-sync-alt"
                    styleName="minerFeeUpdateBtn"
                    onClick={this.updateFees}
                    disabled={isPending}
                  />
                  <a
                    href="https://wiki.swaponline.io/faq/why-i-pay-ming-fees-of-btc-and-eth-both-why-not-seller/"
                    target="_blank"
                  >
                    (?)
                  </a>        
                </>
              </div>
            </div>
          </div>

          {isWaitForPeerAnswer && (
            <div styleName="swapStartStatus">
              <div styleName="swapStartStatusLoader">
                <InlineLoader />
              </div>
              <FormattedMessage
                id="partial291"
                defaultMessage="Waiting for another participant (30 sec)"
              />
            </div>
          )}

          <div styleName="buttons">
            {/* Exchange */}
            <Button
              className="data-tut-Exchange_tourDisabled"
              styleName="button"
              blue
              onClick={this.initSwap}
              disabled={!canStartSwap}
            >
              {linked.haveAmount.value > 0 ? (
                <FormattedMessage id="partial541" defaultMessage="Exchange now" />
              ) : (
                <FormattedMessage id="enterYouSend" defaultMessage='Enter "You send" amount' />
              )}
            </Button>
            {/* Button Create offer */}
            <>
              <Button
                id="createOrderReactTooltipMessageForUser"
                styleName={`button link-like ${haveBalance ? '' : 'noMany'}`}
                onClick={haveBalance ? this.createOffer : null}
              >
                <FormattedMessage id="orders128" defaultMessage="Create offer" />
              </Button>
              {haveBalance ? (
                <ThemeTooltip
                  id="createOrderReactTooltipMessageForUser"
                  effect="solid"
                  place="bottom"
                >
                  <FormattedMessage
                    id="createOrderMessageForUser"
                    defaultMessage="You must be online all the time, otherwise your order will not be visible to other users"
                  />
                </ThemeTooltip>
              ) : (
                <ThemeTooltip
                  id="createOrderReactTooltipMessageForUser"
                  effect="solid"
                  place="bottom"
                >
                  <FormattedMessage
                    id="createOrderNoManyMessageForUser"
                    defaultMessage="Top up your balance"
                  />
                </ThemeTooltip>
              )}
            </>

            {isIncompletedSwaps && (
              <Button blue styleName="buttonContinueSwap" onClick={this.showIncompleteSwap}>
                <FormattedMessage id="continueDeclined977" defaultMessage="Continue your swaps" />
              </Button>
            )}
          </div>

          <div styleName="networkStatusPlace">
            <NetworkStatus />
          </div>
        </div>
      </div>
    )

    return (
      <div styleName="exchangeWrap">
        <div
          styleName={`promoContainer ${isDark ? '--dark' : ''}`}
          ref={(ref) => (this.promoContainer = ref)}
        >
          {config && config.showHowItsWork && (
            <div
              styleName="scrollToTutorialSection"
              ref={(ref) => (this.scrollTrigger = ref)}
              onClick={() =>
                animate((timePassed) => {
                  window.scrollTo(0, this.promoContainer.clientHeight * (timePassed / 100))
                }, 100)
              }
            >
              <span styleName="scrollAdvice">
                <FormattedMessage id="PartialHowItWorks10" defaultMessage="How it works?" />
              </span>
              <span styleName="scrollTrigger" />
            </div>
          )}
          <Fragment>
            <div styleName="container">
              <Promo
                subTitle={subTitle(
                  sellTokenFullName,
                  haveCurrency.toUpperCase(),
                  buyTokenFullName,
                  getCurrency.toUpperCase()
                )}
              />
              {Form}
              <Orders
                sell={haveCurrency}
                buy={getCurrency}
                linkedOrderId={linkedOrderId}
                pairFees={pairFees}
                balances={balances}
                checkSwapAllow={this.checkSwapAllow}
              />
            </div>
          </Fragment>
        </div>
        {config && config.showHowItsWork && (
          <Fragment>
            <HowItWorks />
            <VideoAndFeatures />
            <Quote />
          </Fragment>
        )}
      </div>
    )
  }
}

export default injectIntl(Exchange)
