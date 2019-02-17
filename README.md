# LightSig
This is a simple multisig based on the existing one from https://github.com/christianlundkvist/simple-multisig.

The goal is to remove all unnecessary admin functions from the smart contract to reduce the security footprint.  All signing is performed offline and the transaction is submitted only when all required signatures are gathered.

The smart contract's only job is to validate the signatures and call out to send ETH or instructions to other multisigs.

This also has protection against replay attacks by using a nonce, and also EIP 712 nonces in the message hash that is signed to prevent cross-chain replays or cross-contract replays.

## Warning
This has not been audited and was built for a hackathon demonstration at ETH Denver 2019.  This should not be used to hold funds on mainnet.