pragma solidity 0.6.12;

import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

contract GenericToken is ERC20PresetMinterPauser {

  constructor (string memory name, string memory symbol, uint256 supply) public
    ERC20PresetMinterPauser(name, symbol)
  {
    _mint(msg.sender, supply);
  }

}
