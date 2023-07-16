// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {LayerCake} from "./layercake/LayerCake.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {LayerCakeHelper, LayerCakeExecutionProof} from "./LayerCakeHelper.sol";

contract SendOverContract {
    using LayerCakeHelper for LayerCake;

    LayerCake public layerCake;

    constructor(address _layerCake) {
        layerCake = LayerCake(_layerCake);
    }

    function sendFundsOver(
        uint256 amount,
        uint256 fee,
        address target
    ) external returns (uint256) {
        (
            LayerCakeExecutionProof.Operations memory operations,
            uint256 fullAmount
        ) = layerCake.prepareSimpleTransfer(amount, fee, target);

        IERC20 token = layerCake.token();

        token.approve(address(layerCake), fullAmount);
        token.transferFrom(msg.sender, address(this), fullAmount);

        layerCake.storeStandardOperations(operations);

        return fullAmount;
    }
}

contract SimpleDataReceiver {
    uint256 public triggerTime;
    uint256 public number;
    address public triggerer;
    string public data;

    function triggerMe(uint256 num, string memory str) public {
        triggerTime = block.timestamp;
        number = num;
        triggerer = msg.sender;
        data = str;
    }
}

contract SimpleFundsForwarder is ReentrancyGuard {
    address public fundsOwner;
    LayerCake public immutable layerCake;

    constructor(LayerCake _layerCake) {
        layerCake = _layerCake;
    }

    function receiveFunds(address owner) public {
        require(fundsOwner == address(0) || fundsOwner == owner, "O1");
        fundsOwner = owner;
    }

    function withdrawFunds(address feeRecipient) public nonReentrant {
        IERC20 token = layerCake.token();
        uint256 balance = token.balanceOf(address(this));
        uint256 fee = balance / 100;

        token.transfer(fundsOwner, balance - fee);
        token.transfer(feeRecipient, fee);
    }
}
