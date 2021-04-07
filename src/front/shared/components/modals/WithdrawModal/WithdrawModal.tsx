import React, { Fragment } from 'react'
import cx from 'classnames'
import cssModules from 'react-css-modules'
import styles from './WithdrawModal.scss'

import actions from 'redux/actions'
import Link from 'local_modules/sw-valuelink'
import { connect } from 'redaction'
import typeforce from 'swap.app/util/typeforce'
import { BigNumber } from 'bignumber.js'
import { FormattedMessage, injectIntl, defineMessages } from 'react-intl'
import { isMobile } from 'react-device-detect'

import { inputReplaceCommaWithDot } from 'helpers/domUtils'
import { localisedUrl } from 'helpers/locale'
import minAmount from 'helpers/constants/minAmount'
import redirectTo from 'helpers/redirectTo'
import getCurrencyKey from 'helpers/getCurrencyKey'
import lsDataCache from 'helpers/lsDataCache'
import helpers, {
  constants,
  links,
  adminFee,
  feedback,
} from 'helpers'

import Modal from 'components/modal/Modal/Modal'
import FieldLabel from 'components/forms/FieldLabel/FieldLabel'
import Input from 'components/forms/Input/Input'
import Button from 'components/controls/Button/Button'
import Tooltip from 'components/ui/Tooltip/Tooltip'
import QrReader from 'components/QrReader'
import InvoiceInfoBlock from 'components/InvoiceInfoBlock/InvoiceInfoBlock'
import AdminFeeInfoBlock from 'components/AdminFeeInfoBlock/AdminFeeInfoBlock'
import CurrencyList from './components/CurrencyList'
import FeeInfoBlock from './components/FeeInfoBlock'

const isDark = localStorage.getItem(constants.localStorage.isDark)

type Currency = {
  addAssets: boolean
  fullTitle: string
  icon: string
  name: string
  title: string
  value: string
}

type WithdrawModalProps = {
  name: 'WithdrawModal'
  activeFiat: string
  activeCurrency: string
  dashboardView: boolean
  isBalanceFetching: boolean
  currencies: Currency[]

  intl: IUniversalObj
  history: IUniversalObj
  data: IUniversalObj
  tokenItems: IUniversalObj[]
  items: IUniversalObj[]

  portalUI?: any
}

type WithdrawModalState = {
  isShipped: boolean
  isEthToken: boolean
  fetchFee: boolean
  isInvoicePay?: boolean
  openScanCam: boolean

  address: string
  comment?: string
  ownTx: string
  selectedValue: string
  fiatAmount: string
  amount: string

  currentDecimals: number
  btcFeeRate: number | any
  txSize: null | number
  bitcoinFeeSpeedType: string
  bitcoinFees: null | {
      slow: number | any
      normal: number | any
      fast: number | any,
      custom: number
  }

  devError: IError | null
  ethWallet: IUniversalObj
  exCurrencyRate: BigNumber
  fees: {
    miner: BigNumber
    service: BigNumber
    total: BigNumber
    adminFeeSize: BigNumber
  }
  usedAdminFee: {
    address: string
    fee: number
    min: number
  }
  balances: {
    balance: BigNumber
    allowedCurrency: BigNumber
    allowedFiat: BigNumber
  }

  hiddenCoinsList: string[]
  currentActiveAsset: IUniversalObj
  allCurrencyies: IUniversalObj[]
  selectedItem: IUniversalObj
}

