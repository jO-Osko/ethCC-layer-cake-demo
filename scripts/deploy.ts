import { ethers, network } from "hardhat";
import {
  LayerCakeContract, LayerCakeInstance,
  LayerCakeInteractorSourceContract,
  LayerCakeInteractorTargetContract,
  LayerCakeInteractorTargetInstance,
  LayerCakeToolsContract,
  TokenContract, TokenInstance,
  TokenListContract, TokenListInstance,
  UniswapV2FactoryContract, UniswapV2FactoryInstance,
  UniswapV2PairContract,
  UniswapV2Router02Contract, UniswapV2Router02Instance
} from "../typechain-types";

const { abi, bytecode } = require('@uniswap/v2-core/build/UniswapV2Factory.json')

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { keccak256 } from "ethers";
import { fullValue, latestBlockTimestamp, toBN } from "../lib/helpers";
import { LayerCakeInteractorSourceInstance } from "../typechain-types/contracts/Lock.sol/LayerCakeInteractorSource";




const UniswapV2Factory: UniswapV2FactoryContract = artifacts.require('UniswapV2Factory')
const UniswapV2Pair: UniswapV2PairContract = artifacts.require('UniswapV2Pair')
const UniswapV2Router02: UniswapV2Router02Contract = artifacts.require('UniswapV2Router02')
const Token: TokenContract = artifacts.require('Token')
const LayerCakeInteractorTarget: LayerCakeInteractorTargetContract = artifacts.require('LayerCakeInteractorTarget')
const LayerCake: LayerCakeContract = artifacts.require('LayerCake')
const LayerCakeTools: LayerCakeToolsContract = artifacts.require('LayerCakeTools')
const TokenList: TokenListContract = artifacts.require('TokenList')
const LayerCakeInteractorSource: LayerCakeInteractorSourceContract = artifacts.require('LayerCakeInteractorSource')

const networkName = network.name
const chainId = network.config.chainId

// deploy the bytecode
// coston2 is origin
const ORIGIN_LAYER_CAKE_ADDRESS = "0xabac0173e940210b397fFCc62DeFbc6aafCFA590" // - new one

// sepolia is destination
const DESTINATION_LAYER_CAKE_ADDRESS = "0x104ccbb62b8f969e23a6b292cfc60e9e828953f8" // - new one

const TOKEN_LIST_ADDRESS = "0x6a64ca289638636794436819DA7aaC42D1C489Ef"

const UNISWAP_FACTORY_ADDRESS = "0x3aD37C7dEBD04F3934204aF157a6Da5533d938A9"
const UNISWAP_ROUTER_ADDRESS = "0xbc524D12A581B66450b185274105995Dee491a50"


let WNAT_ADDRESS = ""
let FTSO_REGISTRY_ADDRESS: string = "undefined"

if (networkName == 'coston2') {
  WNAT_ADDRESS = "0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273"
  FTSO_REGISTRY_ADDRESS = "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87"
} else if (networkName == 'coston') {
  WNAT_ADDRESS = "0x767b25A658E8FC8ab6eBbd52043495dB61b4ea91"
  FTSO_REGISTRY_ADDRESS = undefined
} else if (networkName == 'sepolia') {
  WNAT_ADDRESS = "0x7b79995e5f793a07bc00c21412e50ecae098e7f9"
} else {
  FTSO_REGISTRY_ADDRESS = undefined
}




const testerAddress = "0xd98D173aaC27AC6028C0c082246124A65eE57130"

// Destination
const layerCakeTokenAddress = "0x0a0f37ab1ee4a8660f04e391129ff5481a8a88e9" // - new one



const layerCakeInteractorTarget = "0xfaBe2649e461b547DCFa1BD69091921e0505281e" // sepolia

const layerCakeInteractorSource = "0x32ae9B767fD82a05B3Afb2eeEbe64A616F990f50" // coston2



async function deployLayerCakeInteractor() {
  const interactor = await LayerCakeInteractorSource.new(ORIGIN_LAYER_CAKE_ADDRESS)

  console.log("yarn hardhat verify " + interactor.address + " " + DESTINATION_LAYER_CAKE_ADDRESS + " --network " + networkName)
}

// async function getTokenList() {
//   const tokenList: TokenListInstance = await TokenList.at(tokenListAddress)
//   return tokenList
// }

