import React from "react";

import { RouteComponentProps, withRouter, HashRouter } from "react-router-dom";
import actions from "redux/actions";
import { connect } from "redaction";
import moment from "moment-with-locales-es6";
import {
  constants,
  localStorage,
} from "helpers";

import CSSModules from "react-css-modules";
import styles from "./App.scss";
import "scss/app.scss";

import { createSwapApp } from "instances/newSwap";
import SplashScreen from 'pages/SplashScreen'
import Core from "containers/Core/Core";
import Header from "components/Header/Header";
import Footer from "components/Footer/Footer";
import Loader from "components/loaders/Loader/Loader";
import PreventMultiTabs from "components/PreventMultiTabs/PreventMultiTabs";
import RequestLoader from "components/loaders/RequestLoader/RequestLoader";
import ModalConductor from "components/modal/ModalConductor/ModalConductor";
import WidthContainer from "components/layout/WidthContainer/WidthContainer";
import NotificationConductor from "components/notification/NotificationConductor/NotificationConductor";
import Seo from "components/Seo/Seo";

import config from "helpers/externalConfig"

import backupUserData from 'plugins/backupUserData'
import redirectTo from 'helpers/redirectTo'
import links from 'helpers/links'

import { FormattedMessage, injectIntl, defineMessages } from 'react-intl'

import metamask from 'helpers/metamask'


const userLanguage = (navigator.userLanguage || navigator.language || "en-gb").split("-")[0];
moment.locale(userLanguage)


const metamaskNetworks = defineMessages({
  mainnet: {
    id: `MetamaskNetworkAlert_NetworkMainnet`,
    defaultMessage: `Основная сеть (Mainnet)`,
  },
  testnet: {
    id: `MetamaskNetworkAlert_NetworkTestnet`,
    defaultMessage: `Тестовая сеть (Ropsten)`,
  },
})



@withRouter
@connect(({ currencies: { items: currencies }, modals, ui: { dashboardModalsAllowed } }) => ({
  currencies,
  isVisible: "loader.isVisible",
  ethAddress: "user.ethData.address",
  btcAddress: "user.btcData.address",
  ghostAddress: "user.ghostData.address",
  nextAddress: "user.nextData.address",
  tokenAddress: "user.tokensData.swap.address",
  modals,
  dashboardModalsAllowed,
}))
@CSSModules(styles, { allowMultiple: true })
class App extends React.Component<RouteComponentProps<any>, any> {

  prvMultiTab: any
  localStorageListener: any

  constructor(props) {
    super(props)

    this.localStorageListener = null

    this.prvMultiTab = {
      reject: null,
      enter: null,
      switch: null
    };

    this.state = {
      splashSreenIsOpen: false,
      fetching: false,
      multiTabs: false,
      error: "",
    }
  }

  checkSplashScreenDisplay = () => {
    const swapDisalbeStarter = this.getCookie('swapDisalbeStarter')
    const isWalletCreate = localStorage.getItem('isWalletCreate')

    if (
      // TODO: from webpack
      // !isWidgetBuild &&
      swapDisalbeStarter !== 'true' && isWalletCreate === null
    ) {
      this.setState(() => ({
        splashSreenIsOpen: true,
      }))
    }
  }

  getCookie = (cookieName) => {
    const name = cookieName + '='
    const parametersArr = document.cookie.split(';')

    for (let i = 0; i < parametersArr.length; i++) {
      let parameter = parametersArr[i]

      while (parameter.charAt(0) == ' ') {
        parameter = parameter.substring(1)
      }

      if (parameter.indexOf(name) == 0) {
        return parameter.substring(name.length, parameter.length)
      }
    }

    return ''
  }

  generadeId(callback) {
    const newId = Date.now().toString()

    this.setState(
      {
        appID: newId
      },
      () => {
        callback(newId);
      }
    )
  }

