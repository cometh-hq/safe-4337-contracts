
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";

import { getDeterministicDeployment } from "@cometh/contracts-factory";

require("dotenv").config();

if (process.env.PRIVATE_KEY === undefined) throw new Error("PRIVATE_KEY is not set");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.23" },
      { version: "0.7.6" },
      { version: "0.6.12" },
      { version: "0.5.17" },
    ],
  },
  deterministicDeployment: (network: string) => {
    const networkName = process.env.HARDHAT_NETWORK ?? "";
    const env: string = (() => {
      switch (true) {
        case networkName.endsWith("_production"):
          return "production";
        case networkName.endsWith("_staging"):
          return "staging";
        default:
          return "develop";
      }
    })();
    return getDeterministicDeployment(env)(network);
  },
  networks: {
    hardhat: {
      // required to deploy safes
      allowUnlimitedContractSize: true,
    },
    /*
    muster_testnet: {
      url: "https://muster-anytrust.alt.technology",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    muster_testnet_production: {
      url: "https://muster-anytrust.alt.technology",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    muster_testnet_staging: {
      url: "https://muster-anytrust.alt.technology",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    muster_mainnet: {
      url: "https://muster.alt.technology",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    muster_mainnet_production: {
      url: "https://muster.alt.technology",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    muster_mainnet_staging: {
      url: "https://muster.alt.technology",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: "https://polygon-mumbai.infura.io/v3/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai_production: {
      url: "https://polygon-mumbai.infura.io/v3/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai_staging: {
      url: "https://polygon-mumbai.infura.io/v3/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: "https://polygon-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      gasMultiplier: 1.5,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon_production: {
      url: "https://polygon-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      gasMultiplier: 1.5,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon_staging: {
      url: "https://polygon-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      gasMultiplier: 1.5,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    fuji: {
      url: "https://rpc.ankr.com/avalanche_fuji",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    fuji_production: {
      url: "https://rpc.ankr.com/avalanche_fuji",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    avalanche_production: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    gnosis: {
      url: "https://rpc.ankr.com/gnosis",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    gnosis_production: {
      url: "https://rpc.ankr.com/gnosis",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    chiado: {
      url: "https://rpc.chiadochain.net",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    chiado_production: {
      url: "https://rpc.chiadochain.net",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon_zkevm_testnet_production: {
      url: "https://rpc.public.zkevm-test.net",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    redstone_holesky_production: {
      url: "https://rpc.holesky.redstone.xyz",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    optimism_sepolia_production: {
      url: "https://sepolia.optimism.io",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    optimism_production: {
      url: "https://optimism-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    arthera_production: {
      url: "https://rpc.arthera.net/",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet_production: {
      url: "https://eth-mainnet.g.alchemy.com/v2/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    amoy_production: {
      url: "https://polygon-amoy.infura.io/v3/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 30000000000,
    },
    XL_production: {
      url: "https://subnets.avax.network/xlnetworkt/testnet/rpc",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 3084,
    },
    arbitrum_production: {
      url: "https://arbitrum-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
   
   
     */
    arbitrum_sepolia: {
      url: "https://arb-sepolia.g.alchemy.com/v2/j2u34Yef5hzCe4OZ5KJb-EjF8oQenPTT",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrum_sepolia_production: {
      url: "https://arb-sepolia.g.alchemy.com/v2/j2u34Yef5hzCe4OZ5KJb-EjF8oQenPTT",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    base_sepolia: {
      url: "https://sepolia.base.org",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    base_sepolia_production: {
      url: "https://sepolia.base.org",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    /*
    base_production: {
      url: "https://base-mainnet.g.alchemy.com/v2/" + process.env.INFURA_ID,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
   
    */
  },
  /*
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "chiado",
        chainId: 10200,
        urls: {
          apiURL: "https://gnosis-chiado.blockscout.com/api",
          browserURL: "https://gnosis-chiado.blockscout.com/",
        },
      },
      {
        network: "muster_testnet",
        chainId: 2121337,
        urls: {
          apiURL: "https://muster-anytrust-explorer.alt.technology/api",
        },
      },
      {
        network: "muster",
        chainId: 4078,
        urls: {
          apiURL: "https://muster-explorer-v2.alt.technology/api",
        },
      },
      {
        network: "polygon_zkevm_testnet",
        chainId: 1442,
        urls: {
          apiURL: "https://testnet-zkevm.polygonscan.com/api",
          browserURL: "https://testnet-zkevm.polygonscan.com/",
        },
      },
      {
        network: "arbitrum_sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "arbitrum",
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://arbiscan.io/",
        },
      },
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
    ],
  },
  */
  typechain: {
    outDir: "artifacts/typechain",
    target: "ethers-v6",
  },
  /*
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
  */
};

export default config;
