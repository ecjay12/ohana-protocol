// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { LSP17Extension } from "@lukso/lsp17contractextension-contracts/contracts/LSP17Extension.sol";

/**
 * @title LSP17VouchExtension
 * @notice LSP17 module for revocation decay. Vouch strength decreases over time after revocation.
 * @dev To be attached to an LSP17Extendable Handshake. Maps revokeWithDecay(bytes32) selector.
 */
contract LSP17VouchExtension is LSP17Extension {
    struct RevokedVouch {
        uint64 revokedAt;
        uint96 decayRateBps; // e.g. 5000 = 50% per halfLife
        uint32 halfLifeSeconds;
    }

    mapping(bytes32 => RevokedVouch) public revokedVouches;

    event VouchRevokedWithDecay(bytes32 indexed vouchId, address indexed target, address indexed voucher);
    event DecayRateUpdated(bytes32 indexed vouchId, uint96 decayRateBps);

    /**
     * @notice Mark a vouch as revoked with decay. Callable via extendable contract.
     * @param vouchId keccak256(abi.encode(target, voucher))
     */
    function revokeWithDecay(bytes32 vouchId) external {
        address caller = _extendableMsgSender();
        revokedVouches[vouchId] = RevokedVouch({
            revokedAt: uint64(block.timestamp),
            decayRateBps: 5000, // 50% default
            halfLifeSeconds: 86400 * 30 // 30 days
        });
        emit VouchRevokedWithDecay(vouchId, caller, caller);
    }

    /**
     * @notice Get effective vouch score after decay. score = 10000 * (decayFactor)^(elapsed/halfLife)
     * @param vouchId The vouch identifier
     * @return effectiveScore 0-10000 (bps), 10000 = full strength
     */
    function getEffectiveVouchScore(bytes32 vouchId) external view returns (uint256 effectiveScore) {
        RevokedVouch memory rv = revokedVouches[vouchId];
        if (rv.revokedAt == 0) return 10000;
        uint256 elapsed = block.timestamp - rv.revokedAt;
        if (rv.halfLifeSeconds == 0 || elapsed >= rv.halfLifeSeconds * 100) return 0;
        uint256 n = elapsed / rv.halfLifeSeconds;
        uint256 decayFactor = 10000 - rv.decayRateBps;
        effectiveScore = 10000;
        uint256 maxIter = n > 100 ? 100 : n;
        for (uint256 i = 0; i < maxIter && effectiveScore > 0; i++) {
            effectiveScore = (effectiveScore * decayFactor) / 10000;
        }
        return effectiveScore;
    }

    function setDecayRate(bytes32 vouchId, uint96 decayRateBps, uint32 halfLifeSeconds) external {
        RevokedVouch storage rv = revokedVouches[vouchId];
        require(rv.revokedAt != 0, "Vouch not revoked");
        rv.decayRateBps = decayRateBps;
        rv.halfLifeSeconds = halfLifeSeconds;
        emit DecayRateUpdated(vouchId, decayRateBps);
    }
}
