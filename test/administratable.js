/* global artifacts contract it assert */
const { expectRevert, expectEvent } = require('openzeppelin-test-helpers')
const LightSigFactory = artifacts.require('LightSigFactory')
const errors = require('./helpers/errorMessages')

contract('Administratable', (accounts) => {
  it('should deploy', async () => {
    const factoryInstance = await LightSigFactory.new()
    assert.equal(factoryInstance !== null, true, 'Contract should be deployed')
  })

  it('should allow adding and removing for owner', async () => {
    const factoryInstance = await LightSigFactory.new()

    // Validate acct 1 is not an admin by default
    let isAdmin = await factoryInstance.isAdministrator(accounts[1])
    assert.equal(isAdmin, false, 'Account should not be admin by default')

    // Adding an admin to the list should be successful for the owner (address[0])
    await factoryInstance.addAdmin(accounts[1], { from: accounts[0] })
    isAdmin = await factoryInstance.isAdministrator.call(accounts[1])
    assert.equal(isAdmin, true, 'Owner should be able to add admin')

    // Removing the admin should be successful for the owner (address[0])
    await factoryInstance.removeAdmin(accounts[1], { from: accounts[0] })
    isAdmin = await factoryInstance.isAdministrator.call(accounts[1])
    assert.equal(isAdmin, false, 'Owner should be able to remove admin')
  })

  it('should preventing adding and removing for non-owner', async () => {
    const factoryInstance = await LightSigFactory.new()

    // Validate acct 2 is not an admin by default
    const isAdmin = await factoryInstance.isAdministrator(accounts[2])
    assert.equal(isAdmin, false, 'Account should not be admin by default')

    // Adding an address to the list should fail for non-owner (address[1])
    await expectRevert(factoryInstance.addAdmin(accounts[2], { from: accounts[1] }), errors.NOT_OWNER)

    // Adding the address to admin list should not impact this - only owner can add other admins
    await factoryInstance.addAdmin(accounts[1], { from: accounts[0] })
    await expectRevert(factoryInstance.addAdmin(accounts[2], { from: accounts[1] }), errors.NOT_OWNER)

    // Verify a non-owner can't remove an admin (including itself)
    await expectRevert(factoryInstance.removeAdmin(accounts[1], { from: accounts[1] }), errors.NOT_OWNER)
    await expectRevert(factoryInstance.removeAdmin(accounts[1], { from: accounts[2] }), errors.NOT_OWNER)
  })

  it('should emit events for adding admins', async () => {
    const factoryInstance = await LightSigFactory.new()

    const { logs } = await factoryInstance.addAdmin(accounts[3], { from: accounts[0] })
    expectEvent.inLogs(logs, 'AdminAdded', { addedAdmin: accounts[3], addedBy: accounts[0] })
  })

  it('should emit events for removing admins', async () => {
    const factoryInstance = await LightSigFactory.new()

    await factoryInstance.addAdmin(accounts[3], { from: accounts[0] })
    const { logs } = await factoryInstance.removeAdmin(accounts[3], { from: accounts[0] })

    expectEvent.inLogs(logs, 'AdminRemoved', { removedAdmin: accounts[3], removedBy: accounts[0] })
  })

  it('should preventing adding an admin when already an admin', async () => {
    const factoryInstance = await LightSigFactory.new()

    // The first add should succeed
    await factoryInstance.addAdmin(accounts[1], { from: accounts[0] })

    // The second add should fail
    await expectRevert(factoryInstance.addAdmin(accounts[1], { from: accounts[0] }), errors.ALREADY_ADMIN)
  })

  it('should preventing removing an admin when it is not an admin', async () => {
    const factoryInstance = await LightSigFactory.new()

    // Add an accct to the admin list
    await factoryInstance.addAdmin(accounts[1], { from: accounts[0] })

    // The first removal should succeed.
    await factoryInstance.removeAdmin(accounts[1], { from: accounts[0] })

    // The second removal should fail
    await expectRevert(factoryInstance.removeAdmin(accounts[1], { from: accounts[0] }), errors.NOT_ADMIN)
  })
})
