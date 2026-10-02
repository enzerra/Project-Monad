// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HiveCallV2} from "../../contracts/HiveCallV2.sol";

interface Vm {
    function warp(uint256 timestamp) external;
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
}

contract HiveCallV2Test {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant VOTER_KEY = 0xA11CE;
    uint256 private constant OTHER_KEY = 0xB0B;
    bytes32 private constant CALL_ID = keccak256("gaming-short-1");
    bytes32 private constant SOURCE = keccak256("youtube-source");
    bytes32 private constant RULES = keccak256("rules-v2");
    bytes32 private constant SALT = keccak256("random-salt-for-test-only");
    address private constant RELAYER = address(0xBEEF);

    HiveCallV2 private hive;
    address private voter;
    uint64 private openedAt;
    uint64 private closesAt;
    uint64 private evaluationAt;
    uint64 private revealDeadline;

    function setUp() public {
        vm.warp(1_000_000);
        hive = new HiveCallV2(address(this), address(this));
        voter = vm.addr(VOTER_KEY);
        openedAt = uint64(block.timestamp);
        closesAt = openedAt + 90 minutes;
        evaluationAt = openedAt + 6 hours;
        revealDeadline = closesAt + 1 hours;
        hive.createCall(CALL_ID, SOURCE, RULES, openedAt, closesAt, evaluationAt, revealDeadline, 12_000, 22_000);
    }

    function _signature(bytes32 callId, bytes32 commitment, uint256 key, uint256 nonce, uint64 deadline)
        private
        returns (bytes memory)
    {
        bytes32 digest = hive.authorizationDigest(callId, commitment, vm.addr(key), nonce, deadline);
        bytes32 personalHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, personalHash);
        return abi.encodePacked(r, s, v);
    }

    function _commit(bool choice) private returns (bytes32 commitment, bytes memory signature) {
        uint256 nonce = hive.nonces(voter);
        commitment = hive.commitmentHash(CALL_ID, voter, choice, nonce, SALT);
        signature = _signature(CALL_ID, commitment, VOTER_KEY, nonce, closesAt);
        vm.prank(RELAYER);
        hive.commit(CALL_ID, commitment, voter, nonce, closesAt, signature);
    }

    function testCommitRevealResolve() public {
        (bytes32 commitment, bytes memory signature) = _commit(true);
        assert(commitment != bytes32(0));
        assert(hive.nonces(voter) == 1);
        vm.expectRevert(HiveCallV2.AlreadyCommitted.selector);
        hive.commit(CALL_ID, commitment, voter, 1, closesAt, signature);
        vm.expectRevert(HiveCallV2.TooEarly.selector);
        hive.reveal(CALL_ID, voter, true, SALT);
        vm.expectRevert(HiveCallV2.TallyUnavailable.selector);
        hive.officialTally(CALL_ID);
        vm.warp(closesAt);
        vm.expectRevert(HiveCallV2.TooLate.selector);
        hive.commit(CALL_ID, commitment, voter, 1, closesAt, signature);
        vm.expectRevert(HiveCallV2.InvalidReveal.selector);
        hive.reveal(CALL_ID, voter, false, SALT);
        hive.reveal(CALL_ID, voter, true, SALT);
        (uint32 yes, uint32 no, uint32 unrevealed) = hive.officialTally(CALL_ID);
        assert(yes == 1 && no == 0 && unrevealed == 0);
        vm.expectRevert(HiveCallV2.AlreadyRevealed.selector);
        hive.reveal(CALL_ID, voter, true, SALT);
        vm.expectRevert(HiveCallV2.TooEarly.selector);
        hive.resolve(CALL_ID, 22_000, evaluationAt, bytes32(uint256(2)));
        vm.warp(evaluationAt);
        hive.resolve(CALL_ID, 23_000, evaluationAt, bytes32(uint256(2)));
        (,,,,,,,,,,, HiveCallV2.Stage stage, bool outcome,,,) = hive.calls(CALL_ID);
        assert(stage == HiveCallV2.Stage.Resolved && outcome);
        vm.expectRevert(HiveCallV2.InvalidCall.selector);
        hive.resolve(CALL_ID, 23_000, evaluationAt, bytes32(uint256(3)));
    }

    function testCloseEarlyAtHalfwayKeepsCallValid() public {
        _commit(false);
        vm.expectRevert(HiveCallV2.InvalidCall.selector);
        hive.closeEarly(CALL_ID, 16_999, SOURCE);
        hive.closeEarly(CALL_ID, 17_000, SOURCE);
        assert(hive.effectiveClosesAt(CALL_ID) == block.timestamp);
        vm.expectRevert(HiveCallV2.TooLate.selector);
        hive.commit(CALL_ID, bytes32(uint256(1)), vm.addr(OTHER_KEY), 0, closesAt, "");
        hive.reveal(CALL_ID, voter, false, SALT);
        vm.warp(evaluationAt);
        hive.resolve(CALL_ID, 21_000, evaluationAt, SOURCE);
        (,,,,,,,,,,, HiveCallV2.Stage stage, bool outcome,,,) = hive.calls(CALL_ID);
        assert(stage == HiveCallV2.Stage.Resolved && !outcome);
    }

    function testSignatureExpiryAndWrongSigner() public {
        bytes32 commitment = hive.commitmentHash(CALL_ID, voter, true, 0, SALT);
        bytes memory wrongSignature = _signature(CALL_ID, commitment, OTHER_KEY, 0, closesAt);
        vm.expectRevert(HiveCallV2.InvalidSignature.selector);
        hive.commit(CALL_ID, commitment, voter, 0, closesAt, wrongSignature);
        uint64 expired = openedAt;
        bytes memory signature = _signature(CALL_ID, commitment, VOTER_KEY, 0, expired);
        vm.warp(openedAt + 1);
        vm.expectRevert(HiveCallV2.TooLate.selector);
        hive.commit(CALL_ID, commitment, voter, 0, expired, signature);
    }

    function testOnlyConfiguredRolesCanMutate() public {
        vm.prank(RELAYER);
        vm.expectRevert(HiveCallV2.Unauthorized.selector);
        hive.closeEarly(CALL_ID, 17_000, SOURCE);
        vm.prank(RELAYER);
        vm.expectRevert(HiveCallV2.Unauthorized.selector);
        hive.resolve(CALL_ID, 22_000, evaluationAt, SOURCE);
        vm.prank(RELAYER);
        vm.expectRevert(HiveCallV2.Unauthorized.selector);
        hive.voidCall(CALL_ID, RULES);
    }

    function testCancelOnlyBeforeFirstCommit() public {
        hive.cancel(CALL_ID, RULES);
        (,,,,,,,,,,, HiveCallV2.Stage stage,,,,) = hive.calls(CALL_ID);
        assert(stage == HiveCallV2.Stage.Cancelled);
        vm.expectRevert(HiveCallV2.InvalidCall.selector);
        hive.cancel(CALL_ID, RULES);
    }

    function testVoidAfterCommitBlocksResolve() public {
        _commit(true);
        vm.expectRevert(HiveCallV2.InvalidCall.selector);
        hive.cancel(CALL_ID, RULES);
        hive.voidCall(CALL_ID, RULES);
        (,,,,,,,,,,, HiveCallV2.Stage stage,,,,) = hive.calls(CALL_ID);
        assert(stage == HiveCallV2.Stage.Voided);
        vm.warp(evaluationAt);
        vm.expectRevert(HiveCallV2.InvalidCall.selector);
        hive.resolve(CALL_ID, 23_000, evaluationAt, SOURCE);
    }

    function testUnrevealedCannotBeRevealedAfterDeadline() public {
        _commit(true);
        vm.warp(uint256(revealDeadline) + 1);
        vm.expectRevert(HiveCallV2.TooLate.selector);
        hive.reveal(CALL_ID, voter, true, SALT);
        (,,,,,,,,,, uint32 revealCount,,,,,) = hive.calls(CALL_ID);
        assert(revealCount == 0);
        (uint32 yes, uint32 no, uint32 unrevealed) = hive.officialTally(CALL_ID);
        assert(yes == 0 && no == 0 && unrevealed == 1);
    }

    function testTwoWalletsProduceFinalTallyWithOneUnrevealed() public {
        _commit(true);
        address other = vm.addr(OTHER_KEY);
        bytes32 otherSalt = keccak256("second-salt");
        bytes32 otherCommitment = hive.commitmentHash(CALL_ID, other, false, 0, otherSalt);
        bytes memory signature = _signature(CALL_ID, otherCommitment, OTHER_KEY, 0, closesAt);
        vm.prank(RELAYER);
        hive.commit(CALL_ID, otherCommitment, other, 0, closesAt, signature);
        vm.warp(closesAt);
        hive.reveal(CALL_ID, voter, true, SALT);
        vm.expectRevert(HiveCallV2.TallyUnavailable.selector);
        hive.officialTally(CALL_ID);
        vm.warp(uint256(revealDeadline) + 1);
        (uint32 yes, uint32 no, uint32 unrevealed) = hive.officialTally(CALL_ID);
        assert(yes == 1 && no == 0 && unrevealed == 1);
    }

    function testSignatureIsBoundToContract() public {
        HiveCallV2 other = new HiveCallV2(address(this), address(this));
        other.createCall(CALL_ID, SOURCE, RULES, openedAt, closesAt, evaluationAt, revealDeadline, 12_000, 22_000);
        bytes32 commitment = hive.commitmentHash(CALL_ID, voter, true, 0, SALT);
        bytes memory signature = _signature(CALL_ID, commitment, VOTER_KEY, 0, closesAt);
        vm.expectRevert(HiveCallV2.InvalidSignature.selector);
        other.commit(CALL_ID, commitment, voter, 0, closesAt, signature);
    }

    function testRejectsInvalidScheduleAndDuplicateCall() public {
        vm.expectRevert(HiveCallV2.InvalidCall.selector);
        hive.createCall(CALL_ID, SOURCE, RULES, openedAt, closesAt, evaluationAt, revealDeadline, 12_000, 22_000);
        vm.expectRevert(HiveCallV2.InvalidHorizon.selector);
        hive.createCall(
            keccak256("bad-horizon"),
            SOURCE,
            RULES,
            openedAt,
            closesAt,
            openedAt + 8 hours,
            revealDeadline,
            12_000,
            22_000
        );
        vm.expectRevert(HiveCallV2.InvalidTiming.selector);
        hive.createCall(
            keccak256("short-reveal"),
            SOURCE,
            RULES,
            openedAt,
            closesAt,
            evaluationAt,
            closesAt + 30 minutes,
            12_000,
            22_000
        );
    }

    function testResultSnapshotMustBeInEvaluationWindow() public {
        vm.warp(evaluationAt);
        vm.expectRevert(HiveCallV2.InvalidTiming.selector);
        hive.resolve(CALL_ID, 20_000, evaluationAt - 1, SOURCE);
        vm.expectRevert(HiveCallV2.InvalidTiming.selector);
        hive.resolve(CALL_ID, 20_000, evaluationAt + 1, SOURCE);
        vm.warp(uint256(evaluationAt) + 30 minutes + 1);
        vm.expectRevert(HiveCallV2.InvalidTiming.selector);
        hive.resolve(CALL_ID, 20_000, evaluationAt + 30 minutes + 1, SOURCE);
        hive.resolve(CALL_ID, 20_000, evaluationAt, SOURCE);
    }

    function testMetricCorrectionCannotResolveAsNo() public {
        hive.closeEarly(CALL_ID, 17_000, SOURCE);
        vm.warp(evaluationAt);
        vm.expectRevert(HiveCallV2.MetricCorrection.selector);
        hive.resolve(CALL_ID, 16_999, evaluationAt, SOURCE);
        hive.voidCall(CALL_ID, keccak256("metric_correction"));
        (,,,,,,,,,,, HiveCallV2.Stage stage,,,,) = hive.calls(CALL_ID);
        assert(stage == HiveCallV2.Stage.Voided);
    }
}
