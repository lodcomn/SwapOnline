import sdk from 'stellar-sdk'
import { getState } from 'redux/core'
import { constants, xlm } from 'helpers'
import reducers from 'redux/core/reducers'


const server = xlm.initServer()


const login = (privateKey) => {
  const keypair = privateKey
    ? sdk.Keypair.fromSecret(privateKey)
    : sdk.Keypair.random()
  localStorage.setItem(constants.privateKeyNames.xlm, keypair.secret())
  const account = new sdk.Account(keypair.publicKey(), '1')
  const address = keypair.publicKey()
  const data = {
    account,
    keypair,
    address,
  }
  console.info('Logged in with Stellar', data)
  reducers.user.setAuthData({ name: 'xlmData', data })
}

const initAccount = (address) => {
  const admin = sdk.Keypair.fromSecret('SDA7HRNGXC5S4AWMTANDVBXLPVSDMRXGAURMACE2D3NQDO2M7I2STWUG')
  console.log('admin', admin)
  console.log('admin', admin.publicKey())
  return runOperation(admin, 'createAccount', {
    destination: address,
    startingBalance: String(50),
  })
}

const getBalance = () => {
  const { user: { xlmData: { address } } } = getState()

  if (typeof address !== 'string') {
    return
  }

  return server.loadAccount(address)
    .then(({ balances }) => {

      reducers.user.setBalance({ name: 'xlmData', amount: balances || 0 })
      return balances
    }).catch(error => {
      reducers.user.setBalance({ name: 'xlmData', amount: 0 })
    })
}

const runOperation = (from, type, options) => {
  const operationBuilder = sdk.Operation[type]
  if (!operationBuilder) {
    return Promise.reject(new Error(`Unknown operation type: ${type}`))
  }

  let transaction

  return server.loadAccount(from.publicKey())
    .then(sourceAccount => {
      const operation = operationBuilder.call(sdk.Operation, options)
      transaction = new sdk.TransactionBuilder(sourceAccount)
        .addOperation(operation)
        .build()

      transaction.sign(from)
      return server.submitTransaction(transaction)
    })
}

export default {
  login,
  getBalance,
}
