// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.23;

import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {Safe, Enum} from "@safe-global/safe-contracts/contracts/Safe.sol";
import {ModuleManager} from "@safe-global/safe-contracts/contracts/base/ModuleManager.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SessionKeys4337 {
    /// @dev Session keys to destinations
    mapping(address => mapping(address => bool)) public whitelistDestinations;

    /// @dev Session keys to sessions
    mapping(address => Session) public sessionKeys;

    struct Session {
        address account;
        uint48 validAfter;
        uint48 validUntil;
        bool revoked;
    }

    event SessionKeyAdded(address indexed sessionKey, address indexed account);
    event SessionKeyRevoked(
        address indexed sessionKey,
        address indexed account
    );
    event WhitelistedDestinationAdded(
        address indexed sessionKey,
        address indexed destination
    );
    event WhitelistedDestinationRemoved(
        address indexed sessionKey,
        address indexed destination
    );

    error InvalidSessionKey(address sessionKey);
    error InvalidSignature(address sessionKey);
    error InvalidSessionInterval(address sessionKey);
    error RevokedSession(address sessionKey);

    /**
     * @notice An error indicating that the caller does not match the Safe in the corresponding user operation.
     * @dev This indicates that the module is being used to validate a user operation for a Safe that did not directly
     * call this module.
     * @dev copied from `InvalidCaller` for inheritance reasons.
     */
    error InvalidSessionKeyCaller();

    /**
     * @notice An error indicating that the user operation failed to execute successfully.
     * @dev The contract reverts with this error when `executeUserOp` is used instead of bubbling up the original revert
     * data. When bubbling up revert data is desirable, `executeUserOpWithErrorString` should be used instead.
     * @dev copied from `ExecutionFailed` for inheritance reasons.
     */
    error SessionKeyExecutionFailed();

    struct Call {
        // The target address for the account to call.
        address target;
        // The calldata for the call.
        bytes data;
        // Whether to allow all destinations
        bool allowAllDestinations;
    }

    function executeWithSessionKey(
        Call calldata call,
        address sessionKey
    ) external /*returns (bytes[] memory)*/ {
        Session memory session = sessionKeys[sessionKey];

        if (
            block.timestamp < session.validAfter ||
            block.timestamp > session.validUntil
        ) {
            revert InvalidSessionInterval(sessionKey);
        }
        if (session.revoked) {
            revert RevokedSession(sessionKey);
        }

        if (call.allowAllDestinations) {
            require(
                whitelistDestinations[sessionKey][address(0)],
                "All destinations not whitelisted"
            );
        } else {
            require(
                whitelistDestinations[sessionKey][call.target],
                "Destination not whitelisted"
            );
        }

        if (
            !ModuleManager(session.account).execTransactionFromModule(
                call.target,
                0,
                call.data,
                Enum.Operation.Call
            )
        ) {
            revert SessionKeyExecutionFailed();
        }
    }

    /**
     * @notice Create a new session
     * @param sessionKey The session key
     * @param validAfter The start time of the session
     * @param validUntil The end time of the session
     * @param destinations The destinations that are whitelisted for the session
     */
    function addSessionKey(
        address sessionKey,
        uint48 validAfter,
        uint48 validUntil,
        address[] calldata destinations
    ) public {
        Session storage session = sessionKeys[sessionKey];
        require(session.validAfter == 0, "Session already exists");
        require(
            validAfter >= block.timestamp,
            "validAfter at least from the current time"
        );
        require(validAfter < validUntil, "Start time must be before end time");
        require(destinations.length > 0, "Must have at least one destination");

        session.account = msg.sender;
        session.validAfter = validAfter;
        session.validUntil = validUntil;
        for (uint256 i = 0; i < destinations.length; i++) {
            whitelistDestinations[sessionKey][destinations[i]] = true;
        }

        emit SessionKeyAdded(sessionKey, msg.sender);
    }

    /**
     * @notice Revoke a session
     * @param sessionKey The session key
     */
    function revokeSession(address sessionKey) external {
        Session storage session = sessionKeys[sessionKey];
        if (msg.sender != session.account) revert InvalidSessionKeyCaller();
        require(session.validAfter != 0, "Session does not exist");
        require(!session.revoked, "Session has already been revoked");
        session.revoked = true;

        emit SessionKeyRevoked(sessionKey, msg.sender);
    }

    /**
     * @notice Add a destination to the whitelist
     * @param sessionKey The session key
     * @param destination The destination to add to the whitelist
     */
    function addWhitelistDestination(
        address sessionKey,
        address destination
    ) external {
        Session storage session = sessionKeys[sessionKey];
        if (msg.sender != session.account) revert InvalidSessionKeyCaller();
        require(session.validAfter != 0, "Session does not exist");
        require(
            !whitelistDestinations[sessionKey][destination],
            "Destination already whitelisted"
        );
        whitelistDestinations[sessionKey][destination] = true;
        emit WhitelistedDestinationAdded(sessionKey, destination);
    }

    /**
     * @notice Remove a destination from the whitelist
     * @param sessionKey The session key
     * @param destination The destination to remove from the whitelist
     */
    function removeWhitelistDestination(
        address sessionKey,
        address destination
    ) external {
        Session storage session = sessionKeys[sessionKey];
        if (msg.sender != session.account) revert InvalidSessionKeyCaller();
        require(session.validAfter != 0, "Session does not exist");
        require(
            whitelistDestinations[sessionKey][destination],
            "Destination not whitelisted"
        );
        whitelistDestinations[sessionKey][destination] = false;
        emit WhitelistedDestinationRemoved(sessionKey, destination);
    }

    function _validateSessionKeySignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal pure returns (uint256 validationData) {
        /*
        (
            bytes memory operationData,
            uint48 validAfter,
            uint48 validUntil,
            bytes calldata signatures
        ) = _getSafeOp(userOp);
        */

        (, address sessionKey) = abi.decode(
            userOp.callData[4:],
            (Call, address)
        );

        (address recoveredSig, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
            MessageHashUtils.toEthSignedMessageHash(userOpHash),
            userOp.signature
        );

        if (err != ECDSA.RecoverError.NoError) {
            validationData = uint256(1);
        }

        if (sessionKey != recoveredSig) {
            validationData = uint256(1);
        }
    }
}
