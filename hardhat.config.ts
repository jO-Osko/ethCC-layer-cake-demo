import '@nomicfoundation/hardhat-chai-matchers';
import "@nomicfoundation/hardhat-toolbox";
import '@nomiclabs/hardhat-truffle5';
import '@typechain/hardhat';
import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
const { API_URL, PRIVATE_KEY, ETHERSCAN_API_URL, ANKR_SEPOLIA_API_KEY, FLARE_PRIVATE_KEY, FLARE_EXPLORER_API_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
    overrides: {
      "contracts/dummy/Dummy66.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      "@uniswap/v2-periphery/contracts/libraries/SafeMath.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      "@uniswap/v2-core/contracts/UniswapV2Factory.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        }
      },
      "contracts/dummy/Dummy516.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        }
      },
      "@uniswap/v2-core/contracts/UniswapV2Pair.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        }
      },
      "@uniswap/v2-core/contracts/libraries/UQ112x112.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        }
      },
      "@uniswap/v2-core/contracts/libraries/Math.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        }
      },
      "@uniswap/v2-core/contracts/UniswapV2ERC20.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        }
      },
      "@uniswap/v2-core/contracts/libraries/SafeMath.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        }
      },
    }
  },
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${API_URL}`,
      accounts: [`${PRIVATE_KEY}`]
    },
    sepolia: {
      url: `https://rpc.ankr.com/eth_sepolia/${ANKR_SEPOLIA_API_KEY}`,
      accounts: [`${PRIVATE_KEY}`]
    },
    coston: {
      url: "https://coston-api.flare.network/ext/bc/C/rpc" + (FLARE_EXPLORER_API_KEY ? `?x-apikey=${FLARE_EXPLORER_API_KEY}` : ""),
      accounts: [`${PRIVATE_KEY}`],
      chainId: 16
    },
    coston2: {
      url: "https://coston2-api.flare.network/ext/C/rpc",
      accounts: [`${PRIVATE_KEY}`],
      chainId: 114
    },
    songbird: {
      url: "https://songbird-api.flare.network/ext/bc/C/rpc",
      accounts: [`${PRIVATE_KEY}`],
      chainId: 19
    },
    flare: {
      url: "https://flare-api.flare.network/ext/C/rpc",
      accounts: [`${PRIVATE_KEY}`],
      chainId: 14,
    }
  },
  etherscan: {
    apiKey: {
      "goerli": `${ETHERSCAN_API_URL}`,
      "coston": `${FLARE_PRIVATE_KEY}`,
      "coston2": `${FLARE_PRIVATE_KEY}`,
      "songbird": `${FLARE_PRIVATE_KEY}`,
      "flare": `${FLARE_PRIVATE_KEY}`,
      "sepolia": `${ETHERSCAN_API_URL}`,
    },
    customChains: [
      {
        network: "coston",
        chainId: 16,
        urls: {
          // faucet: https://faucet.towolabs.com/
          apiURL: "https://coston-explorer.flare.network/api" + (FLARE_EXPLORER_API_KEY ? `?x-apikey=${FLARE_EXPLORER_API_KEY}` : ""), // Must not have / endpoint
          browserURL: "https://coston-explorer.flare.network"
        }
      },
      {
        network: "coston2",
        chainId: 114,
        urls: {
          // faucet: https://coston2-faucet.towolabs.com/
          apiURL: "https://coston2-explorer.flare.network/api", // Must not have / endpoint
          browserURL: "https://coston2-explorer.flare.network"
        }
      },
      {
        network: "songbird",
        chainId: 19,
        urls: {
          apiURL: "https://songbird-explorer.flare.network/api", // Must not have / endpoint
          browserURL: "https://songbird-explorer.flare.network/"
        }
      },
      {
        network: "flare",
        chainId: 14,
        urls: {
          apiURL: "https://flare-explorer.flare.network/api",
          browserURL: "https://flare-explorer.flare.network/",
        }
      }
    ]
  },
  paths: {
    sources: "./contracts/",
    tests: "./test/",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  typechain: {
    target: 'truffle-v5',
  },
};

export default config;
