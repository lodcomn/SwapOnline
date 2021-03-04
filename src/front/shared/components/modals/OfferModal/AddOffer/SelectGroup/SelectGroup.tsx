// @ts-nocheck
import React, { Fragment } from 'react'
import { FormattedMessage, injectIntl, IntlShape } from 'react-intl'

import CSSModules from 'react-css-modules'
import styles from './SelectGroup.scss'

import Input from 'components/forms/Input/Input'
import FieldLabel from 'components/forms/FieldLabel/FieldLabel'
import CurrencySelect from 'components/ui/CurrencySelect/CurrencySelect'
import Tooltip from 'components/ui/Tooltip/Tooltip'
import { BigNumber } from 'bignumber.js'

import { inputReplaceCommaWithDot } from 'helpers/domUtils'

// TODO to split data and view this component
const SelectGroup = ({ intl: IntlShape,  dynamicFee, isToken, extendedControls, selectedValue, onSelect, dataTut, isDark,
  currencies, fiat, placeholder, label, disabled, className, inputValueLink, tooltip, balance, error,
  id, type, idFee, tooltipAboutFee, haveAmount, dontDisplayError, activeFiat, ...props
}) => {
  const currAllowed = currencies.filter((item) => !item.dontCreateOrder)

  return (
    <div styleName={`${isDark ? 'dark' : ''}`}>
      <div styleName="groupField" className={className}>
        <div>
          <div styleName='row'>
            <span styleName="label">
              {label}
            </span>
            <div styleName="tooltip">
              <Tooltip id={id}>
                {tooltip}
              </Tooltip>
            </div>
          </div>

          <span styleName="balance">{balance && `Balance: ${new BigNumber(balance).dp(8, BigNumber.ROUND_CEIL)}`}</span>
          {/*<div styleName="smallTooltip">
            <Tooltip id={id}>
              {tooltip}
            </Tooltip>
          </div>*/}
        </div>
        <Input
          styleName="inputRoot"
          inputContainerClassName="inputContainer"
          valueLink={inputValueLink}
          type="number"
          placeholder={placeholder}
          pattern="0-9\."
          errorStyle={error}
          dontDisplayError
          disabled={disabled}
          onFocus={props.onFocus ? props.onFocus : () => { }}
          onBlur={props.onBlur ? props.onBlur : () => { }}
          onKeyDown={inputReplaceCommaWithDot}
        />
        {
          (selectedValue === 'eth' || selectedValue === 'btc') && fiat > 0 &&
          <p styleName="textUsd" >{`~${fiat}`} {activeFiat}</p>
        }
        {/*
        //@ */}
        <CurrencySelect
          //name="All"
          label={label}
          tooltip={tooltip}
          id={id}
          styleName="currencySelect"
          selectedItemRender={(item) => item.fullTitle}
          placeholder="Enter the name of coin"
          selectedValue={selectedValue}
          onSelect={onSelect}
          currencies={currAllowed}
        />
      </div>
      {label.props.defaultMessage === 'You sell' && !extendedControls &&
        (balance > 0 ?
          !isToken &&
          <span
            styleName={
              (new BigNumber(haveAmount).isLessThanOrEqualTo(balance)
                && new BigNumber(balance).isLessThan(new BigNumber(haveAmount).plus(dynamicFee))
                && new BigNumber(haveAmount).isGreaterThan(0))
                ? 'red'
                : 'balance'
            }
          >
            <FormattedMessage
              id="select75"
              defaultMessage="Available for exchange: {availableBalance} {tooltip}"
              values={{
                availableBalance: `${new BigNumber(balance).minus(dynamicFee)} ${selectedValue.toUpperCase()}`,
                tooltip: <Tooltip id={idFee}> {tooltipAboutFee}</Tooltip>,
              }} />
          </span> :
          <span styleName="textForNull">
            <FormattedMessage id="selected53" defaultMessage="You can use an external wallet to perform a swap" />
          </span>
        )
      }
    </div>
  )
}

export default injectIntl(CSSModules(SelectGroup, styles, { allowMultiple: true }))
