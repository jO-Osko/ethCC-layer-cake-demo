// Start on coston2 and move funds over directly to sepolia using layer cake

import { LayerCakeContract, TokenContract } from "../typechain-types";


const Token: TokenContract = artifacts.require('Token')
const LayerCake: LayerCakeContract = artifacts.require('LayerCake')




async function main() {
    return
}





main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).then(() => process.exit());

