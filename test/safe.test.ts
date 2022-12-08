import { time } from "@nomicfoundation/hardhat-network-helpers";

import type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
const config = require("../hardhat.config");
const Web3 = require("web3");
const web3 = new Web3(config.INFURA_URL);

import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import type { Safe } from "../typechain-types";

describe("SAFE", function () {
    const zeroAddress = ethers.constants.AddressZero;

    let snapshotA: SnapshotRestorer;

    // Signers.
    let deployer: SignerWithAddress, owner: SignerWithAddress, user: SignerWithAddress;
    let bob: SignerWithAddress, alice: SignerWithAddress, eve: SignerWithAddress;
    // hardhat private key
    const BOB_PK = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

    let safe: Safe;
    let myErc20: any;
    let myErc721: any;
    let amount = ethers.utils.parseEther("1"); // 1 ETH
    let boxOwner: any;
    let boxId: any;
    let tokenId: any;
    let deadline: any;
    let asset: any;
    let assetNFT: any;
    let nonce: any;
    const oneDay = 86400;

    before(async () => {
        // Getting of signers.
        [deployer, user, bob, alice, eve] = await ethers.getSigners();
        tokenId = 1;

        // deploy ERC20
        const MyERC20 = await ethers.getContractFactory("MyERC20", deployer);
        myErc20 = await MyERC20.deploy();
        await myErc20.deployed();

        // deploy ERC721
        const MyERC721 = await ethers.getContractFactory("MyERC721", deployer);
        myErc721 = await MyERC721.deploy();
        await myErc721.deployed();

        // deploy safe contract
        const Safe = await ethers.getContractFactory("Safe", deployer);
        safe = await Safe.deploy();
        await safe.deployed();

        // mint and approve on ERC20
        await myErc20.mint(bob.address, amount.mul(10)); // 100 ETH
        await myErc20.connect(bob).approve(safe.address, amount); // 1 ETH
        asset = myErc20.address;

        // mint and approve on ERC721
        await myErc721.safeMint(bob.address); // mint token id 1
        await myErc721.safeMint(bob.address); // mint token id 2
        await myErc721.connect(bob).approve(safe.address, 1); // approve token id 1
        await myErc721.connect(bob).approve(safe.address, 2); // approve token id 2
        assetNFT = myErc721.address;

        // deposit ERC20
        await safe.connect(bob).depositAssets(myErc20.address, amount);
        await safe.connect(bob).depositAssets(zeroAddress, amount, { value: amount });

        // deposit erc721
        await safe.connect(bob).depositNftAssets(assetNFT, 1);
        await safe.connect(bob).depositNftAssets(assetNFT, 2);

        owner = deployer;

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("Test withdrawAssets function", function () {
        it("Should return custom error 'AlreadyWithdrawn'", async () => {
            nonce = boxId = 1;
            deadline = (await time.latest()) + oneDay;
            let amount_ = await safe.deposited(bob.address, boxId);
            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: amount_ },
                    { t: "address", v: asset },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            await safe.connect(alice).withdrawAssets(bob.address, boxId, deadline, asset, signed.signature);
            await expect(
                safe.connect(alice).withdrawAssets(bob.address, boxId, deadline, asset, signed.signature)
            ).to.be.revertedWithCustomError(safe, "AlreadyWithdrawn");
        });

        it("Should return custom error 'OutOfWithdrawalPeriod'", async () => {
            nonce = boxId = 1;
            deadline = (await time.latest()) + oneDay;
            let amount_ = await safe.deposited(bob.address, boxId);

            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: amount_ },
                    { t: "address", v: asset },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            let further = (await time.latest()) + oneDay * 365 + oneDay;
            await time.increaseTo(further);

            await expect(
                safe.connect(alice).withdrawAssets(bob.address, boxId, deadline, asset, signed.signature)
            ).to.be.revertedWithCustomError(safe, "OutOfWithdrawalPeriod");
        });

        it("Should return custom error 'WrongSignature'", async () => {
            nonce = boxId = 1;
            deadline = (await time.latest()) + oneDay;
            let amount_ = await safe.deposited(bob.address, boxId);

            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: amount_ },
                    { t: "address", v: asset },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            await expect(
                safe.connect(eve).withdrawAssets(bob.address, boxId, deadline, asset, signed.signature)
            ).to.be.revertedWithCustomError(safe, "WrongSignature");
        });

        it("Should change balance ERC20", async () => {
            nonce = boxId = 1;
            deadline = (await time.latest()) + oneDay;
            let amount_ = await safe.deposited(bob.address, boxId);
            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: amount_ },
                    { t: "address", v: asset },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            await safe.connect(alice).withdrawAssets(bob.address, boxId, deadline, asset, signed.signature);
            let balanceAfter = await myErc20.balanceOf(alice.address);

            expect(balanceAfter).to.be.equal(amount_);
        });

        it("Should change balance native currency", async () => {
            nonce = boxId = 1;
            deadline = (await time.latest()) + oneDay;
            asset = zeroAddress;
            let amount_ = await safe.deposited(bob.address, boxId);

            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: amount_ },
                    { t: "address", v: asset },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            const aliceBalanceBefore = await safe.provider.getBalance(alice.address);
            const contractBalanceBefore = await safe.provider.getBalance(safe.address);
            await safe.connect(alice).withdrawAssets(bob.address, boxId, deadline, zeroAddress, signed.signature);

            const aliceBalanceAfter = await safe.provider.getBalance(alice.address);
            const gasFee = aliceBalanceBefore.add(amount_).sub(aliceBalanceAfter);
            const contractBalanceAfter = await safe.provider.getBalance(safe.address);

            expect(aliceBalanceAfter).to.be.equal(aliceBalanceBefore.add(amount_).sub(gasFee));
        });
    });

    describe("Test depositAssets function", function () {
        it("Should return custom error 'WrongAmount'", async () => {
            await expect(
                safe.connect(bob).depositAssets(zeroAddress, amount.add(1), { value: amount })
            ).to.be.revertedWithCustomError(safe, "WrongAmount");
        });

        it("Should return custom error 'OnlyERC20'", async () => {
            await myErc20.connect(bob).approve(safe.address, amount); // 1 ETH
            asset = myErc20.address;

            await expect(
                safe.connect(bob).depositAssets(asset, amount, { value: amount })
            ).to.be.revertedWithCustomError(safe, "OnlyERC20");
        });
    });

    describe("Test withdrawNftAssets function", function () {
        it("Should return custom error 'AlreadyWithdrawn'", async () => {
            nonce = boxId = 3;
            deadline = (await time.latest()) + oneDay;

            let nftId = await safe.deposited(bob.address, boxId);

            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: nftId },
                    { t: "address", v: assetNFT },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            await safe.connect(alice).withdrawNftAssets(bob.address, boxId, deadline, assetNFT, signed.signature);
            await expect(
                safe.connect(alice).withdrawNftAssets(bob.address, boxId, deadline, assetNFT, signed.signature)
            ).to.be.revertedWithCustomError(safe, "AlreadyWithdrawn");
        });

        it("Should return custom error 'OutOfWithdrawalPeriod'", async () => {
            nonce = boxId = 3;
            deadline = (await time.latest()) + oneDay;

            let nftId = await safe.deposited(bob.address, boxId);

            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: nftId },
                    { t: "address", v: assetNFT },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            let further = (await time.latest()) + oneDay * 365 + oneDay;
            await time.increaseTo(further);

            await expect(
                safe.connect(alice).withdrawNftAssets(bob.address, boxId, deadline, assetNFT, signed.signature)
            ).to.be.revertedWithCustomError(safe, "OutOfWithdrawalPeriod");
        });

        it("Should return custom error 'WrongSignature'", async () => {
            nonce = boxId = 3;
            deadline = (await time.latest()) + oneDay;

            let nftId = await safe.deposited(bob.address, boxId);

            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: nftId },
                    { t: "address", v: assetNFT },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);

            await expect(
                safe.connect(alice).withdrawNftAssets(bob.address, boxId + 1, deadline, assetNFT, signed.signature)
            ).to.be.revertedWithCustomError(safe, "WrongSignature");
        });
        it("Alice address own NFT on balance", async () => {
            nonce = boxId = 3;
            deadline = (await time.latest()) + oneDay;

            let nftId = await safe.deposited(bob.address, boxId);

            const message = web3.utils
                .soliditySha3(
                    { t: "uint256", v: boxId },
                    { t: "uint256", v: nftId },
                    { t: "address", v: assetNFT },
                    { t: "address", v: alice.address },
                    { t: "address", v: safe.address },
                    { t: "uint64", v: deadline }
                )
                .toString("hex");
            const signed = web3.eth.accounts.sign(message, BOB_PK);
            await safe.connect(alice).withdrawNftAssets(bob.address, boxId, deadline, assetNFT, signed.signature);

            let aliceBalance = await myErc721.balanceOf(alice.address); // approve token id 2

            expect(aliceBalance).to.be.equal(1);
        });
    });
});
