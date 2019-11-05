/* global web3 */
const constants = require('./constants')

const getDomainSeparator = (address) => {
  const domainData = constants.EIP712DOMAINTYPE_HASH + constants.NAME_HASH.slice(2) + constants.VERSION_HASH.slice(2) + constants.CHAINID.toString('16').padStart(64, '0') + address.slice(2).padStart(64, '0') + constants.SALT.slice(2)
  return web3.utils.sha3(domainData, { encoding: 'hex' })
}

const generateRandomAddressList = (count) =>
  [...Array(count)].map((_) => web3.eth.accounts.create().address)

// Need  to sort with case insensitive comparator
const generateOrderedRandomAddressList = (count) =>
  generateRandomAddressList(count).sort((addr1, addr2) => addr1.localeCompare(addr2))

const generateRandomAccountList = (count) =>
  [...Array(count)].map((_) => web3.eth.accounts.create())

// Need  to sort with case insensitive comparator
const generateOrderedRandomAccountList = (count) =>
  generateRandomAccountList(count).sort((acct1, acct2) => acct1.address.localeCompare(acct2.address))

module.exports = {
  getDomainSeparator,
  generateOrderedRandomAddressList,
  generateOrderedRandomAccountList
}
