// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC2981
 * @notice NFT Royalty Standard - EIP-2981
 */
interface IERC2981 {
    /**
     * @notice Returns how much royalty is owed and to whom.
     * @param tokenId The NFT asset queried for royalty information.
     * @param salePrice The sale price of the NFT asset specified by tokenId.
     * @return receiver Address of who should receive the royalty payment.
     * @return royaltyAmount The royalty payment amount for salePrice.
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount);
}
