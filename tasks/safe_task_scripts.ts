import * as dotenv from "dotenv";
dotenv.config();

const config = require("../hardhat.config");
const Web3 = require("web3");
const web3 = new Web3(config.INFURA_URL);

import { task } from "hardhat/config";
import { ether } from "../test/helpers";
import { MyERC20__factory, Safe__factory } from "../typechain-types";
import { token } from "../typechain-types/@openzeppelin/contracts";
import { Safe, MyERC20, MyERC721 } from "../typechain-types/contracts";
import { MyERC721__factory } from "../typechain-types/factories/contracts/MyERC721.sol";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const BOB_PK = process.env.BOB_PRIVATE_KEY;

const myErc20Address = "0x41dde88194dC4cFF1Eb61d5Afd3743fD2acCB47d";
const myErc721Address = "0xB9537B85e43CFFBad232548EBa03F903175Af03E";
const safeAddress = "0x019603F256a72Ae502238D39b6E1dB10f908F581";

task("mintAndApprove", "Mint Nft and approve for deposit").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
    const bob = deployer;

    const amount = ethers.utils.parseEther("1");
    const tokenId = 1;

    const myErc20Instance = MyERC20__factory.connect(myErc20Address, await ethers.getSigner(deployer.address));
    const myErc721Instance = MyERC721__factory.connect(myErc721Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    await myErc721Instance.safeMint(bob.address); // mint token id 1
    await myErc20Instance.connect(bob).approve(safeInstance.address, amount.mul(5));
    await myErc721Instance.connect(bob).approve(safeInstance.address, tokenId);
});

task("depositERC20", "Deposit ERC20 tokens to safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
    const bob = deployer;

    const amount = ethers.utils.parseEther("1");
    const myErc20Instance = MyERC20__factory.connect(myErc20Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));
    const blockNumber = ethers.provider.getBlockNumber();
    const startClaimPeriod = (await ethers.provider.getBlock(blockNumber)).timestamp;

    // deposit ERC20
    await safeInstance.connect(bob).depositAssets(myErc20Instance.address, amount, startClaimPeriod);
});

task("depositETH", "Deposit ETH tokens to safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
    const bob = deployer;

    const amount = ethers.utils.parseEther("0.1");
    const zeroAddress = ethers.constants.AddressZero;
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const blockNumber = ethers.provider.getBlockNumber();
    const startClaimPeriod = (await ethers.provider.getBlock(blockNumber)).timestamp;

    const deposit = await safeInstance
        .connect(bob)
        .depositAssets(zeroAddress, amount, startClaimPeriod, { value: amount });
});

task("withdrawAssetsErc20", "Withdraw erc20 asset from safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
    const alice = await ethers.getSigner("0xd9e55dbe4d109Afb6B3cdDeAb1bBEE5Cfa943064");
    const bob = deployer;

    const amount = ethers.utils.parseEther("1");

    const myErc20Instance = MyERC20__factory.connect(myErc20Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const blockNumber = ethers.provider.getBlockNumber();
    const startClaimPeriod = (await ethers.provider.getBlock(blockNumber)).timestamp;

    let depositId = 1;
    let deadline = startClaimPeriod + 31536000;

    const message = web3.utils
        .soliditySha3(
            { t: "address", v: bob.address },
            { t: "uint256", v: depositId },
            { t: "uint256", v: amount },
            { t: "address", v: myErc20Instance.address },
            { t: "address", v: alice.address },
            { t: "address", v: safeInstance.address },
            { t: "uint64", v: deadline }
        )
        .toString("hex");
    const signed = web3.eth.accounts.sign(message, BOB_PK);
    console.log(signed);

    await safeInstance.connect(alice).withdrawAssets(bob.address, depositId, deadline, signed.signature);
});

task("withdrawETH", "Withdraw ETH from safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
    const alice = await ethers.getSigner("0xd9e55dbe4d109Afb6B3cdDeAb1bBEE5Cfa943064");
    const bob = deployer;
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const amount = ethers.utils.parseEther("0.1");
    const zeroAddress = ethers.constants.AddressZero;
    const blockNumber = ethers.provider.getBlockNumber();
    const startClaimPeriod = (await ethers.provider.getBlock(blockNumber)).timestamp;

    let depositId = 2;
    let deadline = startClaimPeriod + 31536000;

    const message = web3.utils
        .soliditySha3(
            { t: "address", v: bob.address },
            { t: "uint256", v: depositId },
            { t: "uint256", v: amount },
            { t: "address", v: zeroAddress },
            { t: "address", v: alice.address },
            { t: "address", v: safeInstance.address },
            { t: "uint64", v: deadline }
        )
        .toString("hex");
    const signed = web3.eth.accounts.sign(message, BOB_PK);

    const withdrawInfo = await safeInstance
        .connect(alice)
        .withdrawAssets(bob.address, depositId, deadline, signed.signature);
});

task("depositNFT", "Deposit NFT to safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
    const bob = deployer;
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const nftID = 1;
    const blockNumber = ethers.provider.getBlockNumber();
    const startClaimPeriod = (await ethers.provider.getBlock(blockNumber)).timestamp;

    const depositNFT = await safeInstance.connect(bob).depositNftAssets(myErc721Address, nftID, startClaimPeriod);
});

task("withdrawNFT", "Withdraw NFT from safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
    const alice = await ethers.getSigner("0xd9e55dbe4d109Afb6B3cdDeAb1bBEE5Cfa943064");
    const bob = deployer;

    const myErc721Instance = MyERC721__factory.connect(myErc721Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const blockNumber = ethers.provider.getBlockNumber();
    const startClaimPeriod = (await ethers.provider.getBlock(blockNumber)).timestamp;
    const oneYear = 31536000;
    const tokenId = 1;
    let depositId = 3;
    let deadline = startClaimPeriod + oneYear;

    const message = web3.utils
        .soliditySha3(
            { t: "address", v: bob.address },
            { t: "uint256", v: depositId },
            { t: "uint256", v: tokenId },
            { t: "address", v: myErc721Instance.address },
            { t: "address", v: alice.address },
            { t: "address", v: safeInstance.address },
            { t: "uint64", v: deadline }
        )
        .toString("hex");
    const signed = web3.eth.accounts.sign(message, BOB_PK);

    const withdrawInfo = await safeInstance
        .connect(alice)
        .withdrawNftAssets(bob.address, depositId, deadline, signed.signature);
});
// npx hardhat mintAndApprove       --network mumbai
// npx hardhat depositERC20         --network mumbai
// npx hardhat depositETH           --network mumbai
// npx hardhat withdrawAssetsErc20  --network mumbai
// npx hardhat withdrawETH          --network mumbai
// npx hardhat depositNFT           --network mumbai
// npx hardhat withdrawNFT          --network mumbai