// async function getUniswapRouter() {
//   const router: UniswapV2Router02Instance = await UniswapV2Router02.at(uniswapRouterCoston)
//   return router
// }

async function getLayerCakeToken() {
  const token: TokenInstance = await Token.at(layerCakeTokenAddress)
  return token
}

async function uniswapDeploy(deployerOrigin: HardhatEthersSigner) {
  const Contract = await ethers.getContractFactory(abi, bytecode);
  const deployed = await Contract.deploy(deployerOrigin.address);
  await deployed.waitForDeployment();
  const factory: UniswapV2FactoryInstance = await UniswapV2Factory.at(deployed.target);
  const router: UniswapV2Router02Instance = await UniswapV2Router02.new(factory.address, WNAT_ADDRESS);

  console.log("UniswapV2Factory deployed to:", factory.address);
  console.log("UniswapV2Router02 deployed to:", router.address);

  console.log(`yarn hardhat verify ${factory.address} --network ${networkName} ` + deployerOrigin.address)
  console.log(`yarn hardhat verify ${router.address} --network ${networkName} ` + factory.address + " " + WNAT_ADDRESS)
}

async function deployTokenList(deployerOrigin: HardhatEthersSigner) {
  const tokenList: TokenListInstance = await TokenList.new()
  console.log("TokenList deployed to:", tokenList.address);

  console.log(`yarn hardhat verify ${tokenList.address} --network ${networkName}`)
}

async function deployBasicTokenLiquidity(deployerOrigin: HardhatEthersSigner) {

  const tokenList = await getTokenList()
  console.log("TokenList deployed to:", tokenList.address);

  const router = await getUniswapRouter()
  const layerCakeToken = await getLayerCakeToken()
  const txs = []
  await layerCakeToken.approve(router.address, (await layerCakeToken.totalSupply()), { from: deployerOrigin.address })
  for (let num = 1; num < 10; ++num) {
    const tokenSymbol = "TOK" + num
    const token = await Token.at(await tokenList.tokens(tokenSymbol))
    const maxSupply = fullValue(100000)
    // const token: TokenInstance = await Token.new(tokenName, tokenSymbol, maxSupply)
    console.log(token.address)
    console.log(await token.name())
    let tx = await token.approve(router.address, (await token.totalSupply()), { from: deployerOrigin.address })
    txs.push(tx)
    tx = await router.addLiquidity(
      token.address, layerCakeToken.address,
      fullValue(100), fullValue(50),
      0, 0, deployerOrigin.address, (await latestBlockTimestamp() + 1000), { from: deployerOrigin.address }
    )
    txs.push(tx)
  }
  console.log(txs.length)
}

async function sendTokensOver(deployerOrigin: HardhatEthersSigner, layerCake: LayerCakeInstance) {

  // const TesterContract = new web3.eth.Contract(
  //   Tester.abi,
  // )

  // const abi = TesterContract.methods.triggerMe(1200, "testing").encodeABI()

  const operations = {
    nonce: 1,
    amount: fullValue(toBN(500)).toString(),
    fee: 1, //fee,
    sender: deployerOrigin.address,
    recipient: deployerOrigin.address,
    executionTime: (toBN(0)).toString(),
    callDataGasLimit: toBN(10).pow(toBN(18)).toString(), // Why do we need toString this?
    callData: 0x00, // TODO
    cancel: false,
    cancellationFeeRefund: 0,
    negatedBandwidthProvider: ethers.ZeroAddress,
    initialNegation: false,
    invalidExecutionProofId: ethers.ZeroHash
  }

  const token: TokenInstance = await Token.at(await layerCake.token());
  console.log(token.address)
  console.log(deployerOrigin.address)
  const balance = await token.balanceOf(deployerOrigin.address);
  console.log("balance", balance.toString())

  await token.approve(layerCake.address, fullValue(10000000));

  const d = await layerCake.storeStandardOperations(operations)
  console.log(d)

}

