/* global require, contract, it, artifacts, assert, web3 */
const LightSig = artifacts.require('LightSig')

let DOMAIN_SEPARATOR
const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472'
const NAME_HASH = '0xe0f1e1c99009e212fa1e207fccef2ee9432c52bbf5ef25688885ea0cce69531d'
const TXTYPE_HASH = '0xebbfa7b286e52d30a13889efa8ca90a696b0e6ec0936c8688c357c7d2bdd0430'
const VERSION_HASH = '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6'
const SALT = '0x251543af6a222378665a76fe38dbceae4871a070b7fdaf5c6c30cf758dc33cc0'

const CHAINID = 1

const createSigs = async (signers, multisigAddr, nonce, destinationAddr, value, data) => {
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
    // let sig = await web3.eth.sign(hash, signers[i])
    let sig
    if (i === 0) {
      sig = await web3.eth.accounts.sign(hash, '0x02af0adb7f82c08aa9b77e63aa92e31fcf59caac967d48013ddd6ce19914317d')
    } else {
      sig = await web3.eth.accounts.sign(hash, '0x8eff697843340cf790e9817f9257d40f34ff16ce4433634f7483dad8354f7ec4')
    }

    const strippedSig = sig.slice(2)
    sigR.push(sig.sigR)
    sigS.push(sig.sigS)
    sigV.push(web3.utils.hexToNumber(sig.sigV))
  }

  // if (signers.length > 0) {
  //   console.log('Signer: ' + signers[0])
  //   console.log('Wallet address: ' + multisigAddr)
  //   console.log('Destination: ' + destinationAddr)
  //   console.log('Value: ' + value)
  //   console.log('Data: ' + data)
  //   console.log('Nonce: ' + nonce)
  //   console.log('r: ' + sigR[0])
  //   console.log('s: ' + sigS[0])
  //   console.log('v: ' + sigV[0])
  // }

  return { sigV: sigV, sigR: sigR, sigS: sigS }
}

