// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Royalty } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title POAPEventNFT
 * @notice ERC721 NFT for event attendance badges with EIP-2981 royalties.
 * Supports owner mint and signature-based claim for auto-claim (attendee mints when verified).
 */
contract POAPEventNFT is ERC721Royalty, Ownable {
    using MessageHashUtils for bytes32;

    uint256 private _nextTokenId;

    /// @dev Optional signer for claimWithSignature (e.g. backend). If set, owner OR mintSigner can authorize claims.
    address public mintSigner;

    /// @dev One claim per address when using claimWithSignature
    mapping(address => bool) public hasClaimedWithSignature;

    event RoyaltyUpdated(address receiver, uint96 percentBps);
    event MintSignerUpdated(address indexed signer);
    event ClaimedWithSignature(address indexed to);

    constructor(
        string memory name_,
        string memory symbol_,
        address royaltyReceiver_,
        uint96 royaltyPercentBps_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _setDefaultRoyalty(royaltyReceiver_, royaltyPercentBps_);
    }

    /// @notice Mint to an address (only owner, e.g. manual airdrop or approval flow)
    function mint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    /// @notice Claim POAP with a signature from owner or mintSigner. For auto-claim when attendee fulfills verification.
    function claimWithSignature(address to, uint256 deadline, bytes calldata signature) external returns (uint256) {
        require(to == msg.sender, "Can only claim for self");
        require(block.timestamp <= deadline, "Signature expired");
        require(!hasClaimedWithSignature[to], "Already claimed");

        bytes32 digest = keccak256(
            abi.encodePacked("POAPClaim", address(this), block.chainid, to, deadline)
        );
        bytes32 ethSignedHash = digest.toEthSignedMessageHash();
        address signer = ECDSA.recover(ethSignedHash, signature);
        require(signer == owner() || signer == mintSigner, "Invalid signer");

        hasClaimedWithSignature[to] = true;
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        emit ClaimedWithSignature(to);
        return tokenId;
    }

    /// @notice Set the optional mint signer (backend) for auto-claim. Only owner.
    function setMintSigner(address signer) external onlyOwner {
        mintSigner = signer;
        emit MintSignerUpdated(signer);
    }

    function setRoyalty(address receiver_, uint96 percentBps_) external onlyOwner {
        _setDefaultRoyalty(receiver_, percentBps_);
        emit RoyaltyUpdated(receiver_, percentBps_);
    }
}
