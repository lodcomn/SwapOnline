import React, { Component, Fragment } from 'react'
import SwapApp from 'swap.app'
import actions from 'redux/actions'

import Row from './Row/Row'
import Table from 'components/Table/Table'
import MyOrders from './MyOrders/MyOrders'
import SearchSwap from 'components/SearchSwap/SearchSwap'


export default class Orders extends Component {

  state = {
    orders: SwapApp.services.orders.items,
  }

  componentWillMount() {
    actions.analytics.dataEvent('open-page-orders')
    SwapApp.services.orders
      .on('new orders', this.updateOrders)
      .on('new order', this.updateOrders)
      .on('order update', this.updateOrders)
      .on('remove order', this.updateOrders)
  }

  componentWillUnmount() {
    SwapApp.services.orders
      .off('new orders', this.updateOrders)
      .off('new order', this.updateOrders)
      .off('order update', this.updateOrders)
      .off('remove order', this.updateOrders)
  }

  updateOrders = () => {
    this.setState({
      orders: SwapApp.services.orders.items,
    })

    const { orders } = this.state

    if (orders.length !== 0) {
      actions.feed.getFeedDataFromOrder(orders)
    }
  }

  filterOrders = (orders, filter) => orders
    .filter(order => order.isProcessing === false)
    .filter(order => order.isMy ? (
      `${order.buyCurrency.toLowerCase()}${order.sellCurrency.toLowerCase()}` === filter
    ) : (
      `${order.sellCurrency.toLowerCase()}${order.buyCurrency.toLowerCase()}` === filter
    ))
    .sort((a, b) => b.exchangeRate - a.exchangeRate)

  render() {
    const { filter, sellCurrency, buyCurrency, handleSellCurrencySelect, handleBuyCurrencySelect, flipCurrency } = this.props
    const titles = [ 'EXCHANGE', 'YOU BUY', 'YOU SELL', 'EXCHANGE RATE', 'ACTIONS' ]
    const { orders } = this.state

    const mePeer = SwapApp.services.room.peer
    const filteredOrders = this.filterOrders(orders, filter)
    const myOrders = orders.filter(order => order.owner.peer === mePeer).sort((a, b) => b.exchangeRate - a.exchangeRate)

    return (
      <Fragment>
        <MyOrders
          orders={myOrders}
          updateOrders={this.updateOrders}
        />
        <SearchSwap
          handleSellCurrencySelect={handleSellCurrencySelect}
          handleBuyCurrencySelect={handleBuyCurrencySelect}
          buyCurrency={buyCurrency}
          sellCurrency={sellCurrency}
          flipCurrency={flipCurrency}
        />
        <h3>All orders</h3>
        <Table
          titles={titles}
          rows={filteredOrders}
          rowRender={(row, index) => (
            <Row
              key={index}
              row={row}
              update={this.updateOrders}
            />
          )}
        />
      </Fragment>
    )
  }
}
