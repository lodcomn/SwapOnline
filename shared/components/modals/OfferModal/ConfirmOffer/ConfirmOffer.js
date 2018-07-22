import React, { Component, Fragment } from 'react'

import actions from 'redux/actions'
import SwapApp from 'swap.app'

import cssModules from 'react-css-modules'
import styles from './ConfirmOffer.scss'

import ButtonsInRow from 'components/controls/ButtonsInRow/ButtonsInRow'
import Button from 'components/controls/Button/Button'
import Coins from 'components/Coins/Coins'

import Amounts from './Amounts/Amounts'
import ExchangeRate from './ExchangeRate/ExchangeRate'
import Fee from './Fee/Fee'


@cssModules(styles)
export default class ConfirmOffer extends Component {

  state = {
    buyAmount: null,
    sellAmount: null,
    sellCurrency: null,
    buyCurrency: null,
    exchangeRate: null,
  }

  componentWillMount() {
    const { offer: { sellAmount, buyAmount, sellCurrency, buyCurrency, exchangeRate } } = this.props
    this.setState({ sellAmount, buyAmount, buyCurrency, sellCurrency, exchangeRate })

    if (process.env.MAINNET) {
      if (sellCurrency === 'eth' && sellAmount > 0.1) {
        this.setState({
          sellAmount: 0.1,
          buyAmount: 0.007,
        })
      } else if (sellCurrency === 'btc' && sellAmount > 0.007) {
        this.setState({
          sellAmount: 0.007,
          buyAmount: 0.1,
        })
      }
    }
  }

  handleConfirm = () => {
    this.createOrder()
    actions.modals.close('OfferModal')
  }

  createOrder = () => {
    const {  buyAmount, sellAmount, buyCurrency, sellCurrency, exchangeRate } = this.state

    const data = {
      buyCurrency: `${buyCurrency}`,
      sellCurrency: `${sellCurrency}`,
      buyAmount: Number(buyAmount),
      sellAmount: Number(sellAmount),
      exchangeRate: Number(exchangeRate),
    }
    actions.analytics.dataEvent('orderbook-addoffer-click-confirm-button')
    SwapApp.services.orders.create(data)
  }

  render() {
    const { onBack } = this.props
    const {  buyAmount, sellAmount, buyCurrency, sellCurrency, exchangeRate } = this.state

    return (
      <Fragment>
        <Coins styleName="coins" names={[ buyCurrency, sellCurrency ]} size={100} />
        <Amounts {...{ buyAmount, sellAmount, buyCurrency, sellCurrency }} />
        <ExchangeRate {...{ value: exchangeRate, buyCurrency, sellCurrency }} />
        <Fee amount={0.0001} currency={sellCurrency} />
        <ButtonsInRow styleName="buttonsInRow">
          <Button styleName="button" gray onClick={onBack}>Back</Button>
          <Button styleName="button" id="confirm" brand onClick={this.handleConfirm}>Add</Button>
        </ButtonsInRow>
      </Fragment>
    )
  }
}
