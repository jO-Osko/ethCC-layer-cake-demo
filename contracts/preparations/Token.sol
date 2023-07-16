// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Simple ERC20 token inheriting from openzeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract LiquidityOwnerToken is ERC721, Ownable {
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {}

    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }

    function burn(uint256 _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "BO1");
        _burn(_tokenId);
    }
}

contract Token is ERC20, Ownable {
    uint256 public immutable maximalSupply;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maximalSupply
    ) Ownable() ERC20(_name, _symbol) {
        maximalSupply = _maximalSupply;
        _mint(msg.sender, maximalSupply);
    }

    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
        super._beforeTokenTransfer(_from, _to, _amount);
        require(totalSupply() <= maximalSupply, "TS1");
    }
}
