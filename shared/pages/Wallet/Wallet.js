import React, { Component } from 'react'
import propTypes from 'prop-types'

import { isMobile } from 'react-device-detect'
import { connect } from 'redaction'
import { constants } from 'helpers'
import actions from 'redux/actions'
import { withRouter } from 'react-router'

import CSSModules from 'react-css-modules'
import stylesWallet from './Wallet.scss'

import Row from './Row/Row'
import Table from 'components/tables/Table/Table'
import { WithdrawButton } from 'components/controls'
import styles from 'components/tables/Table/Table.scss'
import PageHeadline from 'components/PageHeadline/PageHeadline'
import SubTitle from 'components/PageHeadline/SubTitle/SubTitle'
import KeyActionsPanel from 'components/KeyActionsPanel/KeyActionsPanel'
import SaveKeysModal from 'components/modals/SaveKeysModal/SaveKeysModal'
import { FormattedMessage } from 'react-intl'
import Hidebtn from 'components/controls/Hidebtn/Hidebtn'


@withRouter
@connect(
  ({
    core: { hiddenCoinsList },
    user: { ethData, btcData, bchData, tokensData, eosData, telosData, nimData, usdtData, ltcData },
    currencies: { items: currencies },
  }) => ({
    tokens: Object.keys(tokensData).map(k => (tokensData[k])),
    items: [btcData, ethData, eosData, telosData, bchData, ltcData, usdtData /* nimData */ ].map((data) => ({
      address: data.address,
      balance: data.balance,
      currency: data.currency,
      fullName: data.fullName,
      unconfirmedBalance: data.unconfirmedBalance,
      isBalanceFetched: data.isBalanceFetched,
      privateKey: data.privateKey,
      publicKey: data.publicKey,
    })),
    currencies,
    hiddenCoinsList,
  })
)
@CSSModules(stylesWallet, { allowMultiple: true })
export default class Wallet extends Component {

  static propTypes = {
    core: propTypes.object,
    user: propTypes.object,
    currencies: propTypes.array,
    hiddenCoinsList: propTypes.array,
    history: propTypes.object,
    items: propTypes.arrayOf(propTypes.object),
    tokens: propTypes.arrayOf(propTypes.object),
    location: propTypes.object,
    match: propTypes.object,
  }

  state = {
    view: 'off',
    zeroBalance: true,
    isVisible: false,
  }

  componentWillMount() {
    process.env.MAINNET && localStorage.setItem(constants.localStorage.testnetSkip, true)
    if (localStorage.getItem(constants.localStorage.privateKeysSaved)) {
      this.changeView('checkKeys')
    } else {
      // actions.modals.open(constants.modals.PrivateKeys, {})
    }
  }

  componentDidMount() {
    actions.user.getBalances()
    actions.analytics.dataEvent('open-page-balances')
  }

  shouldComponentUpdate(nextProps, nextState) {
    const getComparableProps = (props) => ({
      items: props.items,
      tokens: props.tokens,
      currencies: props.currencies,
      hiddenCoinsList: props.hiddenCoinsList,
    });
    return JSON.stringify({
      ...getComparableProps(this.props),
      ...this.state,
    }) !== JSON.stringify({
      ...getComparableProps(nextProps),
      ...nextState,
    });
  }

  componentWillReceiveProps({ items, tokens }) {
    const data = [].concat(items, tokens)

    data.forEach(item => {
      if (item.balance > 0) {
        actions.analytics.balanceEvent(item.currency, item.balance)
      }
    })
  }

  changeView = (view) => {
    this.setState({
      view,
    })
  }

  hideZeroBalance = () => {
    const { isVisible } = this.state
    const { items, tokens } = this.props

    const data = [].concat(items, tokens)

    data.forEach(item => {
      if (item.balance === 0 && item.currency !== 'SWAP' && item.currency !== 'USDT'  && item.currency !== 'BTC' && item.currency !== 'ETH') {
        actions.core.markCoinAsHidden(item.currency)
      }
    })

    this.setState(state => ({
      isVisible: !state.isVisible,
    }))
  }

  showZeroBalance = () => {
    const { isVisible } = this.state
    const { items, tokens } = this.props

    const data = [].concat(items, tokens)

    data.forEach(item => {
      if (item.balance === 0) {
        actions.core.markCoinAsVisible(item.currency)
      }
    })

    this.setState(state => ({ isVisible: !state.isVisible }))
  }

  render() {
    const { view, zeroBalance, currency, balance, isVisible } = this.state
    const { items, tokens, currencies, hiddenCoinsList, data } = this.props
    const titles = [ 'Coin', 'Name', 'Balance', 'Your Address', isMobile ? 'Send, receive, swap' :  'Actions' ]

    const keysSaved = localStorage.getItem(constants.localStorage.privateKeysSaved)
    const testNetSkip = localStorage.getItem(constants.localStorage.testnetSkip)

    const showSaveKeysModal = !zeroBalance && !keysSaved && !testNetSkip // non-zero balance and no keys saved

    return (
      <section styleName={isMobile ? 'sectionWalletMobile' : 'sectionWallet'}>
        { showSaveKeysModal && <SaveKeysModal /> }
        <PageHeadline styleName="pageLine">
          <SubTitle>
            <FormattedMessage id="Wallet104" defaultMessage="Your online cryptocurrency wallet" />
          </SubTitle>
          Deposit funds to addresses below
        </PageHeadline>
        <Hidebtn brand onClick={isVisible ? this.showZeroBalance : this.hideZeroBalance}>
          {
            isVisible ?
              <FormattedMessage id="Hidebtn24" defaultMessage="Show" />
              :
              <FormattedMessage id="Hidebtn26" defaultMessage="Hide" />
          }
          <FormattedMessage id="Hidebtn28" defaultMessage=" zero balance tokens" />
        </Hidebtn>
        <Table
          id="table-wallet"
          className={styles.wallet}
          titles={titles}
          rows={[...items, ...tokens].filter(coin => !hiddenCoinsList.includes(coin.currency))}
          rowRender={(row, index, selectId, handleSelectId) => (
            <Row key={row.currency} {...row} currencies={currencies} hiddenCoinsList={hiddenCoinsList} selectId={selectId} index={index} handleSelectId={handleSelectId} />
          )}
        />
        <KeyActionsPanel />
      </section>
    )
  }
}
