// Start on coston2 and move funds over directly to sepolia using layer cake

import { ethers } from "hardhat";
import { config } from "../lib/config";
import { fullValue, prepareSimpleTransfer, toBN } from "../lib/helpers";
import { LayerCakeContract, TokenContract } from "../typechain-types";


const Token: TokenContract = artifacts.require('Token')
const LayerCake: LayerCakeContract = artifacts.require('LayerCake')




async function main() {
    const [addrs] = await ethers.getSigners();

    const layerCake = await LayerCake.at(
        config.originLayerCakeAddress
    )

    const token = await Token.at(
        await layerCake.token()
    )

    console.log(token.address)

    await token.approve(layerCake.address, fullValue(3))

    const op = await prepareSimpleTransfer(
        fullValue(1),
        toBN(1),
        addrs.address,
        addrs.address
    )

    const tx = await layerCake.storeStandardOperations(
        op
    )

    console.log(tx.tx)

}





main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).then(() => process.exit());

