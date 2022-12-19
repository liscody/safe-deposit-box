import * as dotenv from "dotenv";
dotenv.config();

const config = require("../hardhat.config");
const Web3 = require("web3");
const web3 = new Web3(config.INFURA_URL);

import { task } from "hardhat/config";
import { ether } from "../test/helpers";
import { token } from "../typechain-types/@openzeppelin/contracts";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { string} from "hardhat/internal/core/params/argumentTypes";
import { MyERC20__factory, MyERC721__factory, Safe__factory } from "../typechain-types";
const { myErc20Address, myErc721Address, safeAddress } = require("../deployments/deploy.json");
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
const BN = require("ethers").BigNumber;


const zeroAddress: string  = process.env.ADDRESS_ZERO || "";

const DEPLOYER_ADDRESS: string = process.env.DEPLOYER_ADDRESS || '';
const ALICE_ADDRESS: string  = process.env.ALICE_ADDRESS || "";
const NFT_RECEIVER: string  = process.env.NFT_RECEIVER || "";
const BOB_PK = process.env.BOB_PRIVATE_KEY;

const TOKEN_ID = BN.from(process.env.TOKEN_ID) //BigNumber.from(process.env.TOKEN_ID);
const DEPOSIT_ID = BN.from(process.env.DEPOSIT_ID) //BigNumber.from(process.env.DEPOSIT_ID);
const DEADLINE_PERIOD = BN.from(process.env.DEADLINE_PERIOD); // valid period for signature
const START_CLAIM_PERIOD = BN.from(process.env.START_CLAIM_PERIOD);

const amount = web3.utils.toWei(process.env.AMOUNT, 'ether');

task("mintNFT", "Mint Nft and approve for deposit").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const myErc721Instance = MyERC721__factory.connect(myErc721Address, await ethers.getSigner(DEPLOYER_ADDRESS));
    // mint one NFT
    await myErc721Instance.safeMint(DEPLOYER_ADDRESS);
});

task("approveErc20", "Mint Nft and approve for deposit").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const bob = deployer;
    const myErc20Instance = MyERC20__factory.connect(myErc20Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));
    // approves for transactions
    await myErc20Instance.connect(bob).approve(safeInstance.address, amount);
});

task("approveNft", "Mint Nft and approve for deposit").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const bob = deployer;
    const myErc721Instance = MyERC721__factory.connect(myErc721Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));
    // approves for transactions
    await myErc721Instance.connect(bob).approve(safeInstance.address, TOKEN_ID);
    // console.log(safeInstance.address, TOKEN_ID);
    
});

task("depositERC20", "Deposit ERC20 tokens to safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const bob = deployer;
    const myErc20Instance = MyERC20__factory.connect(myErc20Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));
    // deposit ERC20
    await safeInstance.connect(bob).depositAssets(myErc20Instance.address, amount, START_CLAIM_PERIOD);
});

task("depositETH", "Deposit ETH tokens to safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const bob = deployer;
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));
    // deposit ETH
    const deposit = await safeInstance
        .connect(bob)
        .depositAssets(zeroAddress, amount, START_CLAIM_PERIOD, { value: amount });
});

task("withdrawAssetsErc20", "Withdraw erc20 asset from safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const alice = await ethers.getSigner(ALICE_ADDRESS);
    const bob = deployer;
    const myErc20Instance = MyERC20__factory.connect(myErc20Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const message = web3.utils
        .soliditySha3(
            { t: "address", v: bob.address },
            { t: "uint256", v: DEPOSIT_ID.toString() },
            { t: "uint256", v: amount },
            { t: "address", v: myErc20Instance.address },
            { t: "address", v: alice.address },
            { t: "address", v: safeInstance.address },
            { t: "uint64", v: DEADLINE_PERIOD.toString() }
        )
        .toString("hex");
    const signed = web3.eth.accounts.sign(message, BOB_PK);

    await safeInstance.connect(alice).withdrawAssets(bob.address, DEPOSIT_ID, DEADLINE_PERIOD, signed.signature);
});