@connect(
  ({
    currencies,
    user: {
      ethData,
      btcData,
      ghostData,
      nextData,
      tokensData,
      activeFiat,
      isBalanceFetching,
      activeCurrency,
    },
    ui: { dashboardModalsAllowed },
  }) => ({
    activeFiat,
    activeCurrency,
    currencies: currencies.items,
    items: [ethData, btcData, ghostData, nextData],
    tokenItems: [...Object.keys(tokensData).map((k) => tokensData[k])],
    dashboardView: dashboardModalsAllowed,
    isBalanceFetching,
  })
)
@cssModules(styles, { allowMultiple: true })
class WithdrawModal extends React.Component<WithdrawModalProps, WithdrawModalState> {
  mounted = true
  btcFeeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(props) {
    super(props)

    const {
      items,
      data: {
        amount,
        toAddress,
        currency,
        address: withdrawWallet,
      },
    } = props

    const currentActiveAsset = props.data
    const currentDecimals = constants.tokenDecimals[getCurrencyKey(currency, true).toLowerCase()]
    const allCurrencyies = actions.core.getWallets({}) //items.concat(tokenItems)
    const selectedItem = actions.user.getWithdrawWallet(currency, withdrawWallet)
    const usedAdminFee = adminFee.isEnabled(selectedItem.currency)
    const infoAboutCurrency = currentActiveAsset.infoAboutCurrency
    const isEthToken = helpers.ethToken.isEthToken({ name: currency.toLowerCase() })
    const exCurrencyRate = infoAboutCurrency && infoAboutCurrency.price_fiat
      ? new BigNumber(currentActiveAsset.infoAboutCurrency.price_fiat)
      : new BigNumber(0)
    // save ethereum wallet for token exchange's rate
    const arrWithEthWallet = items.filter(item => {
      return item.currency.toLowerCase() === 'eth'
        && item.infoAboutCurrency
        && item.infoAboutCurrency.price_fiat
    })
    const ethWallet = arrWithEthWallet[0] || {}

    this.state = {
      isShipped: false,
      usedAdminFee,
      openScanCam: false,
      address: toAddress ? toAddress : '',
      fiatAmount: '',
      amount: '',
      selectedItem,
      isEthToken,
      currentDecimals,
      selectedValue: currency,
      ownTx: '',
      hiddenCoinsList: actions.core.getHiddenCoins(),
      currentActiveAsset,
      ethWallet,
      exCurrencyRate,
      allCurrencyies,
      devError: null,
      bitcoinFees: {
        slow: 5 * 1024,
        normal: 15 * 1024,
        fast: 30 * 1024,
        custom: 50 * 1024
      },
      bitcoinFeeSpeedType: '',
      fees: {
        miner: new BigNumber(0),
        service: new BigNumber(0),
        total: new BigNumber(0),
        adminFeeSize: new BigNumber(0),
      },
      balances: {
        balance: new BigNumber(selectedItem.balance || 0),
        allowedCurrency: new BigNumber(0),
        allowedFiat: new BigNumber(0),
      },
      btcFeeRate: null,
      fetchFee: true,
      txSize: null,
      isInvoicePay: !!(currentActiveAsset.invoice),
    }
  }

  componentWillUnmount() {
    this.mounted = false
    clearTimeout(this.btcFeeTimer)
  }

  componentDidMount() {
    this.setCommissions()
    feedback.withdraw.entered()
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      data: prevData,
      items: prevItems,
    } = prevProps
    const {
      data,
      items,
    } = this.props
    const {
      amount: prevAmount,
      fiatAmount: prevFiatAmount,
    } = prevState
    const {
      amount,
      fiatAmount,
    } = this.state

