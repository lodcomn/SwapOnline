import React, { Component, Fragment } from 'react'

import Link from 'sw-valuelink'
import { links } from 'helpers'

import CSSModules from 'react-css-modules'
import styles from './PartialClosure.scss'

import { connect } from 'redaction'
import actions from 'redux/actions'
import { BigNumber } from 'bignumber.js'
import { Redirect } from 'react-router-dom'

import SelectGroup from './SelectGroup/SelectGroup'
import { Button, Toggle, Flip } from 'components/controls'
import Input from 'components/forms/Input/Input'
import FieldLabel from 'components/forms/FieldLabel/FieldLabel'
import Tooltip from 'components/ui/Tooltip/Tooltip'

import PageHeadline from 'components/PageHeadline/PageHeadline'
import InlineLoader from 'components/loaders/InlineLoader/InlineLoader'
import { FormattedMessage, injectIntl } from 'react-intl'
import { localisedUrl } from 'helpers/locale'


import config from 'app-config'
import swapApp, { util } from 'swap.app'

import constants from 'helpers/constants'


const filterIsPartial = (orders) => orders
  .filter(order => order.isPartial && !order.isProcessing)

const text = [
  <FormattedMessage id="partial223" defaultMessage="To change default wallet for buy currency. " />,
  <FormattedMessage id="partial224" defaultMessage="Leave empty for use Swap.Online wallet " />,
]

const suTitle = [
  <FormattedMessage id="partial437" defaultMessage="Fast cryptocurrency exchange using atomicswap" />,
]

@injectIntl
@connect(({
  currencies,
  core: { orders },
  user: { ethData, btcData, /* bchData, */ tokensData, eosData, telosData, nimData, usdtData, ltcData },
}) => ({
  currencies: currencies.items,
  orders: filterIsPartial(orders),
  currenciesData: [ ethData, btcData, eosData, telosData, /* bchData, */ ltcData, usdtData /* nimData */ ],
  tokensData: [ ...Object.keys(tokensData).map(k => (tokensData[k])) ],
}))
@CSSModules(styles)
export default class PartialClosure extends Component {

  static defaultProps = {
    orders: [],
  }

  constructor() {
    super()

    this.state = {
      haveCurrency: 'btc',
      getCurrency: 'eth',
      haveAmount: 0,
      haveUsd: 0,
      getUsd: 0,
      getAmount: '',
      maxAmount: 0,
      maxBuyAmount: new BigNumber(0),
      peer: '',
      filteredOrders: [],
      isNonOffers: false,
      isFetching: false,
      isDeclinedOffer: false,
      customWalletUse: false,
      customWallet: '',
    }

    let timer
    let wallets
    let usdRates
  }

  componentDidMount() {
    this.usdRates = {}
    this.getUsdBalance()

    this.wallets = {}
    this.props.currenciesData.forEach(item => {
      this.wallets[item.currency] = item.address
    })
    this.props.tokensData.forEach(item => {
      this.wallets[item.currency] = item.address
    })

    this.timer = setInterval(() => {
      this.setOrders()
    }, 2000)
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }
  shouldComponentUpdate(nextPros) {
    if (nextPros.orders && this.props.orders && nextPros.orders > 0) {
      if (nextPros.orders.length === this.props.orders.length) {
        return false
      }
    }
    return true
  }

  static getDerivedStateFromProps({ orders }, { haveCurrency, getCurrency }) {
    if (!Array.isArray(orders)) { return }

    const filteredOrders = orders.filter(order => !order.isMy
      && order.sellCurrency === getCurrency.toUpperCase()
      && order.buyCurrency === haveCurrency.toUpperCase())

    return {
      filteredOrders,
    }
  }

  getUsdBalance = async () => {
    const { haveCurrency, getCurrency } = this.state

    try {
      const exHaveRate = (this.usdRates[haveCurrency] !== undefined) ?
        this.usdRates[haveCurrency] : await actions.user.getExchangeRate(haveCurrency, 'usd')
      const exGetRate = (this.usdRates[getCurrency] !== undefined) ?
        this.usdRates[getCurrency] : await actions.user.getExchangeRate(getCurrency, 'usd')

      console.log('exHaveRate', exHaveRate)
      console.log('exGetRate', exGetRate)

      this.usdRates[haveCurrency] = exHaveRate
      this.usdRates[getCurrency] = exGetRate

      this.setState(() => ({
        exHaveRate,
        exGetRate,
      }))
    } catch (e) {
      console.log('Cryptonator offline')
    }
  }

