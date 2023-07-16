// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {LayerCake} from "./layercake/LayerCake.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {LayerCakeExecutionProof} from "./layercake/LayerCakeExecutionProof.sol";

contract TestReceiver {
    string public data;
    address public invokedBy;
    uint256 public invokedAtTimestamp;
    uint256 public invokedAtBlock;
    uint256 public secret;

    function onReceive(string memory message, uint256 secretNum) public {
        // Do nothing
        data = message;
        invokedBy = msg.sender;
        invokedAtTimestamp = block.timestamp;
        invokedAtBlock = block.number;
        secret = secretNum;
    }
}
