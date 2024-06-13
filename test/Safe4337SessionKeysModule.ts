import { expect } from "chai";
import { ethers } from "hardhat";
import {
  SafeProxyFactory,
  Safe,
  EntryPoint,
  TestCounter,
} from "../artifacts/typechain";
import {
  Safe4337SessionKeysModule,
  PackedUserOperationStruct,
} from "../artifacts/typechain/contracts/Safe4337SessionKeysModule";
import { ZeroAddress, parseEther } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  buildSessionOp,
  execTransaction,
  predictSafeAddress,
} from "./utils/safe";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SessionKeys4337 } from "../artifacts/typechain/contracts/SessionKeys4337";

describe("Safe4337SessionKeysModule", () => {
  let safeProxyFactory: SafeProxyFactory;
  let safe: Safe;
  let safeSessionKeysModule: Safe4337SessionKeysModule;
  let entryPoint: EntryPoint;
  let counter: TestCounter;
  let counterAddress: string;
  let user: SignerWithAddress;
  let relayer: SignerWithAddress;

  const SALT_NONCE = "0x00";

  beforeEach(async () => {
    [user, relayer] = await ethers.getSigners();

    const TestCounter = await ethers.getContractFactory("TestCounter");
    counter = await TestCounter.deploy();
    counterAddress = await counter.getAddress();

    const SafeSingleton = await ethers.getContractFactory("Safe");
    const safeSingleton = await SafeSingleton.deploy();

    const SafeProxyFactory = await ethers.getContractFactory(
      "SafeProxyFactory"
    );
    safeProxyFactory = await SafeProxyFactory.deploy();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = (await EntryPoint.deploy()).connect(relayer);

    const Safe4337SessionKeysModule = await ethers.getContractFactory(
      "Safe4337SessionKeysModule"
    );
    safeSessionKeysModule = (await Safe4337SessionKeysModule.deploy(
      entryPoint.getAddress()
    )) as Safe4337SessionKeysModule;

    const SafeModuleSetup = await ethers.getContractFactory("SafeModuleSetup");
    const safeModuleSetup = await SafeModuleSetup.deploy();
    const encodedModules = safeModuleSetup.interface.encodeFunctionData(
      "enableModules",
      [[await safeSessionKeysModule.getAddress()]]
    );

    const walletSetupData = safeSingleton.interface.encodeFunctionData(
      "setup",
      [
        [user.address], // owner
        1, // threshold
        await safeModuleSetup.getAddress(),
        encodedModules, // data
        await safeSessionKeysModule.getAddress(), // fallback handler
        ethers.ZeroAddress,
        0,
        ethers.ZeroAddress,
      ]
    );
    await safeProxyFactory
      .connect(user)
      .createProxyWithNonce(
        safeSingleton.getAddress(),
        walletSetupData,
        SALT_NONCE
      );

    const expectedAddress = await predictSafeAddress(
      safeProxyFactory,
      safeSingleton,
      walletSetupData,
      SALT_NONCE
    );
    safe = await ethers.getContractAt("Safe", expectedAddress);

    expect(await safe.VERSION()).to.equal("1.4.1");
    expect(
      await safe.isModuleEnabled(safeSessionKeysModule.getAddress())
    ).to.equal(true);

    await entryPoint.depositTo(await safe.getAddress(), {
      value: parseEther("1.0"),
    });
  });

  describe("When creating a session", () => {
    it.skip("if not from the safe, it fails", async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      await expect(
        safeSessionKeysModule
          .connect(user)
          .addSessionKey(ethers.ZeroAddress, currentTime, currentTime + 20, [
            ethers.ZeroAddress,
          ])
      ).to.be.revertedWith("Only Safe allowed");
    });
    it("with valid parameters, it succeeds", async () => {
      const timestamp = await time.latest();
      const txData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, txData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );
      const session = await safeSessionKeysModule.sessionKeys(user.address);
      expect(session.revoked).to.be.false;
      expect(session.validAfter).to.be.equal(timestamp + 1);
      expect(session.validUntil).to.be.equal(timestamp + 20);
      const whitelist = await safeSessionKeysModule.whitelistDestinations(
        user.address,
        counterAddress
      );
      expect(whitelist).to.be.true;
    });
    it("if session already exists, it fails", async () => {
      const timestamp = await time.latest();
      const txData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, txData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );
      await expect(execTransaction(safe, user, txData)).to.be.reverted;
    });
    it("if validAfter not in the future, it fails ", async () => {
      const timestamp = await time.latest();
      const txData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp - 10, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, txData)).to.be.reverted;
    });
    it("if validUntil not after validAfter, it fails", async () => {
      const timestamp = await time.latest();
      const txData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 100, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, txData)).to.be.reverted;
    });
    it("if no destination provided, it fails", async () => {
      const timestamp = await time.latest();
      const txData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [] // allowed destinations
        );
      await expect(execTransaction(safe, user, txData)).to.be.reverted;
    });
  });

  describe("When revoking a session", async () => {
    it.skip("if not from the safe, it fails", async () => {});
    it("if session doesn't exist, it fails", async () => {
      const revokeSessionKeyTxData =
        await safeSessionKeysModule.revokeSession.populateTransaction(
          user.address
        );
      await expect(execTransaction(safe, user, revokeSessionKeyTxData)).to.be
        .reverted;
    });
    it("with valid parameters, it succeeds", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, addSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );

      const revokeSessionKeyTxData =
        await safeSessionKeysModule.revokeSession.populateTransaction(
          user.address
        );
      await expect(execTransaction(safe, user, revokeSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyRevoked"
      );
      const session = await safeSessionKeysModule.sessionKeys(user.address);
      expect(session.revoked).to.be.true;
    });
    it("if session already revoked, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, addSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );

      const revokeSessionKeyTxData =
        await safeSessionKeysModule.revokeSession.populateTransaction(
          user.address
        );
      await expect(execTransaction(safe, user, revokeSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyRevoked"
      );

      await expect(execTransaction(safe, user, revokeSessionKeyTxData)).to.be
        .reverted;
    });
  });

  describe("When adding a destination to the whitelist", async () => {
    it.skip("if not from the safe, it fails", async () => {});
    it("if session doesn't exist, it fails", async () => {
      const addWhitelistDestinationTxData =
        await safeSessionKeysModule.addWhitelistDestination.populateTransaction(
          user.address,
          counterAddress
        );
      await expect(execTransaction(safe, user, addWhitelistDestinationTxData))
        .to.be.reverted;
    });
    it("if destination already whitelisted, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [ZeroAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, addSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );

      const addWhitelistDestinationTxData =
        await safeSessionKeysModule.addWhitelistDestination.populateTransaction(
          user.address,
          counterAddress
        );
      await expect(
        execTransaction(safe, user, addWhitelistDestinationTxData)
      ).to.emit(safeSessionKeysModule, "WhitelistedDestinationAdded");

      await expect(execTransaction(safe, user, addWhitelistDestinationTxData))
        .to.be.reverted;
    });
    it("with valid parameters, it succeeds", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [ZeroAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, addSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );

      const addWhitelistDestinationTxData =
        await safeSessionKeysModule.addWhitelistDestination.populateTransaction(
          user.address,
          counterAddress
        );
      await expect(
        execTransaction(safe, user, addWhitelistDestinationTxData)
      ).to.emit(safeSessionKeysModule, "WhitelistedDestinationAdded");
      const whitelisted = await safeSessionKeysModule.whitelistDestinations(
        user.address,
        counterAddress
      );
      expect(whitelisted).to.be.true;
    });
  });

  describe("When removing a destination from the whitelist", async () => {
    it.skip("if not from the safe, it fails", async () => {});
    it("if session doesn't exist, it fails", async () => {
      const removeWhitelistDestinationTxData =
        await safeSessionKeysModule.removeWhitelistDestination.populateTransaction(
          user.address,
          counterAddress
        );
      await expect(
        execTransaction(safe, user, removeWhitelistDestinationTxData)
      ).to.be.reverted;
    });
    it("with valid parameters, it succeeds", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [ZeroAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, addSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );

      const addWhitelistDestinationTxData =
        await safeSessionKeysModule.addWhitelistDestination.populateTransaction(
          user.address,
          counterAddress
        );
      await expect(
        execTransaction(safe, user, addWhitelistDestinationTxData)
      ).to.emit(safeSessionKeysModule, "WhitelistedDestinationAdded");
      let whitelisted = await safeSessionKeysModule.whitelistDestinations(
        user.address,
        counterAddress
      );
      expect(whitelisted).to.be.true;

      const removeWhitelistDestinationTxData =
        await safeSessionKeysModule.removeWhitelistDestination.populateTransaction(
          user.address,
          counterAddress
        );
      await expect(
        execTransaction(safe, user, removeWhitelistDestinationTxData)
      ).to.emit(safeSessionKeysModule, "WhitelistedDestinationRemoved");
      whitelisted = await safeSessionKeysModule.whitelistDestinations(
        user.address,
        counterAddress
      );
      expect(whitelisted).to.be.false;
    });
    it("if destination not whitelisted, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [ZeroAddress] // allowed destinations
        );
      await expect(execTransaction(safe, user, addSessionKeyTxData)).to.emit(
        safeSessionKeysModule,
        "SessionKeyAdded"
      );

      const removeWhitelistDestinationTxData =
        await safeSessionKeysModule.removeWhitelistDestination.populateTransaction(
          user.address,
          counterAddress
        );
      await expect(
        execTransaction(safe, user, removeWhitelistDestinationTxData)
      ).to.be.reverted;
    });
  });

  describe("When executing transaction session", async () => {
    it("if session doesn't exist, it fails", async () => {
      const sessionOp = await interactWithCounter(user, 0n);
      const opHash = await entryPoint.getUserOpHash(sessionOp);
      sessionOp.signature = await user.signMessage(ethers.getBytes(opHash));

      await expect(entryPoint.handleOps([sessionOp], user.address))
        .to.emit(entryPoint, "UserOperationEvent")
        .to.not.emit(safe, "ExecutionFromModuleSuccess");
    });
    it("if session revoked, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await execTransaction(safe, user, addSessionKeyTxData);
      const revokeSessionKeyTxData =
        await safeSessionKeysModule.revokeSession.populateTransaction(
          user.address
        );
      await execTransaction(safe, user, revokeSessionKeyTxData);

      const sessionOp = await interactWithCounter(user, 0n);
      const opHash = await entryPoint.getUserOpHash(sessionOp);
      sessionOp.signature = await user.signMessage(ethers.getBytes(opHash));
      await expect(entryPoint.handleOps([sessionOp], user.address))
        .to.emit(entryPoint, "UserOperationEvent")
        .to.not.emit(safe, "ExecutionFromModuleSuccess");
    });
    it("if session not started, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1000, // valid after
          timestamp + 2000, // valid until
          [counterAddress] // allowed destinations
        );
      await execTransaction(safe, user, addSessionKeyTxData);

      const sessionOp = await interactWithCounter(user, 0n);
      const opHash = await entryPoint.getUserOpHash(sessionOp);
      sessionOp.signature = await user.signMessage(ethers.getBytes(opHash));
      await expect(entryPoint.handleOps([sessionOp], user.address))
        .to.emit(entryPoint, "UserOperationEvent")
        .to.not.emit(safe, "ExecutionFromModuleSuccess");
    });
    it("if session expired, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 100, // valid after
          timestamp + 200, // valid until
          [counterAddress] // allowed destinations
        );
      await execTransaction(safe, user, addSessionKeyTxData);

      await time.increaseTo(timestamp + 300);

      const sessionOp = await interactWithCounter(user, 0n);
      const opHash = await entryPoint.getUserOpHash(sessionOp);
      sessionOp.signature = await user.signMessage(ethers.getBytes(opHash));
      await expect(entryPoint.handleOps([sessionOp], user.address))
        .to.emit(entryPoint, "UserOperationEvent")
        .to.not.emit(safe, "ExecutionFromModuleSuccess");
    });
    it("if allowAllDestinations true, if address(0) not whitelisted, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [counterAddress] // allowed destinations
        );
      await execTransaction(safe, user, addSessionKeyTxData);

      const sessionOp = await interactWithCounter(user, 0n, true);
      const opHash = await entryPoint.getUserOpHash(sessionOp);
      sessionOp.signature = await user.signMessage(ethers.getBytes(opHash));
      await expect(entryPoint.handleOps([sessionOp], user.address))
        .to.emit(entryPoint, "UserOperationEvent")
        .to.not.emit(safe, "ExecutionFromModuleSuccess");
    });
    it("if allowAllDestinations false, if destination not whitelisted, it fails", async () => {
      const timestamp = await time.latest();
      const addSessionKeyTxData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [ZeroAddress] // allowed destinations
        );
      await execTransaction(safe, user, addSessionKeyTxData);

      const sessionOp = await interactWithCounter(user, 0n);
      const opHash = await entryPoint.getUserOpHash(sessionOp);
      sessionOp.signature = await user.signMessage(ethers.getBytes(opHash));
      await expect(entryPoint.handleOps([sessionOp], user.address))
        .to.emit(entryPoint, "UserOperationEvent")
        .to.not.emit(safe, "ExecutionFromModuleSuccess");
    });
    it("with valid parameters, it succeeds", async () => {
      const timestamp = await time.latest();
      const txData =
        await safeSessionKeysModule.addSessionKey.populateTransaction(
          user.address,
          timestamp + 1, // valid after
          timestamp + 20, // valid until
          [counterAddress] //[ethers.ZeroAddress] // allowed destinations
        );
      await execTransaction(safe, user, txData);

      // prepare user operation
      const sessionOp = await interactWithCounter(user, 0n);

      // sign user operation
      const opHash = await entryPoint.getUserOpHash(sessionOp);
      sessionOp.signature = await user.signMessage(ethers.getBytes(opHash));

      // send user operation
      expect(await counter.counters(await safe.getAddress())).to.equal(0);
      await expect(entryPoint.handleOps([sessionOp], user.address))
        .to.emit(entryPoint, "UserOperationEvent")
        .to.emit(safe, "ExecutionFromModuleSuccess");
      expect(await counter.counters(await safe.getAddress())).to.equal(1);
    });
  });

  const interactWithCounter = async (
    signer: SignerWithAddress,
    nonce: bigint,
    allowAllDestinations = false
  ): Promise<PackedUserOperationStruct> => {
    const call: SessionKeys4337.CallStruct = {
      target: counterAddress,
      data: (await counter.count.populateTransaction()).data,
      allowAllDestinations,
    };
    return await buildSessionOp(
      safe,
      safeSessionKeysModule,
      call,
      nonce,
      signer.address
    );
  };
});
