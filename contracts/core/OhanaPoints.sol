// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IOhanaPoints } from "../interfaces/IOhanaPoints.sol";

/**
 * @title OhanaPoints
 * @notice Single per-chain hub for Ohana Points. Uses namespaced `actionType` bytes32 constants.
 * @dev Authorized callers: REWARDER_ROLE (e.g. Handshake) or trustedCallers (e.g. POAP NFTs) or trustedFactory-registered children.
 */
contract OhanaPoints is AccessControl, IOhanaPoints {
    event PointsAwarded(
        address indexed user,
        uint256 points,
        bytes32 indexed actionType,
        uint256 chainId
    );

    bytes32 public constant REWARDER_ROLE = keccak256("REWARDER");

    /// @notice Optional factory (e.g. POAPForge) that may register per-deployment contracts as trusted callers.
    address public trustedFactory;

    mapping(address => uint256) private _balances;
    mapping(address => bool) public trustedCallers;

    /// @notice Namespaced action types (keccak256 of UTF-8 strings) for indexer / off-chain breakdown.
    bytes32 public constant ACTION_HANDSHAKE_VOUCH_RECEIVER =
        keccak256("OHANA_HANDSHAKE_VOUCH_RECEIVER");
    bytes32 public constant ACTION_HANDSHAKE_VOUCH_GIVER =
        keccak256("OHANA_HANDSHAKE_VOUCH_GIVER");
    bytes32 public constant ACTION_POAP_EVENT_CREATED = keccak256("OHANA_POAP_EVENT_CREATED");
    bytes32 public constant ACTION_POAP_CLAIM = keccak256("OHANA_POAP_CLAIM");
    bytes32 public constant ACTION_IMPACT_VERIFIED = keccak256("OHANA_IMPACT_VERIFIED");
    bytes32 public constant ACTION_REPUTATION_REPORT = keccak256("OHANA_REPUTATION_REPORT");

    constructor(address admin) {
        require(admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    /**
     * @notice Award points and emit PointsAwarded. Callable by REWARDER or trusted callers.
     */
    function award(address user, uint256 points, bytes32 actionType) external override {
        require(user != address(0), "Invalid user");
        require(points > 0, "Zero points");
        require(
            hasRole(REWARDER_ROLE, msg.sender) || trustedCallers[msg.sender],
            "Not authorized"
        );
        _balances[user] += points;
        emit PointsAwarded(user, points, actionType, block.chainid);
    }

    /**
     * @notice One-time (or repeated) grant for contracts deployed by a trusted factory (e.g. each POAPEventNFT).
     */
    function registerTrustedCaller(address caller) external override {
        require(caller != address(0), "Invalid caller");
        require(msg.sender == trustedFactory, "Not trusted factory");
        trustedCallers[caller] = true;
    }

    function setTrustedFactory(address factory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trustedFactory = factory;
    }

    function grantRewarder(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(REWARDER_ROLE, account);
    }

    function revokeRewarder(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(REWARDER_ROLE, account);
    }
}