  preventMultiTabs(isSwitch) {
    this.generadeId(newId => {
      if (isSwitch) {
        localStorage.setItem(constants.localStorage.switch, newId)
      }

      const onRejectHandle = () => {
        const { appID } = this.state;
        const id = localStorage.getItem(constants.localStorage.reject)

        if (id && id !== appID) {
          this.setState({ multiTabs: true });

          localStorage.unsubscribe(this.prvMultiTab.reject)
          localStorage.unsubscribe(this.prvMultiTab.enter)
          localStorage.unsubscribe(this.prvMultiTab.switch)
          localStorage.removeItem(constants.localStorage.reject)
        }
      }

      const onEnterHandle = () => {
        const { appID } = this.state
        const id = localStorage.getItem(constants.localStorage.enter)
        const switchId = localStorage.getItem(constants.localStorage.switch)

        if (switchId && switchId === id) return

        localStorage.setItem(constants.localStorage.reject, appID)
      }

      const onSwitchHangle = () => {
        const switchId = localStorage.getItem(constants.localStorage.switch)
        const { appID } = this.state

        if (appID !== switchId) {
          this.setState({
            multiTabs: true
          })

          localStorage.unsubscribe(this.prvMultiTab.reject)
          localStorage.unsubscribe(this.prvMultiTab.enter)
          localStorage.unsubscribe(this.prvMultiTab.switch)
        }
      }

      this.prvMultiTab.reject = localStorage.subscribe(constants.localStorage.reject, onRejectHandle)
      this.prvMultiTab.enter = localStorage.subscribe(constants.localStorage.enter, onEnterHandle)
      this.prvMultiTab.switch = localStorage.subscribe(constants.localStorage.switch, onSwitchHangle)

      localStorage.setItem(constants.localStorage.enter, newId)
    })
  }

  popupIncorrectNetwork() {
    //@ts-ignore
    const { intl } = this.props

    actions.modals.open(constants.modals.AlertModal, {
      title: (
        <FormattedMessage 
          id="MetamaskNetworkAlert_Title"
          defaultMessage="Внимание"
        />
      ),
      message: (
        <FormattedMessage
          id="MetamaskNetworkAlert_Message"
          defaultMessage="Для продолжения выберите в кошельке {walletTitle} &quot;{network}&quot; или отключите кошелек"
          values={{
            network: intl.formatMessage(metamaskNetworks[config.entry]),
            walletTitle: metamask.web3connect.getProviderTitle(),
          }}
        />
      ),
      labelOk: (
        <FormattedMessage
          id="MetamaskNetworkAlert_OkDisconnectWallet"
          defaultMessage="Отключить внешний кошелек"
        />
      ),
      dontClose: true,
      okButtonAutoWidth: true,
      callbackOk: () => {
        metamask.disconnect()
        actions.modals.close(constants.modals.AlertModal)
      },
    })
  }

  processMetamask () {
    metamask.web3connect.onInit(() => {
      const _checkChain = () => {
        if (metamask.isCorrectNetwork()) {
          actions.modals.close(constants.modals.AlertModal)
        } else {
          this.popupIncorrectNetwork()
        }
      }

      metamask.web3connect.on('chainChanged', _checkChain)
      metamask.web3connect.on('connected', _checkChain)

      if (metamask.isConnected()
        && !metamask.isCorrectNetwork()
      ) {
        this.popupIncorrectNetwork()
      }
    })
  }

  processUserBackup () {
    new Promise(async (resolve) => {
      const wpLoader = document.getElementById('wrapper_element')

      const hasServerBackup = await backupUserData.hasServerBackup()
      console.log('has server backup', hasServerBackup)
      if (backupUserData.isUserLoggedIn()
        && backupUserData.isUserChanged()
        && hasServerBackup
      ) {
        console.log('do restore user')
        backupUserData.restoreUser().then((isRestored) => {
          console.log('is restored', isRestored, constants.localStorage.isWalletCreate)
          if (isRestored) {
            if (localStorage.getItem(constants.localStorage.isWalletCreate)) {
              redirectTo(links.home)
              window.location.reload()
            } else {
              redirectTo(links.createWallet)
              if (wpLoader) wpLoader.style.display = 'none'
            }
          }
        })
      } else {
        if (backupUserData.isUserLoggedIn()
          && backupUserData.isFirstBackup()
          || !hasServerBackup
        ) {
          console.log('Do backup user')
          backupUserData.backupUser().then(() => {
            if (!localStorage.getItem(constants.localStorage.isWalletCreate)) {
              redirectTo(links.createWallet)
            }
            if (wpLoader) wpLoader.style.display = 'none'
          })
        } else {
          if (wpLoader) wpLoader.style.display = 'none'
        }
      }
      resolve(`ready`)
    })
  }

