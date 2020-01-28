/* global contract, it, artifacts, assert, web3 */
const errors = require('./helpers/errorMessages')
const createSigs = require('./helpers/createSigs')

const { expectRevert } = require('@openzeppelin/test-helpers')
const LiteSig = artifacts.require('LiteSig')

const CHAINID = 1234

const generateRandomAccountList = (count) =>
  [...Array(count)].map((_) => web3.eth.accounts.create())

// Need  to sort with case insensitive comparator
const generateOrderedRandomAccountList = (count) =>
  generateRandomAccountList(count).sort((acct1, acct2) => acct1.address.localeCompare(acct2.address))

contract('LiteSig Validation', (accounts) => {
  it('should send some eth', async () => {
    const signers = generateOrderedRandomAccountList(2)
    const signingAddresses = signers.map(acct => acct.address)
    const fullCosignerList = [...signingAddresses, accounts[0]].sort((addr1, addr2) => addr1.localeCompare(addr2))

    const multisig = await LiteSig.new()
    await multisig.init(fullCosignerList, 2, CHAINID, { from: accounts[0] })

    // Populate with ETH
    await web3.eth.sendTransaction({ from: accounts[0], to: multisig.address, value: web3.utils.toWei('0.1', 'ether') })

    const destAcct = web3.eth.accounts.create()

    // Get the tx details
    const nonce = await multisig.nonce.call()
    const amount = web3.utils.toWei('0.1', 'ether')
    const data = '0x0'
    const destination = destAcct.address

    const signatures = await createSigs(web3, signers, multisig.address, nonce, destination, amount, data)

    // Verify the destination address is empty
    assert.equal(await web3.eth.getBalance(destAcct.address), '0')

    // Try the send
    await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, destination, amount, data, { from: accounts[0] })

    // Verify destination got funds
    assert.equal(await web3.eth.getBalance(destAcct.address), amount)
  })

  it('should verify signatures', async () => {
    const signers = generateOrderedRandomAccountList(2)
    const signingAddresses = signers.map(acct => acct.address)
    const fullCosignerList = [...signingAddresses, accounts[0]].sort((addr1, addr2) => addr1.localeCompare(addr2))

    const multisig = await LiteSig.new()
    await multisig.init(fullCosignerList, 2, CHAINID, { from: accounts[0] })

    // Populate with ETH
    await web3.eth.sendTransaction({ from: accounts[0], to: multisig.address, value: web3.utils.toWei('0.1', 'ether') })

    const destAcct = web3.eth.accounts.create()

    // Get the tx details
    const nonce = await multisig.nonce.call()
    const amount = web3.utils.toWei('0.1', 'ether')
    const data = '0x0'
    const destination = destAcct.address

    // Create signatures
    const validSigs = await createSigs(web3, signers, multisig.address, nonce, destination, amount, data)

    // Try the send with one signature's params missing
    await expectRevert(multisig.submit(validSigs.sigV.slice(1), validSigs.sigR.slice(1), validSigs.sigS.slice(1), destination, amount, data, { from: accounts[0] }), errors.SIGS_NOT_CORRECT_LEN)

    // Verify all sig params lengths are verified
    await expectRevert(multisig.submit(validSigs.sigV.slice(1), validSigs.sigR, validSigs.sigS, destination, amount, data, { from: accounts[0] }), errors.SIGS_NOT_SAME_LEN)
    await expectRevert(multisig.submit(validSigs.sigV, validSigs.sigR.slice(1), validSigs.sigS, destination, amount, data, { from: accounts[0] }), errors.SIGS_NOT_SAME_LEN)
    await expectRevert(multisig.submit(validSigs.sigV, validSigs.sigR, validSigs.sigS.slice(1), destination, amount, data, { from: accounts[0] }), errors.SIGS_NOT_SAME_LEN)

    // Verify the hash covers all input params with thesig
    await expectRevert(multisig.submit(validSigs.sigV, validSigs.sigR, validSigs.sigS, accounts[4], amount, data, { from: accounts[0] }), errors.INVALID_SIG)
    await expectRevert(multisig.submit(validSigs.sigV, validSigs.sigR, validSigs.sigS, destination, '44', data, { from: accounts[0] }), errors.INVALID_SIG)
    await expectRevert(multisig.submit(validSigs.sigV, validSigs.sigR, validSigs.sigS, destination, amount, '0x01', { from: accounts[0] }), errors.INVALID_SIG)

    // Verify duplicate signatures don't work
    const invalid = {
      sigV: [
        validSigs.sigV[0],
        validSigs.sigV[0]
      ],
      sigR: [
        validSigs.sigR[0],
        validSigs.sigR[0]
      ],
      sigS: [
        validSigs.sigS[0],
        validSigs.sigS[0]
      ]
    }
    await expectRevert(multisig.submit(invalid.sigV, invalid.sigR, invalid.sigS, destination, amount, data, { from: accounts[0] }), errors.SIG_NOT_UNIQUE)

    // Verify replay
    await multisig.submit(validSigs.sigV, validSigs.sigR, validSigs.sigS, destination, amount, data, { from: accounts[0] })
    await expectRevert(multisig.submit(validSigs.sigV, validSigs.sigR, validSigs.sigS, destination, amount, data, { from: accounts[0] }), errors.INVALID_SIG)
  })
})

module.exports = {
  generateOrderedRandomAccountList
}
