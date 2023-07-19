import { ethers, network } from "hardhat";
import {
    LayerCakeContract,
    LayerCakeInteractorSourceContract,
    LayerCakeInteractorTargetContract,
    LayerCakeOriginDeployContract,
    LayerCakeToolsContract,
    SendOverContractContract,
    TokenContract,
    TokenListContract,
    UniswapV2FactoryContract,
    UniswapV2PairContract,
    UniswapV2Router02Contract
} from "../typechain-types";

const { abi, bytecode } = require('@uniswap/v2-core/build/UniswapV2Factory.json')


import { config } from "../lib/config";
import { toBN } from "../lib/helpers";


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
const SendOverContract: SendOverContractContract = artifacts.require('SendOverContract')

const networkName = network.name


async function main() {
    const [deployerOrigin, deployerTarget, originUser1, originUser2, destinationUser1, destinationUser2] = await ethers.getSigners();

    const token = await Token.at(
        await (await LayerCake.at(config.originLayerCakeAddress)).token()
    )

    const sender = await SendOverContract.new(config.originLayerCakeAddress)
    console.log(sender.address)

    await token.approve(sender.address, 1234569)
    console.log(`yarn hardhat verify ${sender.address} ${config.originLayerCakeAddress} --network ${networkName}`)
    const t = await sender.sendFundsOver.call(123456, 1, deployerOrigin.address)
    console.log(t.toString())
    await sender.sendFundsOver(123456, 1, deployerOrigin.address)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).then(() => process.exit());



