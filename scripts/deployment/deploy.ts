import { ethers } from "hardhat";
const hre = require("hardhat");

async function main() {
    console.log("Deploying process started ... Please wait till all contract will be deployed.");

    const MyERC20 = await hre.ethers.getContractFactory("MyERC20");
    const myErc20 = await MyERC20.deploy();
    await myErc20.deployed();
    console.log("MyERC20 deployed on address: ", myErc20.address);

    const MyERC721 = await hre.ethers.getContractFactory("MyERC721");
    const myErc721 = await MyERC721.deploy();
    await myErc721.deployed();
    console.log("MyERC721deployed on address: ", myErc721.address);

    const Safe = await hre.ethers.getContractFactory("Safe");
    const safe = await Safe.deploy();
    await safe.deployed();
    console.log("Vesting deployed on address: ", safe.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