    if (prevData !== data || prevItems !== items) {
      this.setCurrenctActiveAsset()
    }
    if (prevAmount !== amount || prevFiatAmount !== fiatAmount) {
      this.updateServiceAndTotalFee()
    }
  }

  reportError = (error: IError, details: string = '-') => {
    feedback.withdraw.failed(`details(${details}) : error message(${error.message})`)
    console.error(`Withdraw. details(${details}) : error(${JSON.stringify(error)})`)
    this.setState({
      devError: {
        name: error.name || 'Error',
        message: error.message || '-',
      },
    })
  }

  setCurrenctActiveAsset = () => {
    const { items, tokenItems, data } = this.props
    const allCurrencyies = items.concat(tokenItems)
    this.setState({
      currentActiveAsset: data,
      allCurrencyies,
    })
  }

  setBtcFeeRate = async () => {
    const {
      address: toAddress,
      selectedItem: {
        address,
        isUserProtected,
        isSmsProtected,
        isPinProtected,
      },
      currentDecimals,
      amount,
    } = this.state

    let method = `send`
    if (isUserProtected) method = `send_multisig`
    if (isSmsProtected || isPinProtected) method = `send_2fa`

    const numAmount = Number(amount) || 0

    try {
      const { txSize } = await helpers.btc.estimateFeeValue({
        method,
        speed: 'fast',
        address,
        toAddress,
        amount: numAmount,
        moreInfo: true,
      })

      const bitcoinFeesRate = await helpers.btc.getFeesRateBlockcypher();
      const feeInByte = new BigNumber(bitcoinFeesRate.fast).div(1024).dp(0, BigNumber.ROUND_HALF_EVEN);
      const fee = feeInByte.multipliedBy(txSize).multipliedBy(1e-8);
      if (!this.mounted) return
      this.setState((state) => ({
        bitcoinFeeSpeedType: 'fast',
        bitcoinFees: bitcoinFeesRate,
        btcFeeRate: feeInByte.toNumber(),
        txSize,
        fees: {
          ...state.fees,
          miner: fee,
          total: state.fees.service.plus(fee).dp(currentDecimals, BigNumber.ROUND_CEIL),
        },
      }))
    } catch (error) {
      this.reportError(error)
    }
  }

  setBitcoinFeeRate = (speedType: string, customValue?: number) => {
    const { bitcoinFees, txSize, currentDecimals } = this.state;

    let feeInByte = speedType === 'custom' ?
      new BigNumber(customValue) :
      new BigNumber(bitcoinFees[speedType]).div(1024).dp(0, BigNumber.ROUND_HALF_EVEN);

    let fee = feeInByte.multipliedBy(txSize).multipliedBy(1e-8);

    this.setState((state) => ({
      bitcoinFeeSpeedType: speedType,
      btcFeeRate: feeInByte.toNumber(),
      fees: {
        ...state.fees,
        miner: fee,
        total: state.fees.service.plus(fee).dp(currentDecimals, BigNumber.ROUND_CEIL),
      }
    }))
    this.setAlowedBalances()
  }

  setCommissions = async () => {
    const {
      data: { currency },
    } = this.props
    const {
      isEthToken,
      selectedItem,
      usedAdminFee,
      amount,
      currentDecimals,
    } = this.state

    const currentCoin = getCurrencyKey(currency, true).toLowerCase()
    const adminFeeSize = usedAdminFee ? adminFee.calc(currency, amount) : 0
    let newMinerFee = new BigNumber(0)

    if (!this.mounted) return
    this.setState({ fetchFee: true })

    try {
      if (isEthToken) {
        // if decimals < 7 then equal 0.0...1
        // if decimals >= 7 then equal 1e-<decimals>
        minAmount[currentCoin] = 10 ** -currentDecimals
        minAmount.eth = await helpers.eth.estimateFeeValue({
          method: 'send',
          speed: 'fast',
        })

        newMinerFee = new BigNumber(await helpers.ethToken.estimateFeeValue({
          method: 'send',
          speed: 'fast',
        }))
      } else if (constants.coinsWithDynamicFee.includes(currentCoin)) {
        let method = 'send'
        if (selectedItem.isUserProtected) method = 'send_multisig'
        if (selectedItem.isPinProtected || selectedItem.isSmsProtected) method = 'send_2fa'

        newMinerFee = new BigNumber(await helpers[currentCoin].estimateFeeValue({
          method,
          speed: 'fast',
          address: selectedItem.address,
          amount,
        }))

        minAmount[currentCoin] = newMinerFee.toNumber()

        if (selectedItem.isBTC) {
          this.setBtcFeeRate()
        }
      }

      this.setState((state) => ({
        fees: {
          ...state.fees,
          miner: newMinerFee,
          service: new BigNumber(adminFeeSize).dp(currentDecimals, BigNumber.ROUND_CEIL),
          total: newMinerFee.plus(adminFeeSize).dp(currentDecimals, BigNumber.ROUND_CEIL),
          adminFeeSize: new BigNumber(adminFeeSize),
        },
      }))
      this.setAlowedBalances()
    } catch (error) {
      this.reportError(error)
    } finally {
      this.setState({ fetchFee: false })
    }
  }

  handleSubmit = async () => {
    feedback.withdraw.started()

    const {
      address: to,
      amount,
      ownTx,
      fees,
      selectedItem,
      isEthToken,
      comment = '',
      selectedItem: {
        isBTC,
      },
    } = this.state

    const {
      data: { currency, address, invoice, onReady },
      name,
    } = this.props

    this.setState(() => ({
      isShipped: true,
      devError: null,
    }))

    let sendOptions = {
      from: address,
      to,
      amount,
      speed: 'fast',
      name: isEthToken ? currency.toLowerCase() : '',
      feeValue: isBTC && fees.miner,
    }

    // ? is it need ?
    // Опрашиваем балансы отправителя и получателя на момент выполнения транзакции
    // Нужно для расчета final balance получателя и отправителя
    let beforeBalances = false
    // try {
    //   // beforeBalances = await helpers.transactions.getTxBalances(currency, address, to)
    // } catch (error) {
    //   this.reportError(error, 'Fail fetch balances - may be destination is segwit')
    // }

    if (invoice && ownTx) {
      await actions.invoices.markInvoice(invoice.id, 'ready', ownTx, address)
      actions.loader.hide()
      actions.notifications.show(constants.notifications.SuccessWithdraw, {
        amount,
        currency,
        address: to,
      })
      this.setState(() => ({ isShipped: false }))
      actions.modals.close(name)
      if (onReady instanceof Function) {
        onReady()
      }
      return
    }

    if (selectedItem.isPinProtected || selectedItem.isSmsProtected || selectedItem.isUserProtected) {
      let nextStepModal = constants.modals.WithdrawBtcPin
      if (selectedItem.isSmsProtected) nextStepModal = constants.modals.WithdrawBtcSms
      if (selectedItem.isUserProtected) nextStepModal = constants.modals.WithdrawBtcMultisig

      actions.modals.close(name)
      actions.modals.open(nextStepModal, {
        wallet: selectedItem,
        invoice,
        sendOptions,
        beforeBalances,
        onReady,
        adminFee: fees.adminFeeSize,
      })
      return
    }

    await actions[currency.toLowerCase()]
      .send(sendOptions)
      .then(async (txRaw) => {
        actions.loader.hide()
        actions[currency.toLowerCase()].getBalance(currency)
        if (invoice) {
          await actions.invoices.markInvoice(invoice.id, 'ready', txRaw, address)
        }

        this.setState({
          isShipped: false
        })

        if (onReady instanceof Function) {
          onReady()
        }

        // Redirect to tx
        const txInfo = helpers.transactions.getInfo(currency.toLowerCase(), txRaw)
        const { tx: txId } = txInfo

        // Не используем await. Сбрасываем статистику по транзакции (final balance)
        // Без блокировки клиента
        // Результат и успешность запроса критического значения не имеют
        helpers.transactions.pullTxBalances(txId, amount, beforeBalances, adminFee)

        // Сохраняем транзакцию в кеш
        const txInfoCache = {
          amount,
          senderAddress: address,
          receiverAddress: to,
          confirmed: false,
          adminFee: fees.adminFeeSize,
        }

        lsDataCache.push({
          key: `TxInfo_${currency.toLowerCase()}_${txId}`,
          time: 3600,
          data: txInfoCache,
        })
        feedback.withdraw.finished()

        if (comment) {
          actions.comments.setComment({
            key: txId,
            comment: comment
          })
        }

        const txInfoUrl = helpers.transactions.getTxRouter(currency.toLowerCase(), txId)
        redirectTo(txInfoUrl)
      })
      .then(() => {
        actions.modals.close(name)
      })
      .catch((error) => {
        const { selectedItem } = this.state
        const errorText = error.res ? error.res.text : ''
        const customError = {
          name: {
            id: 'Withdraw218',
            defaultMessage: 'Withdrawal error',
          },
          message: {
            id: 'ErrorNotification12',
            defaultMessage: 'Oops, looks like something went wrong!',
          },
        }

        if (/insufficient priority|bad-txns-inputs-duplicate/.test(errorText)) {
          customError.message = {
            id: 'Withdraw232',
            defaultMessage: 'There is not enough confirmation of the last transaction. Try later.',
          }
        }

        this.reportError(error, `selected item: ${selectedItem.fullName} | custom message: ${customError.message.defaultMessage}`)
        this.setState(() => ({
          isShipped: false,
        }))
      })
  }

  addressIsCorrect() {
    const {
      data: { currency },
    } = this.props
    const { address, isEthToken } = this.state

    if (getCurrencyKey(currency, false).toLowerCase() === `btc`) {
      if (!typeforce.isCoinAddress.BTC(address)) {
        return actions.btc.addressIsCorrect(address)
      }
      return true
    }

    if (isEthToken) {
      return typeforce.isCoinAddress.ETH(address)
    }

    return typeforce.isCoinAddress[getCurrencyKey(currency, false).toUpperCase()](address)
  }

  openScan = () => {
    const { openScanCam } = this.state

    this.setState(() => ({
      openScanCam: !openScanCam,
    }))
  }

  handleScan = (data) => {
    if (data) {
      const address = data.split(':')[1].split('?')[0]
      const amount = data.split('=')[1]

      this.setState(() => ({ address, amount }))
      this.openScan()
    }
  }
  // (value: any) => void' is not assignable to parameter of type Transform<string>
  handleAmount = (value): any => {
    const {
      currentActiveAsset,
      currentDecimals,
      exCurrencyRate,
      selectedValue,
      selectedItem: {
        isBTC,
      },
    } = this.state

    if (isBTC) {
      clearTimeout(this.btcFeeTimer)
      this.btcFeeTimer = setTimeout(() => {
        this.setBtcFeeRate()
      }, 2000)
    }

    const hasExCurrencyRate = exCurrencyRate.isGreaterThan(0)

    if (selectedValue === currentActiveAsset.currency) {
      this.setState({
        fiatAmount: value && hasExCurrencyRate
          ? exCurrencyRate.times(value).dp(2, BigNumber.ROUND_CEIL).toString()
          : '',
        amount: value,
      })
    } else {
      this.setState({
        fiatAmount: value,
        amount: value && hasExCurrencyRate
          ? new BigNumber(value).div(exCurrencyRate).dp(currentDecimals).toString()
          : '',
      })
    }
  }

  handleClose = () => {
    const {
      history,
      intl: { locale },
    } = this.props
    const { name } = this.props

    history.push(localisedUrl(locale, links.home))
    actions.modals.close(name)
  }

  handleBuyCurrencySelect = (value) => {
    this.setState({
      selectedValue: value,
    })
  }

  setAlowedBalances = () => {
    const {
      isEthToken,
      usedAdminFee,
      currentDecimals,
      exCurrencyRate,
      balances,
      fees,
    } = this.state

    const ONE_HUNDRED_PERCENT = 100
    const minerFee = isEthToken ? new BigNumber(0) : fees.miner
    const maxService = usedAdminFee
        ? new BigNumber(usedAdminFee.fee).dividedBy(ONE_HUNDRED_PERCENT).multipliedBy(balances.balance)
        : new BigNumber(0)
    const maxAmount = balances.balance.minus(minerFee).minus(maxService).dp(currentDecimals, BigNumber.ROUND_CEIL)
    const maxFiatAmount = maxAmount.multipliedBy(exCurrencyRate).dp(2, BigNumber.ROUND_CEIL)

    if (maxAmount.isGreaterThan(balances.balance) || maxAmount.isLessThanOrEqualTo(0)) {
      this.setState((state) => ({
        balances: {
          ...state.balances,
          allowedCurrency: new BigNumber(0),
          allowedFiat: new BigNumber(0),
        },
      }))
    } else {
      this.setState((state) => ({
        balances: {
          ...state.balances,
          allowedCurrency: maxAmount,
          allowedFiat: maxFiatAmount,
        },
      }))
    }
  }

  setMaxBalance = () => {
    const { balances } = this.state

    this.setState({
      amount: balances.allowedCurrency.toString(),
      fiatAmount: balances.allowedFiat.toString(),
    })
  }

  updateServiceAndTotalFee = () => {
    const { usedAdminFee, amount, fees, currentDecimals } = this.state
    const ONE_HUNDRED_PERCENT = 100

    let newServiceFeeSize = usedAdminFee
      ? new BigNumber(usedAdminFee.fee).dividedBy(ONE_HUNDRED_PERCENT).multipliedBy(amount)
      : new BigNumber(0)

    newServiceFeeSize = new BigNumber(amount).isGreaterThan(0)
      && newServiceFeeSize.isGreaterThan(fees.adminFeeSize)
        ? newServiceFeeSize
        : fees.adminFeeSize

    this.setState((state) => ({
      fees: {
        ...state.fees,
        service: newServiceFeeSize.dp(currentDecimals, BigNumber.ROUND_CEIL),
        total: fees.miner.plus(newServiceFeeSize).dp(currentDecimals, BigNumber.ROUND_CEIL),
      },
    }))
  }

  amountInputKeyDownCallback = (event) => {
    const { currentDecimals, currentActiveAsset, selectedValue } = this.state
    // key codes
    const BACKSPACE = 8
    const LEFT_ARROW = 37
    const RIGHT_ARROW = 39
    const DELETE = 46
    const isNumber = +event.key >= 0 && +event.key <= 9
    const amountValue = event.target.value

    if (event.key === ',') {
      inputReplaceCommaWithDot(event)
    }

    if (
      !(isNumber ||
        event.keyCode === BACKSPACE ||
        event.keyCode === LEFT_ARROW ||
        event.keyCode === RIGHT_ARROW ||
        event.keyCode === DELETE ||
        event.key === '.' ||
        event.key === ','
      )
    ) {
      event.preventDefault()
    } else if (amountValue.includes('.')) {
      // block number input if quantity decimal places
      // more than allowed (crypto: currentDecimals | fiat: 2)
      const maxQuantityDecimals = selectedValue === currentActiveAsset.currency
        ? amountValue.split('.')[1].length === currentDecimals
        : amountValue.split('.')[1].length === 2

      maxQuantityDecimals && isNumber && event.preventDefault()
    }
  }

  render() {
    const {
      ownTx,
      amount,
      address,
      balances,
      ethWallet,
      isShipped,
      fiatAmount,
      isEthToken,
      openScanCam,
      exCurrencyRate,
      currentDecimals,
      hiddenCoinsList,
      currentActiveAsset,
      selectedValue,
      usedAdminFee,
      devError,
      fees,
      fetchFee,
      txSize,
      bitcoinFeeSpeedType,
      bitcoinFees,
      btcFeeRate,
      selectedItem: {
        isBTC: isBTCWallet,
      },
    } = this.state

    const { name, intl, portalUI, activeFiat, dashboardView } = this.props
    const linked = Link.all(this, 'address', 'amount', 'ownTx', 'fiatAmount', 'comment')

    const {
      currency,
      address: currentAddress,
      balance: currentBalance,
      invoice,
    } = currentActiveAsset

    let tableRows = actions.core.getWallets({}).filter(({ currency, address, balance }) => {
      // @ToDo - В будущем нужно убрать проверку только по типу монеты.
      // Старую проверку оставил, чтобы у старых пользователей не вывалились скрытые кошельки

      return (
        (!hiddenCoinsList.includes(currency) &&
          !hiddenCoinsList.includes(`${currency}:${address}`)) ||
        balance > 0
      )
    })

    const activeCriptoCurrency = getCurrencyKey(currentActiveAsset.currency, true).toUpperCase()
    const selectedValueView = getCurrencyKey(selectedValue, true).toUpperCase()
    const criptoCurrencyHaveInfoPrice = returnHaveInfoPrice();
    const ethBalanceLessThanMiner = new BigNumber(ethWallet.balance).isLessThan(fees.miner)
    const exEthereumRate = new BigNumber(ethWallet.infoAboutCurrency.price_fiat || 0)

    function returnHaveInfoPrice(): boolean {
      let result = true

      tableRows.forEach(item => {
        if (item.currency === activeCriptoCurrency) {
          result = item.infoAboutCurrency && item.infoAboutCurrency.price_fiat
        }
      })

      return result
    }

    const isDisabled =
      !address ||
      !+amount ||
      isShipped ||
      !!ownTx ||
      !this.addressIsCorrect() ||
      isEthToken && ethBalanceLessThanMiner ||
      new BigNumber(amount).isGreaterThan(balances.balance) ||
      new BigNumber(amount).dp() > currentDecimals


    const labels = defineMessages({
      withdrowModal: {
        id: 'withdrowTitle271',
        defaultMessage: `Send`,
      },
      balanceFiatMobile: {
        id: 'Withdraw_FiatBalanceMobile',
        defaultMessage: '~{amount} {currency}',
      },
      balanceFiatDesktop: {
        id: 'Withdraw_FiatBalanceDesktop',
        defaultMessage: 'это ~{amount} {currency}',
      },
      balanceMobile: {
        id: 'Withdraw_BalanceMobile',
        defaultMessage: '{amount} {currency}',
      },
      balanceDesktop: {
        id: 'Withdraw_BalanceDesktop',
        defaultMessage: '{amount} {currency} will be send',
      },
      ownTxPlaceholder: {
        id: 'withdrawOwnTxPlaceholder',
        defaultMessage: 'If paid from another source',
      },
    })

    const dataCurrency = isEthToken ? 'ETH' : currency.toUpperCase()

    const formRender = (
      <Fragment>
        {openScanCam && (
          <QrReader
            openScan={this.openScan}
            handleError={this.reportError}
            handleScan={this.handleScan}
          />
        )}
        {invoice && <InvoiceInfoBlock invoiceData={invoice} />}
        {!dashboardView && (
          <p styleName={isEthToken ? 'rednotes' : 'notice'}>
            <FormattedMessage
              id="Withdrow213"
              defaultMessage="Please note: Fee is {minAmount} {data}.{br}Your balance must exceed this sum to perform transaction"
              values={{
                minAmount: <span>{isEthToken ? minAmount.eth : fees.total.toNumber()}</span>,
                br: <br />,
                data: `${dataCurrency}`,
              }}
            />
          </p>
        )}

        <div style={{ marginBottom: '40px' }}>
          <div styleName="customSelectContainer">
            <FieldLabel>
              <FormattedMessage id="Withdrow559" defaultMessage="Send from wallet " />
            </FieldLabel>
            <CurrencyList
              {...this.props}
              currentActiveAsset={currentActiveAsset}
              currentBalance={currentBalance}
              currency={currency}
              exCurrencyRate={exCurrencyRate.toNumber()}
              activeFiat={activeFiat}
              tableRows={tableRows}
              currentAddress={currentAddress}
            />
          </div>
        </div>
        <div styleName="highLevel">
          <FieldLabel>
            <FormattedMessage id="Withdrow1194" defaultMessage="Address " />{' '}
            <Tooltip id="WtH203">
              <div style={{ textAlign: 'center' }}>
                <FormattedMessage
                  id="WTH275"
                  defaultMessage="Make sure the wallet you{br}are sending the funds to supports {currency}"
                  values={{
                    br: <br />,
                    currency: `${currency.toUpperCase()}`,
                  }}
                />
              </div>
            </Tooltip>
          </FieldLabel>
          <Input
            valueLink={linked.address}
            focusOnInit
            pattern="0-9a-zA-Z:"
            placeholder={`Enter ${currency.toUpperCase()} address to transfer`}
            qr={isMobile}
            openScan={this.openScan}
          />
          {/* show invalid value warning in address input */}
          {address && !this.addressIsCorrect() && (
            <div styleName="rednote bottom0">
              <FormattedMessage
                id="WithdrawIncorectAddress"
                defaultMessage="Your address not correct"
              />
            </div>
          )}
        </div>
        <div styleName={`lowLevel ${isDark ? 'dark' : ''}`} style={{ marginBottom: '30px' }}>
          {/* why style ? see tip for max button */}
          <div style={usedAdminFee ? { right: '20px' } : null} styleName="additionalСurrencies">
            {criptoCurrencyHaveInfoPrice && <>
                <span
                  styleName={cx('additionalСurrenciesItem', {
                    additionalСurrenciesItemActive: selectedValue.toUpperCase() === activeFiat,
                  })}
                  onClick={() => this.handleBuyCurrencySelect(activeFiat)}
                >
                  {activeFiat}
                </span>
                <span styleName="delimiter"></span>
              </>
            }
            <span
              styleName={cx('additionalСurrenciesItem', {
                additionalСurrenciesItemActive:
                  selectedValueView === activeCriptoCurrency,
              })}
              onClick={() => this.handleBuyCurrencySelect(currentActiveAsset.currency)}
            >
              {activeCriptoCurrency}
            </span>
          </div>
          {/* why style ? see tip for max button */}
          <p style={usedAdminFee ? { right: '10px' } : null} styleName='balance'>
            {new BigNumber(amount).isGreaterThan(0) && criptoCurrencyHaveInfoPrice && (
              <FormattedMessage
                {...labels[
                  selectedValue !== activeFiat
                    ? isMobile
                      ? `balanceFiatMobile`
                      : `balanceFiatDesktop`
                    : isMobile
                    ? `balanceMobile`
                    : `balanceDesktop`
                ]}
                values={{
                  amount: selectedValue !== activeFiat
                    ? new BigNumber(fiatAmount).dp(2, BigNumber.ROUND_CEIL).toNumber()
                    : new BigNumber(amount).dp(6, BigNumber.ROUND_CEIL).toNumber(),
                  currency: selectedValue !== activeFiat ? activeFiat : activeCriptoCurrency.toUpperCase(),
                }}
              />
            )}
          </p>

          <FieldLabel>
            <FormattedMessage id="Withdrow118" defaultMessage="Amount" />
          </FieldLabel>
          <div styleName="group">
            <Input
              pattern="0-9\."
              onKeyDown={this.amountInputKeyDownCallback}
              valueLink={selectedValue === currentActiveAsset.currency
                ? linked.amount.pipe(this.handleAmount)
                : linked.fiatAmount.pipe(this.handleAmount)
              }
            />
            {/*
            with service commission we can't send all balance (there is a remainder)
            so we disable this button
            */}
            {!usedAdminFee &&
              <>
                <div style={{ marginLeft: '15px' }}>
                  <Button disabled={fetchFee} blue big onClick={this.setMaxBalance} id="Withdrow134">
                    <FormattedMessage id="Select210" defaultMessage="MAX" />
                  </Button>
                </div>
                {!isMobile && (
                  <Tooltip id="Withdrow134" place="top" mark={false}>
                    <FormattedMessage
                      id="WithdrawButton32"
                      defaultMessage="When you click this button, in the field, an amount{br}equal to your balance minus the miners commission will appear"
                      values={{
                        br: <br />,
                      }}
                    />
                  </Tooltip>
                )}
              </>
            }
          </div>
          {/* hint for amount value */}
          {dashboardView && (
            <div styleName={`prompt ${fetchFee ? 'hide' : ''}`}>
              {isEthToken && ethBalanceLessThanMiner
                ? (
                    <FormattedMessage
                      id="WithdrowBalanceNotEnoughtEthereumBalancePrompt"
                      defaultMessage="Not enough ethereum balance for miner fee"
                    />
                  )
                : balances.allowedCurrency.isEqualTo(0) ?
                  (
                    <FormattedMessage
                      id="WithdrowBalanceNotEnoughtPrompt"
                      defaultMessage="Not enough balance to send"
                    />
                  ) : (
                    <FormattedMessage
                      id="Withdrow170"
                      defaultMessage="Maximum amount you can send is {allowedBalance} {currency}"
                      values={{
                        allowedBalance: selectedValue === currentActiveAsset.currency
                          ? balances.allowedCurrency.toNumber()
                          : balances.allowedFiat.toNumber(),
                        currency: selectedValue === currentActiveAsset.currency
                          ? activeCriptoCurrency
                          : activeFiat,
                      }}
                    />
                  )
              }{' '}
              <Tooltip id="WtH204">
                <div style={{ maxWidth: '24em', textAlign: 'center' }}>
                  <FormattedMessage
                    id="WTH276"
                    defaultMessage="The amount should not exceed your{br} current balance minus mining fee"
                    values={{
                      br: <br />,
                    }}
                  />
                </div>
              </Tooltip>
            </div>
          )}
        </div>
        <div styleName="commentFormWrapper" >
          <FieldLabel>
            <FormattedMessage id="Comment" defaultMessage="Comment" />
          </FieldLabel>
          <div styleName="group">
            <Input
              valueLink={linked.comment}
              placeholder={
                intl.formatMessage({
                  id: 'Comment',
                  defaultMessage: 'Comment',
                })
              }
            />
          </div>
        </div>
        <div styleName="sendBtnsWrapper">
          <div styleName="actionBtn">
            <Button big fill gray onClick={this.handleClose}>
              <Fragment>
                <FormattedMessage id="WithdrawModalCancelBtn" defaultMessage="Cancel" />
              </Fragment>
            </Button>
          </div>
          <div styleName="actionBtn">
            <Button blue big fill disabled={isDisabled} onClick={this.handleSubmit}>
              {isShipped ? (
                <Fragment>
                  <FormattedMessage id="WithdrawModal11212" defaultMessage="Processing ..." />
                </Fragment>
              ) : (
                <Fragment>
                  <FormattedMessage id="WithdrawModal111" defaultMessage="Send" />{' '}
                  {`${currency.toUpperCase()}`}
                </Fragment>
              )}
            </Button>
          </div>
        </div>
        {usedAdminFee && isEthToken && (
          <AdminFeeInfoBlock {...usedAdminFee} currency={currency} />
        )}
        {invoice && (
          <Fragment>
            <hr />
            <div styleName="lowLevel" style={{ marginBottom: '50px' }}>
              <div styleName="groupField">
                <div styleName="downLabel">
                  <FieldLabel inRow>
                    <span styleName="mobileFont">
                      <FormattedMessage id="WithdrowOwnTX" defaultMessage="Или укажите TX" />
                    </span>
                  </FieldLabel>
                </div>
              </div>
              <div styleName="group">
                <Input
                  styleName="input"
                  valueLink={linked.ownTx}
                  placeholder={`${intl.formatMessage(labels.ownTxPlaceholder)}`}
                />
              </div>
            </div>
            <Button
              styleName="buttonFull"
              blue
              big
              fullWidth
              disabled={!ownTx || isShipped}
              onClick={this.handleSubmit}
            >
              {isShipped ? (
                <Fragment>
                  <FormattedMessage id="WithdrawModal11212" defaultMessage="Processing ..." />
                </Fragment>
              ) : (
                <FormattedMessage
                  id="WithdrawModalInvoiceSaveTx"
                  defaultMessage="Отметить как оплаченный"
                />
              )}
            </Button>
          </Fragment>
        )}
        {dashboardView && (
          <>
            <div style={{ paddingTop: '2em' }}>
              <FeeInfoBlock
                isEthToken={isEthToken}
                currency={currency}
                currentDecimals={currentDecimals}
                activeFiat={activeFiat}
                dataCurrency={dataCurrency}
                exEthereumRate={exEthereumRate}
                exCurrencyRate={exCurrencyRate}
                feeCurrentCurrency={btcFeeRate}
                isLoading={fetchFee}
                usedAdminFee={usedAdminFee}
                hasTxSize={isBTCWallet}
                txSize={txSize}
                bitcoinFees={bitcoinFees}
                bitcoinFeeSpeedType={bitcoinFeeSpeedType}
                setBitcoinFee={this.setBitcoinFeeRate}
                minerFee={fees.miner}
                serviceFee={fees.service}
                totalFee={fees.total}
              />
            </div>
            {devError && (
                <div styleName="errorBlock">
                  <p>
                    Error name: {devError.name}<br />
                    Message: {devError.message}
                  </p>
                </div>
              )
            }
          </>
        )}
      </Fragment>
    )
    return portalUI ? (
      formRender
    ) : (
      <Modal
        name={name}
        onClose={this.handleClose}
        title={`${intl.formatMessage(labels.withdrowModal)}${' '}${currency.toUpperCase()}`}
      >
        <div style={{ paddingBottom: '50px', paddingTop: '15px' }}>{formRender}</div>
      </Modal>
    )
  }
}

export default injectIntl(WithdrawModal)
