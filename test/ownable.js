/* global artifacts contract it assert */
const liteSigFactory = artifacts.require('liteSigFactory')

/**
 * Sanity check for transferring ownership.  Most logic is fully tested in OpenZeppelin lib.
 */
contract('Ownable', (accounts) => {
  it('should deploy', async () => {
    const factoryInstance = await liteSigFactory.new()
    assert.equal(factoryInstance !== null, true, 'Contract should be deployed')

    // Current owner
    let owner = await factoryInstance.owner.call()
    assert.equal(owner, accounts[0], 'Default owner should be account 0')

    // Transfer to account 1
    await factoryInstance.transferOwnership(accounts[1])

    // Should have been updated
    owner = await factoryInstance.owner.call()
    assert.equal(owner, accounts[1], 'Updated owner should be account 1')
  })
})