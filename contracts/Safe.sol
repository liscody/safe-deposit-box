// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";

contract Safe is Ownable {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;

    Counters.Counter private depositIds;

    // mapping(uint256 => uint256) public deposited;
    /// @dev address of owner => boxId => amount
    mapping(address => mapping(uint256 => uint256)) public deposited;
    mapping(uint256 => bool) public nonces;

    error AlreadyWithdrawn();
    error WrongSignature();
    error WrongAmount();
    error OutOfWithdrawalPeriod();
    error OnlyERC20();

    /**
     * @dev Add token amount to balance of the contract
     */
    function depositAssets(address asset, uint256 amount) public payable {
        depositIds.increment();
        uint256 newBoxId = depositIds.current();

        deposited[msg.sender][newBoxId] = amount;

        if (asset == address(0)) {
            if (msg.value != amount) revert WrongAmount();
        } else {
            if (msg.value != 0) revert OnlyERC20();
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

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
        address boxOwner,
        uint256 boxId,
        uint256 amount,
        uint64 deadline,
        address asset,
        bytes memory signature
    ) public payable {
        if (nonces[boxId]) revert AlreadyWithdrawn();
        if (deposited[boxOwner][boxId] != amount) revert WrongAmount();
        if (deadline < block.timestamp) revert OutOfWithdrawalPeriod();

        checkSignature(
            abi.encodePacked(boxId, amount, asset, msg.sender, address(this), deadline),
            boxOwner,
            signature
        );

        nonces[boxId] = true;

        if (asset == address(0)) {
            (bool os, ) = msg.sender.call{value: amount}("");
            require(os);
        } else {
            IERC20(asset).safeTransfer(msg.sender, amount);
        }
    }
}
