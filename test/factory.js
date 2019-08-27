/* global contract, it, artifacts, assert, web3 */
const { expectRevert } = require('openzeppelin-test-helpers')

const LightSigFactory = artifacts.require('LightSigFactory')
const LightSig = artifacts.require('LightSig')

const CHAINID = 1234

const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472'
const NAME_HASH = '0xe0f1e1c99009e212fa1e207fccef2ee9432c52bbf5ef25688885ea0cce69531d'
const VERSION_HASH = '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6'
const SALT = '0x251543af6a222378665a76fe38dbceae4871a070b7fdaf5c6c30cf758dc33cc0'

const getDomainSeparator = (address) => {
  const domainData = EIP712DOMAINTYPE_HASH + NAME_HASH.slice(2) + VERSION_HASH.slice(2) + CHAINID.toString('16').padStart(64, '0') + address.slice(2).padStart(64, '0') + SALT.slice(2)
  return web3.utils.sha3(domainData, { encoding: 'hex' })
}

const generateRandomAddressList = (count) =>
  [...Array(count)].map((_) => web3.eth.accounts.create().address)

// Need  to sort with case insensitive comparator
const generateOrderedRandomAddressList = (count) =>
  generateRandomAddressList(count).sort((addr1, addr2) => addr1.localeCompare(addr2))

contract('LightSig Factory', (accounts) => {
  it('should deploy through factory', async () => {
    const addrs = generateOrderedRandomAddressList(3)

    const deployedFactory = await LightSigFactory.new()

    const deployReceipt = await deployedFactory.createLightSig(123, addrs, 2, CHAINID)

    // Pull the deployted address from the logs
    const deployed = await LightSig.at(deployReceipt.logs[0].args[1])

    // Validate owners list is correct
    addrs.map(async (addr, i) => {
      const owner = await deployed.owners.call(i)
      assert.equal(owner, addr, 'Owner addresses should be set')
    })

    // Invalid index should not be allowed
    await expectRevert.assertion(deployed.owners.call(3))

    assert.equal(await deployed.nonce.call(), 0, 'Nonce should be set')
    assert.equal(await deployed.requiredSignatures.call(), 2, 'requiredSignatures should be set')
    assert.equal(await deployed.DOMAIN_SEPARATOR.call(), getDomainSeparator(deployed.address), 'DOMAIN_SEPARATOR should be set')
  })
})
