import React from 'react'

import CSSModules from 'react-css-modules'
import styles from './Flip.scss'

import FlipSvg from './images/flip.svg'


function Flip({ onClick, id }) {
  return <img src={FlipSvg} id={id || null} alt="" onClick={onClick} styleName="trade-panel__change" />
}

export default CSSModules(Flip, styles)
