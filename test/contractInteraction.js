/* global contract, it, artifacts, assert, web3 */
const GenericToken = artifacts.require('GenericToken')
const LightSig = artifacts.require('LightSig')
const createSigs = require('./helpers/createSigs')

const CHAINID = 1234

const generateRandomAccountList = (count) =>
  [...Array(count)].map((_) => web3.eth.accounts.create())

// Need  to sort with case insensitive comparator
const generateOrderedRandomAccountList = (count) =>
  generateRandomAccountList(count).sort((acct1, acct2) => acct1.address.localeCompare(acct2.address))

contract('LightSig ERC20 Transfer', (accounts) => {
  it('should send some eth', async () => {
    const signers = generateOrderedRandomAccountList(2)
    const signingAddresses = signers.map(acct => acct.address)
    const fullCosignerList = [...signingAddresses, accounts[0]].sort((addr1, addr2) => addr1.localeCompare(addr2))

    const multisig = await LightSig.new(fullCosignerList, 2, CHAINID, { from: accounts[0] })

    // Populate multisig with Tokens
    const assetToken = await GenericToken.new('AssetToken', 'AST', 0, 1000)
    await assetToken.transfer(multisig.address, '100')

    const destAcct = web3.eth.accounts.create()

    // Get the tx details
    const nonce = await multisig.nonce.call()
    const amount = '0'
    const data = assetToken.contract.methods.transfer(destAcct.address, 10).encodeABI()
    const destination = assetToken.address

    const signatures = await createSigs(web3, signers, multisig.address, nonce, destination, amount, data)

    // Verify the destination address is empty
    assert.equal(await assetToken.balanceOf(destAcct.address), '0')

    // Try the send
    await multisig.submit(signatures.sigV, signatures.sigR, signatures.sigS, destination, amount, data, { from: accounts[0] })

    // Verify destination got funds
    assert.equal(await assetToken.balanceOf(destAcct.address), '10')
  })
})
