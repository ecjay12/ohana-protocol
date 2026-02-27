// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Handshake } from "./Handshake.sol";

/**
 * @title OhanaHandshakeRegistry
 * @notice Unified Handshake + EOA-to-UP registry. Same address across chains via CREATE2.
 * All vouch handling plus EOA->Universal Profile binding in one contract.
 */
contract OhanaHandshakeRegistry is Handshake {
    /// @notice EOA => Universal Profile address (for displaying vouches on UP)
    mapping(address => address) public eoaToUP;

    event EOARegistered(address indexed eoa, address indexed up);
    event EOAUnregistered(address indexed eoa, address indexed up);

    constructor(address payable _feeCollector) Handshake(_feeCollector) {}

    /**
     * @notice Bind caller's EOA to a Universal Profile for vouch display.
     * @param up The Universal Profile address (must be a contract).
     */
    function registerEOAtoUP(address up) external {
        require(up != address(0), "Invalid UP");
        require(_isContract(up), "UP must be a contract");
        address previous = eoaToUP[msg.sender];
        eoaToUP[msg.sender] = up;
        if (previous != address(0)) {
            emit EOAUnregistered(msg.sender, previous);
        }
        emit EOARegistered(msg.sender, up);
    }

    /**
     * @notice Remove EOA->UP binding. Caller must be the EOA.
     */
    function unregisterEOAtoUP() external {
        address previous = eoaToUP[msg.sender];
        require(previous != address(0), "No binding");
        delete eoaToUP[msg.sender];
        emit EOAUnregistered(msg.sender, previous);
    }

    /**
     * @notice Resolve Universal Profile for an EOA.
     */
    function getUPForEOA(address eoa) external view returns (address) {
        return eoaToUP[eoa];
    }

    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
