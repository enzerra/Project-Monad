import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, getContract, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileHiveCall } from "../scripts/contract-compiler.mjs";

const artifact = compileHiveCall();
const hash = (text) => keccak256(toBytes(text));
const chain = { id: 1337, name: "Ganache", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://localhost"] } } };

async function setup(targetViews = 22_000n) {
  const provider = ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 4 } });
  const entries = Object.values(provider.getInitialAccounts());
  const accounts = entries.map((entry) => privateKeyToAccount(entry.secretKey));
  const wallets = accounts.map((account) => createWalletClient({ account, chain, transport: custom(provider) }));
  const publicClient = createPublicClient({ chain, transport: custom(provider) });
  const deployHash = await wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [accounts[0].address, accounts[0].address] });
  const deployed = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  assert.equal(deployed.status, "success");
  const address = deployed.contractAddress;
  const contract = getContract({ address, abi: artifact.abi, client: publicClient });
  const now = (await publicClient.getBlock()).timestamp;
  const callId = hash(`call-${now}-${targetViews}`);
  const closesAt = now + 90n * 60n;
  const evaluationAt = now + 6n * 60n * 60n;
  const revealDeadline = closesAt + 60n * 60n;
  const tx = await wallets[0].writeContract({ address, abi: artifact.abi, functionName: "createCall", args: [callId, hash("youtube-video"), hash("rules-v1"), now, closesAt, evaluationAt, revealDeadline, 12_000n, targetViews] });
  assert.equal((await publicClient.waitForTransactionReceipt({ hash: tx })).status, "success");
  const send = async (walletIndex, functionName, args) => {
    const txHash = await wallets[walletIndex].writeContract({ address, abi: artifact.abi, functionName, args });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    assert.equal(receipt.status, "success");
  };
  const expectRevert = async (walletIndex, functionName, args) => {
    await assert.rejects(publicClient.simulateContract({ address, abi: artifact.abi, functionName, args, account: accounts[walletIndex].address }));
  };
  const advanceTo = async (timestamp) => {
    const latest = (await publicClient.getBlock()).timestamp;
    if (timestamp > latest) await provider.request({ method: "evm_increaseTime", params: [Number(timestamp - latest)] });
    await provider.request({ method: "evm_mine", params: [] });
  };
  return { provider, accounts, wallets, publicClient, contract, address, callId, closesAt, evaluationAt, revealDeadline, send, expectRevert, advanceTo };
}

async function commitChoice(ctx, choice = true) {
  const salt = hash("private-salt");
  const commitment = await ctx.contract.read.commitmentHash([ctx.callId, ctx.accounts[1].address, choice, salt]);
  const nonce = await ctx.contract.read.nonces([ctx.accounts[1].address]);
  const digest = await ctx.contract.read.authorizationDigest([ctx.callId, commitment, ctx.accounts[1].address, nonce]);
  const signature = await ctx.accounts[1].signMessage({ message: { raw: digest } });
  await ctx.send(2, "commit", [ctx.callId, commitment, ctx.accounts[1].address, nonce, signature]);
  return { salt, commitment, nonce, signature };
}

describe("HiveCallV2", () => {
  it("enforces commit, reveal, and single resolution gates", async () => {
    const ctx = await setup();
    const signed = await commitChoice(ctx);
    await ctx.expectRevert(2, "commit", [ctx.callId, signed.commitment, ctx.accounts[1].address, signed.nonce, signed.signature]);
    await ctx.expectRevert(2, "reveal", [ctx.callId, ctx.accounts[1].address, true, signed.salt]);
    await ctx.advanceTo(ctx.closesAt);
    await ctx.expectRevert(2, "commit", [ctx.callId, hash("another"), ctx.accounts[1].address, signed.nonce + 1n, signed.signature]);
    await ctx.send(2, "reveal", [ctx.callId, ctx.accounts[1].address, true, signed.salt]);
    await ctx.advanceTo(ctx.evaluationAt);
    await ctx.send(0, "resolve", [ctx.callId, 23_000n, hash("snapshot")]);
    const call = await ctx.contract.read.calls([ctx.callId]);
    assert.equal(call[11], 2); // Stage.Resolved
    assert.equal(call[12], true);
    await ctx.expectRevert(0, "resolve", [ctx.callId, 23_000n, hash("second")]);
  });

  it("uses half of the remaining view gap for early close and keeps the Call valid", async () => {
    const ctx = await setup(20_000n);
    await ctx.expectRevert(0, "closeEarly", [ctx.callId, 15_999n, hash("low")]);
    await ctx.send(0, "closeEarly", [ctx.callId, 16_000n, hash("halfway")]);
    const call = await ctx.contract.read.calls([ctx.callId]);
    assert.equal(call[11], 1); // Stage.Open
    assert.ok(call[4] > 0n);
  });

  it("cancels only before a valid commitment", async () => {
    const first = await setup();
    await first.send(0, "cancel", [first.callId, hash("mistake")]);
    assert.equal((await first.contract.read.calls([first.callId]))[11], 4);
    const second = await setup(25_000n);
    await commitChoice(second);
    await second.expectRevert(0, "cancel", [second.callId, hash("late")]);
  });
});
