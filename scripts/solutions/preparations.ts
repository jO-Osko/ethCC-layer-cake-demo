// Start on coston2 and move funds over directly to sepolia using layer cake

import { ethers } from "hardhat";
import { config } from "../../lib/config";
import { fullValue, prepareSimpleTransfer, toBN } from "../../lib/helpers";
import { LayerCakeContract, LayerCakeInstance, TokenContract } from "../../typechain-types";


const Token: TokenContract = artifacts.require('Token')
const LayerCake: LayerCakeContract = artifacts.require('LayerCake')




async function sendTokensOver(
    layerCake: LayerCakeInstance,
    sender: string,
    recipient: string,
    amount: BN,
) {

    const token = await layerCake.token().then(
        (a: string) => Token.at(a)
    )

    await token.approve(
        layerCake.address,
        amount.mul(toBN(2))
    )

    // 2. Construct the operations

    const operations = await prepareSimpleTransfer(
        amount, toBN(5), sender, recipient
    )

    console.log(operations)

    // 3. Send the operations over

    const tx = await layerCake.storeStandardOperations(
        operations
    )
    console.log(tx.tx)

}

async function main() {
    const [addrs] = await ethers.getSigners();

    // 1. Approve the token to the layer cake

    const layerCake = await LayerCake.at(
        config.destinationLayerCakeAddress
    )

    await sendTokensOver(
        layerCake, addrs.address, addrs.address, fullValue(30)
    )
}




// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).then(() => process.exit());





