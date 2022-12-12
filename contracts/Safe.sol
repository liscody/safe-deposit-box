// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Safe {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    struct DepositInfo {
        uint256 amount;
        uint64 startClaimPeriod;
        address asset;
        bool claimed;
    }

    struct NftDepositInfo {
        uint256 nftId;
        uint64 startClaimPeriod;
        address asset;
        bool claimed;
    }

    mapping(address => uint256) public userDepositIds;
    mapping(address => mapping(uint256 => DepositInfo)) public deposited;
    mapping(address => mapping(uint256 => NftDepositInfo)) public nftDeposited;

    error AlreadyWithdrawn();
    error WrongSignature();
    error WrongAmount();
    error OutOfWithdrawalPeriod();
    error EarlyWithdrawCall();
    error OnlyERC20();
    error WrongNftId();

    event DepositAssets(address indexed depositOwner, uint256 amount);
    event DepositNFTAssets(address indexed depositOwner, uint256 id);
    event WithdrawAssets(
        address indexed sender,
        address indexed owner,
        uint256 depositId,
        address asset,
        uint256 amount
    );
    event WithdrawNftAssets(
        address indexed sender,
        address indexed owner,
        uint256 depositId,
        address asset,
        uint256 nftId
    );

    /**
     * @dev Add token amount to balance of the contract
     */
    function depositAssets(
        address asset,
        uint256 amount,
        uint64 _startClaimPeriod
    ) external payable {
        userDepositIds[msg.sender] += 1;

        deposited[msg.sender][userDepositIds[msg.sender]] = DepositInfo(amount, _startClaimPeriod, asset, false);

        if (asset == address(0)) {
            if (msg.value != amount) revert WrongAmount();
        } else {
            if (msg.value != 0) revert OnlyERC20();
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        }
        emit DepositAssets(msg.sender, amount);
    }

    /**
     * @dev Add NFT to balance of the contract
     */
    function depositNftAssets(
        address assetNft,
        uint256 nftId,
        uint64 _startClaimPeriod
    ) external {
        userDepositIds[msg.sender] += 1;

        nftDeposited[msg.sender][userDepositIds[msg.sender]] = NftDepositInfo(
            nftId,
            _startClaimPeriod,
            assetNft,
            false
        );

        IERC721(assetNft).transferFrom(msg.sender, address(this), nftId);
        emit DepositNFTAssets(msg.sender, nftId);
    }

    ///@dev validate signature
    function checkSignature(
        bytes memory param,
        address signer,
        bytes memory signature
    ) private pure {
        bytes32 message = keccak256(param).toEthSignedMessageHash();
        if (message.recover(signature) != signer) revert WrongSignature();
    }

    /**
     * @dev Withdraw amount by authorized user
     */
    function withdrawAssets(
        address depositOwner,
        uint256 depositId,
        uint64 withdrawDeadline,
        bytes memory signature
    ) external payable {
        DepositInfo storage deposit = deposited[depositOwner][depositId];

        if (deposit.claimed) revert AlreadyWithdrawn();
        if (deposit.startClaimPeriod >= block.timestamp) revert EarlyWithdrawCall();
        if (withdrawDeadline <= block.timestamp) revert OutOfWithdrawalPeriod();

        checkSignature(
            abi.encodePacked(
                depositOwner,
                depositId,
                deposit.amount,
                deposit.asset,
                msg.sender,
                address(this),
                withdrawDeadline
            ),
            depositOwner,
            signature
        );

        deposit.claimed = true;

        if (deposit.asset == address(0)) {
            (bool os, ) = msg.sender.call{value: deposit.amount}("");
            require(os);
        } else {
            IERC20(deposit.asset).safeTransfer(msg.sender, deposit.amount);
        }

        emit WithdrawAssets(msg.sender, depositOwner, depositId, deposit.asset, deposit.amount);
    }

    /**
     * @dev Withdraw NFT by authorized user
     */
    function withdrawNftAssets(
        address depositOwner,
        uint256 depositId,
        uint64 withdrawDeadline,
        bytes memory signature
    ) external {
        NftDepositInfo storage nftDeposit = nftDeposited[depositOwner][depositId];

        if (nftDeposit.claimed) revert AlreadyWithdrawn();
        if (nftDeposit.startClaimPeriod >= block.timestamp) revert EarlyWithdrawCall();
        if (withdrawDeadline <= block.timestamp) revert OutOfWithdrawalPeriod();

        checkSignature(
            abi.encodePacked(
                depositOwner,
                depositId,
                nftDeposit.nftId,
                nftDeposit.asset,
                msg.sender,
                address(this),
                withdrawDeadline
            ),
            depositOwner,
            signature
        );

        nftDeposit.claimed = true;

        IERC721(nftDeposit.asset).transferFrom(address(this), msg.sender, nftDeposit.nftId);

        emit WithdrawAssets(msg.sender, depositOwner, depositId, nftDeposit.asset, nftDeposit.nftId);
    }
}
