import { ethers, network } from "hardhat";
import {
    LayerCakeContract, LayerCakeInstance,
    LayerCakeInteractorSourceContract,
    LayerCakeInteractorSourceInstance,
    LayerCakeInteractorTargetContract,
    LayerCakeOriginDeployContract,
    LayerCakeToolsContract,
    TokenContract, TokenInstance,
    TokenListContract, TokenListInstance,
    UniswapV2FactoryContract, UniswapV2FactoryInstance,
    UniswapV2PairContract,
    UniswapV2Router02Contract, UniswapV2Router02Instance
} from "../typechain-types";

const { abi, bytecode } = require('@uniswap/v2-core/build/UniswapV2Factory.json')

import { config } from "../lib/config";

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { latestBlockTimestamp, toBN } from "../lib/helpers";


function fullValue(i: any): BN {
    return toBN(10).pow(toBN(18)).mul(toBN(i));
}

const UniswapV2Factory: UniswapV2FactoryContract = artifacts.require('UniswapV2Factory')
const UniswapV2Pair: UniswapV2PairContract = artifacts.require('UniswapV2Pair')
const UniswapV2Router02: UniswapV2Router02Contract = artifacts.require('UniswapV2Router02')
const Token: TokenContract = artifacts.require('Token')
const LayerCakeInteractorTarget: LayerCakeInteractorTargetContract = artifacts.require('LayerCakeInteractorTarget')
const LayerCake: LayerCakeContract = artifacts.require('LayerCake')
const LayerCakeOriginDeploy: LayerCakeOriginDeployContract = artifacts.require('LayerCakeOriginDeploy')
const LayerCakeTools: LayerCakeToolsContract = artifacts.require('LayerCakeTools')
const TokenList: TokenListContract = artifacts.require('TokenList')
const LayerCakeInteractorSource: LayerCakeInteractorSourceContract = artifacts.require('LayerCakeInteractorSource')

const networkName = network.name


async function getLayerCakeDestination() {
    assert(networkName === config.destinationNetwork)
    return await LayerCake.at(config.destinationLayerCakeAddress)
}

async function getLayerCakeSource() {
    assert(networkName === config.originNetwork)
    return await LayerCake.at(config.originLayerCakeAddress)
}

async function getTokenList(): TokenListInstance {
    return await TokenList.at(config.tokenListAddress)
}

async function getUniswapRouter() {
    const router: UniswapV2Router02Instance = await UniswapV2Router02.at(config.uniswapRouterAddress)
    return router
}

async function deployUniswapFactory(deployerOrigin: HardhatEthersSigner) {
    const Contract = await ethers.getContractFactory(abi, bytecode);
    const deployed = await Contract.deploy(deployerOrigin.address);
    await deployed.waitForDeployment();
    const factory: UniswapV2FactoryInstance = await UniswapV2Factory.at(deployed.target);
    const router: UniswapV2Router02Instance = await UniswapV2Router02.new(factory.address, config.wrappedETHAddress);

    console.log("UniswapV2Factory deployed to:", factory.address);
    console.log("UniswapV2Router02 deployed to:", router.address);

    console.log(`yarn hardhat verify ${factory.address} --network ${networkName} ` + deployerOrigin.address) // This fails
    console.log(`yarn hardhat verify ${router.address} --network ${networkName} ` + factory.address + " " + config.wrappedETHAddress)
}


async function sendSimpleTokensOver(sender: HardhatEthersSigner, recipient: string,
    layerCake: LayerCakeInstance, amount: BN) {

    const operations = {
        nonce: (await latestBlockTimestamp()),
        amount: amount.toString(),
        fee: 1, //fee,
        sender: sender.address,
        recipient: recipient,
        executionTime: (toBN(0)).toString(),
        callDataGasLimit: toBN(10).pow(toBN(18)).toString(),
        callData: 0x00, // TODO
        cancel: false,
        cancellationFeeRefund: 0,
        negatedBandwidthProvider: ethers.ZeroAddress,
        initialNegation: false,
        invalidExecutionProofId: ethers.ZeroHash
    }

    const token: TokenInstance = await Token.at(await layerCake.token());
    console.log(token.address)
    console.log(`${sender.address} => ${recipient}: ${amount.toString()}`)

    await token.approve(layerCake.address, fullValue(10000000));

    await layerCake.storeStandardOperations(operations)
}