task("withdrawETH", "Withdraw ETH from safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const alice = await ethers.getSigner(ALICE_ADDRESS);
    const bob = deployer;
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const message = web3.utils
        .soliditySha3(
            { t: "address", v: bob.address },
            { t: "uint256", v: DEPOSIT_ID.toString() },
            { t: "uint256", v: amount.toString() },
            { t: "address", v: zeroAddress },
            { t: "address", v: alice.address },
            { t: "address", v: safeInstance.address },
            { t: "uint64", v: DEADLINE_PERIOD.toString() }
        )
        .toString("hex");
    const signed = web3.eth.accounts.sign(message, BOB_PK);

    const withdrawInfo = await safeInstance
        .connect(alice)
        .withdrawAssets(bob.address, DEPOSIT_ID, DEADLINE_PERIOD, signed.signature);
        console.log(withdrawInfo);
});

// task("withdrawETH", "Withdraw ETH from safe contract").setAction(async (taskArgs, { ethers }) => {
//     const deployer = await ethers.getSigner("0x56b6730FbDaac504Ec47b6580Fa9D9F9CccdcC5C");
//     const alice = await ethers.getSigner("0xd9e55dbe4d109Afb6B3cdDeAb1bBEE5Cfa943064");
//     const bob = deployer;
//     const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

//     // const amount = ethers.utils.parseEther("0.01");
//     // const zeroAddress = ethers.constants.AddressZero;
//     // const blockNumber = ethers.provider.getBlockNumber();
//     // const startClaimPeriod = (await ethers.provider.getBlock(blockNumber)).timestamp;

//     let depositId = 5;

//     const message = web3.utils
//         .soliditySha3(
//             { t: "address", v: bob.address },
//             { t: "uint256", v: DEPOSIT_ID.toString() },
//             { t: "uint256", v: amount.toString() },
//             { t: "address", v: zeroAddress },
//             { t: "address", v: alice.address },
//             { t: "address", v: safeInstance.address },
//             { t: "uint64", v: DEADLINE_PERIOD.toString() }
// )
//         .toString("hex");
//     const signed = web3.eth.accounts.sign(message, BOB_PK);
// console.log( bob.address, DEPOSIT_ID, amount,zeroAddress, alice.address, safeInstance.address, 
//     DEADLINE_PERIOD )
//     // const withdrawInfo = await safeInstance
//     //     .connect(alice)
//     //     .withdrawAssets(bob.address, DEPOSIT_ID, DEADLINE_PERIOD, signed.signature);
// });

task("depositNFT", "Deposit NFT to safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const bob = deployer;
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const depositNFT = await safeInstance.connect(bob).depositNftAssets(myErc721Address, TOKEN_ID, START_CLAIM_PERIOD);
});

task("withdrawNFT", "Withdraw NFT from safe contract").setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(DEPLOYER_ADDRESS);
    const alice = await ethers.getSigner(ALICE_ADDRESS);
    const bob = deployer;

    const myErc721Instance = MyERC721__factory.connect(myErc721Address, await ethers.getSigner(deployer.address));
    const safeInstance = Safe__factory.connect(safeAddress, await ethers.getSigner(deployer.address));

    const message = web3.utils
        .soliditySha3(
            { t: "address", v: bob.address },
            { t: "uint256", v: DEPOSIT_ID },
            { t: "uint256", v: TOKEN_ID },
            { t: "address", v: myErc721Instance.address },
            { t: "address", v: alice.address },
            { t: "address", v: safeInstance.address },
            { t: "uint64", v: DEADLINE_PERIOD }
        )
        .toString("hex");
    const signed = web3.eth.accounts.sign(message, BOB_PK);

    const withdrawInfo = await safeInstance
        .connect(alice)
        .withdrawNftAssets(bob.address, DEPOSIT_ID, DEADLINE_PERIOD, signed.signature);
});