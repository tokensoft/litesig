pragma solidity 0.6.12;

import "./LiteSig.sol";
import "./Administratable.sol";
import './Proxy.sol';

/**
 * LiteSig Factory creates new instances of the proxy class pointing to the multisig 
 * contract and triggers an event for listeners to see the new contract.
 */
contract LiteSigFactory is Administratable {

  // Event to track deployments
  event Deployed(address indexed deployedAddress);

  // Address where LiteSig logic contract lives
  address liteSigLogicAddress;

  // Constructor for the factory
  constructor(address _liteSigLogicAddress) public {
    // Add the deployer as an admin by default
    Administratable.addAdmin(msg.sender);

    // Save the logic address
    liteSigLogicAddress = _liteSigLogicAddress;
  }

  /**
   * Function called by external addresses to create a new multisig contract
   * Caller must be whitelisted as an admin - this is to prevent someone from sniping the address
   * (the standard approach to locking in the sender addr into the salt was not chosen in case a long time
   * passes before the contract is created and a new deployment account is required for some unknown reason)
   */
  function createLiteSig(bytes32 salt, address[] memory _owners, uint _requiredSignatures, uint chainId)
    public onlyAdministrator returns (address) {
    // Track the address for the new contract
    address payable deployedAddress;

    // Get the creation code from the Proxy class
    bytes memory code = type(Proxy).creationCode;

    // Pack the constructor arg for the proxy initialization
    bytes memory deployCode = abi.encodePacked(code, abi.encode(liteSigLogicAddress));

    // Drop into assembly to deploy with create2
    assembly {
      deployedAddress := create2(0, add(deployCode, 0x20), mload(deployCode), salt)
      if iszero(extcodesize(deployedAddress)) { revert(0, 0) }
    }

    // Initialize the contract with this master's address
    LiteSig(deployedAddress).init(_owners, _requiredSignatures, chainId);

    // Trigger the event for any listeners
    emit Deployed(deployedAddress);

    // Return address back to caller if applicable
    return deployedAddress;
  }
}