async function deployTargetInteractor(deployerOrigin: HardhatEthersSigner) {

  const token = (await Token.at(await (await (LayerCake.at(DESTINATION_LAYER_CAKE_ADDRESS))).token()))

  const interactor = await LayerCakeInteractorTarget.new(
    DESTINATION_LAYER_CAKE_ADDRESS,
    token.address,
    UNISWAP_FACTORY_ADDRESS,
    UNISWAP_ROUTER_ADDRESS,
    deployerOrigin.address,
    TOKEN_LIST_ADDRESS,
  )

  console.log("LayerCakeInteractorTarget deployed to:", interactor.address);
  console.log(`yarn hardhat verify ${interactor.address} ${DESTINATION_LAYER_CAKE_ADDRESS} ${token.address} ${UNISWAP_FACTORY_ADDRESS} ${UNISWAP_ROUTER_ADDRESS} ${deployerOrigin.address} ${TOKEN_LIST_ADDRESS} --network ${networkName}`)

}


async function deploySourceInteractor(deployerOrigin: HardhatEthersSigner) {
  const interactor: LayerCakeInteractorSourceInstance = await LayerCakeInteractorSource.new(
    ORIGIN_LAYER_CAKE_ADDRESS,
    FTSO_REGISTRY_ADDRESS,
  )

  console.log('yarn hardhat verify ' + interactor.address + ' ' + ORIGIN_LAYER_CAKE_ADDRESS + " " + FTSO_REGISTRY_ADDRESS + ' --network ' + networkName)

  const token: TokenInstance = await Token.at(await (await LayerCake.at(ORIGIN_LAYER_CAKE_ADDRESS)).token())
  console.log(token.address)
  console.log(ORIGIN_LAYER_CAKE_ADDRESS)
  await token.approve(interactor.address, (await token.balanceOf(deployerOrigin.address)))

  return interactor
}

async function deployTokensWithLiquidity(deployerOrigin: HardhatEthersSigner) {
  const router = await getUniswapRouter();
  const layerCakeToken = await getLayerCakeToken();

  const tokenList: TokenListInstance = await TokenList.new()
  console.log(`yarn hardhat verify ${tokenList.address} --network ${networkName}`)
  await layerCakeToken.approve(router.address, (await layerCakeToken.totalSupply()), { from: deployerOrigin.address })

  const txs = []
  for (let num = 1; num < 10; ++num) {
    const tokenName = "Token" + num
    const tokenSymbol = "TOK" + num

    const maxSupply = fullValue(100000)

    const token: TokenInstance = await Token.new(tokenName, tokenSymbol, maxSupply)
    console.log(
      `yarn hardhat verify ${token.address} --network ${networkName} ${tokenName} ${tokenSymbol} ${maxSupply}`
    )
    let tx = await tokenList.addToken(token.address, { from: deployerOrigin.address })
    txs.push(tx)
    tx = await token.approve(router.address, (await token.totalSupply()), { from: deployerOrigin.address })
    txs.push(tx)
    tx = await router.addLiquidity(
      token.address, layerCakeToken.address,
      fullValue(100), fullValue(50),
      0, 0, deployerOrigin.address, (await latestBlockTimestamp() + 1000), { from: deployerOrigin.address }
    )
    txs.push(tx)
  }
  const targetInteractor: LayerCakeInteractorTargetInstance = await LayerCakeInteractorTarget.at(layerCakeInteractorTarget)

  await targetInteractor.setTokenList(tokenList.address)

}


async function hehe(deployerOrigin: HardhatEthersSigner) {
  const router = await getUniswapRouter();

  const t1: TokenInstance = await Token.new("Token1", "TKN1", fullValue(100000))
  const t2: TokenInstance = await Token.new("Token2", "TKN2", fullValue(100000))

  await t1.approve(router.address, fullValue(100000))
  await t2.approve(router.address, fullValue(100000))

  await router.addLiquidity(
    t1.address, t2.address,
    fullValue(100), fullValue(50),
    0, 0,
    deployerOrigin.address,
    (await latestBlockTimestamp() + 1000)
  )

  await t1.approve(router.address, fullValue(0))
  await t2.approve(router.address, fullValue(0))

  await t1.approve(router.address, fullValue(10))

  const tx = await router.swapExactTokensForTokens(
    fullValue(10),
    0,
    [t1.address, t2.address],
    deployerOrigin.address,
    (await latestBlockTimestamp() + 1000)
  )


  console.log(tx)
}


