import { BigNumber } from 'bignumber.js'
import { FormattedMessage } from 'react-intl'
import CSSModules from 'react-css-modules'
import styles from './index.scss'
import { SwapBlockReason } from './types'

function SwapInfo(props) {
  const {
    blockReason,
    fromWallet,
    spendedAmount,
    swapFee,
    wrongNetwork,
    needApprove,
    spendedCurrency,
  } = props

  const insufficientBalance =
    new BigNumber(fromWallet.balance).isEqualTo(0) ||
    new BigNumber(spendedAmount).plus(swapFee || 0).isGreaterThan(fromWallet.balance)

  return (
    <section styleName="reasons">
      {wrongNetwork ? (
        <p styleName="wrong">
          <FormattedMessage id="incorrectNetwork" defaultMessage="Please choose correct network" />
        </p>
      ) : !spendedAmount ? (
        <p styleName="neutral">
          <FormattedMessage id="enterYouSend" defaultMessage='Enter "You send" amount' />
        </p>
      ) : insufficientBalance ? (
        <p styleName="neutral">
          <FormattedMessage
            id="AlertOrderNonEnoughtBalance"
            defaultMessage="Please top up your balance before you start the swap"
          />
        </p>
      ) : needApprove ? (
        <p styleName="warning">
          <FormattedMessage
            id="approveTokenFirst"
            defaultMessage="Please approve {token} first"
            values={{ token: spendedCurrency.name }}
          />
        </p>
      ) : blockReason === SwapBlockReason.InsufficientSlippage ? (
        <p styleName="warning">
          <FormattedMessage
            id="insufficientSlippage"
            defaultMessage="Insufficient slippage. Try to increase it"
          />
        </p>
      ) : blockReason === SwapBlockReason.NoLiquidity ? (
        <p styleName="neutral">
          <FormattedMessage
            id="insufficientLiquidity"
            defaultMessage="Insufficient pool liquidity"
          />
        </p>
      ) : blockReason === SwapBlockReason.Liquidity ? (
        <p styleName="neutral">
          <FormattedMessage
            id="liquidityPoolProblem"
            defaultMessage="There is some problem with liquidity pool. Try direct swap"
          />
        </p>
      ) : blockReason === SwapBlockReason.Unknown ? (
        <p styleName="wrong">
          <FormattedMessage
            id="unknownSwapProblemHasOccurred"
            defaultMessage="Unknown problem has occurred"
          />
        </p>
      ) : null}
    </section>
  )
}

export default CSSModules(SwapInfo, styles, { allowMultiple: true })
