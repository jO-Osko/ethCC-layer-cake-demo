// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {LayerCake} from "../layercake/LayerCake.sol";
import {LayerCakeExecutionProof} from "../layercake/LayerCakeExecutionProof.sol";
import {LiquidityOwnerToken, Token} from "../preparations/Token.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import {TokenList} from "./TokenList.sol";

// On target network:
contract LayerCakeInteractorTarget is
    IERC721Receiver,
    ReentrancyGuard,
    Ownable
{
    // This might not ba a valid address on the current network
    address public otherSideInteractingContract;

    LayerCake public immutable layerCake;
    IERC20 public immutable layerCakeToken;
    IUniswapV2Factory public immutable uniswapFactory;
    IUniswapV2Router02 public immutable uniswapRouter;
    TokenList public tokenList;

    address token1;
    address token2;

    LiquidityOwnerToken public immutable liquidityOwnerToken;

    uint256 public currentLiquidityTokenId = 0;
    bool public liquidityTokenActive = false;
    uint256 public currentLiquidity = 0;

    uint256 defaultLCFee = 10;

    bytes32 public hashedPassword;

    constructor(
        address _layerCake, // This side's layer cake
        address _tokenFromLayerCake,
        address _uniswapFactory,
        address _uniswapRouter,
        address _otherSideInteractingContract, // The demo contract on the other side
        address _tokenList
    ) Ownable() {
        layerCake = LayerCake(_layerCake);
        layerCakeToken = IERC20(_tokenFromLayerCake); // layerCake.token();
        uniswapFactory = IUniswapV2Factory(_uniswapFactory);
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        otherSideInteractingContract = _otherSideInteractingContract;
        liquidityOwnerToken = new LiquidityOwnerToken(
            "LiquidityOwnerToken",
            "LOT"
        );
        tokenList = TokenList(_tokenList);
    }

    function setOtherSideInteractingContract(
        address _otherSideInteractingContract
    ) public onlyOwner {
        otherSideInteractingContract = _otherSideInteractingContract;
    }

    function getUniswapPair(
        address _token1,
        address _token2
    ) public view returns (IUniswapV2Pair) {
        return IUniswapV2Pair(uniswapFactory.getPair(_token1, _token2));
    }

    function calculateLCBurnFee(uint256 amount) public view returns (uint256) {
        return (amount / layerCake.forwardedFeeDenominator());
    }

    function getCurrentUniswapPair() public view returns (IUniswapV2Pair) {
        return getUniswapPair(token1, token2);
    }

    function getTokenReserves()
        public
        view
        returns (
            uint256,
            uint256,
            address,
            address,
            string memory,
            string memory
        )
    {
        IUniswapV2Pair pair = getCurrentUniswapPair();
        (uint256 r1, uint256 r2, ) = pair.getReserves();
        uint256 balance = pair.balanceOf(address(this));
        uint256 totalSupply = pair.totalSupply();

        return (
            (r1 * balance) / totalSupply,
            (r2 * balance) / totalSupply,
            pair.token0(),
            pair.token1(),
            IERC20Metadata(pair.token0()).symbol(),
            IERC20Metadata(pair.token1()).symbol()
        );
    }

    function getExpectedOutputAmountOnSwap(
        address tokenA, // Input token
        address tokenB,
        uint256 amountIn // amount of tokenA
    ) public view returns (uint256) {
        IUniswapV2Pair pair = getUniswapPair(tokenA, tokenB);
        (uint256 ra, uint256 rb, ) = pair.getReserves();
        if (tokenA == tokenB) {
            return amountIn;
        }
        if (tokenA > tokenB) {
            (ra, rb) = (rb, ra);
        }
        if (amountIn == 0) {
            return 0;
        }
        return uniswapRouter.getAmountOut(amountIn, ra, rb);
    }

    function getExpectedReturn() public view returns (uint256) {
        uint256 amount = getExpectedOutputAmount();

        return amount - defaultLCFee - calculateLCBurnFee(amount);
    }

    function getExpectedOutputAmount() public view returns (uint256) {
        (
            uint256 a0,
            uint256 a1,
            address t0,
            address t1,
            ,

        ) = getTokenReserves();
        return
            (getExpectedOutputAmountOnSwap(t0, address(layerCakeToken), a0)) +
            (getExpectedOutputAmountOnSwap(t1, address(layerCakeToken), a1));
    }

    function swapExact(
        IERC20 startToken,
        IERC20 endToken,
        uint256 amount
    ) private returns (uint256 swapped) {
        startToken.approve(address(uniswapRouter), amount);

        address[] memory path = new address[](2);
        path[0] = address(startToken);
        path[1] = address(endToken);
        swapped = uniswapRouter.swapExactTokensForTokens(
            amount,
            0,
            path,
            address(this),
            block.timestamp
        )[1];

        startToken.approve(address(uniswapRouter), 0);
    }

    function setTokenList(TokenList _tokenList) public onlyOwner {
        tokenList = _tokenList;
    }

    function removeLiquidity(string memory password) public returns (uint256) {
        require(liquidityTokenActive == true, "Liquidity token is not active");
        liquidityTokenActive = false;

        require(
            keccak256(abi.encodePacked(password)) == hashedPassword,
            "Wrong password"
        );

        address owner = liquidityOwnerToken.ownerOf(currentLiquidityTokenId);

        bytes memory calldataLC = abi.encodeWithSignature(
            "processReceivingTokens(address,uint256)",
            owner,
            layerCakeToken.balanceOf(address(this))
        );

        // 1.Remove liquidity from uniswap

        IERC20 pair = IERC20(uniswapFactory.getPair(token1, token2));
        uint256 liquidity = pair.balanceOf(address(this));
        pair.approve(address(uniswapRouter), liquidity);

        uniswapRouter.removeLiquidity(
            token1,
            token2,
            liquidity,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 amount1 = IERC20(token1).balanceOf(address(this));
        uint256 amount2 = IERC20(token2).balanceOf(address(this));

        swapExact(IERC20(token1), layerCakeToken, amount1);
        swapExact(IERC20(token2), layerCakeToken, amount2);

        // 2. Execute layer cake

        // Approve full
        uint256 totalAmount = layerCakeToken.balanceOf(address(this));

        uint256 burnFee = calculateLCBurnFee(totalAmount);

        layerCakeToken.approve(address(layerCake), totalAmount);

        LayerCakeExecutionProof.Operations
            memory standardOperations = LayerCakeExecutionProof.Operations(
                uint256(
                    keccak256(
                        abi.encode(
                            address(this),
                            currentLiquidityTokenId,
                            block.timestamp
                        )
                    )
                ),
                totalAmount - burnFee,
                defaultLCFee,
                address(this),
                otherSideInteractingContract,
                0,
                1 ether,
                calldataLC,
                false,
                0, // No refund
                address(0),
                false,
                ""
            );

        layerCake.storeStandardOperations(standardOperations);

        return totalAmount;
    }

    function executeLayerCakeLiquidityFarm(
        string memory _token1,
        string memory _token2,
        bytes32 _hashedPassword,
        address _liquidityOwner
    ) external nonReentrant {
        require(
            liquidityTokenActive == false,
            "Liquidity token is already active"
        );

        hashedPassword = _hashedPassword;

        // 1. Swap half of the origin token to each of the tokens

        token1 = address(tokenList.tokens(_token1));
        token2 = address(tokenList.tokens(_token2));

        // TODO: Calculate a better ratio
        // We currently just swap half of the original token for each of the new tokens
        // This works pretty well if the liquidity on both tokens is similar
        uint256 originalBalance = layerCakeToken.balanceOf(address(this));
        uint256 amountToSwap1 = originalBalance / 2;

        uint256 amountToSwap2 = originalBalance - amountToSwap1;

        uint256 swapped1 = 0;
        if (address(layerCakeToken) != token1) {
            swapped1 = swapExact(layerCakeToken, IERC20(token1), amountToSwap1);
        }
        uint256 swapped2 = 0;
        if (address(layerCakeToken) != token2) {
            swapped2 = swapExact(layerCakeToken, IERC20(token2), amountToSwap2);
        }

        require(
            IERC20(token1).balanceOf(address(this)) > 0,
            "No tokens to add liquidity with"
        );
        require(
            IERC20(token2).balanceOf(address(this)) > 0,
            "No tokens to add liquidity with"
        );

        // 2. Get (or create) a pool for new tokens - automatically on V2
        // 3. Add liquidity to the target pool

        IERC20(token1).approve(address(uniswapRouter), swapped1);
        IERC20(token2).approve(address(uniswapRouter), swapped2);

        (uint256 amountA, uint256 amountB, uint256 liquidity) = uniswapRouter
            .addLiquidity(
                token1,
                token2,
                swapped1, // Should be balance - if there are no residuals -> there is some dust
                swapped2, // Should be balance - if there are no residuals -> there is some dust
                0,
                0,
                address(this),
                block.timestamp
            );

        // Remove allowance
        IERC20(token1).approve(address(uniswapRouter), 0);
        IERC20(token2).approve(address(uniswapRouter), 0);

        // 4. Mint an internal liquidity holding NFT + accounting updates
        liquidityTokenActive = true;
        liquidityOwnerToken.mint(_liquidityOwner, ++currentLiquidityTokenId);
    }

    function onERC721Received(
        address operator,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // We don't do anything, as we are the owner of the NFT directly
        return this.onERC721Received.selector;
    }
}
