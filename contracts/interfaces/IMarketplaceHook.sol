// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IMarketplaceHook
 * @notice Optional pre/post transfer hooks for marketplace validation (Seaport-style).
 */
interface IMarketplaceHook {
    /**
     * @notice Called before a token is listed/sold. Marketplace can validate.
     * @param seller Address listing/selling the token.
     * @param tokenId The NFT token ID.
     * @param price The listing/sale price.
     */
    function onSale(
        address seller,
        uint256 tokenId,
        uint256 price
    ) external;

    /**
     * @notice Called after a token is sold. For post-transfer hooks.
     * @param seller Previous owner.
     * @param buyer New owner.
     * @param tokenId The NFT token ID.
     * @param price The sale price.
     */
    function onSold(
        address seller,
        address buyer,
        uint256 tokenId,
        uint256 price
    ) external;
}
