// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Commit/reveal proof for curated HIVE calls. The resolver attests to offchain YouTube snapshots.
contract HiveCallV2 {
    enum Stage { None, Open, Resolved, Voided, Cancelled }

    struct Call {
        bytes32 rulesHash;
        bytes32 sourceHash;
        uint64 openedAt;
        uint64 scheduledClosesAt;
        uint64 closedEarlyAt;
        uint64 evaluationAt;
        uint64 revealDeadline;
        uint64 baselineViews;
        uint64 targetViews;
        uint32 commitCount;
        uint32 revealCount;
        Stage stage;
        bool outcome;
        uint64 resultViews;
        bytes32 resultSnapshotHash;
        bytes32 reasonHash;
    }

    struct Commitment {
        bytes32 hash;
        uint64 committedAt;
        bool revealed;
        bool choice;
    }

    address public owner;
    address public keeper;
    address public resolver;
    mapping(bytes32 => Call) public calls;
    mapping(bytes32 => mapping(address => Commitment)) public commitments;
    mapping(address => uint256) public nonces;

    event CallCreated(bytes32 indexed callId, bytes32 indexed sourceHash, bytes32 rulesHash);
    event Committed(bytes32 indexed callId, address indexed voter, bytes32 commitmentHash, uint64 committedAt);
    event ClosedEarly(bytes32 indexed callId, uint64 closedAt, uint64 observedViews, bytes32 snapshotHash);
    event Revealed(bytes32 indexed callId, address indexed voter, bool choice);
    event Resolved(bytes32 indexed callId, bool outcome, uint64 resultViews, bytes32 snapshotHash);
    event Voided(bytes32 indexed callId, bytes32 reasonHash);
    event Cancelled(bytes32 indexed callId, bytes32 reasonHash);
    event RoleUpdated(bytes32 indexed role, address indexed account);

    error Unauthorized();
    error InvalidCall();
    error InvalidTiming();
    error InvalidSignature();
    error AlreadyCommitted();
    error AlreadyRevealed();
    error InvalidReveal();
    error TooEarly();
    error TooLate();

    modifier onlyOwner() { if (msg.sender != owner) revert Unauthorized(); _; }
    modifier onlyKeeper() { if (msg.sender != keeper) revert Unauthorized(); _; }
    modifier onlyResolver() { if (msg.sender != resolver) revert Unauthorized(); _; }

    constructor(address keeper_, address resolver_) {
        if (keeper_ == address(0) || resolver_ == address(0)) revert InvalidCall();
        owner = msg.sender;
        keeper = keeper_;
        resolver = resolver_;
    }

    function setKeeper(address account) external onlyOwner {
        if (account == address(0)) revert InvalidCall();
        keeper = account;
        emit RoleUpdated("KEEPER", account);
    }

    function setResolver(address account) external onlyOwner {
        if (account == address(0)) revert InvalidCall();
        resolver = account;
        emit RoleUpdated("RESOLVER", account);
    }

    function createCall(
        bytes32 callId,
        bytes32 sourceHash,
        bytes32 rulesHash,
        uint64 openedAt,
        uint64 scheduledClosesAt,
        uint64 evaluationAt,
        uint64 revealDeadline,
        uint64 baselineViews,
        uint64 targetViews
    ) external onlyOwner {
        if (callId == 0 || sourceHash == 0 || rulesHash == 0 || calls[callId].stage != Stage.None) revert InvalidCall();
        if (openedAt > block.timestamp || scheduledClosesAt <= block.timestamp || scheduledClosesAt <= openedAt) revert InvalidTiming();
        if (evaluationAt <= scheduledClosesAt || revealDeadline <= scheduledClosesAt || revealDeadline >= evaluationAt) revert InvalidTiming();
        if (targetViews <= baselineViews) revert InvalidCall();
        calls[callId] = Call({
            rulesHash: rulesHash,
            sourceHash: sourceHash,
            openedAt: openedAt,
            scheduledClosesAt: scheduledClosesAt,
            closedEarlyAt: 0,
            evaluationAt: evaluationAt,
            revealDeadline: revealDeadline,
            baselineViews: baselineViews,
            targetViews: targetViews,
            commitCount: 0,
            revealCount: 0,
            stage: Stage.Open,
            outcome: false,
            resultViews: 0,
            resultSnapshotHash: 0,
            reasonHash: 0
        });
        emit CallCreated(callId, sourceHash, rulesHash);
    }

    function effectiveClosesAt(bytes32 callId) public view returns (uint64) {
        Call storage c = calls[callId];
        return c.closedEarlyAt == 0 ? c.scheduledClosesAt : c.closedEarlyAt;
    }

    function closeEarly(bytes32 callId, uint64 observedViews, bytes32 snapshotHash) external onlyKeeper {
        Call storage c = calls[callId];
        if (c.stage != Stage.Open || c.closedEarlyAt != 0) revert InvalidCall();
        if (block.timestamp >= c.scheduledClosesAt || block.timestamp < c.openedAt) revert InvalidTiming();
        uint64 halfway = c.baselineViews + uint64((uint256(c.targetViews) - c.baselineViews + 1) / 2);
        if (observedViews < halfway || snapshotHash == 0) revert InvalidCall();
        c.closedEarlyAt = uint64(block.timestamp);
        emit ClosedEarly(callId, uint64(block.timestamp), observedViews, snapshotHash);
    }

    /// @dev Hash voter signature uses EIP-191 over this digest. The relayer cannot choose the commitment.
    function authorizationDigest(bytes32 callId, bytes32 commitmentHash, address voter, uint256 nonce) public view returns (bytes32) {
        return keccak256(abi.encode("HIVE_COMMIT_V2", block.chainid, address(this), callId, commitmentHash, voter, nonce));
    }

    function commit(bytes32 callId, bytes32 commitmentHash, address voter, uint256 nonce, bytes calldata signature) external {
        Call storage c = calls[callId];
        if (c.stage != Stage.Open || commitmentHash == 0 || voter == address(0)) revert InvalidCall();
        if (block.timestamp < c.openedAt) revert TooEarly();
        if (block.timestamp >= effectiveClosesAt(callId)) revert TooLate();
        if (commitments[callId][voter].hash != 0) revert AlreadyCommitted();
        if (nonce != nonces[voter]) revert InvalidSignature();
        bytes32 digest = authorizationDigest(callId, commitmentHash, voter, nonce);
        if (_recover(_ethSignedMessageHash(digest), signature) != voter) revert InvalidSignature();
        nonces[voter]++;
        commitments[callId][voter] = Commitment(commitmentHash, uint64(block.timestamp), false, false);
        c.commitCount++;
        emit Committed(callId, voter, commitmentHash, uint64(block.timestamp));
    }

    function commitmentHash(bytes32 callId, address voter, bool choice, bytes32 salt) public view returns (bytes32) {
        return keccak256(abi.encode("HIVE_CHOICE_V2", block.chainid, address(this), callId, voter, choice, salt));
    }

    function reveal(bytes32 callId, address voter, bool choice, bytes32 salt) external {
        Call storage c = calls[callId];
        Commitment storage choiceCommit = commitments[callId][voter];
        if (c.stage != Stage.Open || choiceCommit.hash == 0) revert InvalidCall();
        if (block.timestamp < effectiveClosesAt(callId)) revert TooEarly();
        if (block.timestamp > c.revealDeadline) revert TooLate();
        if (choiceCommit.revealed) revert AlreadyRevealed();
        if (choiceCommit.hash != commitmentHash(callId, voter, choice, salt)) revert InvalidReveal();
        choiceCommit.revealed = true;
        choiceCommit.choice = choice;
        c.revealCount++;
        emit Revealed(callId, voter, choice);
    }

    function resolve(bytes32 callId, uint64 resultViews, bytes32 snapshotHash) external onlyResolver {
        Call storage c = calls[callId];
        if (c.stage != Stage.Open || snapshotHash == 0) revert InvalidCall();
        if (block.timestamp < c.evaluationAt || block.timestamp < c.revealDeadline) revert TooEarly();
        if (block.timestamp > uint256(c.evaluationAt) + 30 minutes) revert TooLate();
        c.stage = Stage.Resolved;
        c.outcome = resultViews >= c.targetViews;
        c.resultViews = resultViews;
        c.resultSnapshotHash = snapshotHash;
        emit Resolved(callId, c.outcome, resultViews, snapshotHash);
    }

    function voidCall(bytes32 callId, bytes32 reasonHash) external onlyResolver {
        Call storage c = calls[callId];
        if (c.stage != Stage.Open || reasonHash == 0) revert InvalidCall();
        c.stage = Stage.Voided;
        c.reasonHash = reasonHash;
        emit Voided(callId, reasonHash);
    }

    function cancel(bytes32 callId, bytes32 reasonHash) external onlyOwner {
        Call storage c = calls[callId];
        if (c.stage != Stage.Open || c.commitCount != 0 || reasonHash == 0) revert InvalidCall();
        c.stage = Stage.Cancelled;
        c.reasonHash = reasonHash;
        emit Cancelled(callId, reasonHash);
    }

    function _ethSignedMessageHash(bytes32 digest) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidSignature();
        return ecrecover(digest, v, r, s);
    }
}
