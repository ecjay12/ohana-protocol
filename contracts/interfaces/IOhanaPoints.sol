// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IOhanaPoints
 * @notice Canonical Ohana reputation points hub (per chain). Other contracts integrate via `award` or factory registration.
 */
interface IOhanaPoints {
    function balanceOf(address user) external view returns (uint256);

    function award(address user, uint256 points, bytes32 actionType) external;

    function registerTrustedCaller(address caller) external;
}
