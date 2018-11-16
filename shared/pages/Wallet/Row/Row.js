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
@cssModules(styles, { allowMultiple: true })
export default class Row extends Component {

  state = {
    isBalanceFetching: false,
    viewText: false,
    tradeAllowed: false,
    isAddressCopied: false,
    isTouch: false,
    isBalanceEmpty: true
  }

  componentWillMount() {
    const { currency, currencies } = this.props

    this.setState({
      tradeAllowed: !!currencies.find(c => c.value === currency.toLowerCase()),
    })

  }

  componentWillReceiveProps(newProps) {
    this.handleCheckBalance()
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleSliceAddress);
  }

  componentDidMount() {
    const { hiddenCoinsList } = this.props

    window.addEventListener("resize", this.handleSliceAddress);

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

  handleSliceAddress = () => {
    const { address } = this.props;
    if(window.innerWidth < 1080 || isMobile) {
      return address.substr(0, 6) + '...' + address.substr(address.length - 2)
    }
    else {
      return address
    }
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
    const { currency, address, contractAddress, decimals, balance, token, unconfirmedBalance } = this.props

    actions.analytics.dataEvent(`balances-withdraw-${currency.toLowerCase()}`)
    actions.modals.open(constants.modals.Withdraw, {
      currency,
      address,
      contractAddress,
      decimals,
      token,
      balance,
      unconfirmedBalance,
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

  handleCheckBalance = () => {
    const { balance } = this.props;
    if( balance > 0 ) {
      this.setState({
        isBalanceEmpty: false
      })
    }
  }

  handleGoTrade = (currency) => {
    this.props.history.push(`/${currency.toLowerCase()}`)
  }

  handleMarkCoinAsHidden = (coin) => {
    actions.core.markCoinAsHidden(coin)
  }

  render() {
    const { isBalanceFetching, tradeAllowed, isAddressCopied, isTouch, isBalanceEmpty } = this.state
    const { currency, balance, isBalanceFetched, address, contractAddress, fullName, unconfirmedBalance } = this.props
    const eosAccountActivated = localStorage.getItem(constants.localStorage.eosAccountActivated) === "true"
    const telosAccountActivated = localStorage.getItem(constants.localStorage.telosAccountActivated) === "true"

    return (
      <tr
        styleName={this.props.index === this.props.selectId || !isMobile ? 'showButtons' : 'hidden'}
        onClick={() => { this.props.handleSelectId(this.props.index) }}
        onTouchEnd={this.handleTouchClear}
        onTouchMove={this.handleTouch}
        style={isTouch && this.props.index !== this.props.selectId ?  { background: '#f5f5f5' } : { background: '#fff' }}
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
                    <span styleName="unconfirmedBalance">
                      <FormattedMessage id="RowWallet181" defaultMessage="Unconfirmed" />
                      {unconfirmedBalance} {' '}
                    </span>
                  </Fragment>
                ) }
                { currency === 'LTC' && unconfirmedBalance !== 0 && (
                  <Fragment>
                    <br />
                    <span styleName="unconfirmedBalance">
                      <FormattedMessage id="RowWallet189" defaultMessage="Unconfirmed" />
                      {unconfirmedBalance}
                    </span>
                  </Fragment>
                ) }
                { currency === 'USDT' && unconfirmedBalance !== 0 && (
                  <Fragment>
                    <br />
                    <span styleName="unconfirmedBalance">
                      <FormattedMessage id="RowWallet197" defaultMessage="Unconfirmed" />
                      {unconfirmedBalance}
                    </span>
                  </Fragment>
                ) }
              </div>
            )
          }
          <span styleName="mobileName">{fullName}</span>
        </td>
          <Fragment>
            <CopyToClipboard
              text={address}
              onCopy={this.handleCopyAddress}
            >
              <td styleName="yourAddress">
                {
                  !contractAddress ? (
                    <div styleName="notContractAddress">
                      {
                         address !== '' && <i className="far fa-copy" styleName="icon" data-tip data-for="Copy" style={{ width: '14px' }} />
                      }
                      <LinkAccount type={currency} address={address}>{this.handleSliceAddress()}</LinkAccount>
                      <ReactTooltip id="Copy" type="light" effect="solid">
                        <span>
                          <FormattedMessage id="Row235" defaultMessage="Copy" />
                        </span>
                      </ReactTooltip>
                      { currency === 'EOS' && !eosAccountActivated && (
                        <Fragment>
                          <br />
                          <span styleName="notActiveLink">not activated</span>
                        </Fragment>
                      )
                      }
                      { currency === 'TLOS' && !telosAccountActivated && (
                        <Fragment>
                          <br />
                          <span styleName="notActiveLink">not activated</span>
                        </Fragment>
                      )
                      }
                    </div>
                  ) : (
                    <Fragment>
                      <i className="far fa-copy" styleName="icon" data-tip data-for="Copy" style={{ width: '14px' }} />
                      <LinkAccount type={currency} contractAddress={contractAddress} address={address} >{this.handleSliceAddress()}</LinkAccount>
                    </Fragment>
                  )
                }

                <div styleName="actButton">
                  {currency === 'EOS' && !eosAccountActivated && <button styleName="button buttonActivate" onClick={this.handleEosBuyAccount} data-tip data-for="Activate">Activate</button>}
                </div>
                <ReactTooltip id="Activate" type="light" effect="solid">
                  <span>
                    <FormattedMessage id="Row256" defaultMessage="Buy this account" />
                  </span>
                </ReactTooltip>

                <div styleName="useButton">
                  {
                    currency === 'EOS' &&
                    <button styleName="button" onClick={this.handleEosRegister} data-tip data-for="Use">
                      <FormattedMessage id="Row263" defaultMessage="Use another" />
                    </button>
                  }
                </div>
                <ReactTooltip id="Use" type="light" effect="solid">
                  <span>
                    <FormattedMessage id="Row268" defaultMessage="Login with your existing eos account" />
                  </span>
                </ReactTooltip>
                { isAddressCopied &&
                  <p styleName="copied" >
                    <FormattedMessage id="Row293" defaultMessage="Address copied to clipboard" />
                  </p>
                }
              </td>
            </CopyToClipboard>
          </Fragment>
        <td>
          <div styleName={currency === 'EOS' && !eosAccountActivated ? 'notActivated' : ''}>
            <WithdrawButton onClick={this.handleReceive} styleName="marginRight">
              <i className="fas fa-qrcode" />
              <span>
                <FormattedMessage id="Row313" defaultMessage="Deposit" />
              </span>
            </WithdrawButton>
            <WithdrawButton onClick={this.handleWithdraw} datatip="Send your currency" styleName="marginRight" disabled={isBalanceEmpty}>
              <i className="fas fa-arrow-alt-circle-right" />
              <span>
                <FormattedMessage id="Row305" defaultMessage="Send" />
              </span>
            </WithdrawButton>
            {
              tradeAllowed && (
                <WithdrawButton onClick={() => this.handleGoTrade(currency)} disabled={isBalanceEmpty}>
                  <i className="fas fa-exchange-alt" />
                  <span>
                    <FormattedMessage id="RowWallet313" defaultMessage="Exchange" />
                  </span>
                </WithdrawButton>
              )
            }
            {
              isMobile && (currency === 'EOS' && !eosAccountActivated && <button styleName="button buttonActivate" onClick={this.handleEosBuyAccount} data-tip data-for="Activate">Activate</button>)
            }
          </div>
        </td>
      </tr>
    )
  }
}
