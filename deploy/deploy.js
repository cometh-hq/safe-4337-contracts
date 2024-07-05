const deploy = async (hre) => {
  const {
    deployments: { deploy },
  } = hre;
  const [deployer] = await hre.ethers.getSigners();

  const entrypointv7 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"

  console.log(deployer.address)




  const safe4337SessionKeysModule = await deploy("Safe4337SessionKeysModule", {
    from: deployer.address,
    log: true,
    //deterministicDeployment: true,
    args: [entrypointv7],
  });

  console.log({safe4337SessionKeysModule})

  await run("verify:verify", {
    address: safe4337SessionKeysModule.address,
    constructorArguments: [entrypointv7],
  });
};

module.exports = deploy;
deploy.tags = "safe4337SessionKeysModuler";
