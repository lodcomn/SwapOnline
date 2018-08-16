import React, { PureComponent } from 'react'

import Table from 'components/Table/Table'
import styles from 'components/Table/Table.scss'
import RowHistory from './RowHistory/RowHistory'


export default class SwapsHistory extends PureComponent {

  render() {
    let { orders } = this.props
    const titles = [ 'Exchange', 'You buy', 'You sell', 'Exchange rate', 'Status', 'Link' ]

    if (orders === null || orders.length === 0) {
      return null
    }

    return (
      <div style={{ marginBottom: '50px' }}>
        <h3>Swaps history</h3>
        <Table
          classTitle={styles.historySwap}
          titles={titles}
          rows={orders}
          rowRender={(row, index) => (
            <RowHistory
              key={index}
              row={row}
            />
          )}
        />
      </div>
    )
  }
}