  sendRequest = () => {
    const {
      getAmount, haveAmount, haveCurrency, getCurrency,
      peer, orderId, customWalletUse, customWallet,
    } = this.state

    console.log('sendRequest', getAmount, peer, orderId, haveAmount)

    if (!String(getAmount) || !peer || !orderId || !String(haveAmount)) {
      return
    }

    const newValues = {
      sellAmount: getAmount,
    }

    const destination = {
      address: this.customWalletAllowed() ? customWallet : null,
    }

    console.log('sendRequest for partial order', newValues, destination)

    this.setState(() => ({ isFetching: true }))

    actions.core.sendRequestForPartial(orderId, newValues, destination, (newOrder, isAccepted) => {
      console.log('sendRequest order received', newOrder, isAccepted)
      if (isAccepted) {
        this.setState(() => ({
          redirect: true,
          isFetching: false,
          orderId: newOrder.id,
        }))
      } else {
        this.setDeclinedOffer()
      }
    })
  }

  setDeclinedOffer = () => {
    this.setState(() => ({ haveAmount: '', isFetching: false, isDeclinedOffer: true }))

    setTimeout(() => {
      this.setState(() => ({
        isDeclinedOffer: false,
      }))
    }, 5000)
  }

  setNoOfferState = () => {
    this.setState(() => ({ isNonOffers: true }))
  }

  setAmountOnState = (maxAmount, getAmount, buyAmount) => {

    console.log('maxAmount', Number(maxAmount))
    console.log('getAmount', this.getFixed(getAmount))

    this.setState(() => ({
      maxAmount: Number(maxAmount),
      getAmount: this.getFixed(getAmount),
      maxBuyAmount: buyAmount,
    }))

    return getAmount.isLessThanOrEqualTo(maxAmount)
  }

  getFixed = (value) => Number(value).toFixed(5)

  setAmount = (value) => {
    this.setState(() => ({ haveAmount: value, maxAmount: 0 }))
  }

  setOrders = async () => {
    const { filteredOrders, haveAmount, exHaveRate, exGetRate } = this.state

    if (filteredOrders.length === 0) {
      this.setNoOfferState()
      return
    }

    this.setState(() => ({
      isSearching: true,
    }))

    console.log('filteredOrders', filteredOrders.length)

    const sortedOrders = filteredOrders
      .sort((a, b) => Number(a.buyAmount.dividedBy(a.sellAmount)) - Number(b.buyAmount.dividedBy(b.sellAmount)))
      .map((item, index) => {

        const exRate = item.buyAmount.dividedBy(item.sellAmount)
        const getAmount = new BigNumber(String(haveAmount)).dividedBy(exRate)

        return {
          sellAmount: item.sellAmount,
          buyAmount: item.buyAmount,
          exRate,
          getAmount,
          orderId: item.id,
          peer: item.owner.peer,
        }
      })

    console.log('sortedOrder', sortedOrders.length)

    this.getUsdBalance()

    const didFound = await this.setOrderOnState(sortedOrders)

    console.log('didFound', didFound)

    if (didFound) {
      this.setState(() => ({
        isSearching: false,
      }))
    }
  }

  setOrderOnState = (orders) => {
    const { exHaveRate, exGetRate } = this.state
    const haveAmount = new BigNumber(this.state.haveAmount)

    let maxAllowedSellAmount = new BigNumber(0)
    let maxAllowedGetAmount = new BigNumber(0)
    let maxAllowedBuyAmount = new BigNumber(0)

    orders.forEach(item => {
      maxAllowedSellAmount = (maxAllowedSellAmount.isLessThanOrEqualTo(item.sellAmount)) ? item.sellAmount : maxAllowedSellAmount
      maxAllowedBuyAmount = (maxAllowedBuyAmount.isLessThanOrEqualTo(item.buyAmount)) ? item.buyAmount : maxAllowedBuyAmount
      if (haveAmount.isLessThanOrEqualTo(item.buyAmount)) {
        maxAllowedGetAmount = (maxAllowedGetAmount.isLessThanOrEqualTo(item.getAmount)) ? item.getAmount : maxAllowedGetAmount
        const haveUsd = new BigNumber(String(exHaveRate)).multipliedBy(new BigNumber(haveAmount))
        const getUsd  = new BigNumber(String(exGetRate)).multipliedBy(new BigNumber(item.getAmount))

        this.setState(() => ({
          haveUsd: Number(haveUsd).toFixed(2),
          getUsd: Number(getUsd).toFixed(2),
          isNonOffers: false,
          peer: item.peer,
          orderId: item.orderId,
        }))
      } else {
        this.setState(() => ({
          isNonOffers: true,
          getUsd: Number(0).toFixed(2),
        }))
      }
    })

    const checkAmount = this.setAmountOnState(maxAllowedSellAmount, maxAllowedGetAmount, maxAllowedBuyAmount)

    if (!checkAmount) {
      this.setNoOfferState()
    }
    return true
  }

