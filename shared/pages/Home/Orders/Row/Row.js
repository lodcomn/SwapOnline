import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'redaction'
import actions from 'redux/actions'

import { links } from 'helpers'
import { Link } from 'react-router-dom'

import Coins from 'components/Coins/Coins'
import RequestButton from '../RequestButton/RequestButton'
import RemoveButton from 'components/controls/RemoveButton/RemoveButton'

import Identicon from 'components/Identicon/Identicon'

import Moment from 'react-moment';


@connect({
  peer: 'ipfs.peer',
})
export default class Row extends Component {

  static propTypes = {
    row: PropTypes.object,
  }

  state = {
    balance: 0,
  }

  componentWillMount() {
    const { row: {  sellCurrency, isMy, buyCurrency } } = this.props
    isMy ? this.checkBalance(sellCurrency) : this.checkBalance(buyCurrency)
  }

  checkBalance = async (sellCurrency) => {
    const balance = await actions[sellCurrency.toLowerCase()].getBalance()

    this.setState({
      balance,
    })
  }

  removeOrder = (orderId) => {
    actions.core.removeOrder(orderId)
    actions.core.updateCore()
  }

  sendRequest = (orderId) => {
    actions.core.sendRequest(orderId)
    actions.core.updateCore()
  }

  render() {
    const { balance } = this.state
    const { orderId, row: { id, createdAt, buyCurrency, sellCurrency, isMy, buyAmount,
      sellAmount, isRequested, exchangeRate,
      owner :{  peer: ownerPeer } }, peer } = this.props
    const amount = isMy ? sellAmount : buyAmount

    return (
      <tr style={orderId === id ? { background: 'rgba(0, 236, 0, 0.1)' } : {}}>
        <td>
          <a href={`${links.exchange}/${sellCurrency.toLowerCase()+'-'+buyCurrency.toLowerCase()} /-${buyCurrency.toLowerCase()}/${id}`}>
            <Identicon hash={id} />
          </a>
        </td>
        <td>
          <Coins names={[buyCurrency, sellCurrency]}  />
        </td>
        <td>
          {
            isMy ? (
              `${buyAmount.toFixed(5)} ${buyCurrency} `
            ) : (
              `${sellAmount.toFixed(5)} ${sellCurrency} `
            )
          }
        </td>
        <td>
          {
            isMy ? (
              `${sellAmount.toFixed(5)} ${sellCurrency} `
            ) : (
              `${buyAmount.toFixed(5)} ${buyCurrency} `
            )
          }
        </td>
        <td>
          { exchangeRate.toFixed(5) || (buyAmount.dividedBy(sellAmount)).toFixed(5)}
          {
            isMy ? (
              `${sellCurrency}/${buyCurrency}`
            ) : (
              `${buyCurrency}/${sellCurrency}`
            )
          }
        </td>
        <td>
          {
            peer === ownerPeer ? (
              <RemoveButton onClick={() => this.removeOrder(id)} />
            ) : (
              <Fragment>
                {
                  isRequested ? (
                    <Fragment>
                      <div style={{ color: 'red' }}>REQUESTING</div>
                      <Link to={`${links.swap}/${buyCurrency}-${sellCurrency}/${id}`}> Go to the swap</Link>
                    </Fragment>
                  ) : (
                    balance > amount.toNumber() ? (
                      <Link to={`${links.swap}/${buyCurrency}-${sellCurrency}/${id}`} >
                        <RequestButton onClick={() => this.sendRequest(id)} />
                      </Link>
                    ) : (
                      <span>Insufficient funds</span>
                    )
                  )
                }
              </Fragment>
            )
          }
        </td>
        <td>
           { createdAt && <Moment fromNow ago>{createdAt}</Moment> }
           { !createdAt && 'A long time'} ago
        </td>
      </tr>
    )
  }
}