async function createTokenList(): TokenListInstance {
    const tokenList: TokenListInstance = await TokenList.new()
    console.log("TokenList deployed to:", tokenList.address);
    console.log(`yarn hardhat verify ${tokenList.address} --network ${networkName}`)
    return tokenList
}

async function deployTokens(tokenList: TokenListInstance) {
    for (let num = 1; num < 10; ++num) {
        const tokenName = "Token" + num
        const tokenSymbol = "TOK" + num

        const maxSupply = fullValue(100000)

        const token: TokenInstance = await Token.new(tokenName, tokenSymbol, maxSupply)
        console.log(
            `yarn hardhat verify ${token.address} --network ${networkName} ${tokenName} ${tokenSymbol} ${maxSupply}`
        )
        await tokenList.addToken(token.address)
    }
}

async function bootstrapLiquidityPairPools(deployerOrigin: HardhatEthersSigner) {
    const uniRouter: UniswapV2Router02Instance = await UniswapV2Router02.at(config.uniswapRouterAddress)

    const tokenList = await getTokenList()

    for (let i = 1; i < 10; ++i) {
        const t1 = await Token.at(await tokenList.tokens("TOK" + i))
        await t1.approve(uniRouter.address, fullValue(10))
    }

    for (let i = 1; i < 10; ++i) {
        for (let j = i + 1; j < 10; ++j) {
            const t1 = await Token.at(await tokenList.tokens("TOK" + i))
            const t2 = await Token.at(await tokenList.tokens("TOK" + j))
            console.log(t1.address, t2.address, i, j)
            // await t1.approve(uniRouter.address, fullValue(10))
            // await t2.approve(uniRouter.address, fullValue(10))

            await uniRouter.addLiquidity(
                t1.address, t2.address,
                10_000, 10_000,
                0, 0,
                deployerOrigin.address,
                (await latestBlockTimestamp() + 1000)
            )
        }
    }
}

async function createLayerCakeToTokenLiquidityPools(deployerOrigin: HardhatEthersSigner) {
    const tokenList = await getTokenList()
    console.log("TokenList deployed to:", tokenList.address);

    const router = await UniswapV2Router02.at(config.uniswapRouterAddress)
    const layerCakeToken = await Token.at(await (await getLayerCakeDestination()).token())
    await layerCakeToken.approve(router.address, (await layerCakeToken.totalSupply()), { from: deployerOrigin.address })
    for (let num = 1; num < 10; ++num) {
        const tokenSymbol = "TOK" + num
        const token = await Token.at(await tokenList.tokens(tokenSymbol))
        console.log(token.address)
        console.log(await token.name())
        await token.approve(router.address, (await token.totalSupply()), { from: deployerOrigin.address })

        await router.addLiquidity(
            token.address, layerCakeToken.address,
            fullValue(100), fullValue(50),
            0, 0, deployerOrigin.address, (await latestBlockTimestamp() + 1000), { from: deployerOrigin.address }
        )
    }
}

async function deploySourceInteractor(deployerOrigin: HardhatEthersSigner) {
    const interactor: LayerCakeInteractorSourceInstance = await LayerCakeInteractorSource.new(
        config.originLayerCakeAddress,
        config.ftsoRegistryAddress,
    )

    console.log('yarn hardhat verify ' + interactor.address + ' ' + config.originLayerCakeAddress + " " + config.ftsoRegistryAddress + ' --network ' + networkName)

    const token: TokenInstance = await Token.at(await (await LayerCake.at(config.originLayerCakeAddress)).token())
    console.log(token.address)
    console.log(config.originLayerCakeAddress)
    await token.approve(interactor.address, (await token.balanceOf(deployerOrigin.address)))

    return interactor
}

async function deployTargetInteractor(deployerOrigin: HardhatEthersSigner) {

    const token = (await Token.at(await (await (LayerCake.at(config.destinationLayerCakeAddress))).token()))

    const interactor = await LayerCakeInteractorTarget.new(
        config.destinationLayerCakeAddress,
        token.address,
        config.uniswapFactoryAddress,
        config.uniswapRouterAddress,
        deployerOrigin.address,
        config.tokenListAddress,
    )

    console.log("LayerCakeInteractorTarget deployed to:", interactor.address);
    console.log(`yarn hardhat verify ${interactor.address} ${config.destinationLayerCakeAddress} ${token.address} ${config.uniswapFactoryAddress} ${config.uniswapRouterAddress} ${deployerOrigin.address} ${config.tokenListAddress} --network ${networkName}`)

}

