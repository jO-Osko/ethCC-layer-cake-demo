// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {LayerCake} from "./layercake/LayerCake.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {LayerCakeExecutionProof} from "./layercake/LayerCakeExecutionProof.sol";

library LayerCakeHelper {
    function isLayerCakeCaller(
        LayerCake layerCake,
        address caller
    ) internal view returns (bool) {
        return caller == address(layerCake.calldataInterface());
    }

    function calculateFullSendAmount(
        LayerCake layerCake,
        uint256 amount
    ) internal view returns (uint256) {
        uint256 denominatorFee = layerCake.forwardedFeeDenominator();
        if (denominatorFee == 0) {
            return amount;
        }
        return amount + amount / denominatorFee;
    }

    function prepareSimpleTransfer(
        LayerCake layerCake,
        uint256 amount,
        uint256 fee,
        address target
    )
        internal
        view
        returns (LayerCakeExecutionProof.Operations memory, uint256)
    {
        uint256 fullAmount = calculateFullSendAmount(layerCake, amount);

        LayerCakeExecutionProof.Operations
            memory standardOperations = LayerCakeExecutionProof.Operations({
                nonce: uint256(
                    keccak256(
                        abi.encode(address(this), msg.sender, block.timestamp)
                    )
                ),
                amount: amount,
                fee: fee,
                sender: address(this),
                recipient: target,
                executionTime: 0,
                callDataGasLimit: 1 ether, // Creating a pool if it does not exist is expensive
                callData: "",
                cancel: false,
                cancellationFeeRefund: 0, // No refund
                negatedBandwidthProvider: address(0),
                initialNegation: false,
                invalidExecutionProofId: ""
            });

        return (standardOperations, fullAmount);
    }
}
