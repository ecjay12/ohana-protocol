// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { POAPEventNFT } from "./POAPEventNFT.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title POAPEventToken
 * @notice Fungible attendance token (LSP7-style on EVM).
 */
contract POAPEventToken is ERC20, Ownable {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title POAPForge
 * @notice Factory deploying ERC721 (NFT) + ERC20 (fungible) per event. Dual standards.
 */
contract POAPForge is Ownable {
    struct Event {
        address nftContract;
        address tokenContract;
        address creator;
        string eventId;
        uint64 createdAt;
    }

    Event[] public events;
    mapping(bytes32 => uint256) public eventIdToIndex;

    event EventCreated(
        uint256 indexed index,
        string eventId,
        address nftContract,
        address tokenContract,
        address creator
    );

    constructor() Ownable(msg.sender) {}

    function createEvent(
        string calldata eventId_,
        string calldata nftName_,
        string calldata nftSymbol_,
        string calldata tokenName_,
        string calldata tokenSymbol_,
        address royaltyReceiver_,
        uint96 royaltyPercentBps_
    ) external returns (address nftContract, address tokenContract) {
        bytes32 idHash = keccak256(abi.encodePacked(eventId_));
        require(eventIdToIndex[idHash] == 0, "Event exists");

        address rcvr = royaltyReceiver_ == address(0) ? msg.sender : royaltyReceiver_;
        POAPEventNFT nft = new POAPEventNFT(nftName_, nftSymbol_, rcvr, royaltyPercentBps_);
        nft.transferOwnership(msg.sender);

        POAPEventToken token = new POAPEventToken(tokenName_, tokenSymbol_);
        token.transferOwnership(msg.sender);

        address nftAddr = address(nft);
        address tokenAddr = address(token);
        events.push(Event(nftAddr, tokenAddr, msg.sender, eventId_, uint64(block.timestamp)));
        uint256 index = events.length;
        eventIdToIndex[idHash] = index;

        emit EventCreated(index, eventId_, nftAddr, tokenAddr, msg.sender);
        return (nftAddr, tokenAddr);
    }

    function getEvent(uint256 index) external view returns (Event memory) {
        require(index > 0 && index <= events.length, "Invalid index");
        return events[index - 1];
    }

    function getEventCount() external view returns (uint256) {
        return events.length;
    }
}
