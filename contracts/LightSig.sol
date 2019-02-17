pragma solidity >=0.4.25 <0.6.0;

contract LightSig {

    event Execution(uint indexed transactionId);
    event ExecutionFailure(uint indexed transactionId);
    event Deposit(address indexed sender, uint value);

		// List of owner addresses
    address[] public owners;

    // Mapping of owner address to keep track
    mapping(address => bool) ownersMap;

		// Nonce increments by one on each valid transaction to prevent replays
    uint public nonce = 0;

		// Number of required 
    uint public requiredSignatures = 0;

    // EIP712 Precomputed hashes:
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
    bytes32 constant EIP712DOMAINTYPE_HASH = 0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472;

    // kekkac256("LightSig")
    bytes32 constant NAME_HASH = 0xe0f1e1c99009e212fa1e207fccef2ee9432c52bbf5ef25688885ea0cce69531d;

    // kekkac256("1")
    bytes32 constant VERSION_HASH = 0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6;

    // kekkac256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce)")
    bytes32 constant TXTYPE_HASH = 0xebbfa7b286e52d30a13889efa8ca90a696b0e6ec0936c8688c357c7d2bdd0430;

    // kekkac256("POOLE_PARTY") - 
    bytes32 constant SALT = 0x251543af6a222378665a76fe38dbceae4871a070b7fdaf5c6c30cf758dc33cc0;

    // hash for EIP712, computed from contract address - ensures it can't be replayed against
    // other contracts
    bytes32 DOMAIN_SEPARATOR;          

    // The constructor inputs a list of owners and the required signatures that
    //   are required before a transaction is executed.
    // Owners list must be in ascending address order.
    // Required sigs must be greater than 0 and less than or equal to number of owners.
    // Chain ID prevents replay across chains
    constructor(address[] memory _owners, uint _requireSignatures, uint chainId) public {
        // Verify the lengths of values being passed in
        require(_owners.length > 0, "Owners List must be greater than 0");
        require(
            _requireSignatures > 0 && _requireSignatures <= _owners.length,
            "Required signatures must be in the proper range"
        );

        // Verify the owners list is valid and in order
        // Also ensures there are no duplicates
        address lastAdd = address(0);
        for (uint i = 0; i < _owners.length; i++) {
            require(_owners[i] > lastAdd, "Owner addresses must be unique and in order");
            ownersMap[_owners[i]] = true;
            lastAdd = _owners[i];
        }

        // Save off owner list and required sig.
        owners = _owners;
        requiredSignatures = _requireSignatures;		

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(EIP712DOMAINTYPE_HASH,
            NAME_HASH,
            VERSION_HASH,
            chainId,
            this,
            SALT)
        );	
    }

    function submit(
        uint8[] memory sigV, 
        bytes32[] memory sigR, 
        bytes32[] memory sigS, 
        address destination, 
        uint value, 
        bytes memory data
    ) public
    { 
        // Verify signature lengths
        require(sigR.length == requiredSignatures, "Sig R values not expected length");
        require(sigR.length == sigS.length && sigR.length == sigV.length, "Sig arrays not same length");
        
        // Verify sender is an owner
        require(ownersMap[msg.sender], "Only owners can submit transactions");

        // EIP712 scheme: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
        // Note that the nonce is always included from the contract state to prevent replay attacks
        bytes32 txInputHash = keccak256(abi.encode(TXTYPE_HASH, destination, value, keccak256(data), nonce));
        bytes32 totalHash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, txInputHash));

        address lastAdd = address(0); // cannot have address(0) as an owner
        for (uint i = 0; i < requiredSignatures; i++) {
            // Get the address from the signature
            bytes memory prefix = "\x19Ethereum Signed Message:\n32";
            bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, totalHash));
            address recovered = ecrecover(prefixedHash, sigV[i], sigR[i], sigS[i]);

            // Ensure the signature is from an owner address and there are no duplicates
            require(recovered > lastAdd, "Signature must be unique");
            require(ownersMap[recovered], "Signature must be from owner");
            lastAdd = recovered;
        }

        // Increment the nonce
        nonce = nonce + 1;
        (bool success, ) = address(destination).call.value(value)(data);
        if(success) {
            emit Execution(nonce);
        } else {
            emit ExecutionFailure(nonce);
        }
        require(success, "Transaction call failed");
    }

    // Allow ETH to be sent to this contract
    function () external payable {
        emit Deposit(msg.sender, msg.value);
    }

}
