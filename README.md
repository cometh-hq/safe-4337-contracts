# Modular Safe 4337 Contracts

This repository contains an alternative to the official *Safe4337Module* module.
`Safe4337SessionKeysModule` is this modified module with with hooks for session keys.

To keep maintenance as easy as possible, the original contract is barely modified
and implements sessions keys through a separate contract (`SessionKeys4337`).

## Diff

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
