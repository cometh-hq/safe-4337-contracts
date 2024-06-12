# Account Abstraction 

This repository contains a *DeploymentManager* contract that handles the setup of new Safes in the Cometh Connect environment.

## DeploymentManager

It adds a Zodiac Delay module to support Recovery.
* At the creation of the Safe, the user choses a Guardian (who can initiate a recovery)
* The contract creates a Delay module and adds the Guardian as a manager of the module.

## Delay Module

Implemented [here](https://github.com/gnosisguild/zodiac-modifier-delay). This module allows a third party to queue transactions to be executed by a Safe.
We leverage this module to create recovery transactions that replaces the ownership of a Safe (and its threshold).

## Launch tests

To launch tests:
```bash
yarn test
```

## How to deploy

```bash
HARDHAT_NETWORK="NETWORK" ETHERSCAN_API_KEY="" npx hardhat deploy
```
