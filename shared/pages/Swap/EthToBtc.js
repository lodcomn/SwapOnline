import React, { Component, Fragment } from 'react'

import actions from 'redux/actions'

import config from 'app-config'
import { BigNumber } from 'bignumber.js'
import CopyToClipboard from 'react-copy-to-clipboard'

import InlineLoader from 'components/loaders/InlineLoader/InlineLoader'
import TimerButton from 'components/controls/TimerButton/TimerButton'
import Button from 'components/controls/Button/Button'
import Timer from './Timer/Timer'
import { FormattedMessage } from 'react-intl'


export default class EthToBtc extends Component {

  constructor({ swap, currencyData, depositWindow }) {
    super()

    this.swap = swap

    this.state = {
      depositWindow,
      enabledButton: false,
      isAddressCopied: false,
      flow: this.swap.flow.state,
      isShowingBitcoinScript: false,
      currencyAddress: currencyData.address,
    }
  }

  componentWillMount() {
    this.swap.on('state update', this.handleFlowStateUpdate)

  }

  componentWillUnmount() {
    this.swap.off('state update', this.handleFlowStateUpdate)
  }


  handleFlowStateUpdate = (values) => {
    const stepNumbers = {
      1: 'sign',
      2: 'wait-lock-btc',
      3: 'verify-script',
      4: 'sync-balance',
      5: 'lock-eth',
      6: 'wait-withdraw-eth',
      7: 'withdraw-btc',
      8: 'finish',
      9: 'end',
    }

    actions.analytics.swapEvent(stepNumbers[values.step], 'ETH-BTC')

    this.setState({
      flow: values,
    })

    // this.overProgress(values, Object.keys(stepNumbers).length)
  }

  // overProgress = (flow, length) => {
  //   actions.loader.show(true, '', '', true, { flow, length, name: 'ETH2BTC' })
  // }

  signSwap = () => {
    this.swap.flow.sign()
  }

  confirmBTCScriptChecked = () => {
    this.swap.flow.verifyBtcScript()
  }

  updateBalance = () => {
    this.swap.flow.syncBalance()
  }

  tryRefund = () => {
    this.swap.flow.tryRefund()
    this.setState(() => ({ enabledButton: false }))
  }

  toggleBitcoinScript = () => {
    this.setState({
      isShowingBitcoinScript: !this.state.isShowingBitcoinScript,
    })
  }



