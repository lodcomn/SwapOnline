import React, { Component } from 'react'
import cssModules from 'react-css-modules'
import styles from './index.scss'
import cx from 'classnames'
import PartOfAddress from 'pages/Wallet/PartOfAddress'
import { isMobile } from 'react-device-detect'
import { constants, user } from 'helpers'
import { localisedUrl } from 'helpers/locale'
import getCurrencyKey from 'helpers/getCurrencyKey'
import Coin from 'components/Coin/Coin'
import OutsideClick from 'components/OutsideClick'

@cssModules(styles, { allowMultiple: true })
export default class CurrencyList extends Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      isAssetsOpen: false,
    }
  }

  openModal = (params) => {
    const { target } = params
    let { currency, address, tokenKey } = target

    this.setState({
      isAssetsOpen: false,
    }, () => {
      const {
        history,
        intl: { locale },
      } = this.props

      switch (currency.toLowerCase()) {
        case 'btc (multisig)':
        case 'btc (sms-protected)':
        case 'btc (pin-protected)':
          currency = 'btc'
      }

      const newPathName = `${tokenKey ? `/token/${tokenKey}` : `/${currency}`}/${address}/send`

      if (history.location.pathname !== newPathName) {
        history.push(
          localisedUrl(locale, newPathName)
        )
      }
    })
  }

  closeList = () => {
    this.setState(() => ({
      isAssetsOpen: false,
    }))
  }

  toggleListDisplay = () => {
    this.setState((state) => ({
      isAssetsOpen: !state.isAssetsOpen,
    }))
  }

  render() {
    const {
      selectedCurrency,
      currentBalance,
      currency,
      activeFiat,
      tableRows,
      currentAddress,
    } = this.props

    const {
      isAssetsOpen,
    } = this.state

    const standard = selectedCurrency.itemCurrency?.standard

    return (
      <OutsideClick outsideAction={this.closeList}>
        <div
          id='withdrawCurrencyList'
          styleName="customSelectValue"
          onClick={this.toggleListDisplay}
        >
          <div styleName="coin">
            <Coin name={selectedCurrency.currency} />
          </div>

          <div>
            <a>
              {selectedCurrency.currency}
              {standard && <span styleName="tokenStandard">{standard.toUpperCase()}</span>}
            </a>
            <span styleName="address">{currentAddress}</span>
            <span styleName="mobileAddress">
              {isMobile ? <PartOfAddress address={currentAddress} withoutLink /> : ''}
            </span>
          </div>

          <div styleName="amount">
            <span>
              {currentBalance} {getCurrencyKey(currency, true).toUpperCase()}
            </span>
            <span styleName="usd">
              {selectedCurrency.infoAboutCurrency && selectedCurrency.infoAboutCurrency.price_fiat
                ? <span>{(currentBalance * selectedCurrency.infoAboutCurrency.price_fiat).toFixed(2)} {activeFiat}</span>
                : null
              }
            </span>
          </div>
          <div styleName={cx('customSelectArrow', { active: isAssetsOpen })}></div>
        </div>

        {isAssetsOpen && (
          <div styleName="customSelectList">
            {tableRows.map((item, index) => {
              if (!user.isCorrectWalletToShow(item)) return

              const baseCurrency = item.baseCurrency
              const itemId = `${
                baseCurrency ? baseCurrency.toLowerCase() : ''
              }${item.currency.toLowerCase()}`

              return (
                <div id={`${itemId}Send`} key={index}
                  styleName={cx('customSelectListItem customSelectValue', {
                    disabled: !item.balance || item.balanceError,
                  })}
                  onClick={() => this.openModal({ target: item })}
                >
                  <Coin name={item.currency} />

                  <div>
                    <a>
                      {item.fullName}
                      {item.standard && <span styleName="tokenStandard">{item.standard.toUpperCase()}</span>}
                    </a>
                    <span styleName="address">{item.address}</span>
                    <span styleName="mobileAddress">
                      {isMobile ? <PartOfAddress address={item.address} withoutLink /> : ''}
                    </span>
                  </div>
   
                  <div styleName="amount">
                    <span>
                      <span id={`${itemId}CryptoBalance`}>{item.balance}</span>
                      {getCurrencyKey(item.currency, true).toUpperCase()}
                    </span>
                    <span styleName="usd">
                      {item.infoAboutCurrency && item.infoAboutCurrency.price_fiat
                        ? <span>{(item.balance * item.infoAboutCurrency.price_fiat).toFixed(2)} {activeFiat}</span>
                        : null
                      }
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </OutsideClick>
    )
  }
}