contract('LightSig', (accounts) => {
  it('should fail without proper owners', async () => {
    try {
      await LightSig.new(null, 2, CHAINID, { from: accounts[0] })
      assert.fail('Should not allow')
    } catch (ex) {}

    try {
      await LightSig.new([], 2, CHAINID, { from: accounts[0] })
      assert.fail('Should not allow')
    } catch (ex) {}

    try {
      await LightSig.new(['0x0'], 2, CHAINID, { from: accounts[0] })
      assert.fail('Should not allow')
    } catch (ex) {}

    try {
      await LightSig.new([accounts[0], accounts[0]], 2, CHAINID, { from: accounts[0] })
      assert.fail('Should not allow')
    } catch (ex) {}

    const signers = [accounts[0], accounts[1]]
    signers.sort()
    signers.reverse()
    try {
      await LightSig.new(signers, 2, CHAINID, { from: accounts[0] })
      assert.fail('Should not allow')
    } catch (ex) {}
  })

  it('should fail without proper requirement', async () => {
    const signers = [accounts[0], accounts[1]]
    signers.sort()

    try {
      await LightSig.new(signers, 0, CHAINID, { from: accounts[0] })
      assert.fail('Should not allow')
    } catch (ex) {}

    try {
      await LightSig.new(signers, 3, CHAINID, { from: accounts[0] })
      assert.fail('Should not allow')
    } catch (ex) {}
  })

  it('should fail with unknown sig and send', async () => {
    const signers = [accounts[0], accounts[1]]
    signers.sort()
    const multisig = await LightSig.new(signers, 2, CHAINID, { from: accounts[0] })

    await web3.eth.sendTransaction({ from: accounts[0], to: multisig.address, value: web3.utils.toWei('0.1', 'ether') })

    // Get the nonce
    const nonce = await multisig.nonce.call()

    const randomAddr = '0xD01c92937400DD1ecE24992B1dc44Aeaa47Ae72a'

    const amount = web3.utils.toWei('0.1', 'ether')
    const data = '0x0'

    // Create random sig
    const badSigners = [accounts[0], accounts[5]]
    badSigners.sort()

    const signatures = await createSigs(badSigners, multisig.address, nonce, randomAddr, amount, data)

    // Try the send
    try {
      await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, randomAddr, amount, data, { from: accounts[0] })
      assert.fail('Invalid signer should throw')
    } catch (ex) {}
  })

  it('should fail with duplicate sig and send', async () => {
    const signers = [accounts[0], accounts[1]]
    signers.sort()
    const multisig = await LightSig.new(signers, 2, CHAINID, { from: accounts[0] })

    await web3.eth.sendTransaction({ from: accounts[0], to: multisig.address, value: web3.utils.toWei('0.1', 'ether') })

    // Get the nonce
    const nonce = await multisig.nonce.call()

    const randomAddr = '0xD01c92937400DD1ecE24992B1dc44Aeaa47Ae72a'

    const amount = web3.utils.toWei('0.1', 'ether')
    const data = '0x0'

    // Create random sig
    const badSigners = [accounts[0], accounts[0]]
    badSigners.sort()

    const signatures = await createSigs(badSigners, multisig.address, nonce, randomAddr, amount, data)

    // Try the send
    try {
      await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, randomAddr, amount, data, { from: accounts[0] })
      assert.fail('Invalid signer should throw')
    } catch (ex) {}
  })

  it('should create and send', async () => {
    const signers = [accounts[0], accounts[1]]
    signers.sort()
    const multisig = await LightSig.new(signers, 2, CHAINID, { from: accounts[0] })

    await web3.eth.sendTransaction({ from: accounts[0], to: multisig.address, value: web3.utils.toWei('0.1', 'ether') })

    // Get the nonce
    const nonce = await multisig.nonce.call()

    const randomAddr = '0xD01c92937400DD1ecE24992B1dc44Aeaa47Ae72a'
    const originalBalance = await web3.eth.getBalance(randomAddr)

    const amount = web3.utils.toWei('0.1', 'ether')
    const data = '0x0'

    const signatures = await createSigs(signers, multisig.address, nonce, randomAddr, amount, data)

    // Try the send
    await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, randomAddr, amount, data, { from: accounts[0] })

    const afterValue = await web3.eth.getBalance(randomAddr)
    const expectedBalance = web3.utils.toBN(originalBalance).add(web3.utils.toBN(amount)).toString()

    assert.equal(afterValue, expectedBalance, 'Amount in random address should be amount sent')
  })

  it('should fail with replay attack', async () => {
    const signers = [accounts[0], accounts[1]]
    signers.sort()
    const multisig = await LightSig.new(signers, 2, CHAINID, { from: accounts[0] })

    await web3.eth.sendTransaction({ from: accounts[0], to: multisig.address, value: web3.utils.toWei('0.1', 'ether') })

    // Get the nonce
    const nonce = await multisig.nonce.call()

    const randomAddr = '0xD01c92937400DD1ecE24992B1dc44Aeaa47Ae72a'
    const originalBalance = await web3.eth.getBalance(randomAddr)

    const amount = web3.utils.toWei('0.1', 'ether')
    const data = '0x0'

    const signatures = await createSigs(signers, multisig.address, nonce, randomAddr, amount, data)

    // Try the send
    await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, randomAddr, amount, data, { from: accounts[0] })

    const afterValue = await web3.eth.getBalance(randomAddr)
    const expectedBalance = web3.utils.toBN(originalBalance).add(web3.utils.toBN(amount)).toString()

    assert.equal(afterValue, expectedBalance, 'Amount in random address should be amount sent')

    try {
      await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, randomAddr, amount, data, { from: accounts[0] })
      assert.fail('Replay should throw')
    } catch (ex) {}
  })
})
