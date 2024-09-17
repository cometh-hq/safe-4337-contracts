import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {
    run,
    deployments: { deploy },
  } = hre;
  const [deployer] = await hre.ethers.getSigners();

  let period;
  let owner;
  switch (true) {
    case hre.network.name.endsWith("_production"):
      period = 86400;
      owner = "0x6c5F2CD54098E09EF35ac908a8d81f54C64E7F91";
      break;
    case hre.network.name.endsWith("_staging"):
      period = 86400;
      owner = "0x354A999be7A1143F8fD59d0a893b2f47a645b5AC";
      break;
    default:
      period = 600;
      owner = "0x9C8C71E891CC928810D0D03722a1da072219e81E";
  }

  const isProduction = hre.network.name.endsWith("_production");

  const expiration = 0;
  const delay = "0xd54895B1121A2eE3f37b502F507631FA1331BED6";
  const factory = "0x000000000000aDdB49795b0f9bA5BC298cDda236";
  const entrypointv7 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

  const safe4337SessionKeysModule = await deploy("Safe4337SessionKeysModule", {
    from: deployer.address,
    log: true,
    deterministicDeployment: true,
    args: [entrypointv7],
  });

  console.log({ safe4337SessionKeysModule });

  await run("verify:verify", {
    address: safe4337SessionKeysModule.address,
    constructorArguments: [entrypointv7],
  });
};

export default func;
func.tags = ["safe4337SessionKeysModuler"];
