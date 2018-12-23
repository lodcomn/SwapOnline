import React, { Component } from 'react'

import { connect } from 'redaction'
import actions from 'redux/actions'
import { Link, withRouter } from 'react-router-dom'

import { links, constants } from 'helpers'

import CSSModules from 'react-css-modules'
import styles from './CurrencyWallet.scss'

import Row from 'pages/History/Row/Row'
import SwapsHistory from 'pages/History/SwapsHistory/SwapsHistory'

import Table from 'components/tables/Table/Table'
import { Button } from 'components/controls'
import PageHeadline from 'components/PageHeadline/PageHeadline'
import PageSeo from 'components/Seo/PageSeo'
import { getSeoPage } from 'helpers/seo'
import { FormattedMessage, injectIntl } from 'react-intl'
import ReactTooltip from 'react-tooltip'
import CurrencyButton from 'components/controls/CurrencyButton/CurrencyButton'
import { localisedUrl } from 'helpers/locale'


const titles = [
  <FormattedMessage id="currencyWallet27"  defaultMessage="Coin" />,
  <FormattedMessage id="currencyWallet28"  defaultMessage="Status" />,
  <FormattedMessage id="currencyWallet29"  defaultMessage="Statement" />,
  <FormattedMessage id="currencyWallet30"  defaultMessage="Amount" />,
]

@connect(({ core, user,  history: { transactions, swapHistory },
  user: { ethData, btcData, ltcData, tokensData, eosData, nimData, usdtData, telosData } }) => ({
  items: [ ethData, btcData, eosData, usdtData, ltcData, telosData, ...Object.keys(tokensData).map(k => (tokensData[k])) /* nimData */ ],
  user,
  hiddenCoinsList: core.hiddenCoinsList,
  txHistory: transactions,
  swapHistory,
}))

@injectIntl
@withRouter
@CSSModules(styles)
export default class CurrencyWallet extends Component {

  static getDerivedStateFromProps(nextProps) {
    let { match:{ params: { fullName } }, items } = nextProps
    const itemCurrency = items.filter(item => item.fullName.toLowerCase() === fullName.toLowerCase())[0]
    const {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
    } = itemCurrency

    return {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
      isBalanceEmpty: balance === 0,
    }
  }

  constructor({ user, match: { params: { fullName } }, items, history }) {
    super()
    this.state = {
      name: null,
      address: null,
      balance: null,
      isBalanceEmpty: false,
    }

    const item = items.map(item => item.fullName.toLowerCase())

    if (!item.includes(fullName.toLowerCase())) {
      return  window.location.href = '/NotFound'
    }
  }




  handleReceive = () => {
    const { currency, address } = this.state

    actions.modals.open(constants.modals.ReceiveModal, {
      currency,
      address,
    })
  }

  handleWithdraw = () => {
    let { match:{ params: { fullName } }, items } = this.props
    const {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
      isBalanceEmpty,
    } = this.state

    actions.analytics.dataEvent(`balances-withdraw-${currency.toLowerCase()}`)
    actions.modals.open(constants.modals.Withdraw, {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
    })
  }
  handleGoTrade = (currency) => {
    const { intl: { locale } } = this.props
    this.props.history.push(localisedUrl(locale, `/${currency.toLowerCase()}`))
  }

  handleEosBuyAccount = async () => {
    actions.modals.open(constants.modals.EosBuyAccount)
  }

  render() {

    let { swapHistory, txHistory, location, match:{ params: { fullName } },  intl } = this.props
    const {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
      isBalanceEmpty,
    } = this.state

    txHistory = txHistory
      .filter(tx => tx.type === currency.toLowerCase())

    swapHistory = Object.keys(swapHistory)
      .map(key => swapHistory[key])
      .filter(swap => swap.sellCurrency === currency || swap.buyCurrency === currency)

    const seoPage = getSeoPage(location.pathname)
    const eosAccountActivated = localStorage.getItem(constants.localStorage.eosAccountActivated) === "true"

    return (
      <div className="root">
        <PageSeo
          location={location}
          defaultTitle={intl.formatMessage({ id: 'CurrencyWalletMetaTitle' }, { fullName, currency  })}
          defaultDescription={intl.formatMessage({ id: 'CurrencyWalletMetaDescription' }, { fullName, currency  })} />
        <PageHeadline
          styleName="title"
          subTitle={!!seoPage
            ? seoPage.h1
            : <FormattedMessage
              id="CurrencyWallet141"
              defaultMessage={`Swap.Online - {fullName}({currency}) Web Wallet with Atomic Swap.`}
              values={{
                fullName:`${fullName}`,
                currency: `${currency}`,
              }}
            />}
        />
        <h3 styleName="subtitle">
          <FormattedMessage
            id="CurrencyWallet168"
            defaultMessage={`Your address: {address}{br}Your {fullName} balance: {balance} {currency}`}
            values={{
              address:  <span>{address}</span>,
              br: <br />,
              fullName: `${fullName}`,
              balance: `${balance}`,
              currency: `${currency.toUpperCase()}`,
            }}
          />
        </h3>
        {currency === 'EOS' && !eosAccountActivated && (<Button onClick={this.handleEosBuyAccount} gray>
          <FormattedMessage id="CurrencyWallet105" defaultMessage="Activate account" />
        </Button>)}
        <div styleName="inRow">
          <CurrencyButton
            onClick={this.handleReceive}
            dataTooltip={{
              id: `deposit${currency}`,
              deposit: 'true',
            }}
          >
            <FormattedMessage id="Row313" defaultMessage="Deposit" />
          </CurrencyButton>
          <CurrencyButton
            onClick={this.handleWithdraw}
            disable={isBalanceEmpty}
            dataTooltip={{
              id: `send${currency}`,
              isActive: isBalanceEmpty,
            }}
          >
            <FormattedMessage id="CurrencyWallet100" defaultMessage="Send" />
          </CurrencyButton>
          <Button gray onClick={() => this.handleGoTrade(currency)}>
            <FormattedMessage id="CurrencyWallet104" defaultMessage="Exchange" />
          </Button>
        </div>
        { swapHistory.length > 0 && <SwapsHistory orders={swapHistory} /> }
        <h2 style={{ marginTop: '20px' }} >
          <FormattedMessage id="CurrencyWallet110" defaultMessage="History your transactions" />
        </h2>
        {txHistory && (<Table titles={titles} rows={txHistory}styleName="table" rowRender={(row) => (<Row key={row.hash} {...row} />)} />)}
      </div>
    )
  }
}
