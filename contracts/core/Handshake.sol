// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Handshake
 * @notice Vouch registry with categories. Gasless-ready (signed payload for relayer).
 */
contract Handshake is Ownable {
    enum Status { None, Pending, Accepted, Denied }

    struct Vouch {
        Status status;
        uint8 category;
        uint64 timestamp;
        uint64 updatedAt;
        bool hidden; // Whether target has hidden this vouch
    }

    // target => voucher => Vouch
    mapping(address => mapping(address => Vouch)) public vouches;
    // target => list of vouchers
    mapping(address => address[]) private _vouchersFor;
    mapping(address => mapping(address => uint256)) private _voucherIndex;
    // voucher => list of targets (tracks all targets a voucher has vouched for)
    mapping(address => address[]) private _targetsVouchedBy;
    mapping(address => mapping(address => uint256)) private _targetIndex;

    uint256 public fee;
    address payable public feeCollector;
    uint256 public accumulatedFees;

    event VouchRequested(address indexed target, address indexed voucher, uint8 category);
    event VouchAccepted(address indexed target, address indexed voucher);
    event VouchDenied(address indexed target, address indexed voucher);
    event VouchCancelled(address indexed target, address indexed voucher);
    event VouchHidden(address indexed target, address indexed voucher);
    event VouchUnhidden(address indexed target, address indexed voucher);
    event VouchRemoved(address indexed target, address indexed voucher);
    event FeeUpdated(uint256 newFee);
    event FeeCollectorChanged(address newCollector);
    event FeesWithdrawn(address collector, uint256 amount);

    // Category constants: 0=skill, 1=trust, 2=attendance, etc.
    uint8 public constant CATEGORY_SKILL = 0;
    uint8 public constant CATEGORY_TRUST = 1;
    uint8 public constant CATEGORY_ATTENDANCE = 2;

    constructor(address payable _feeCollector) Ownable(msg.sender) {
        feeCollector = _feeCollector;
        fee = 0;
    }

    function vouch(address target, uint8 category) external payable {
        require(target != address(0), "Invalid target");
        require(target != msg.sender, "Cannot vouch for self");
        require(msg.value >= fee, "Insufficient fee");
        Vouch storage v = vouches[target][msg.sender];
        require(v.status == Status.None, "Vouch exists");
        v.status = Status.Pending;
        v.category = category;
        v.timestamp = uint64(block.timestamp);
        v.updatedAt = uint64(block.timestamp);
        v.hidden = false;
        _addVoucher(target, msg.sender);
        _addTarget(msg.sender, target);
        if (msg.value > 0) {
            accumulatedFees += msg.value;
        }
        emit VouchRequested(target, msg.sender, category);
    }

    function acceptVouch(address voucher) external {
        Vouch storage v = vouches[msg.sender][voucher];
        require(v.status == Status.Pending, "Not pending");
        v.status = Status.Accepted;
        v.updatedAt = uint64(block.timestamp);
        emit VouchAccepted(msg.sender, voucher);
    }

    function denyVouch(address voucher) external {
        Vouch storage v = vouches[msg.sender][voucher];
        require(v.status == Status.Pending, "Not pending");
        v.status = Status.Denied;
        v.updatedAt = uint64(block.timestamp);
        emit VouchDenied(msg.sender, voucher);
    }

    function cancelVouch(address target) external {
        require(target != address(0), "Invalid target");
        Vouch storage v = vouches[target][msg.sender];
        require(v.status == Status.Pending, "Can only cancel pending");
        v.status = Status.None;
        v.updatedAt = uint64(block.timestamp);
        v.hidden = false;
        _removeVoucher(target, msg.sender);
        _removeTarget(msg.sender, target);
        emit VouchCancelled(target, msg.sender);
    }

    function getVouch(address target, address voucher) external view returns (Vouch memory) {
        return vouches[target][voucher];
    }

    function getVouchersFor(address target) external view returns (address[] memory) {
        return _vouchersFor[target];
    }

    function acceptedCount(address target) external view returns (uint256) {
        address[] memory list = _vouchersFor[target];
        uint256 count = 0;
        for (uint256 i = 0; i < list.length; i++) {
            Vouch memory v = vouches[target][list[i]];
            if (v.status == Status.Accepted && !v.hidden) count++;
        }
        return count;
    }

    /**
     * @notice Get all targets a voucher has vouched for
     * @param voucher The address of the voucher
     * @return Array of target addresses
     */
    function getTargetsVouchedBy(address voucher) external view returns (address[] memory) {
        return _targetsVouchedBy[voucher];
    }

    /**
     * @notice Hide an accepted vouch. Only the target can hide vouches they received.
     * @param voucher The address of the voucher whose vouch should be hidden
     */
    function hideVouch(address voucher) external {
        require(voucher != address(0), "Invalid voucher");
        Vouch storage v = vouches[msg.sender][voucher];
        require(v.status == Status.Accepted, "Can only hide accepted vouches");
        require(!v.hidden, "Vouch already hidden");
        v.hidden = true;
        v.updatedAt = uint64(block.timestamp);
        emit VouchHidden(msg.sender, voucher);
    }

    /**
     * @notice Unhide a previously hidden vouch. Only the target can unhide.
     * @param voucher The address of the voucher whose vouch should be unhidden
     */
    function unhideVouch(address voucher) external {
        require(voucher != address(0), "Invalid voucher");
        Vouch storage v = vouches[msg.sender][voucher];
        require(v.status == Status.Accepted, "Vouch must be accepted");
        require(v.hidden, "Vouch not hidden");
        v.hidden = false;
        v.updatedAt = uint64(block.timestamp);
        emit VouchUnhidden(msg.sender, voucher);
    }

    /**
     * @notice Permanently remove a vouch. Only the voucher can remove their own vouches.
     * @param target The address of the target whose vouch should be removed
     */
    function removeVouch(address target) external {
        require(target != address(0), "Invalid target");
        Vouch storage v = vouches[target][msg.sender];
        require(v.status != Status.None, "Vouch does not exist");
        // Allow removal of any status (Pending, Accepted, Denied)
        v.status = Status.None;
        v.updatedAt = uint64(block.timestamp);
        v.hidden = false;
        _removeVoucher(target, msg.sender);
        _removeTarget(msg.sender, target);
        emit VouchRemoved(target, msg.sender);
    }

    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
        emit FeeUpdated(newFee);
    }

    function setFeeCollector(address payable newCollector) external onlyOwner {
        feeCollector = newCollector;
        emit FeeCollectorChanged(newCollector);
    }

    function withdrawFees() external {
        require(msg.sender == feeCollector || msg.sender == owner(), "Not collector");
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        (bool ok,) = feeCollector.call{ value: amount }("");
        require(ok, "Transfer failed");
        emit FeesWithdrawn(feeCollector, amount);
    }

    receive() external payable {
        accumulatedFees += msg.value;
    }

    function _addVoucher(address target, address voucher) internal {
        _vouchersFor[target].push(voucher);
        _voucherIndex[target][voucher] = _vouchersFor[target].length;
    }

    function _removeVoucher(address target, address voucher) internal {
        uint256 idx = _voucherIndex[target][voucher];
        if (idx == 0) return;
        uint256 last = _vouchersFor[target].length;
        if (idx != last) {
            address lastVoucher = _vouchersFor[target][last - 1];
            _vouchersFor[target][idx - 1] = lastVoucher;
            _voucherIndex[target][lastVoucher] = idx;
        }
        _vouchersFor[target].pop();
        delete _voucherIndex[target][voucher];
    }

    function _addTarget(address voucher, address target) internal {
        // Only add if not already in list (check index == 0)
        if (_targetIndex[voucher][target] == 0) {
            _targetsVouchedBy[voucher].push(target);
            _targetIndex[voucher][target] = _targetsVouchedBy[voucher].length;
        }
    }

    function _removeTarget(address voucher, address target) internal {
        uint256 idx = _targetIndex[voucher][target];
        if (idx == 0) return;
        uint256 last = _targetsVouchedBy[voucher].length;
        if (idx != last) {
            address lastTarget = _targetsVouchedBy[voucher][last - 1];
            _targetsVouchedBy[voucher][idx - 1] = lastTarget;
            _targetIndex[voucher][lastTarget] = idx;
        }
        _targetsVouchedBy[voucher].pop();
        delete _targetIndex[voucher][target];
    }
}
