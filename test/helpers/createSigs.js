let DOMAIN_SEPARATOR

const CHAINID = 1234

const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472'
const NAME_HASH = '0xe0f1e1c99009e212fa1e207fccef2ee9432c52bbf5ef25688885ea0cce69531d'
const VERSION_HASH = '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6'
const SALT = '0x251543af6a222378665a76fe38dbceae4871a070b7fdaf5c6c30cf758dc33cc0'
const TXTYPE_HASH = '0xebbfa7b286e52d30a13889efa8ca90a696b0e6ec0936c8688c357c7d2bdd0430'

const createSigs = async (web3, signers, multisigAddr, nonce, destinationAddr, value, data) => {
  const domainData = EIP712DOMAINTYPE_HASH + NAME_HASH.slice(2) + VERSION_HASH.slice(2) + CHAINID.toString('16').padStart(64, '0') + multisigAddr.slice(2).padStart(64, '0') + SALT.slice(2)
  DOMAIN_SEPARATOR = web3.utils.sha3(domainData, { encoding: 'hex' })

  const destInput = destinationAddr.slice(2).padStart(64, '0')
  const valInput = web3.utils.toBN(value).toString(16).padStart(64, '0')
  const dataInput = web3.utils.sha3(data, { encoding: 'hex' }).slice(2)
  const nonceInput = nonce.toString(16).padStart(64, '0')

  const txInput = TXTYPE_HASH + destInput + valInput + dataInput + nonceInput
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
