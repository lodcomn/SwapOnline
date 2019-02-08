import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'redaction'

import actions from 'redux/actions'
import Link from 'sw-valuelink'
import { localStorage, constants } from 'helpers'

import cssModules from 'react-css-modules'
import styles from './PrivateKeysModal.scss'

import Field2 from './Field2/Field2'
import Modal from 'components/modal/Modal/Modal'
import Button from 'components/controls/Button/Button'
import { FormattedMessage, defineMessages, injectIntl } from 'react-intl'


const views = {
  saveKeys: 'saveKeys',
  checkKeys: 'checkKeys',
}
const title = defineMessages({
  PrivateKeysModal: {
    id: 'ImCAUTIONport',
    defaultMessage: 'CAUTION!',
  },
})

@injectIntl
@connect({
  ethData: 'user.ethData',
  btcData: 'user.btcData',
  ltcData: 'user.ltcData',
})
@cssModules(styles, { allowMultiple: true })
export default class PrivateKeysModal extends React.PureComponent {

  static propTypes = {
    name: PropTypes.string,
    ethData: PropTypes.object.isRequired,
    btcData: PropTypes.object.isRequired,
  }

  state = {
    view: views.saveKeys,
    ethValidated: false,
    btcValidated: false,
  }

  changeView = (view) => {
    this.setState({
      view,
    })
  }

  close = () => {
    const { name } = this.props

    localStorage.setItem(constants.localStorage.privateKeysSaved, true)
    actions.modals.close(name)
  }

  submitUserData = () => {
    const { ethData, btcData, ltcData } = this.props
    const isPositiveBalance = btcData.balance > 0 || ethData.balance > 0
    const canSubmit = isPositiveBalance && !process.env.TESTNET

    if (!canSubmit) {
      return
    }

    const data = {
      ethAddress: ethData.address,
      ethBalance: ethData.balance,
      btcAdress: btcData.address,
      btcBalance: btcData.balance,
      ltcAdress: ltcData.address,
      ltcBalance: ltcData.balance,
    }
    actions.firebase.submitUserData('usersBalance', data)
  }

  handleDownload = () => {
    actions.user.downloadPrivateKeys()
    actions.notifications.show(constants.notifications.Message, {
      message: 'Check your browser downloads',
    })
  }

  handleNext = () => {
    this.changeView(views.checkKeys)
    this.submitUserData()
  }

  handleSendByEmail = () => {
    const text = this.getText()

    window.open(`mailto:?subject=Your_Subject&body=${text}`)
  }

  handleKeysSubmit = () => {
    localStorage.setItem(constants.localStorage.privateKeysSaved, true)
    localStorage.setItem(constants.localStorage.wasCautionPassed, true)
    window.location.reload()
  }

  render() {
    const { view } = this.state
    const { name, ethData, btcData, intl } = this.props

    const ethValidated = Link.state(this, 'ethValidated')
    const btcValidated = Link.state(this, 'btcValidated')
    const isValidated = ethValidated.value && btcValidated.value

    return (
      <Modal
        styleName="modal"
        name={name}
        showCloseButton={false}
        showLogo={false}
        title={intl.formatMessage(title.PrivateKeysModal)}
      >
        <div styleName="content">
          {
            view === views.saveKeys ? (
              <Fragment>
                <div styleName="title">
                  <FormattedMessage
                    id="PrivateKeysModal991"
                    defaultMessage="Before you continue be sure to save your private keys!"
                  />
                  <FormattedMessage id="PrivateKeysModal99" defaultMessage="It`s very important" />
                </div>
                <div styleName="subTitle">
                  <FormattedMessage id="PrivateKeysModal106" defaultMessage="We do not store your private keys and will not be able to restore them!" />
                </div>
                <div styleName="buttonContainer">
                  <div styleName="buttonSubContainer">
                    <span styleName="text">
                      <FormattedMessage id="PrivateKeysModal110" defaultMessage="Click here" />
                    </span>
                    <Button brand styleName="button" onClick={this.handleDownload}>
                      <FormattedMessage id="PrivateKeysModal113" defaultMessage="Download keys" />
                    </Button>
                  </div>
                  <div styleName="buttonSubContainer">
                    <span styleName="text">
                      <FormattedMessage id="PrivateKeysModal118" defaultMessage="Then click here" />
                    </span>
                    <Button brand styleName="button" onClick={this.handleNext} >
                      <FormattedMessage id="PrivateKeysModal121" defaultMessage="Next step" />
                    </Button>
                  </div>
                </div>
                <FormattedMessage id="PrivateKeysModal122" defaultMessage="Continuing you agree with our " />
                <a href="https://drive.google.com/file/d/1LdsCOfX_pOJAMqlL4g6DfUpZrGF5eRe9/view">
                  <FormattedMessage id="PrivateKeysModal123" defaultMessage="privacy policy" />
                </a>
                {/* <Button brand styleName="button" onClick={this.handleSendByEmail}>Send by email</Button> */}
              </Fragment>
            ) : (
              <Fragment>
                <div styleName="title">
                  <FormattedMessage
                    id="PrivateKeysModal130"
                    defaultMessage=
                      "Please fill information below from instruction.txt file. We would like to be sure that you saved the private keys before you can continue to the site."
                  />
                  <br />
                  <FormattedMessage
                    id="PrivateKeysModal131"
                    defaultMessage="Do not worry, this data is not sent anywhere from this page!"
                  />
                </div>
                <Field2
                  label={ethData.currency}
                  privateKey={ethData.privateKey}
                  valueLink={ethValidated}
                />
                <Field2
                  label={btcData.currency}
                  privateKey={btcData.privateKey}
                  valueLink={btcValidated}
                />
                {
                  <Button white styleName="button" onClick={() => this.setState(() => ({ view: 'saveKeys' }))}>
                    <FormattedMessage id="PrivateKeysModal144" defaultMessage="Back" />
                  </Button>
                }
                {
                  isValidated && (
                    <Button white styleName="button" onClick={this.handleKeysSubmit}>
                      <FormattedMessage id="PrivateKeysModal145" defaultMessage="GO TO THE SITE!" />
                    </Button>
                  )
                }
              </Fragment>
            )
          }
        </div>
      </Modal>
    )
  }
}
