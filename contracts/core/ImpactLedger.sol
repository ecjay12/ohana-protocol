// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IOhanaPoints } from "../interfaces/IOhanaPoints.sol";

/**
 * @title ImpactLedger
 * @notice Authorized verifier records verified positive actions; points flow through the OhanaPoints hub (20 pts per action).
 * @dev Grant REWARDER on the hub to this contract address. Set verifier to your oracle/backend signer.
 */
contract ImpactLedger is Ownable {
    address public ohanaPointsHub;
    address public verifier;

    bytes32 private constant _IMPACT_VERIFIED = keccak256("OHANA_IMPACT_VERIFIED");

    event VerifierUpdated(address indexed newVerifier);
    event OhanaPointsHubUpdated(address indexed hub);

    constructor(address initialVerifier) Ownable(msg.sender) {
        require(initialVerifier != address(0), "Invalid verifier");
        verifier = initialVerifier;
    }

    function setVerifier(address v) external onlyOwner {
        require(v != address(0), "Invalid verifier");
        verifier = v;
        emit VerifierUpdated(v);
    }

    function setOhanaPointsHub(address hub) external onlyOwner {
        ohanaPointsHub = hub;
        emit OhanaPointsHubUpdated(hub);
    }

    /// @notice Award 20 points for a verified impact action (dedupe off-chain if needed).
    function recordVerifiedAction(address beneficiary) external {
        require(msg.sender == verifier, "Not verifier");
        require(beneficiary != address(0), "Invalid beneficiary");
        address hub = ohanaPointsHub;
        if (hub == address(0)) return;
        IOhanaPoints(hub).award(beneficiary, 20, _IMPACT_VERIFIED);
    }
}
