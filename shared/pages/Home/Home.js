import React, { Component, Fragment } from 'react'

import actions from 'redux/actions'
import { connect } from 'redaction'
import { links } from 'helpers'

import Title from 'components/PageHeadline/Title/Title'
import PageHeadline from 'components/PageHeadline/PageHeadline'

import Orders from './Orders/Orders'


@connect(({ core: { filter } }) => ({
  filter,
}))
export default class Home extends Component {

  constructor({ initialData, match: { params: { buy, sell } } }) {
    super()

    const { buyCurrency, sellCurrency } = initialData || {}

    this.state = {
      buyCurrency: buy || buyCurrency || 'swap',
      sellCurrency: sell || sellCurrency || 'btc',
    }
  }

  componentWillMount() {
    let { filter, match: { params: { buy, sell } } } = this.props

    if (typeof buy !== 'string' || typeof sell !== 'string') {
      filter = filter.split('-')
      this.handelReplaceHistory(filter[0], filter[1])
    }

    if (buy !== this.state.sellCurrency || sell !== this.state.sellCurrency) {
      actions.core.setFilter(`${sell}-${buy}`)
    }
  }
  
  handelReplaceHistory = (sellCurrency, buyCurrency) => {
    let { history } = this.props

    this.setFilter(`${buyCurrency}-${sellCurrency}`)
    history.replace((`${links.home}${buyCurrency}-${sellCurrency}`))
  }


  setFilter = (filter) => {
    actions.core.setFilter(filter)
  }

  render() {
    const { match: { params: { orderId } } } = this.props
    const { buyCurrency, sellCurrency } = this.state
    
    return (
      <section style={{ position: 'relative', width: '100%' }}>
        <PageHeadline >
          <Fragment>
            <Title>{buyCurrency} &#8594; {sellCurrency} no limit exchange with 0 fee</Title>
          </Fragment>
          <Orders
            orderId={orderId}
          />
        </PageHeadline>
      </section>
    )
  }
}
