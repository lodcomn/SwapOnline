import React, { PureComponent } from 'react'

import Swap from 'swap.swap'

import cssModules from 'react-css-modules'
import styles from './Swap.scss'

import { connect } from 'redaction'
import { links, constants } from 'helpers'
import actions from 'redux/actions'


import { swapComponents } from './swaps'
import Share from './Share/Share'
import EmergencySave from './EmergencySave/EmergencySave'
import { injectIntl } from 'react-intl'
import { localisedUrl } from 'helpers/locale'
import DeleteSwapAfterEnd from './DeleteSwapAfterEnd'


@injectIntl
@connect(({
  user: { ethData, btcData, /* bchData, */ tokensData, eosData, telosData, nimData, usdtData, ltcData },
}) => ({
  items: [ ethData, btcData, eosData, telosData, /* bchData, */ ltcData, usdtData /* nimData */ ],
  tokenItems: [ ...Object.keys(tokensData).map(k => (tokensData[k])) ],
  errors: 'api.errors',
  checked: 'api.checked',
}))

@cssModules(styles, { allowMultiple: true })
export default class SwapComponent extends PureComponent {

  state = {
    swap: null,
    SwapComponent: null,
    currencyData: null,
  }

  componentWillMount() {
    const { items, tokenItems, intl: { locale } } = this.props
    let { match : { params : { orderId } }, history } = this.props

    if (!orderId) {
      history.push(localisedUrl(links.exchange))
      return
    }

    try {
      const swap = new Swap(orderId)
      const SwapComponent = swapComponents[swap.flow._flowName]
      const currencyData = items.concat(tokenItems)
        .filter(item => item.currency === swap.sellCurrency.toUpperCase())[0]

      window.swap = swap

      this.setState({
        SwapComponent,
        swap,
        currencyData,
      })

    } catch (error) {
      actions.notifications.show(constants.notifications.ErrorNotification, { error: 'Sorry, but this order do not exsit already' })
      this.props.history.push(localisedUrl(links.exchange))
    }

    this.setSaveSwapId(orderId)
  }

  // componentWillMount() {
  //   actions.api.checkServers()
  //     .then(() => {
  //
  //     })
  // }

  setSaveSwapId = (orderId) => {
    let swapsId = JSON.parse(localStorage.getItem('swapId'))

    if (swapsId === null || swapsId.length === 0) {
      swapsId = []
    }

    if (!swapsId.includes(orderId)) {
      swapsId.push(orderId)
    }

    localStorage.setItem('swapId', JSON.stringify(swapsId))
  }

  render() {
    const { swap, SwapComponent, currencyData } = this.state
    console.log(this.props)
    console.log(this.state)

    if (!swap || !SwapComponent) {
      return null
    }

    return (

      <div styleName="swap">
        <SwapComponent swap={swap} currencyData={currencyData} styles={styles}>
          <Share flow={swap.flow} />
          <EmergencySave flow={swap.flow} />
        </SwapComponent>
      </div>
    )
  }
}
