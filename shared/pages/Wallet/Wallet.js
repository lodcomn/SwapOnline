import React, { Component } from 'react'
import { isMobile } from 'react-device-detect'

import { connect } from 'redaction'
import { constants } from 'helpers'
import actions from 'redux/actions'

import Table from 'components/tables/Table/Table'
import styles from 'components/tables/Table/Table.scss'
import Confirm from 'components/Confirm/Confirm'
import SaveKeys from 'components/SaveKeys/SaveKeys'
import PageHeadline from 'components/PageHeadline/PageHeadline'
import SubTitle from 'components/PageHeadline/SubTitle/SubTitle'
import { WithdrawButton } from 'components/controls'
import stylesWallet from './Wallet.scss'

import Row from './Row/Row'



@connect(({ user: { ethData, btcData, tokensData, eosData, nimData, usdtData } , currencies: { items: currencies }}) => ({
  tokens: Object.keys(tokensData).map(k => (tokensData[k])),
  items: [ ethData, btcData, eosData, usdtData /* eosData  nimData */ ],
  currencies,
}))
export default class Wallet extends Component {

  state = {
    view: 'off',
  }

  componentWillMount() {
    if (localStorage.getItem(constants.localStorage.privateKeysSaved)) {
      this.changeView('checkKeys')
    }
  }

  componentDidMount() {
    actions.user.getBalances()
    actions.analytics.dataEvent('open-page-balances')
    // if (!localStorage.getItem(constants.localStorage.privateKeysSaved)) {
    //   actions.modals.open(constants.modals.PrivateKeys, {})
    // }
  }

  handleClear = process.env.MAINNET ? () => {} : (event) => {
    event.preventDefault()
    window.localStorage.clear()
    window.location.reload()
  }

  handleDownload = () => {
    actions.user.downloadPrivateKeys()
    this.changeView('checkKeys')
  }

  handleConfirm = () => {
    this.changeView('checkKeys')
    localStorage.setItem(constants.localStorage.privateKeysSaved, true)
  }

  handleImportKeys = () => {
    actions.modals.open(constants.modals.ImportKeys, {})
  }

  changeView = (view) => {
    this.setState({
      view,
    })
  }

  render() {
    const { view } = this.state
    const { items, tokens, currencies } = this.props
    const titles = [ 'Coin', !isMobile && 'Name', 'Balance', !isMobile && 'Address', 'Actions' ]

    return (
      <section>
        <PageHeadline>
          <SubTitle>
            Swap.Online - Cryptocurrency Wallet with Atomic Swap Exchange
          </SubTitle>
        </PageHeadline>
        <Confirm
          title="Are you sure ?"
          isConfirm={() => this.handleConfirm()}
          isReject={() => this.changeView('off')}
          animation={view === 'on'}
        />
        <Table
          classTitle={styles.wallet}
          titles={titles}
          rows={[...items, ...tokens]}
          rowRender={(row, index) => (
            <Row key={index} {...row} currencies={currencies} />
          )}
        />
        <div>
          { view === 'off' && <SaveKeys isDownload={this.handleDownload} isChange={() => this.changeView('on')} /> }
          { process.env.TESTNET && <WithdrawButton onClick={this.handleClear} >Exit</WithdrawButton> }
          <WithdrawButton onClick={this.handleDownload}>Download keys</WithdrawButton>
          <WithdrawButton onClick={this.handleImportKeys}>Import keys</WithdrawButton>
        </div>
      </section>
    )
  }
}
