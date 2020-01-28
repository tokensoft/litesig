/* global contract, it, artifacts, assert, web3 */
const LiteSig = artifacts.require('LiteSig')
const constants = require('./helpers/constants')
const errors = require('./helpers/errorMessages')
const { expectRevert, expectEvent, time } = require('@openzeppelin/test-helpers')
const createSigs = require('./helpers/createSigs')
const { generateOrderedRandomAccountList } = require('./signatureValidation')

contract('LiteSig Recovery', (accounts) => {
  it('should validate recover inputs', async () => {
    // Generate the multisig
    const fullCosignerList = [accounts[0], accounts[1], accounts[2]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    const multisig = await LiteSig.new()
    await multisig.init(fullCosignerList, 2, constants.CHAINID)

    const recoveryOwners = [accounts[3], accounts[4], accounts[5]].sort((addr1, addr2) => addr1.localeCompare(addr2))

    // Verify only an owner can call recovery functions
    await expectRevert(multisig.startRecover(recoveryOwners, { from: accounts[3] }), errors.NOT_ADMIN_REVERT)
    await expectRevert(multisig.cancelRecover({ from: accounts[3] }), errors.NOT_ADMIN_REVERT)
    await expectRevert(multisig.finalizeRecover({ from: accounts[3] }), errors.NOT_ADMIN_REVERT)

    // Verify the number of recovery owners is checked to match the existing length
    const recoveryOwnersShort = [accounts[3], accounts[4]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    const recoveryOwnersLong = [accounts[3], accounts[4], accounts[5], accounts[6]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    await expectRevert(multisig.startRecover(recoveryOwnersShort, { from: accounts[0] }), errors.INVALID_RECOVER_LIST)
    await expectRevert(multisig.startRecover(recoveryOwnersLong, { from: accounts[0] }), errors.INVALID_RECOVER_LIST)

    // Validate the recovery address order is checked
    const reversedRecoveryOwners = recoveryOwners.reverse()
    await expectRevert(multisig.startRecover(reversedRecoveryOwners, { from: accounts[0] }), errors.INIT_OWNER_LIST_INVALID)
  })

  it('should allow a recover', async () => {
    // Generate the multisig
    const fullCosignerList = [accounts[0], accounts[1], accounts[2]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    const multisig = await LiteSig.new()
    await multisig.init(fullCosignerList, 2, constants.CHAINID)

    // Start the recovery
    const recoveryOwners = [accounts[3], accounts[4], accounts[5]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    let receipt = await multisig.startRecover(recoveryOwners)

    // Verify event was fired
    expectEvent(receipt, 'RecoverStarted', { owner: accounts[0] })

    // Verify recovery mode
    assert.equal(await multisig.inRecoveryMode.call(), true, 'Recover mode should be set')

    // Verify recovery addresses
    recoveryOwners.map(async (addr, i) => {
      const owner = await multisig.recoveryOwners.call(i)
      assert.equal(owner, addr, 'Recovery Owner addresses should be set')
    })

    // Time travel 175 days - ensure you can't recover yet
    await time.increase(86400 * 175)
    await expectRevert(multisig.finalizeRecover(), errors.INVALID_TIME_RECOVER)

    // Time travel 5 days - should succeed
    await time.increase(86408 * 5)
    receipt = await multisig.finalizeRecover({ from: accounts[1] })

    // Verify event
    expectEvent(receipt, 'RecoverFinalized', { owner: accounts[1] })

    // Verify new owners
    recoveryOwners.map(async (addr, i) => {
      const owner = await multisig.owners.call(i)
      assert.equal(owner, addr, 'Owner addresses should be set')
    })

    // Verify recovery mode
    assert.equal(await multisig.inRecoveryMode.call(), false, 'Rover mode should be cleared')
  })

  it('should allow a cancel of recover', async () => {
    // Generate the multisig
    const fullCosignerList = [accounts[0], accounts[1], accounts[2]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    const multisig = await LiteSig.new()
    await multisig.init(fullCosignerList, 2, constants.CHAINID)

    // Start the recovery
    const recoveryOwners = [accounts[3], accounts[4], accounts[5]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    await multisig.startRecover(recoveryOwners)

    // Verify a non-wner can't cancel
    await expectRevert(multisig.cancelRecover({ from: accounts[3] }), errors.NOT_ADMIN_REVERT)

    // Trigger the cancel
    const receipt = await multisig.cancelRecover()
    expectEvent(receipt, 'RecoverCanceled', { owner: accounts[0] })

    // Verify the recovery status
    assert.equal(await multisig.inRecoveryMode.call(), false, 'Recover mode should not be set')
  })

  it('transaction should cancel a recover', async () => {
    // Generate the multisig
    const signers = generateOrderedRandomAccountList(2)
    const signingAddresses = signers.map(acct => acct.address)
    const orderedAddressList = [...signingAddresses, accounts[0]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    const multisig = await LiteSig.new()
    await multisig.init(orderedAddressList, 2, constants.CHAINID)

    // Start the recovery
    const recoveryOwners = [accounts[3], accounts[4], accounts[5]].sort((addr1, addr2) => addr1.localeCompare(addr2))
    await multisig.startRecover(recoveryOwners)

    // Send in some eth
    await web3.eth.sendTransaction({ from: accounts[0], to: multisig.address, value: web3.utils.toWei('1', 'ether') })

    // Send some out
    const nonce = await multisig.nonce.call()
    const amount = web3.utils.toWei('0.1', 'ether')
    const data = '0x0'
    const destination = accounts[5]

    const signatures = await createSigs(web3, signers, multisig.address, nonce, destination, amount, data)

    // Try the send
    const receipt = await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, destination, amount, data, { from: accounts[0] })
    expectEvent(receipt, 'RecoverCanceled', { owner: accounts[0] })
  })
})
