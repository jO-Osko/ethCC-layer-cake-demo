import { ethers, network } from "hardhat";
import {
    LayerCakeContract,
    LayerCakeInteractorSourceContract,
    LayerCakeInteractorTargetContract, LayerCakeInteractorTargetInstance,
    LayerCakeOriginDeployContract,
    LayerCakeToolsContract,
    TokenContract, TokenInstance,
    TokenListContract,
    UniswapV2FactoryContract,
    UniswapV2PairContract,
    UniswapV2Router02Contract
} from "../typechain-types";

const { abi, bytecode } = require('@uniswap/v2-core/build/UniswapV2Factory.json')

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { keccak256 } from "ethers";
import { config } from "../lib/config";
import { toBN } from "../lib/helpers";
import { LayerCakeInteractorSourceInstance } from "../typechain-types/contracts/Lock.sol/LayerCakeInteractorSource";
import { LayerCakeInstance } from "../typechain-types/contracts/layercake/LayerCake";


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
const chainId = network.config.chainId

// coston2 is origin
const ORIGIN_LAYER_CAKE_ADDRESS = "0x581995FA6E6D3eF192149f182D486A3c4705F308" // - new one

// coston is destination
const DESTINATION_LAYER_CAKE_ADDRESS = "0x85Ae9fd276f39C6D0cd047cAbc6b6ecb9ccfA97c" // - new one

let WNAT_ADDRESS = ""

if (networkName == 'coston2') {
    WNAT_ADDRESS = "0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273"
} else if (networkName == 'coston') {
    WNAT_ADDRESS = "0x767b25A658E8FC8ab6eBbd52043495dB61b4ea91"
} else {
    // throw new Error("Unknown network")
}

const testerAddress = "0xd98D173aaC27AC6028C0c082246124A65eE57130"
const uniswapRouterCoston = "0xf0ED132DB3D2f06979DC506a2Ad2f7491413d462"
const uniswapFactoryCoston = "0x123B6fA95c9e12e4b2b1AF03d12F053A91167436"

const tokenListAddress = "0xC3aE85f54480c6ca98D46c2248653A23d6D781AA"
// const layerCakeTokenAddress = "0x264FccA29133bDDB7a34B2C42ce1461306B8CA2A" // - new one
const layerCakeTokenAddress = "0x6AA975Fd9f43946555cb803d72a6573163503705" // - new one

const layerCakeInteractorTarget = "0xC6f65c07fF1F1710564a8D1913b1Dee623Ff8E9f" // coston

const layerCakeInteractorSource = "0xf5F6D62f02d8F962C7F8E14454a329Dd1e87b93d" // coston2

const password = "password"



async function startLiquidityFarming(deployerOrigin: HardhatEthersSigner) {

    assert(networkName == 'coston2', "This script should be run on coston2")
    const sourceInteractorC: LayerCakeInteractorSourceInstance = await LayerCakeInteractorSource.at(layerCakeInteractorSource)

    const sourceToken: TokenInstance = await Token.at(await sourceInteractorC.layerCakeToken())

    // TODO uncomment this line if there is not enough tokens on the source interactor
    // await sourceToken.transfer(sourceInteractorC.address, 100_000_000)
    const cost = 1
    const amount = await sourceInteractorC.getAmountOfTokens(cost)

    console.log(amount.toString())

    const a = await sourceToken.approve(sourceInteractorC.address, amount)
    // console.log(a)
    console.log((await sourceToken.balanceOf(sourceInteractorC.address)).toString())
    console.log((await sourceToken.balanceOf(deployerOrigin.address)).toString())
    console.log((await sourceToken.allowance(deployerOrigin.address, sourceInteractorC.address)).toString())

    console.log((await sourceInteractorC.otherSideInteractingContract()).toString())
    console.log((await sourceInteractorC.address).toString())

    return
    const txStartMe = await sourceInteractorC.startLiquidityFarming(
        "sepolia", "uniswapV2", "TOK1", "TOK2",
        keccak256(ethers.toUtf8Bytes(password)), cost,
        { from: deployerOrigin.address })

    console.log(txStartMe)
    return
}

async function removeLiquidityDirect() {
    // This works, as it is not started from the layer cake part    
    assert(networkName == 'coston', "This script should be run on coston")
    // Test
    const interactorTarget: LayerCakeInteractorTargetInstance = await LayerCakeInteractorTarget.at(layerCakeInteractorTarget)
    const txC = await interactorTarget.removeLiquidity.call("neki")
    console.log(txC)
    return
}


async function removeLiquidity() {

    assert(networkName == 'coston2', "This script should be run on coston2")

    const sourceInteractorC: LayerCakeInteractorSourceInstance = await LayerCakeInteractorSource.at(layerCakeInteractorSource)

    const sourceToken: TokenInstance = await Token.at(await sourceInteractorC.layerCakeToken())

    // There should be at least 2 WEI tokens (otherwise the tx will fail directly on the layer cake)
    console.log((await sourceToken.balanceOf(sourceInteractorC.address)).toString())
    await sourceToken.approve(sourceInteractorC.address, fullValue(1))
    const txRemove = await sourceInteractorC.withdrawLiquidityFarming("sepolia", "uniswapv2", "neki")
    console.log(txRemove)
    return

}


const MY_ADDRESS_DEMO = "0x4C3dFaFc3207Eabb7dc8A6ab01Eb142C8655F373"

const targetAddresses: string[] = [
    MY_ADDRESS_DEMO
]

async function main() {
    const [deployerOrigin, deployerTarget, originUser1, originUser2, destinationUser1, destinationUser2] = await ethers.getSigners();


    const lcToken: TokenInstance = await LayerCake.at(config.originLayerCakeAddress).then(
        (lc: LayerCakeInstance) => lc.token()
    ).then(
        (tokenAddress: string) => Token.at(tokenAddress)
    )

    for (let address of targetAddresses) {
        // await deployerOrigin.sendTransaction(
        //     {
        //         value: fullValue(8).div(toBN(1)).toString(),
        //         to: address,
        //     }
        // )


        await lcToken.transfer(address, fullValue(1000))

    }



}




main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).then(() => process.exit());


