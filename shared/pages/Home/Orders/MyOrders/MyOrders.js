import React, { PureComponent, Fragment } from 'react'

import actions from 'redux/actions'

import Table from 'components/tables/Table/Table'
import styles from 'components/tables/Table/Table.scss'
import RowFeeds from './RowFeeds/RowFeeds'


export default class MyOrders extends PureComponent {

  render() {
    const titles = [ 'EXCHANGE', 'YOU GET', 'YOU HAVE', 'EXCHANGE RATE', 'SHARE', 'ACTIONS' ]
    const { myOrders, declineRequest, acceptRequest, removeOrder } = this.props

    if (myOrders.length === undefined || myOrders.length <= 0) {
      return null
    }

    return (
      <Fragment>
        <h3 style={{ marginTop: '50px' }} >Your orders</h3>
        <Table
          className={styles.exchange}
          titles={titles}
          rows={myOrders}
          rowRender={(row, index) => (
            <RowFeeds
              key={index}
              row={row}
              declineRequest={declineRequest}
              acceptRequest={acceptRequest}
              removeOrder={removeOrder}
            />
          )}
        />
      </Fragment>
    )
  }
}
