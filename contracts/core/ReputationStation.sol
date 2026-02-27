// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReputationStation
 * @notice Minimal on-chain rep storage. Primary logic in utils/proxyVouchCalc.ts (Ceramic/GraphQL).
 * On-chain: cache hash or Merkle root; MVP returns 0 until oracle/indexer integration.
 */
contract ReputationStation {
    mapping(address => bytes32) public repHash;
    address public indexerOrUpdater;
    address public owner;

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
        repHash[subject] = hash;
        emit RepHashUpdated(subject, hash);
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
