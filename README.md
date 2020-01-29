# LiteSig
This is a simple multisig based on the existing one from https://github.com/christianlundkvist/simple-multisig.

The goal is to remove all unnecessary admin functions from the smart contract to reduce the security footprint.  All signing is performed offline and the transaction is submitted only when all required signatures are gathered.

The smart contract's only job is to validate the signatures and call out to send ETH or instructions to other smart contracts.

This has protection against replay attacks by using an incrementing nonce and also EIP 712 nonces in the message hash that is signed to prevent cross-chain replays or cross-contract replays.

## Warning
This has not been audited and was built for a hackathon demonstration at ETH Denver 2019.  This should not be used to hold funds on mainnet.

## Recovery Feature
If M of N keys are completely lost and will never be found, a remaining key holder can trigger a "Wallet Recovery" and specify a list of new owners.  When this function is called, a timer starts for 180 days of blockchain time (not precisely real world time).  If no other owners contest this change within the 180 days, an owner can "Finalize the Recovery" and replace the current owners with the recovery owner list.

During the recovery "wait" period, any existing owners can cancel the pending recovery by calling a function on the contract.  Any successful transaction occurring during the recovery period will also cancel a pending recovery.

This recovery feature is specifically targeted to TokenSoft's use case where they hold 1 key of the M keys.  If a user is responsible for holding M-1 keys and completely loses them all, this will allow TokenSoft to recover the funds that would otherwise be locked forever.  This recovery model may not be sensible for other use cases.