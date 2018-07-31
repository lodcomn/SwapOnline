import reducers from 'redux/core/reducers'
import TagManager from 'react-gtm-module'


const addEvent = (name) => reducers.addEvent(name)
const dataEvent = (eventName) => {

  window.dataLayer = window.dataLayer ? window.dataLayer : []
  window.dataLayer.push({ 'event' : eventName })

  console.log(window.dataLayer)
}

const tagManagerArgs = {
  gtmId: 'GTM-WK72GSV',
  dataLayerName: 'dataLayer',
}

TagManager.initialize(tagManagerArgs)

export default {
  addEvent,
  dataEvent,
}
