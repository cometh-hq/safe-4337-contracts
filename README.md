# Safe 4337 Contracts

This repository contains a highly experimental alternate implementation of the official Safe 4337 module, providing session keys support for ERC-4337 user operations.

_DO NOT USE FOR PRODUCTION!_

## Introduction

In the realm of blockchain and decentralized applications, security and usability are paramount. One innovative approach to enhance both is the use of session keys, particularly in the context of ERC-4337 user operations for Safe wallets. 

Session keys are ephemeral keys that enable users to perform a series of predefined operations within a limited timeframe, without the need for repeated authorization with their primary private keys. This concept is akin to temporary access tokens used in traditional systems, offering a balance between convenience and security.

For Safe wallets, which are smart contract-based wallets offering advanced security features, session keys can be especially valuable. By leveraging session keys, users can delegate certain actions to these temporary keys, reducing the exposure of their main private keys and mitigating the risk of key compromise. This is particularly useful in scenarios requiring frequent interactions, such as gaming, DeFi transactions, or other decentralized application activities.

When integrated with ERC-4337, a standard that focuses on account abstraction and user operation management, session keys provide a seamless and secure user experience. ERC-4337 facilitates the execution of complex operations without compromising the security and efficiency of the user's primary account. Through this synergy, users can enjoy the benefits of decentralized applications with enhanced security measures and improved usability.

## Implementation
- `Safe4337SessionKeysModule` is a contract based on the official `Safe4337Module` one, with hooks for session keys.
- `SessionKeys4337` is the contract doing most of the work wrt session keys.

## Diff from official implementation

The Safe official 4337 module can't be extended.
In order to keep maintenance as easy as possible, the original contract is barely modified
and implements sessions keys through a separate contract (`SessionKeys4337`).

```diff
27c28,29
<     CompatibilityFallbackHandler
---
>     CompatibilityFallbackHandler,
>     SessionKeysModule
141c143
<         bytes32,
---
>         bytes32 userOpHash,
157c159,160
<             selector != this.executeUserOpWithErrorString.selector
---
>             selector != this.executeUserOpWithErrorString.selector &&
>             selector != this.executeWithSessionKey.selector
163c166,168
<         validationData = _validateSignatures(userOp);
---
>         if (selector == this.executeUserOp.selector) {
>             validationData = _validateSignatures(userOp);
>         }
164a170,173
>         if (selector == this.executeWithSessionKey.selector) {
>             validationData = _validateSessionKeySignature(userOp, userOpHash);
>         }
> 
174c183
<                 0
---
>                 0 // Enum.Operation.Call
```
