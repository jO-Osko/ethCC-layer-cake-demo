// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {LayerCake} from "../layercake/LayerCake.sol";
import {LayerCakeExecutionProof} from "../layercake/LayerCakeExecutionProof.sol";
import {Token} from "../preparations/Token.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata, IERC20} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

import {IFtsoRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ftso/userInterfaces/IFtsoRegistry.sol";
import {IFlareContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/util-contracts/userInterfaces/IFlareContractRegistry.sol";

// On source network

contract LayerCakeInteractorSource is Ownable {
    LayerCake public layerCake;
    IERC20 public layerCakeToken;
    string public layerCakeTokenSymbol;
    address public ftsoRegistryAddress;

    address public otherSideInteractingContract;

    uint256 public defaultLCFee = 1;

    mapping(string => string) public symbolConverter;

    modifier onlyLayerCakeInteractor() {
        require(
            msg.sender == address(layerCake.calldataInterface()),
            "Only the LayerCake contract can call this"
        );
        _;
    }

    constructor(address _layerCake, address _ftsoRegistryAddress) Ownable() {
        layerCake = LayerCake(_layerCake);
        layerCakeToken = layerCake.token();
        layerCakeTokenSymbol = IERC20Metadata(address(layerCakeToken)).symbol();
        ftsoRegistryAddress = _ftsoRegistryAddress;
        symbolConverter["testWETH"] = "testETH";
    }

    function getFtsoRegistry() public view returns (IFtsoRegistry) {
        return IFtsoRegistry(ftsoRegistryAddress);
    }

    function getAmountOfTokens(
        uint256 dollarPrice
    ) public view returns (uint256) {
        IFtsoRegistry ftsoRegistry = getFtsoRegistry();

        (uint256 foreignTokenToUsdDecimals, ) = ftsoRegistry.getCurrentPrice(
            symbolConverter[layerCakeTokenSymbol]
        );

        uint256 weiDollarPriceDecimals = 0; // No decimal for dollar price
        uint256 tokenPriceDecimals = 5;
        uint256 price = (dollarPrice *
            (10 ** tokenPriceDecimals) *
            (10 ** 18)) / // Decimals for wei
            (foreignTokenToUsdDecimals * (10 ** weiDollarPriceDecimals));

        return price;
    }

    function setOtherSideInteractingContract(
        address _contract
    ) external onlyOwner {
        otherSideInteractingContract = _contract;
    }

    function processReceivingTokens(
        address targetAddress,
        uint256
    ) external onlyLayerCakeInteractor {
        layerCake.token().transfer(
            targetAddress,
            layerCake.token().balanceOf(address(this))
        );
    }

    // Frontend interacting functions
    // Hardcoded to declutter demo
    function getAvailableExternalNetworks()
        external
        view
        returns (string[] memory)
    {
        string[] memory data = new string[](1);
        data[0] = "sepolia";
        return data;
    }

    // Hardcoded to declutter demo
    function getAvailableFarmingProtocols(
        string memory // network
    ) external view returns (string[] memory) {
        string[] memory data = new string[](1);
        data[0] = "UniswapV2";
        return data;
    }

    // Hardcoded to declutter demo
    function getAvailableTargetFarmingTokens(
        string memory, // network
        string memory // protocol
    ) external view returns (string[] memory) {
        string[] memory data = new string[](9);
        data[0] = "TOK1";
        data[1] = "TOK2";
        data[2] = "TOK3";
        data[3] = "TOK4";
        data[4] = "TOK5";
        data[5] = "TOK6";
        data[6] = "TOK7";
        data[7] = "TOK8";
        data[8] = "TOK9";
        return data;
    }

    // Network and protocol are irrelevant for the demo
    function startLiquidityFarming(
        string memory, // network
        string memory, // protocol
        string memory targetToken1,
        string memory targetToken2,
        bytes32 passwordHash,
        uint256 amount
    ) external {
        bytes memory calldataLC = abi.encodeWithSignature(
            "executeLayerCakeLiquidityFarm(string,string,bytes32,address)",
            targetToken1,
            targetToken2,
            passwordHash,
            msg.sender
        );

        uint256 weiAmount = getAmountOfTokens(amount);

        uint256 sendAmount = (weiAmount * 98) / 100;
        layerCakeToken.transferFrom(msg.sender, address(this), weiAmount);

        LayerCakeExecutionProof.Operations
            memory standardOperations = LayerCakeExecutionProof.Operations(
                uint256(
                    keccak256(
                        abi.encode(address(this), msg.sender, block.timestamp)
                    )
                ),
                sendAmount - defaultLCFee * 2,
                defaultLCFee,
                address(this),
                otherSideInteractingContract,
                0,
                10 ether, // Creating a pool if it does not exist is expensive
                calldataLC,
                false,
                0, // No refund
                address(0),
                false,
                ""
            );

        layerCakeToken.approve(
            address(layerCake),
            layerCakeToken.balanceOf(address(this))
        );
        layerCake.storeStandardOperations(standardOperations);
    }

    // Network and protocol are irrelevant for the demo
    function withdrawLiquidityFarming(
        string memory, // network
        string memory, // protocol
        string memory password
    ) external {
        bytes memory calldataLC = abi.encodeWithSignature(
            "removeLiquidity(string)",
            password
        );

        uint256 weiAmount = layerCake.forwardedFeeDenominator() + 1;

        layerCakeToken.transferFrom(msg.sender, address(this), weiAmount);

        LayerCakeExecutionProof.Operations
            memory standardOperations = LayerCakeExecutionProof.Operations(
                uint256(
                    keccak256(
                        abi.encode(address(this), msg.sender, block.timestamp)
                    )
                ),
                weiAmount, // Send just minimal
                defaultLCFee,
                address(this),
                otherSideInteractingContract,
                0,
                1.5 ether,
                calldataLC,
                false,
                0, // No refund
                address(0),
                false,
                ""
            );

        layerCakeToken.approve(
            address(layerCake),
            layerCakeToken.balanceOf(address(this))
        );
        layerCake.storeStandardOperations(standardOperations);
    }
}