async function works(deployerOrigin: HardhatEthersSigner) {
  const tl: TokenListInstance = await getTokenList()

  console.log(tl.address)

  const lcToken: TokenInstance = await Token.at(await (await LayerCake.at(DESTINATION_LAYER_CAKE_ADDRESS)).token())

  const interactor = await LayerCakeInteractorTarget.new(
    DESTINATION_LAYER_CAKE_ADDRESS,
    (await getLayerCakeToken()).address,
    uniswapFactoryCoston,
    uniswapRouterCoston,
    deployerOrigin.address,
    tokenListAddress,
  )

  await lcToken.transfer(interactor.address, 100_000_000)

  const txb = await interactor.executeLayerCakeLiquidityFarm(
    "TOK9",
    "TOK8",
    keccak256(ethers.toUtf8Bytes("password")),
    deployerOrigin.address
  )

  console.log(txb)
}


async function contractPreparations(deployer: HardhatEthersSigner) {
  // 4 phases, you need to do it manually

  // 1. Deploy interactor on this side -- coston2

  // assert(networkName === originNetwork)
  // await deploySourceInteractor(deployer)
  // return

  // 2. Deploy interactor on other side and set it up -- coston

  // assert(networkName === destinationNetwork)
  // await deployTargetInteractor(deployer)
  // return

  // 3. Set up the other side addresses 

  // a) -- coston2

  // assert(networkName === originNetwork)
  // const interactorSource = await LayerCakeInteractorSource.at(layerCakeInteractorSource)
  // await interactorSource.setOtherSideInteractingContract(layerCakeInteractorTarget)
  // return

  // b) -- sepolia

  // assert(networkName === destinationNetwork)
  // const interactorTarget = await LayerCakeInteractorTarget.at(layerCakeInteractorTarget)
  // await interactorTarget.setOtherSideInteractingContract(layerCakeInteractorSource)
  // return

}


async function createLiquidityPools(deployerOrigin: HardhatEthersSigner) {
  const uniRouter: UniswapV2Router02Instance = await UniswapV2Router02.at(uniswapRouterCoston)

  const tokenList = await getTokenList()

  for (let i = 1; i < 10; ++i) {
    for (let j = i + 1; j < 10; ++j) {
      const t1 = await Token.at(await tokenList.tokens("TOK" + i))
      const t2 = await Token.at(await tokenList.tokens("TOK" + j))
      console.log(t1.address, t2.address, i, j)
      await t1.approve(uniRouter.address, fullValue(10))
      await t2.approve(uniRouter.address, fullValue(10))

      const ttx = await uniRouter.addLiquidity(
        t1.address, t2.address,
        10_000, 10_000,
        0, 0,
        deployerOrigin.address,
        (await latestBlockTimestamp() + 1000)
      )
      console.log(ttx)
    }
  }
}

const password = "password"

async function runUniswap(t1: string, t2: string, num: number,
  deployerOrigin: HardhatEthersSigner,
) {


  const token8: TokenInstance = await getTokenList().then(tl => tl.tokens(t1)).then(t => Token.at(t))
  const token9: TokenInstance = await getTokenList().then(tl => tl.tokens(t2)).then(t => Token.at(t))

  console.log(token8.address)
  console.log(token9.address)

  console.log((await token8.balanceOf(deployerOrigin.address)).toString())
  console.log((await token9.balanceOf(deployerOrigin.address)).toString())

  const router = await getUniswapRouter();

  for (let i = 0; i < num; ++i) {
    console.log(i)

    await token8.approve(router.address, fullValue(1000000))
    await token9.approve(router.address, fullValue(1000000))

    const t = await router.swapExactTokensForTokens(
      (toBN(5).mul(toBN(10).pow(toBN(9)))).toString(),
      0, [token8.address, token9.address],
      deployerOrigin.address,
      (await latestBlockTimestamp() + 1000)
    )

    await token8.approve(router.address, fullValue(1000000))
    await token9.approve(router.address, fullValue(1000000))

    await router.swapExactTokensForTokens(
      (toBN(5).mul(toBN(10).pow(toBN(9)))).toString(),
      0, [token9.address, token8.address],
      deployerOrigin.address,
      (await latestBlockTimestamp() + 1000)
    )

    console.log((await token8.balanceOf(deployerOrigin.address)).toString())
    console.log((await token9.balanceOf(deployerOrigin.address)).toString())

  }

}

const originNetwork = "coston2"
const destinationNetwork = "sepolia"

