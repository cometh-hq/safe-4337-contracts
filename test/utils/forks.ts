const hre = require("hardhat");

let snapshot: any = undefined;

const resetForkedChain = async () => {
  if (snapshot) {
    await hre.network.provider.request({
      method: "evm_revert",
      params: [snapshot], // snapshot is global
    });
  }
};

const makeForkedChainSnapshot = async () => {
  snapshot = await hre.network.provider.request({ method: "evm_snapshot" });
};

export { resetForkedChain, makeForkedChainSnapshot };
