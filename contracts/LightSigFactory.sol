pragma solidity 0.5.8;

import "./LightSig.sol";

/**
 * LightSig Factory creates new instances of the multisig contract and triggers an event
 * for listeners to see the new contract.
 */
contract LightSigFactory {

  // Event to track deployments
  event Deployed(uint32 indexed trackingId, address indexed deployedAddress);

  /**
   * Function called by external addresses to create a new multisig contract
   */
  function createLightSig(uint32 trackingId, address[] memory _owners, uint _requiredSignatures, uint chainId) public returns (address) {
    // Deploy the contract
    LightSig deployedContract = new LightSig(_owners, _requiredSignatures, chainId);

    // Get the newly deployed address
    address deployedAddress = address(deployedContract);

    // Trigger the event for any listeners
    emit Deployed(trackingId, deployedAddress);

    // Return address back to caller if applicable
    return deployedAddress;
  }
}