let DOMAIN_SEPARATOR

const constants = require('./constants')

const createSigs = async (web3, signers, multisigAddr, nonce, destinationAddr, value, data, broadcastAddress) => {
  const domainData = constants.EIP712DOMAINTYPE_HASH + constants.NAME_HASH.slice(2) + constants.VERSION_HASH.slice(2) + constants.CHAINID.toString('16').padStart(64, '0') + multisigAddr.slice(2).padStart(64, '0') + constants.SALT.slice(2)
  DOMAIN_SEPARATOR = web3.utils.sha3(domainData, { encoding: 'hex' })

  const destInput = destinationAddr.slice(2).padStart(64, '0')
  const valInput = web3.utils.toBN(value).toString(16).padStart(64, '0')
  const dataInput = web3.utils.sha3(data, { encoding: 'hex' }).slice(2)
  const nonceInput = nonce.toString(16).padStart(64, '0')
  const originInput = broadcastAddress.slice(2).padStart(64, '0')

  const txInput = constants.TXTYPE_HASH + destInput + valInput + dataInput + nonceInput + originInput
  const txInputHash = web3.utils.sha3(txInput, { encoding: 'hex' })

  const input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + txInputHash.slice(2)
  const hash = web3.utils.sha3(input, { encoding: 'hex' })

  const sigV = []
  const sigR = []
  const sigS = []

  for (var i = 0; i < signers.length; i++) {
    const sig = await web3.eth.accounts.sign(hash, signers[i].privateKey)

    // const strippedSig = sig.slice(2)
    sigV.push(sig.v)
    sigR.push(sig.r)
    sigS.push(sig.s)
  }

  return { sigV: sigV, sigR: sigR, sigS: sigS }
}

module.exports = createSigs
