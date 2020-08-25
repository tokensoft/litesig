/* global contract, it, artifacts, assert, web3 */
const crypto = require('crypto')

const LiteSigFactory = artifacts.require('LiteSigFactory')
const LiteSig = artifacts.require('LiteSig')
const Proxy = artifacts.require('Proxy')

const { generateOrderedRandomAddressList } = require('./helpers/addressLists.js')

const constants = require('./helpers/constants')

function buildCreate2Address (contractAddress, saltHex, bytecode) {
  return web3.utils.toChecksumAddress(`0x${web3.utils.sha3(`0x${[
    'ff',
    contractAddress,
    saltHex,
    web3.utils.sha3(bytecode)
  ].map(x => x.replace(/0x/, ''))
    .join('')}`).slice(-40)}`)
}

contract('LiteSig Addresses', (accounts) => {
  it('should be able to determine address ahead of time', async () => {
    // Deploy the factory
    const logicInstance = await LiteSig.new()
    const walletFactory = await LiteSigFactory.new(logicInstance.address)

    // Spin over handler creation
    for (let i = 0; i < 10; i++) {
      // Generate random bytes
      const random = crypto.randomBytes(10)

      const addrs = generateOrderedRandomAddressList(3)

      // Get the sha 256 hash
      const hash = crypto.createHash('sha256')
      hash.update(random)
      const hashToSubmit = hash.digest('hex')

      // The address needs to be ABI encoded
      const encodedAddressParameter = web3.eth.abi.encodeParameter('address', logicInstance.address)
      
      // Concat the constructor arg that will be deployed to the end for the proxy contract constructor
      const encodedBytes = `${Proxy.bytecode}${encodedAddressParameter.slice(2)}`      

      const expectedAddress = buildCreate2Address(walletFactory.address, hashToSubmit, encodedBytes)

      // Deploy handler - use index as salt bytes
      const deployReceipt = await walletFactory.createLiteSig('0x' + hashToSubmit, addrs, 2, constants.CHAINID)
      assert.equal(expectedAddress, deployReceipt.logs[0].args[0], 'Expected Address should match')
    }
  })
})
