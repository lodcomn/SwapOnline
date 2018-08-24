import React, { Component } from 'react'
import { connect } from 'redaction'
import { withRouter } from 'react-router-dom'
import { isMobile } from 'react-device-detect'

import CSSModules from 'react-css-modules'
import styles from './Header.scss'

import Nav from './Nav/Nav'
import User from './User/User'
import NavMobile from './NavMobile/NavMobile'
import Logo from 'components/Logo/Logo'
import WidthContainer from 'components/layout/WidthContainer/WidthContainer'


@withRouter
@connect(({ menu: { items: menu } }) => ({
  menu,
}))
@CSSModules(styles)
export default class Header extends Component {
  render() {
    const { menu } = this.props

    if (isMobile) {
      return <NavMobile menu={menu} />
    }

    return (
      <div styleName="header">
        <WidthContainer styleName="container">
          <Logo withLink />
          <Nav menu={menu} />
          <Logo withLink mobile />
          <User />
        </WidthContainer>
      </div>
    )
  }
}
