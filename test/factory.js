/* global contract, it, artifacts, assert */
const { expectRevert } = require('openzeppelin-test-helpers')

const liteSigFactory = artifacts.require('liteSigFactory')
const liteSig = artifacts.require('liteSig')

const constants = require('./helpers/constants')
const errors = require('./helpers/errorMessages')

const { generateOrderedRandomAddressList, getDomainSeparator } = require('./helpers/addressLists.js')

contract('liteSig Factory', (accounts) => {
  it('should deploy through factory', async () => {
    const addrs = generateOrderedRandomAddressList(3)

    const deployedFactory = await liteSigFactory.new()

    const deployReceipt = await deployedFactory.createliteSig('0x0', addrs, 2, constants.CHAINID)

    // Pull the deployted address from the logs
    const deployed = await liteSig.at(deployReceipt.logs[0].args[0])

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

  it('should deploy with admin checks', async () => {
    const addrs = generateOrderedRandomAddressList(3)

    const deployedFactory = await liteSigFactory.new()

    // Should succeed with default account
    await deployedFactory.createliteSig('0x0', addrs, 2, constants.CHAINID)

    // Should fail with non admin
    await expectRevert(deployedFactory.createliteSig('0x0', addrs, 2, constants.CHAINID, { from: accounts[2] }), errors.NOT_ADMIN_REVERT)

    // Add account 2 as admin
    await deployedFactory.addAdmin(accounts[2])

    // Should succeed now
    await deployedFactory.createliteSig('0x01', addrs, 2, constants.CHAINID, { from: accounts[2] })

    // Remove acct 2
    await deployedFactory.removeAdmin(accounts[2])

    // Should fail again
    await expectRevert(deployedFactory.createliteSig('0x02', addrs, 2, constants.CHAINID, { from: accounts[2] }), errors.NOT_ADMIN_REVERT)
  })
})
