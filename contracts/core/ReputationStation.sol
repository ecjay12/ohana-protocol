// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IOhanaPoints } from "../interfaces/IOhanaPoints.sol";

/**
 * @title ReputationStation
 * @notice Minimal on-chain rep storage. Primary logic in utils/proxyVouchCalc.ts (Ceramic/GraphQL).
 * On-chain: cache hash or Merkle root; MVP returns 0 until oracle/indexer integration.
 * Optional OhanaPoints hub: first non-zero report for a subject awards 8 pts (grant REWARDER to this contract).
 */
contract ReputationStation {
    mapping(address => bytes32) public repHash;
    address public indexerOrUpdater;
    address public owner;

    /// @notice Optional Ohana Points hub (see OhanaPoints.ACTION_REPUTATION_REPORT).
    address public ohanaPointsHub;

    bytes32 private constant _REP_REPORT = keccak256("OHANA_REPUTATION_REPORT");

    event RepHashUpdated(address indexed subject, bytes32 hash);
    event IndexerUpdated(address indexed oldIndexer, address indexed newIndexer);

    constructor() {
        owner = msg.sender;
        indexerOrUpdater = msg.sender;
    }

    modifier onlyUpdater() {
        require(msg.sender == indexerOrUpdater || msg.sender == owner, "Not updater");
        _;
    }

    function setRepHash(address subject, bytes32 hash) external onlyUpdater {
        bytes32 prev = repHash[subject];
        repHash[subject] = hash;
        emit RepHashUpdated(subject, hash);
        address hub = ohanaPointsHub;
        if (hub != address(0) && prev == bytes32(0) && hash != bytes32(0)) {
            IOhanaPoints(hub).award(subject, 8, _REP_REPORT);
        }
    }

    function setOhanaPointsHub(address hub) external {
        require(msg.sender == owner, "Not owner");
        ohanaPointsHub = hub;
    }

    function setIndexer(address _indexer) external {
        require(msg.sender == owner, "Not owner");
        address old = indexerOrUpdater;
        indexerOrUpdater = _indexer;
        emit IndexerUpdated(old, _indexer);
    }

    /**
     * @notice Get cached reputation hash. Decode off-chain for score.
     * @param subject Address to query
     */
    function getReputation(address subject) external view returns (bytes32) {
        return repHash[subject];
    }
}
