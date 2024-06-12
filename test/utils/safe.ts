import {
  BigNumberish,
  BytesLike,
  ContractTransaction,
  ContractTransactionResponse,
} from "ethers";
import { PackedUserOperationStruct } from "../../typechain-types/contracts/experimental/SafeSessionModule";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
  Safe,
  SafeProxyFactory,
  SafeSessionModule,
} from "../../artifacts/typechain";

export type SafeTx = {
  to: string;
  value: BigNumberish;
  data: BytesLike;
  operation: BigNumberish;
  safeTxGas: BigNumberish;
  baseGas: BigNumberish;
  gasPrice: BigNumberish;
  gasToken: string;
  refundReceiver: string;
  nonce: BigNumberish;
};

interface GasParameters {
  verificationGasLimit: BigNumberish;
  callGasLimit: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
  maxFeePerGas: BigNumberish;
}

interface PackedGasParameters {
  accountGasLimits: BytesLike;
  gasFees: BytesLike;
}

export const buildSessionOp = async (
  safe: Safe,
  module: SafeSessionModule,
  call: SafeSessionModule.CallStruct,
  nonce: BigNumberish,
  sessionKey: string
): Promise<PackedUserOperationStruct> => {
  const callData = await module.interface.encodeFunctionData(
    "executeWithSessionKey",
    [call, sessionKey]
  );
  return {
    sender: await safe.getAddress(),
    nonce, //: ethers.utils.hexlify(nonce),
    initCode: "0x",
    callData: ethers.hexlify(callData),
    preVerificationGas: ethers.toBeHex(60000),
    ...packGasParameters({
      verificationGasLimit: 500000,
      callGasLimit: 2000000,
      maxPriorityFeePerGas: 10000000000,
      maxFeePerGas: 10000000000,
    }),
    paymasterAndData: ethers.hexlify("0x"),
    signature: "0x",
  };
};

const packGasParameters = (unpacked: GasParameters): PackedGasParameters => {
  const pack = (hi: BigNumberish, lo: BigNumberish) =>
    ethers.solidityPacked(["uint128", "uint128"], [hi, lo]);
  return {
    accountGasLimits: pack(
      unpacked.verificationGasLimit,
      unpacked.callGasLimit
    ),
    gasFees: pack(unpacked.maxPriorityFeePerGas, unpacked.maxFeePerGas),
  };
};

export const predictSafeAddress = async (
  safeFactoryImpl: SafeProxyFactory,
  safeSingleton: Safe,
  setUpData: any,
  saltNonce: string
): Promise<string> => {
  const deploymentCode = ethers.solidityPacked(
    ["bytes", "uint256"],
    [
      await safeFactoryImpl.proxyCreationCode(),
      await safeSingleton.getAddress(),
    ]
  );

  const salt = ethers.solidityPackedKeccak256(
    ["bytes", "uint256"],
    [ethers.solidityPackedKeccak256(["bytes"], [setUpData]), saltNonce]
  );

  return ethers.getCreate2Address(
    await safeFactoryImpl.getAddress(),
    salt,
    ethers.keccak256(deploymentCode)
  );
};

export const execTransaction = async (
  safe: Safe,
  signer: SignerWithAddress,
  tx: ContractTransaction
): Promise<ContractTransactionResponse> => {
  const { safeTx, signature } = await signTransaction(safe, signer, tx);
  return await execSafeTransaction(safe, safeTx, signature);
};

const signTransaction = async (
  safe: Safe,
  signer: SignerWithAddress,
  tx: ContractTransaction
): Promise<{ safeTx: SafeTx; signature: string }> => {
  const safeTx = await prepareSafeTransaction(safe, tx);
  const signature = await signSafeTransaction(safe, signer, safeTx);
  return { safeTx, signature };
};

const prepareSafeTransaction = async (
  safe: Safe,
  tx: ContractTransaction
): Promise<SafeTx> => {
  return {
    to: tx.to!,
    value: tx.value ?? 0,
    data: tx.data!,
    operation: 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: ethers.ZeroAddress, // ETH
    refundReceiver: ethers.ZeroAddress, // tx.origin
    nonce: await safe.nonce(), //(await safe.nonce()).add(1),
  };
};

const signSafeTransaction = async (
  safe: Safe,
  signer: SignerWithAddress,
  safeTx: SafeTx
): Promise<string> => {
  const { chainId } = await ethers.provider.getNetwork();

  const domain = {
    verifyingContract: await safe.getAddress(),
    chainId,
  };

  const types = {
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  };

  const signature = await signer.signTypedData(domain, types, safeTx);
  return signature;
};

const execSafeTransaction = async (
  safe: Safe,
  safeTx: SafeTx,
  signature: string
): Promise<ContractTransactionResponse> => {
  return await safe.execTransaction(
    safeTx.to,
    safeTx.value,
    safeTx.data,
    safeTx.operation,
    safeTx.safeTxGas,
    safeTx.baseGas,
    safeTx.gasPrice,
    safeTx.gasToken,
    safeTx.refundReceiver,
    signature
  );
};
