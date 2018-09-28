import React, { Component, Fragment } from 'react'
import { connect } from 'redaction'
import actions from 'redux/actions'
import { constants } from 'helpers'

import Row from './Row/Row'
import Table from 'components/tables/Table/Table'
import styles from 'components/tables/Table/Table.scss'
import MyOrders from './MyOrders/MyOrders'
import Button from 'components/controls/Button/Button'


const filterMyOrders = (orders, peer) => orders.filter(order => order.owner.peer === peer)

const filterOrders = (orders, filter) => orders
  .filter(order => order.isMy ? (
    `${order.buyCurrency.toLowerCase()}-${order.sellCurrency.toLowerCase()}` === filter
  ) : (
      `${order.sellCurrency.toLowerCase()}-${order.buyCurrency.toLowerCase()}` === filter
    ))
  .sort((a, b) => b.exchangeRate - a.exchangeRate)

@connect(({ core: { orders, filter }, ipfs: { isOnline, peer }, currencies: { items: currencies } }) => ({
  orders: filterOrders(orders, filter),
  myOrders: filterMyOrders(orders, peer),
  isOnline,
  currencies,
}))

export default class Orders extends Component {

  createOffer = () => {
    actions.modals.open(constants.modals.Offer, {
      buyCurrency: this.props.buyCurrency,
      sellCurrency: this.props.sellCurrency,
    })
    actions.analytics.dataEvent('orderbook-click-createoffer-button')
  }

  render() {
    const titles = ['OWNER', 'EXCHANGE', 'YOU GET', 'YOU HAVE', 'EXCHANGE RATE', 'ACTIONS']
    const { isOnline, orders, myOrders, orderId } = this.props

    return (
      <Fragment>
        <MyOrders myOrders={myOrders} />
        <div className="d-flex justify-content-between mt-4">
          <h3>All orders</h3>
          <Button
          onClick={this.createOffer} 
          className="btn btn-light"
          >
          Create offer
          </Button>
        </div>
        <Table
          classTitle={styles.exchange}
          titles={titles}
          rows={orders}
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
}