async function runUniswap(t1: string, t2: string, num: number,
    deployerOrigin: HardhatEthersSigner,
) {


    const tokenA: TokenInstance = await getTokenList().then(tl => tl.tokens(t1)).then(t => Token.at(t))
    const tokenB: TokenInstance = await getTokenList().then(tl => tl.tokens(t2)).then(t => Token.at(t))

    console.log(tokenA.address)
    console.log(tokenB.address)

    console.log((await tokenA.balanceOf(deployerOrigin.address)).toString())
    console.log((await tokenB.balanceOf(deployerOrigin.address)).toString())

    const router = await getUniswapRouter();
    await tokenA.approve(router.address, fullValue(1000000))
    await tokenB.approve(router.address, fullValue(1000000))
    for (let i = 0; i < num; ++i) {
        console.log(i)



        const t = await router.swapExactTokensForTokens(
            (toBN(5).mul(toBN(10).pow(toBN(18)))).toString(),
            0, [tokenA.address, tokenB.address],
            deployerOrigin.address,
            (await latestBlockTimestamp() + 1000)
        )

        await router.swapExactTokensForTokens(
            (toBN(5).mul(toBN(10).pow(toBN(18)))).toString(),
            0, [tokenB.address, tokenA.address],
            deployerOrigin.address,
            (await latestBlockTimestamp() + 1000)
        )

        console.log((await tokenA.balanceOf(deployerOrigin.address)).toString())
        console.log((await tokenB.balanceOf(deployerOrigin.address)).toString())

    }

}

async function contractPreparations(deployer: HardhatEthersSigner) {
    // 4 phases, you need to do it manually

    // 1. Deploy interactor on this side -- coston2

    // assert(networkName === config.originNetwork)
    // await deploySourceInteractor(deployer)
    // return

    // 2. Deploy interactor on other side and set it up -- coston

    // assert(networkName === config.destinationNetwork)
    // await deployTargetInteractor(deployer)
    // return

    // 3. Set up the other side addresses 

    // a) -- coston2

    // assert(networkName === config.originNetwork)
    // const interactorSource = await LayerCakeInteractorSource.at(config.sourceInteractorAddress)
    // await interactorSource.setOtherSideInteractingContract(config.targetInteractorAddress)
    // return

    // b) -- sepolia

    // assert(networkName === config.destinationNetwork)
    // const interactorTarget = await LayerCakeInteractorTarget.at(config.targetInteractorAddress)
    // await interactorTarget.setOtherSideInteractingContract(config.sourceInteractorAddress)
    // return

}


async function main() {
    const [deployerOrigin, deployerTarget, originUser1, originUser2, destinationUser1, destinationUser2] = await ethers.getSigners();


    await runUniswap("TOK2", "TOK6", 100, deployerOrigin)


    /* 1. Deploy uniswap factory and router - This only needs to be done once per network */

    // assert(networkName === config.destinationNetwork)
    // await deployUniswapFactory(deployerOrigin)
    // return

    /* 2. Send over a reasonable amount of LayerCakeToken to later bootstrap liquidity pools */

    // assert(networkName === config.originNetwork)
    // const layerCake = await getLayerCakeSource()
    // const token: TokenInstance = await Token.at(await layerCake.token())
    // console.log(layerCake.address, token.address)

    // await sendSimpleTokensOver(deployerOrigin, deployerOrigin.address, layerCake, fullValue(500))
    // return


    /* 3. Create tokens on the other side and bootstrap liquidity pools */

    // assert(networkName === config.destinationNetwork)
    // const tokenList = await createTokenList()
    // await deployTokens(tokenList)
    // return

    /* 3.1. Bootstrap liquidity pools */

    // await bootstrapLiquidityPairPools(deployerOrigin)
    // await createLayerCakeToTokenLiquidityPools(deployerOrigin)
    // return

    /* 4. Deploy interactor contracts */

    // await contractPreparations(deployerOrigin)
    // return

}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).then(() => process.exit());