  render() {
    const { children } = this.props
    const { currencyAddress, flow, enabledButton, isShowingBitcoinScript, isAddressCopied } = this.state
    const headingStyle = {
      color: '#5100dc',
      textTransform: 'uppercase',
      fontSize: '20px',
      marginTop: '20px',
      borderTop: '1px solid #5100dc',
      paddingTop: '20px' }

    return (
      <div>
        <div className={this.props.styles.swapWrapper}>
          {
            this.swap.id && (
              <strong>
                {this.swap.sellAmount.toNumber()}
                {this.swap.sellCurrency} &#10230;
                {this.swap.buyAmount.toNumber()}
                {this.swap.buyCurrency}
              </strong>
            )
          }
        </div>
        <div>
          {
            !this.swap.id && (
              this.swap.isMy ? (
                <h3>
                  <FormattedMessage id="EthToBtc99" defaultMessage="This order doesn&apos;t have a buyer" />
                </h3>
              ) : (
                <Fragment>
                  <h3>
                    <FormattedMessage id="EthToBtc104" defaultMessage="Waiting the order creator" />
                  </h3>
                  <InlineLoader />
                </Fragment>
              )
            )
          }
          {
            flow.isWaitingForOwner && (
              <Fragment>
                <h3 style={headingStyle}>
                  <FormattedMessage id="EthToBtc115" defaultMessage="Waiting for other user when he connect to the order" />
                </h3>
                <InlineLoader />
              </Fragment>
            )
          }
          {
            flow.step === 1 && (
              <Fragment>
                <div>
                  <FormattedMessage
                    id="EthToBtc125"
                    defaultMessage={`
                      "Confirmation of the transaction is necessary for crediting the reputation. 
                      If a user does not bring the deal to the end he gets a negative credit to his reputation."
                    `}
                  />
                </div>
                <TimerButton timeLeft={5} brand onClick={this.signSwap}>
                  <FormattedMessage id="EthToBtc128" defaultMessage="Sign" />
                </TimerButton>
                {
                  (flow.isSignFetching || flow.signTransactionHash) && (
                    <Fragment>
                      <h4>
                        <FormattedMessage id="EthToBtc134" defaultMessage="Please wait. Confirmation processing" />
                      </h4>
                      {
                        flow.signTransactionHash && (
                          <div>
                            <FormattedMessage id="EthToBtc139" defaultMessage="Transaction: " />
                            <strong>
                              <a
                                href={`${config.link.etherscan}/tx/${flow.signTransactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {flow.signTransactionHash}
                              </a>
                            </strong>
                          </div>
                        )
                      }
                      {
                        flow.isSignFetching && (
                          <InlineLoader />
                        )
                      }
                    </Fragment>
                  )
                }
              </Fragment>
            )
          }
          {flow.step > 1 && <h3 style={headingStyle}><FormattedMessage id="BtcToEthToken157" defaultMessage="1. Confirmation" /></h3>}
          {
            flow.isMeSigned && (
              <Fragment>
                <h3 style={headingStyle}>
                  <FormattedMessage id="EthToBtc167" defaultMessage="2. Waiting for BTC Owner to create Secret Key, create BTC Script and charge it" />
                </h3>
                {
                  flow.step === 2 && (
                    <InlineLoader />
                  )
                }

                {
                  flow.secretHash && flow.btcScriptValues && (
                    <Fragment>
                      <h3 style={headingStyle}>
                        <FormattedMessage id="EthToBtc179" defaultMessage="3. The bitcoin Script was created and charged. Please check the information below" />
                      </h3>
                      <div>
                        <FormattedMessage id="EthToBtc182" defaultMessage="Secret Hash: " />
                        <strong>{flow.secretHash}</strong>
                      </div>
                      <div>
                        <strong>
                          {
                            flow.btcScriptCreatingTransactionHash && (
                              <a
                                href={`${config.link.bitpay}/tx/${flow.btcScriptCreatingTransactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {flow.btcScriptCreatingTransactionHash}
                              </a>
                            )
                          }
                        </strong>
                      </div>
                      <br />
                      <Fragment>
                        { flow.btcScriptValues &&
                          <span onClick={this.toggleBitcoinScript}>
                            <FormattedMessage id="EthToBtc204" defaultMessage="Show bitcoin script" />
                          </span>
                        }
                        { isShowingBitcoinScript && (
                          <pre>
                            <code>{`
    bitcoinjs.script.compile([
      bitcoin.core.opcodes.OP_RIPEMD160,
      Buffer.from('${flow.btcScriptValues.secretHash}', 'hex'),
      bitcoin.core.opcodes.OP_EQUALVERIFY,
      Buffer.from('${flow.btcScriptValues.recipientPublicKey}', 'hex'),
      bitcoin.core.opcodes.OP_EQUAL,
      bitcoin.core.opcodes.OP_IF,
      Buffer.from('${flow.btcScriptValues.recipientPublicKey}', 'hex'),
      bitcoin.core.opcodes.OP_CHECKSIG,
      bitcoin.core.opcodes.OP_ELSE,
      bitcoin.core.script.number.encode(${flow.btcScriptValues.lockTime}),
      bitcoin.core.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.core.opcodes.OP_DROP,
      Buffer.from('${flow.btcScriptValues.ownerPublicKey}', 'hex'),
      bitcoin.core.opcodes.OP_CHECKSIG,
      bitcoin.core.opcodes.OP_ENDIF,
    ])
                        `}
                            </code>
                          </pre>
                        )
                        }
                      </Fragment>

                      <br />

                      {
                        flow.step === 3 && (
                          <Fragment>
                            <br />
                            <TimerButton timeLeft={5} brand onClick={this.confirmBTCScriptChecked}>
                              <FormattedMessage id="EthToBtc247" defaultMessage="Everything is OK. Continue" />
                            </TimerButton>
                          </Fragment>
                        )
                      }
                    </Fragment>
                  )
                }
                {
                  flow.step === 4 && !flow.isBalanceEnough && !flow.isBalanceFetching && (
                    <Fragment>
                      <h3 style={headingStyle}>
                        <FormattedMessage id="EthToBtc260" defaultMessage="Not enough money for this swap. Please fund the balance" />
                      </h3>
                      <div>
                        <div>
                          <FormattedMessage id="EthToBtc264" defaultMessage="Your balance: " />
                          <strong>{flow.balance}</strong> {this.swap.sellCurrency}
                        </div>
                        <div>
                          <FormattedMessage id="EthToBtc267" defaultMessage="Required balance: " />
                          <strong>{this.swap.sellAmount.toNumber()}</strong> {this.swap.sellCurrency}
                        </div>
                        <div>
                          <FormattedMessage id="EthToBtc270" defaultMessage="Your address: " />
                          <a href={`${config.link.etherscan}/address/${currencyAddress}`} target="_blank" rel="noopener noreferrer">
                            {currencyAddress}
                          </a>
                        </div>
                        <hr />
                        <span>{flow.address}</span>
                      </div>
                      <br />
                      <Button brand onClick={this.updateBalance}>
                        <FormattedMessage id="EthToBtc277" defaultMessage="Continue" />
                      </Button>
                    </Fragment>
                  )
                }
                {
                  flow.step === 4 && flow.isBalanceFetching && (
                    <Fragment>
                      <div>
                        <FormattedMessage id="EthToBtc286" defaultMessage="Checking balance.." />
                      </div>
                      <InlineLoader />
                    </Fragment>
                  )
                }
                {
                  (flow.step >= 5 || flow.isEthContractFunded) && (
                    <Fragment>
                      <h3 style={headingStyle}>
                        <FormattedMessage id="EthToBtc297" defaultMessage="5. Creating Ethereum Contract. \n Please wait, it can take a few minutes" />
                      </h3>
                    </Fragment>
                  )
                }
                {
                  flow.ethSwapCreationTransactionHash && (
                    <div>
                      <FormattedMessage id="EthToBtc305" defaultMessage="Transaction: " />
                      <strong>
                        <a
                          href={`${config.link.etherscan}/tx/${flow.ethSwapCreationTransactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {flow.ethSwapCreationTransactionHash}
                        </a>
                      </strong>
                    </div>
                  )
                }
                {
                  flow.step === 5 && (
                    <InlineLoader />
                  )
                }
                {
                  flow.refundTransactionHash && (
                    <div>
                      <FormattedMessage id="EthToBtc326" defaultMessage="Transaction: " />
                      <strong>
                        <a
                          href={`${config.link.etherscan}/tx/${flow.refundTransactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {flow.refundTransactionHash}
                        </a>
                      </strong>
                    </div>
                  )
                }
                {
                  (flow.step === 6 || flow.isEthWithdrawn) && (
                    <Fragment>
                      <h3 style={headingStyle}>
                        <FormattedMessage id="EthToBtc343" defaultMessage="6. Waiting for BTC Owner to add a Secret Key to ETH Contact" />
                      </h3>
                      {
                        !flow.isEthWithdrawn && (
                          <InlineLoader />
                        )
                      }
                    </Fragment>
                  )
                }

                {
                  (flow.step === 7 || flow.isBtcWithdrawn) && (
                    <h3 style={headingStyle}>
                      <FormattedMessage
                        id="EthToBtc357"
                        defaultMessage="7. The funds from ETH contract was successfully transferred to BTC owner. BTC owner left a secret key. Requesting withdrawal from BTC script. Please wait." // eslint-disable-line
                      />
                    </h3>
                  )
                }
                {
                  flow.btcSwapWithdrawTransactionHash && (
                    <div>
                      <FormattedMessage id="EthToBtc364" defaultMessage="Transaction: " />
                      <strong>
                        <a
                          href={`${config.link.bitpay}/tx/${flow.btcSwapWithdrawTransactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {flow.btcSwapWithdrawTransactionHash}
                        </a>
                      </strong>
                    </div>
                  )
                }
                {
                  flow.step === 7 && (
                    <InlineLoader />
                  )
                }

                {
                  flow.isBtcWithdrawn && (
                    <Fragment>
                      <h3 style={headingStyle}>
                        <FormattedMessage id="EthToBtc387" defaultMessage="8. BTC was transferred to your wallet. Check the balance." />
                      </h3>
                      <h3 style={headingStyle}>
                        <FormattedMessage id="EthToBtc390" defaultMessage="Thank you for using Swap.Online!" />
                      </h3>
                    </Fragment>
                  )
                }
                {
                  flow.step >= 6 && !flow.isFinished && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      { enabledButton && !flow.isBtcWithdrawn && (
                        <Button brand onClick={this.tryRefund}>
                          <FormattedMessage id="EthToBtc400" defaultMessage="TRY REFUND" />
                        </Button>
                      )}
                      <Timer lockTime={(flow.btcScriptValues.lockTime - 5400) * 1000} enabledButton={() => this.setState({ enabledButton: true })} />
                    </div>
                  )
                }
                {
                  flow.refundTransactionHash && (
                    <div>
                      <FormattedMessage id="EthToBtc412" defaultMessage="Transaction: " />
                      <strong>
                        <a
                          href={`${config.link.bitpay}/tx/${flow.refundTransactionHash}`}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {flow.refundTransactionHash}
                        </a>
                      </strong>
                    </div>
                  )
                }
              </Fragment>
            )
          }
          <br />
          {/* { !flow.isFinished && <Button white onClick={this.addGasPrice}>Add gas price</Button> } */}
          { children }
        </div>
      </div>
    )
  }
}
