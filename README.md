# LiteSig
This is a simple multisig based on the existing one from https://github.com/christianlundkvist/simple-multisig.

The goal is to remove all unnecessary admin functions from the smart contract to reduce the security footprint.  All signing is performed offline and the transaction is submitted only when all required signatures are gathered.

The smart contract's only job is to validate the signatures and call out to send ETH or instructions to other smart contracts.

This has protection against replay attacks by using an incrementing nonce and also EIP 712 nonces in the message hash that is signed to prevent cross-chain replays or cross-contract replays.

## Notes
Before adopting the approach based in this repo, the following items need to be verified.

1) The create2 logic that creates the wallets allows a deployment address to be determined ahead of time.  If funds are sent to the address before deployment, a malicious Factory Administrator could deploy a contract to that address with different owners.  Funds should not be sent to the address until the contract is deployed and the owner list is verified to prevent this.

2) The payload being signed by the owners includes the broadcaster's address to ensure other malicious actors can't rebroadcast and change the order in the mempool or broadcast with a different gas price/limit.  This does not prevent the broadcaster from sending with an unexpected gas limit.  If a smart contract determines behavior based on the gas limit then this could have adverse affects.

## Warning
Use at your own risk.

