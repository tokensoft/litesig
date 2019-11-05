/* global contract, it, artifacts, assert */
const errors = require('./helpers/errorMessages')
const { expectRevert } = require('openzeppelin-test-helpers')

const LightSig = artifacts.require('LightSig')

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
const constants = require('./helpers/constants')

const { generateOrderedRandomAddressList, getDomainSeparator } = require('./helpers/addressLists.js')

contract('LightSig Deploy', (accounts) => {
  it('should deploy', async () => {
    const addresses = generateOrderedRandomAddressList(5)
    const multisig = await LightSig.new()
    await multisig.init(addresses, 2, constants.CHAINID)
  })

  it('should verify initialization', async () => {
    const multisig = await LightSig.new()
    await expectRevert(multisig.submit([], [], [], accounts[0], '0', '0x0'), errors.NOT_INITIALIZED)
  })

  it('should verify owners length', async () => {
    const multisig = await LightSig.new()
    await expectRevert(multisig.init([], 0, constants.CHAINID), errors.INIT_OWNER_LIST_FAIL)
    await expectRevert(multisig.init(generateOrderedRandomAddressList(11), 0, constants.CHAINID), errors.INIT_OWNER_LIST_FAIL)
  })

  it('should verify requirement value', async () => {
    let multisig = await LightSig.new()
    await expectRevert(multisig.init(generateOrderedRandomAddressList(5), 0, constants.CHAINID), errors.INIT_REQ_VAL_FAIL)
    multisig = await LightSig.new()
    await expectRevert(multisig.init(generateOrderedRandomAddressList(5), 6, constants.CHAINID), errors.INIT_REQ_VAL_FAIL)
  })

  it('should verify the owner list is valid', async () => {
    //  Insert a 0 address
    let list = generateOrderedRandomAddressList(5)
    list[0] = ZERO_ADDR
    let multisig = await LightSig.new()
    await expectRevert(multisig.init(list, 2, constants.CHAINID), errors.INIT_OWNER_LIST_INVALID)

    //  Insert a 0 address into the middle
    list = generateOrderedRandomAddressList(5)
    list[3] = ZERO_ADDR
    multisig = await LightSig.new()
    await expectRevert(multisig.init(list, 2, constants.CHAINID), errors.INIT_OWNER_LIST_INVALID)

    // Reverse the order of addresses
    list = generateOrderedRandomAddressList(5).reverse()
    multisig = await LightSig.new()
    await expectRevert(multisig.init(list, 2, constants.CHAINID), errors.INIT_OWNER_LIST_INVALID)

    // Duplicate an address
    list = generateOrderedRandomAddressList(5).reverse()
    list[3] = list[4]
    multisig = await LightSig.new()
    await expectRevert(multisig.init(list, 2, constants.CHAINID), errors.INIT_OWNER_LIST_INVALID)
  })

  it('should save init params', async () => {
    const addrs = generateOrderedRandomAddressList(3)
    const deployed = await LightSig.new()
    await deployed.init(addrs, 2, constants.CHAINID)

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
