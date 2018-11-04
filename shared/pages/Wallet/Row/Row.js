import React, { Component, Fragment } from 'react'
import actions from 'redux/actions'
import { constants } from 'helpers'
import config from 'app-config'
import { isMobile } from 'react-device-detect'

import cssModules from 'react-css-modules'
import styles from './Row.scss'

import { Link } from 'react-router-dom'
import CopyToClipboard from 'react-copy-to-clipboard'

import Coin from 'components/Coin/Coin'
import InlineLoader from 'components/loaders/InlineLoader/InlineLoader'
import WithdrawButton from 'components/controls/WithdrawButton/WithdrawButton'

import LinkAccount from '../LinkAccount/LinkAcount'
import { withRouter } from 'react-router'
import ReactTooltip from 'react-tooltip'
import { FormattedMessage } from 'react-intl'


@withRouter
@cssModules(styles)
export default class Row extends Component {

  state = {
    isBalanceFetching: false,
    viewText: false,
    tradeAllowed: false,
    isAddressCopied: false,
    isTouch: false,
  }

  componentWillMount() {
    const { currency, currencies } = this.props

    this.setState({
      tradeAllowed: !!currencies.find(c => c.value === currency.toLowerCase()),
    })

  }

  componentDidMount() {
    const { hiddenCoinsList } = this.props

    Object.keys(config.erc20)
      .forEach(name => {
        if (!hiddenCoinsList.includes(name.toUpperCase())) {
          actions.core.markCoinAsVisible(name.toUpperCase())
        }
      })
  }

  handleReloadBalance = async () => {
    const { isBalanceFetching } = this.state

    if (isBalanceFetching) {
      return null
    }

    this.setState({
      isBalanceFetching: true,
    })

    const { currency } = this.props

    await actions[currency.toLowerCase()].getBalance(currency.toLowerCase())

    this.setState(() => ({
      isBalanceFetching: false,
    }))
  }

  handleTouch = (e) => {
    this.setState({
      isTouch: true,
    })
  }

  handleTouchClear = (e) => {
    this.setState({
      isTouch: false,
    })
  }

  handleCopyAddress = () => {
    this.setState({
      isAddressCopied: true,
    }, () => {
      setTimeout(() => {
        this.setState({
          isAddressCopied: false,
        })
      }, 500)
    })
  }

  handleEosRegister = () => {
    actions.modals.open(constants.modals.EosRegister, {})
  }

  handleTelosRegister = () => {
    actions.modals.open(constants.modals.TelosRegister, {})
  }

  handleEosBuyAccount = async () => {
    actions.modals.open(constants.modals.EosBuyAccount)
  }

  handleWithdraw = () => {
    const { currency, address, contractAddress, decimals, balance, token } = this.props

    actions.analytics.dataEvent(`balances-withdraw-${currency.toLowerCase()}`)
    actions.modals.open(constants.modals.Withdraw, {
      currency,
      address,
      contractAddress,
      decimals,
      token,
      balance,
    })
  }

  handleReceive = () => {
    const { currency, address } = this.props

    actions.modals.open(constants.modals.ReceiveModal, {
      currency,
      address,
    })
  }

  handleShowOptions = () => {
    this.setState({
      showMobileButtons: true,
    })
  }

  handleGoTrade = (currency) => {
    this.props.history.push(`/${currency.toLowerCase()}`)
  }

  handleMarkCoinAsHidden = (coin) => {
    actions.core.markCoinAsHidden(coin)
  }

