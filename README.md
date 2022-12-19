## How to use the Template

This template deployed on polygon testnet - Mumbai. For test proposes only. 

### 1. Deploy contract  
```bash
# set network & run deploy script 
npx hardhat run --network mumbai scripts/deployment/deploy.ts
```
### 2. Verify contracts

```bash
# set network & contract address. Run command after it 
npx hardhat verify --network mumbai <address>
```


### 2. Check & adjust configs ENV file

- Add all settings to env 


POLYGON_TESTNET_KEYS  -> that is a private keys of users

deployer == bob -> that is a same person. We will use a bob to sign a data and provide it by caller for withdraw a assets.bob has signer role 

NFT_RECEIVER -> that is the address of further NFT owner 

```bash
# Mint call with MyERC721 contract:

forge test --match test_BytesLib_slice

# Differential fuzzing against another implementation with incompatible Solidity version via ganache fork:
forge test --fork-url http://127.0.0.1:8545/ --match-path src/test/example/BytesLib-BytesUtil-diff.sol

# Differential fuzzing against an executable via FFI shell command execution:
forge test --match-path src/test/example/BytesLib-FFI-diff.sol
```