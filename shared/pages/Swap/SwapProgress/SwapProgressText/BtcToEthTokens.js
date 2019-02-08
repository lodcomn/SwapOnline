import React, { Component } from 'react'

import styles from '../SwapProgress.scss'
import CSSModules from 'react-css-modules'

import { FormattedMessage } from 'react-intl'


@CSSModules(styles)
export default class BtcToEthTokens extends Component {
  BtcToEthTokens = (step) => {

    switch (step) {
      case 1:
        return (
          <FormattedMessage id="BitcoinBuyText17" defaultMessage="Please wait. Confirmation processing" />
        )
      case 2:
        return (
          <FormattedMessage id="BtcToEthToken20" defaultMessage="Create a secret key" />
        )
      case 3:
        return (
          <FormattedMessage id="BitcoinBuyText29" defaultMessage="Checking balance.." />
        )
      case 4:
        return (
          <FormattedMessage id="BitcoinBuyText33" defaultMessage="Creating Bitcoin Script. \n Please wait, it can take a few minutes" />
        )
      case 5:
        return (
          <FormattedMessage
            id="BitcoinBuyText37"
            defaultMessage="{buyCurrency} Owner received Bitcoin Script and Secret Hash. Waiting when he creates {buyCurrency} Contract"
            values={{ buyCurrency: `${this.props.swap.buyCurrency}` }} />
        )
      case 6:
        return (
          <FormattedMessage
            id="BitcoinBuyText41"
            defaultMessage="{buyCurrency} Contract created and charged. Requesting withdrawal from {buyCurrency} Contract. Please wait"
            values={{ buyCurrency: `${this.props.swap.buyCurrency}` }} />
        )
      case 7:
        return (
          <FormattedMessage
            id="BitcoinBuyText45"
            defaultMessage="{buyCurrency} tokens was transferred to your wallet. Check the balance."
            values={{ buyCurrency: `${this.props.swap.buyCurrency}` }} />
        )
      case 8:
        return (
          <FormattedMessage id="BitcoinBuyText49" defaultMessage="Thank you for using Swap.Online" />
        )
      case 9:
        return (
          <FormattedMessage id="BitcoinBuyText53" defaultMessage="Thank you for using Swap.Online!" />
        )
      default:
        return null
    }
  }

  render() {

    return (
      <h1 styleName="stepHeading">{this.BtcToEthTokens(this.props.step)}</h1>
    )
  }
}