async function runme(deployerOrigin: HardhatEthersSigner) {
  const token8: TokenInstance = await getTokenList().then(tl => tl.tokens("TOK1")).then(t => Token.at(t))
  const token9: TokenInstance = await getTokenList().then(tl => tl.tokens("TOK2")).then(t => Token.at(t))

  console.log(token8.address)
  console.log(token9.address)

  console.log((await token8.balanceOf(deployerOrigin.address)).toString())
  console.log((await token9.balanceOf(deployerOrigin.address)).toString())

  const router = await getUniswapRouter();


  for (let i = 0; i < 20; ++i) {
    console.log(i)

    await token8.approve(router.address, fullValue(1000000))
    await token9.approve(router.address, fullValue(1000000))

    await router.swapExactTokensForTokens(
      (toBN(5).mul(toBN(10).pow(toBN(17)))).toString(),
      0, [token8.address, token9.address],
      deployerOrigin.address,
      (await latestBlockTimestamp() + 1000)
    )

    await token8.approve(router.address, fullValue(1000000))
    await token9.approve(router.address, fullValue(1000000))

    await router.swapExactTokensForTokens(
      (toBN(5).mul(toBN(10).pow(toBN(17)))).toString(),
      0, [token9.address, token8.address],
      deployerOrigin.address,
      (await latestBlockTimestamp() + 1000)
    )
  }
}

// From here on

async function getLayerCakeDestination() {
  assert(networkName === destinationNetwork)
  return await LayerCake.at(DESTINATION_LAYER_CAKE_ADDRESS)
}

async function getLayerCakeSource() {
  assert(networkName === originNetwork)
  return await LayerCake.at(ORIGIN_LAYER_CAKE_ADDRESS)
}

async function getTokenList(): TokenListInstance {
  return await TokenList.at(TOKEN_LIST_ADDRESS)
}

async function getUniswapRouter() {
  const router: UniswapV2Router02Instance = await UniswapV2Router02.at(UNISWAP_ROUTER_ADDRESS)
  return router
}