  handleCustomWalletUse = () => {
    const newCustomWalletUse = !this.state.customWalletUse

    this.setState({
      customWalletUse: newCustomWalletUse,
      customWallet: (!newCustomWalletUse) ? '' : this.getSystemWallet(),
    })
  }

  handleSetGetValue = ({ value }) => {
    let { getCurrency, haveCurrency } = this.state

    if (haveCurrency === value) {
      haveCurrency = getCurrency
    }

    this.setClearState()

    this.setState(() => ({
      haveCurrency,
      getCurrency: value,
    }))
  }

  handleSetHaveValue = ({ value }) => {
    let { getCurrency, haveCurrency } = this.state

    if (getCurrency === value) {
      getCurrency = haveCurrency
    }

    this.setClearState()

    this.setState(() => ({
      getCurrency,
      haveCurrency: value,
    }))
  }

  handleFlipCurrency = () => {
    this.setClearState()
    this.setState(() => ({
      haveCurrency: this.state.getCurrency,
      getCurrency: this.state.haveCurrency,
    }))
  }

  handlePush = () => {
    const { intl: { locale } } = this.props
    const { haveCurrency, getCurrency } = this.state
    this.props.history.push(localisedUrl(locale, `/${haveCurrency} - ${getCurrency}`))

    const tradeTicker = `${haveCurrency}-${getCurrency}`

    if (constants.tradeTicker.includes(tradeTicker.toUpperCase())) {
      this.props.history.push(tradeTicker)
    } else {
      this.props.history.push(tradeTicker.split('-').reverse().join('-'))
    }
  }

  setClearState = () => {
    this.setState(() => ({
      haveAmount: 0,
      haveUsd: 0,
      getUsd: 0,
      getAmount: '',
      maxAmount: 0,
      maxBuyAmount: new BigNumber(0),
      peer: '',
      isNonOffers: false,
      isFetching: false,
      isDeclinedOffer: false,
      customWalletUse: false,
      customWallet: '',
    }))
  }

  getSystemWallet = () => {
    const { getCurrency } = this.state

    return this.wallets[getCurrency.toUpperCase()]
  }

  customWalletValid() {
    const { haveCurrency, getCurrency, customWallet } = this.state

    if (!this.customWalletAllowed()) {
      return true
    }

    // TODO: check for BTC address
    return util.typeforce.isCoinAddress.ETH(customWallet)
  }

  customWalletAllowed() {
    const { haveCurrency, getCurrency } = this.state

    if (haveCurrency !== 'btc') {
      return false
    }

    return config.erc20[getCurrency] !== undefined
  }

