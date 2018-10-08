import React, { Component, Fragment } from 'react'
import cssModules from 'react-css-modules'
import { connect } from 'redaction'
import actions from 'redux/actions'
import constants from 'helpers/constants'

import Row from './Row/Row'
import Table from 'components/tables/Table/Table'
import Title from 'components/PageHeadline/Title/Title'
import tableStyles from 'components/tables/Table/Table.scss'
import MyOrders from './MyOrders/MyOrders'
import { Button } from 'components/controls'

import styles from './Orders.scss'


const filterMyOrders = (orders, peer) => orders.filter(order => order.owner.peer === peer)

const filterOrders = (orders) => orders
  .sort((a, b) => b.exchangeRate - a.exchangeRate)

@connect(({
  core: { orders, filter },
  ipfs: { isOnline, peer },
  currencies: { items: currencies },
}) => ({
  orders: filterOrders(orders, filter),
  myOrders: filterMyOrders(orders, peer),
  isOnline,
  currencies,
}))
@cssModules(styles)
export default class Orders extends Component {

  state = {
    buyOrders: [],
    sellOrders: [],
  }

  static getDerivedStateFromProps({ orders }) {
    if (!Array.isArray(orders)) { return }

    const sellOrders = orders.filter(order =>
      order.sellCurrency.toLowerCase() === 'btc'
    )

    const buyOrders = orders.filter(order =>
      order.buyCurrency.toLowerCase() === 'btc'
    )

    return {
      buyOrders,
      sellOrders,
    }
  }

  createOffer = () => {
    actions.modals.open(constants.modals.Offer, {
      buyCurrency: this.props.buyCurrency,
      sellCurrency: this.props.sellCurrency,
    })
    actions.analytics.dataEvent('orderbook-click-createoffer-button')
  }

  render() {
    const { sellOrders, buyOrders } = this.state
    const { sellCurrency, buyCurrency } = this.props
    const titles = [ 'OWNER', 'EXCHANGE', 'YOU GET', 'YOU HAVE', 'EXCHANGE RATE', 'START EXCHANGE' ]
    const { isOnline, myOrders, orderId } = this.props

    return (
      <Fragment>
        <Title>{buyCurrency} &#8594; {sellCurrency} no limit exchange with 0 fee</Title>
        <MyOrders myOrders={myOrders} />
        <Button gray styleName="button" onClick={this.createOffer}>Create offer</Button>
        {
          sellOrders.length > 0 && (
            <Fragment>
              <h3>Ask</h3>
              <Table
                id="table_exchange"
                classTitle={tableStyles.exchange}
                titles={titles}
                rows={sellOrders}
                rowRender={(row, index) => (
                  <Row
                    key={index}
                    orderId={orderId}
                    row={row}
                  />
                )}
                isLoading={!isOnline}
              />
            </Fragment>
          )
        }
        {
          buyOrders.length > 0 && (
            <Fragment>
              <h3>Bid</h3>
              <Table
                id="table_exchange"
                classTitle={tableStyles.exchange}
                titles={titles}
                rows={buyOrders}
                rowRender={(row, index) => (
                  <Row
                    key={index}
                    orderId={orderId}
                    row={row}
                  />
                )}
                isLoading={!isOnline}
              />
            </Fragment>
          )
        }
      </Fragment>
    )
  }
}
