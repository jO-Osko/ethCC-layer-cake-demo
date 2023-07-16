// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

contract TokenList {
    address public owner;

    mapping(string => IERC20Metadata) public tokens;
    string[] public tokenSymbols;

    constructor() {
        owner = msg.sender;
    }

    function addToken(IERC20Metadata token) external {
        require(msg.sender == owner, "O1");
        if (tokens[token.symbol()] == IERC20Metadata(address(0))) {
            tokenSymbols.push(token.symbol());
        }
        tokens[token.symbol()] = token;
    }
}