  render() {
    const { currencies, intl: { locale } } = this.props
    const { haveCurrency, getCurrency, isNonOffers, redirect, orderId, isSearching,
      isDeclinedOffer, isFetching, maxAmount, customWalletUse, customWallet, getUsd, haveUsd,
      maxBuyAmount, getAmount,
    } = this.state

    const oneCryptoCost = maxBuyAmount.isLessThanOrEqualTo(0) ? new BigNumber(0) :  maxBuyAmount.div(maxAmount)
    const linked = Link.all(this, 'haveAmount', 'getAmount', 'customWallet')

    if (redirect) {
      return <Redirect push to={`${localisedUrl(locale, links.swap)}/${getCurrency}-${haveCurrency}/${orderId}`} />
    }

    let canDoOrder = !isNonOffers
    if (!(Number(getAmount) > 0)) canDoOrder = false
    if (this.customWalletAllowed() && !this.customWalletValid()) canDoOrder = false

    return (
      <Fragment>
        <PageHeadline subTitle={suTitle} />
        <div styleName="section">
          <div styleName="blockVideo">
            <iframe
              title="swap online video"
              width="560"
              height="315"
              src="https://www.youtube-nocookie.com/embed/Jhrb7xOT_7s?controls=0"
              frameBorder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div styleName="block">
            <SelectGroup
              inputValueLink={linked.haveAmount.pipe(this.setAmount)}
              selectedValue={haveCurrency}
              onSelect={this.handleSetHaveValue}
              label={<FormattedMessage id="partial243" defaultMessage="You sell" />}
              id="partialClosure456"
              tooltip={<FormattedMessage id="partial462" defaultMessage="The amount you have in your swap.online wallet or external wallet that you want to exchange" />}
              placeholder="Enter amount"
              usd={(maxAmount > 0 && isNonOffers) ? 0 : haveUsd}
              currencies={currencies}
            />
            <p>
              <FormattedMessage id="partial221" defaultMessage="Max amount for offer: " />
              {maxAmount}{' '}{getCurrency.toUpperCase()}
            </p>
            <Flip onClick={this.handleFlipCurrency} styleName="flipButton" />
            <SelectGroup
              inputValueLink={linked.getAmount}
              selectedValue={getCurrency}
              onSelect={this.handleSetGetValue}
              label={<FormattedMessage id="partial255" defaultMessage="You get" />}
              id="partialClosure472"
              tooltip={<FormattedMessage id="partial478" defaultMessage="The amount you receive after the swap" />}
              disabled
              currencies={currencies}
              usd={getUsd}
            />
            {
              (isSearching || (isNonOffers && maxAmount === 0)) && (
                <span>
                  <FormattedMessage id="PartialPriceSearch" defaultMessage="Searching orders..." />
                  <div styleName="loaderHolder">
                    <InlineLoader />
                  </div>
                </span>
              )
            }
            { oneCryptoCost.isGreaterThan(0) && oneCryptoCost.isFinite() && (
              <div>
                <FormattedMessage id="PartialPriceSearch483" defaultMessage="Price: 1" />
                {getCurrency.toUpperCase()} = {oneCryptoCost.toFixed(5)} {haveCurrency.toUpperCase()}
              </div>
            )}
            { !oneCryptoCost.isFinite() && !isNonOffers && (
              <FormattedMessage id="PartialPriceCalc" defaultMessage="Calc price" />
            )}
            {maxAmount > 0 && isNonOffers && (
              <Fragment>
                <p styleName="error">
                  <FormattedMessage id="PartialPriceNoOrdersReduce" defaultMessage="No orders found, try to reduce the amount" />
                </p>
                <p styleName="error">
                  <FormattedMessage id="PartialPriceReduceMin" defaultMessage="Maximum available amount: " />
                  {maxAmount}{' '}{getCurrency.toUpperCase()}
                </p>
              </Fragment>
            )}
            {isDeclinedOffer && (
              <p styleName="error">
                {`Offer is declined`}
              </p>
            )}
            {
              isFetching && (
                <span>
                  <FormattedMessage id="partial291" defaultMessage="Wait participant: " />
                  <div styleName="loaderHolder">
                    <InlineLoader />
                  </div>
                </span>
              )
            }

            {
              this.customWalletAllowed() && (
                <Fragment>
                  <FieldLabel>
                    <strong>
                      <FormattedMessage id="PartialYourWalletAddress" defaultMessage="Your wallet address" />
                    </strong>
                    &nbsp;
                    <Tooltip id="PartialClosure">
                      <FormattedMessage id="PartialClosure" defaultMessage="Your wallet address to where cryptocurrency will be sent after the swap" />
                    </Tooltip >
                  </FieldLabel>
                  <div styleName="walletInput">
                    <Input required valueLink={linked.customWallet} pattern="0-9a-zA-Z" placeholder="Enter the address of ETH wallet" />
                  </div>
                  <div styleName="walletToggle">
                    <Toggle checked={customWalletUse} onChange={this.handleCustomWalletUse} />
                    <FormattedMessage id="PartialUseSwapOnlineWallet" defaultMessage="Use Swap.Online wallet" />
                  </div>
                </Fragment>
              )
            }
            <div styleName="rowBtn">
              <Button styleName="button" brand onClick={this.sendRequest} disabled={!canDoOrder}>
                <FormattedMessage id="partial541" defaultMessage="Exchange now" />
              </Button>
              <Button styleName="button" gray onClick={this.handlePush} >
                <FormattedMessage id="partial544" defaultMessage="Show order book" />
              </Button>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }
}