  async componentDidMount() {
    //@ts-ignore
    const { currencies } = this.props

    this.preventMultiTabs(false)

    // Default Farm init options
    if (config.entry === 'testnet') {
      window.farm = {
        farmAddress: '0xa21FC7e1E31269b3AA0E17fF1F1a23C035cE207c',
        stakingAddress: '0xF6fF95D53E08c9660dC7820fD5A775484f77183A', // Yeenus
        rewardsAddress: '0x101848D5C5bBca18E6b4431eEdF6B95E9ADF82FA', // Weenus
      }
    }

    const isWalletCreate = localStorage.getItem(constants.localStorage.isWalletCreate)

    if (!isWalletCreate) {
      currencies.forEach(({ name }) => {
        if (name !== "BTC") {
          actions.core.markCoinAsHidden(name)
        }
      })
    }

    this.processUserBackup()
    this.processMetamask()

    this.checkIfDashboardModalsAllowed()
    window.actions = actions

    window.onerror = (error) => {
      console.error('App error: ', error)
    }

    try {
      const db = indexedDB.open("test")
      db.onerror = (e) => {
        console.error('db error', e)
      }
    } catch (e) {
      console.error('db error', e)
    }

    actions.user.sign()
    await createSwapApp()

    this.setState(() => ({ fetching: true }))
    window.prerenderReady = true;

    const appInstalled = (e) => {
      alert(
        userLanguage === 'ru'
          ? 'Подождите пока приложение устанавливается'
          : 'Wait while application is installing'
      )
      window.removeEventListener('appinstalled', appInstalled)
    }

    window.addEventListener('appinstalled', appInstalled)

    this.checkSplashScreenDisplay()
  }

  componentDidUpdate(prevProps, prevState) {
    const { splashSreenIsOpen } = this.state

    if (prevState.splashSreenIsOpen !== splashSreenIsOpen) {
      this.checkSplashScreenDisplay()
    }

    this.checkIfDashboardModalsAllowed()
  }

  checkIfDashboardModalsAllowed = () => {
    const dashboardModalProvider = document.querySelector('.__modalConductorProvided__')
    //@ts-ignore
    if (dashboardModalProvider && !this.props.dashboardModalsAllowed) {
      return actions.ui.allowDashboardModals()
    //@ts-ignore
    } else if (dashboardModalProvider && this.props.dashboardModalsAllowed) {
      return null
    }
    return actions.ui.disallowDashboardModals()
  }

  handleSwitchTab = () => {
    this.setState({
      multiTabs: false
    });
    this.preventMultiTabs(true)
  }

  overflowHandler = () => {
    //@ts-ignore
    const { modals, dashboardModalsAllowed } = this.props
    const isAnyModalCalled = Object.keys(modals).length > 0

    const isDark = localStorage.getItem(constants.localStorage.isDark)

    if (typeof document !== 'undefined' && isAnyModalCalled && !dashboardModalsAllowed) {
      document.body.classList.remove('overflowY-default')
      document.body.classList.add('overflowY-hidden')
    } else {
      document.body.classList.remove('overflowY-hidden')
      document.body.classList.add('overflowY-default')
    }
    if (typeof document !== 'undefined' && isAnyModalCalled && dashboardModalsAllowed) {
      document.body.classList.remove('overflowY-dashboardView-default')
      document.body.classList.add('overflowY-dashboardView-hidden')
    } else {
      document.body.classList.remove('overflowY-dashboardView-hidden')
      document.body.classList.add('overflowY-dashboardView-default')
    }

    if (isDark) {
      document.body.classList.add('darkTheme')
    }
  }

  render() {
    const { fetching, multiTabs, splashSreenIsOpen } = this.state
    //@ts-ignore
    const { children, ethAddress, btcAddress, ghostAddress, nextAddress, tokenAddress, history, dashboardModalsAllowed } = this.props

    this.overflowHandler()

    const isFetching = !ethAddress || !btcAddress || !ghostAddress || !nextAddress || (!tokenAddress && config && !config.isWidget) || !fetching

    const isWidget = history.location.pathname.includes("/exchange") && history.location.hash === "#widget"
    const isCalledFromIframe = window.location !== window.parent.location
    const isWidgetBuild = config && config.isWidget

    if (isWidgetBuild && localStorage.getItem(constants.localStorage.didWidgetsDataSend) !== "true") {
      localStorage.setItem(constants.localStorage.didWidgetsDataSend, true);
    }

    if (multiTabs) {
      return <PreventMultiTabs onSwitchTab={this.handleSwitchTab} />
    }

    if (isFetching) {
      //@ts-ignore
      return <Loader />
    }

    const isSeoDisabled = isWidget || isWidgetBuild || isCalledFromIframe

    return (
      <HashRouter>
        <div styleName="compressor">
          {!isSeoDisabled && <Seo location={history.location} />}

          {!splashSreenIsOpen ? (
            <>
              <WidthContainer>
                <Header />
                <main>{children}</main>
              </WidthContainer>
              <Core />
              <Footer />
              <RequestLoader />
            </>
          ) : (
            <SplashScreen />
          )}

          {!dashboardModalsAllowed && <ModalConductor history={history}/>}
          <NotificationConductor history={history} />
        </div>
      </HashRouter>
    )
  }
}

export default withRouter(injectIntl(App))
