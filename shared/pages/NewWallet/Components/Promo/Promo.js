import React from 'react'
import PropTypes from 'prop-types'

import CurrencySlider from '../CurrencySlider/CurrencySlider'
import PromoText from '../PromoText/PromoText'
import NewHeader from '../NewHeader/NewHeader'

import CSSModules from 'react-css-modules'
import styles from './Promo.scss'


const Promo = ({ className }) => (
  <div styleName="promo">
    <NewHeader />
    <div styleName="promoWrap">
      <PromoText />
      <CurrencySlider />
    </div>
  </div>
)

export default CSSModules(Promo, styles)
