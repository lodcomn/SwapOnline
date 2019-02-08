import React from 'react'

import CSSModules from 'react-css-modules'
import styles from './SelectGroup.scss'

import Input from 'components/forms/Input/Input'
import FieldLabel from 'components/forms/FieldLabel/FieldLabel'
import CurrencySelect from 'components/ui/CurrencySelect/CurrencySelect'
import Tooltip from 'components/ui/Tooltip/Tooltip'

// TODO to split data and view this component
const SelectGroup = ({ selectedValue, onSelect, currencies, usd, placeholder, label, disabled, className, inputValueLink, tooltip, id }) => (
  <div>
    <FieldLabel inRow>
      <strong>
        {label}
      </strong>
      &nbsp;
      <Tooltip id={id}>
        {tooltip}
      </Tooltip>
    </FieldLabel>
    <div styleName="groupField" className={className}>
      <Input
        styleName="inputRoot"
        inputContainerClassName="inputContainer"
        valueLink={inputValueLink}
        type="number"
        placeholder={placeholder}
        pattern="0-9."
        disabled={disabled}
      />
      {
        (selectedValue === 'eth' || selectedValue === 'btc') && usd > 0 &&
        <p styleName="textUsd" >{`~${usd}`}$</p>
      }
      <CurrencySelect
        styleName="currencySelect"
        selectedValue={selectedValue}
        onSelect={onSelect}
        currencies={currencies}
      />
    </div>
  </div>
)

export default CSSModules(SelectGroup, styles)