async function deployUniswapFactory(deployerOrigin: HardhatEthersSigner) {
  const Contract = await ethers.getContractFactory(abi, bytecode);
  const deployed = await Contract.deploy(deployerOrigin.address);
  await deployed.waitForDeployment();
  const factory: UniswapV2FactoryInstance = await UniswapV2Factory.at(deployed.target);
  const router: UniswapV2Router02Instance = await UniswapV2Router02.new(factory.address, "0x7b79995e5f793a07bc00c21412e50ecae098e7f9");

  console.log("UniswapV2Factory deployed to:", factory.address);
  console.log("UniswapV2Router02 deployed to:", router.address);

  console.log(`yarn hardhat verify ${factory.address} --network ${networkName} ` + deployerOrigin.address) // This fails
  console.log(`yarn hardhat verify ${router.address} --network ${networkName} ` + factory.address + " " + WNAT_ADDRESS)
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
  const uniRouter: UniswapV2Router02Instance = await UniswapV2Router02.at(UNISWAP_ROUTER_ADDRESS)

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

  const router = await UniswapV2Router02.at(UNISWAP_ROUTER_ADDRESS)
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

// Until here
async function main() {
  const [deployerOrigin, deployerTarget, originUser1, originUser2, destinationUser1, destinationUser2] = await ethers.getSigners();



  /* 1. Deploy uniswap factory and router - This only needs to be done once per network */

  // assert(networkName === destinationNetwork)
  // await deployUniswapFactory(deployerOrigin)
  // return

  /* 2. Send over a reasonable amount of LayerCakeToken to later bootstrap liquidity pools */

  // assert(networkName === originNetwork)
  // const layerCake = await getLayerCakeSource()
  // const token: TokenInstance = await Token.at(await layerCake.token())
  // console.log(layerCake.address, token.address)

  // await sendSimpleTokensOver(deployerOrigin, deployerOrigin.address, layerCake, fullValue(500))
  // return


  /* 3. Create tokens on the other side and bootstrap liquidity pools */

  // assert(networkName === destinationNetwork)
  // const tokenList = await createTokenList()
  // await deployTokens(tokenList)

  //await bootstrapLiquidityPairPools(deployerOrigin)
  // await createLayerCakeToTokenLiquidityPools(deployerOrigin)
  // return

  /* 4. Deploy interactor contracts */


  const interactor = await LayerCakeInteractorTarget.at(
    layerCakeInteractorTarget
  )

  await interactor.setTokenList(TOKEN_LIST_ADDRESS)

  const otherSideToken = await Token.at(await interactor.layerCakeToken())

  // await otherSideToken.transfer(interactor.address, 10_000)

  const tokenList = await TokenList.at(await interactor.tokenList())

  console.log(await tokenList.tokens("TOK1"))
  console.log(await tokenList.tokens("TOK1"))

  console.log(tokenList.address)


  const txTest = await interactor.executeLayerCakeLiquidityFarm.call(
    "TOK1", "TOK2",
    keccak256(ethers.toUtf8Bytes(password)),
    deployerOrigin.address
  )
  console.log(txTest)
  return


  console.log(interactor.address)




  // await contractPreparations(deployerOrigin)

  return



  /* 4. Deploy the needed interactor contracts */

  // await contractPreparations(deployerOrigin)

  await runme(deployerOrigin)
  return

  // await deployBasicTokenLiquidity(deployerOrigin)

  // const lcc = await LayerCake.at(ORIGIN_LAYER_CAKE_ADDRESS)
  // const token = await Token.at(await lcc.token())
  // console.log(token.address)
  // await token.transfer("0x7d0F24d863961e7C51C28A3eC092C96239FBD05e", fullValue(100))

  return

  // await deployBasicTokenLiquidity(deployerOrigin)

  // return

  const lc = await LayerCake.at(ORIGIN_LAYER_CAKE_ADDRESS)

  await sendTokensOver(deployerOrigin, lc)


  return

  // await runUniswap("TOK8", "TOK9", 100, deployerOrigin)

  // return

  // 1. Prepare interacting contracts

  // await contractPreparations(deployerOrigin)
  // return


  // 2.-1 -- Test that it works on coston
  // const interactorTarget: LayerCakeInteractorTargetInstance = await LayerCakeInteractorTarget.at(layerCakeInteractorTarget)

  // const otherSideToken = await Token.at(await interactorTarget.layerCakeToken())

  // await otherSideToken.transfer(interactorTarget.address, 10_000)
  // const txTest = await interactorTarget.executeLayerCakeLiquidityFarm(
  //   "TOK1", "TOK2",
  //   keccak256(ethers.toUtf8Bytes(password)),
  //   deployerOrigin.address
  // )
  // console.log(txTest)
  // return

  // Add liquidity to prevent out of gas error

  // const uniRouter: UniswapV2Router02Instance = await UniswapV2Router02.at(uniswapRouterCoston)

  // const tokenList = await getTokenList()
  // const t1 = await Token.at(await tokenList.tokens("TOK1"))
  // const t2 = await Token.at(await tokenList.tokens("TOK2"))

  // await t1.approve(uniRouter.address, fullValue(10))
  // await t2.approve(uniRouter.address, fullValue(10))

  // const ttx = await uniRouter.addLiquidity(
  //   t1.address, t2.address,
  //   10_000, 10_000,
  //   0, 0,
  //   deployerOrigin.address,
  //   (await latestBlockTimestamp() + 1000)
  // )

  // console.log(ttx)
  // return

  // 2. Execute Layer Cake on source -- coston2

  // This works if there is an active pool (due to gas problems)
  // const sourceInteractorC: LayerCakeInteractorSourceInstance = await LayerCakeInteractorSource.at(layerCakeInteractorSource)

  // const sourceToken: TokenInstance = await Token.at(await sourceInteractorC.layerCakeToken())

  // // await sourceToken.transfer(sourceInteractorC.address, 100_000_000)

  // console.log((await sourceToken.balanceOf(sourceInteractorC.address)).toString())
  // const txStartMe = await sourceInteractorC.startLiquidityFarming(
  //   "sepolia", "uniswapV2", "TOK1", "TOK2",
  //   keccak256(ethers.toUtf8Bytes(password))
  // )

  // console.log(txStartMe)
  // return



  // 3. Remove liquidity

  // Test
  // const interactorTarget: LayerCakeInteractorTargetInstance = await LayerCakeInteractorTarget.at(layerCakeInteractorTarget)
  // const txC = await interactorTarget.removeLiquidity("password")
  // console.log(txC)
  // return

  const sourceInteractorC: LayerCakeInteractorSourceInstance = await LayerCakeInteractorSource.at(layerCakeInteractorSource)

  const sourceToken: TokenInstance = await Token.at(await sourceInteractorC.layerCakeToken())

  console.log((await sourceToken.balanceOf(sourceInteractorC.address)).toString())

  const txRemove = await sourceInteractorC.withdrawLiquidityFarming("sepolia", "uniswapv2", password)
  console.log(txRemove)
  return

  // TODO FROM HERE ON



  // const interactorTarget: LayerCakeInteractorTargetInstance = await LayerCakeInteractorTarget.at(layerCakeInteractorTarget)

  // const t = await getLayerCakeToken()
  // console.log(interactorTarget.address)


  // const cc = await interactorTarget.executeLayerCakeLiquidityFarm.encodeABI(
  //   "TOK1",
  //   "TOK2",
  //   keccak256(ethers.toUtf8Bytes("password")),
  //   deployerOrigin.address
  // )

  // console.log(cc)

  // const interactorSource = await LayerCakeInteractorSource.at(layerCakeInteractorSource)


  // const token = await getLayerCakeToken()

  // const t = await interactorSource.startLiquidityFarming(
  //   "", "",
  //   "TOK1",
  //   "TOK2",
  //   keccak256(ethers.toUtf8Bytes("password")),
  // )

  // console.log(t)

  return


  const token8: TokenInstance = await getTokenList().then(tl => tl.tokens("TOK8")).then(t => Token.at(t))
  const token9: TokenInstance = await getTokenList().then(tl => tl.tokens("TOK9")).then(t => Token.at(t))

  console.log(token8.address)
  console.log(token9.address)

  console.log((await token8.balanceOf(deployerOrigin.address)).toString())
  console.log((await token9.balanceOf(deployerOrigin.address)).toString())

  const router = await getUniswapRouter();


  for (let i = 0; i < 20; ++i) {
    console.log(i)

    await token8.approve(router.address, fullValue(1000000))
    await token9.approve(router.address, fullValue(1000000))

    await router.swapExactTokensForTokens(
      (toBN(5).mul(toBN(10).pow(toBN(9)))).toString(),
      0, [token8.address, token9.address],
      deployerOrigin.address,
      (await latestBlockTimestamp() + 1000)
    )

    await token8.approve(router.address, fullValue(1000000))
    await token9.approve(router.address, fullValue(1000000))

    await router.swapExactTokensForTokens(
      (toBN(5).mul(toBN(10).pow(toBN(9)))).toString(),
      0, [token9.address, token8.address],
      deployerOrigin.address,
      (await latestBlockTimestamp() + 1000)
    )
  }

  return


  const pass = keccak256(ethers.toUtf8Bytes("password"))
  console.log(pass)
  // const TesterContract = new web3.eth.Contract(
  //   LayerCakeInteractorTarget.abi,
  // )
  // const abi = TesterContract.methods.executeLayerCakeLiquidityFarm(
  //   "TKN1",
  //   "TKN2",
  //   pass,
  //   deployerOrigin.address
  // ).encodeABI()

  // console.log(abi)
  const targetInteractor: LayerCakeInteractorTargetInstance = await LayerCakeInteractorTarget.at(layerCakeInteractorTarget)


  const txa = await targetInteractor.executeLayerCakeLiquidityFarm.call(
    "TOK9",
    "TOK8",
    pass,
    deployerOrigin.address
  )

  console.log(txa)

  // const a: AInstance = await A.new()                    
  // const x = await a.cll.call(targetInteractor.address, "0xf290541a000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0b68fe43f0d1a0d7aef123722670be50268e15365401c442f8806ef83b612976b000000000000000000000000ff02f742106b8a25c26e65c1f0d66bec3c90d4290000000000000000000000000000000000000000000000000000000000000004544b4e31000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004544b4e3200000000000000000000000000000000000000000000000000000000")

  // console.log(x)
  return

  const sourceInteractor = await deploySourceInteractor()

  const tx = await sourceInteractor.startLiquidityFarming(
    "sepolia",
    "uniswapV2",
    "TKN1",
    "TKN2",
    pass,
  )

  console.log(tx)

  return
  const maximalSupply = fullValue(1_000_000_000);



  const layerCakeOrigin: LayerCakeInstance = await LayerCake.at(ORIGIN_LAYER_CAKE_ADDRESS);
  // const layerCakeDestination: LayerCakeInstance = await LayerCake.at(DESTINATION_LAYER_CAKE_ADDRESS);



  await sendTokensOver(deployerOrigin, layerCakeOrigin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).then(() => process.exit());