  render() {
    const { isBalanceFetching, tradeAllowed, isAddressCopied, isTouch } = this.state
    const { currency, balance, isBalanceFetched, address, contractAddress, fullName, unconfirmedBalance } = this.props
    const eosAccountActivated = localStorage.getItem(constants.localStorage.eosAccountActivated) === "true"
    const telosAccountActivated = localStorage.getItem(constants.localStorage.telosAccountActivated) === "true"

    return (
      <tr
        styleName={this.props.index === this.props.selectId || !isMobile ? 'showButtons' : 'hidden'}
        onClick={() => { this.props.handleSelectId(this.props.index) }}
        onTouchEnd={this.handleTouchClear} onTouchMove={this.handleTouch}
        style={ isTouch && this.props.index !== this.props.selectId ?  { background: '#f5f5f5' } : { background: '#fff' }}
      >
        <td>
          <Link to={`/${fullName}-wallet`} title={`Online ${fullName} wallet`}>
            <Coin name={currency} />
          </Link>
        </td>
        <td>
          <Link to={`/${fullName}-wallet`} title={`Online ${fullName} wallet`}>
            {fullName}
          </Link>
        </td>
        <td styleName="table_balance-cell">
          {
            !isBalanceFetched || isBalanceFetching ? (
              <InlineLoader />
            ) : (
              <div styleName="no-select-inline" onClick={this.handleReloadBalance} >
                <i className="fas fa-sync-alt" styleName="icon" />
                <span>{String(balance).length > 4 ? balance.toFixed(4) : balance}{' '}{currency}</span>
                { currency === 'BTC' && unconfirmedBalance !== 0 && (
                  <Fragment>
                    <br />
                    <span style={{ fontSize: '12px', color: '#c9c9c9' }}>
                      <FormattedMessage id="RowWallet181" defaultMessage="Unconfirmed" />
                      {unconfirmedBalance}
                    </span>
                  </Fragment>
                ) }
                { currency === 'LTC' && unconfirmedBalance !== 0 && (
                  <Fragment>
                    <br />
                    <span style={{ fontSize: '12px', color: '#c9c9c9' }}>
                      <FormattedMessage id="RowWallet189" defaultMessage="Unconfirmed" />
                      {unconfirmedBalance}
                    </span>
                  </Fragment>
                ) }
                { currency === 'USDT' && unconfirmedBalance !== 0 && (
                  <Fragment>
                    <br />
                    <span style={{ fontSize: '12px', color: '#c9c9c9' }}>
                      <FormattedMessage id="RowWallet197" defaultMessage="Unconfirmed" />
                      {unconfirmedBalance}
                    </span>
                  </Fragment>
                ) }
              </div>
            )
          }
          {isMobile && <span styleName="mobileName">{fullName}</span>}
        </td>

        { !isMobile && (
          <Fragment>
            <CopyToClipboard
              text={address}
              onCopy={this.handleCopyAddress}
            >
              <td style={{ position: 'relative' }}>
                {
                  !contractAddress ? (
                    <Fragment>

                      {
                        address !== '' && <i
                          className="far fa-copy"
                          styleName="icon"
                          data-tip
                          data-for="Copy"
                          style={{ width: '10px' }} />
                      }
                      <LinkAccount type={currency} address={address} >{address}</LinkAccount>
                      <ReactTooltip id="Copy" type="light" effect="solid">
                        <FormattedMessage id="RowWallet229" defaultMessage="Copy">
                          {message => <span>{message}</span>}
                        </FormattedMessage>
                      </ReactTooltip>
                    </Fragment>

                  ) : (
                    <Fragment>
                      <i className="far fa-copy" styleName="icon" />
                      <LinkAccount type={currency} contractAddress={contractAddress} address={address} >{address}</LinkAccount>
                    </Fragment>
                  )
                }

                {
                  currency === 'EOS' && !eosAccountActivated &&
                  <button styleName="button" onClick={this.handleEosBuyAccount} data-tip data-for="Activate">
                    <FormattedMessage id="RowWallet1245" defaultMessage="Activate" />
                  </button>                }
                <ReactTooltip id="Activate" type="light" effect="solid">
                  <FormattedMessage id="RowWallet250" defaultMessage="Buy this account">
                    {message => <span>{message}</span>}
                  </FormattedMessage>
                </ReactTooltip>

                {
                  <button styleName="button" onClick={this.handleEosRegister} data-tip data-for="Use">
                    <FormattedMessage id="RowWallet256" defaultMessage="Use another" />
                  </button>
                }
                <ReactTooltip id="Use" type="light" effect="solid">
                  <FormattedMessage id="RowWallet261" defaultMessage="Login with your existing eos account">
                    {message => <span>{message}</span>}
                  </FormattedMessage>
                </ReactTooltip>
                { currency === 'EOS' && !eosAccountActivated && (
                  <Fragment>
                    <br />
                    <span style={{ fontSize: '12px', color: '#c9c9c9' }}>
                      <FormattedMessage id="RowWallet267" defaultMessage="not activated" />
                    </span>
                  </Fragment>
                )
                }

                { currency === 'TLOS' && !telosAccountActivated && (
                  <Fragment>
                    <br />
                    <span style={{ fontSize: '12px', color: '#c9c9c9' }}>
                      <FormattedMessage id="RowWallet274" defaultMessage="not activated" />
                    </span>
                  </Fragment>
                )
                }
                { isAddressCopied &&
                  <p styleName="copied" >
                    <FormattedMessage id="RowWallet284" defaultMessage="Address copied to clipboard" />
                  </p>
                }
              </td>
            </CopyToClipboard>
          </Fragment>
        ) }
        <td>
          <div>
            <WithdrawButton onClick={this.handleWithdraw} datatip="Send your currency" styleName="marginRight">
              <i className="fas fa-arrow-alt-circle-right" />
              <span>
                <FormattedMessage id="RowWallet296" defaultMessage="Send" />
              </span>
              <ReactTooltip type="light" effect="solid" />
            </WithdrawButton>
            { isMobile && (
              <WithdrawButton onClick={this.handleReceive} styleName="marginRight">
                <i className="fas fa-qrcode" />
                <span>
                  <FormattedMessage id="RowWallet304" defaultMessage="Receive" />
                </span>
              </WithdrawButton>
            )}
            {
              tradeAllowed && (
                <WithdrawButton datatip="Swap your currency or create order to swap" onClick={() => this.handleGoTrade(currency)}>
                  <i className="fas fa-exchange-alt" />
                  <span>
                    <FormattedMessage id="RowWallet313" defaultMessage="Exchange" />
                  </span>
                  <ReactTooltip type="light" effect="solid" />
                </WithdrawButton>
              )
            }
          </div>
        </td>
      </tr>
    )
  }
}
