import { defineChain, parseAbi } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { decimals: 18, name: "MON", symbol: "MON" },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
  testnet: true,
});

export const hiveCallAbi = parseAbi([
  "function createCall(bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,uint64,uint64)",
  "function calls(bytes32) view returns (bytes32,bytes32,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint32,uint32,uint8,bool,uint64,bytes32,bytes32)",
  "function nonces(address) view returns (uint256)",
  "function commitmentHash(bytes32,address,bool,uint256,bytes32) view returns (bytes32)",
  "function authorizationDigest(bytes32,bytes32,address,uint256,uint64) view returns (bytes32)",
  "function commit(bytes32,bytes32,address,uint256,uint64,bytes)",
  "function reveal(bytes32,address,bool,bytes32)",
  "function closeEarly(bytes32,uint64,bytes32)",
  "function resolve(bytes32,uint64,uint64,bytes32)",
  "function voidCall(bytes32,bytes32)",
  "function effectiveClosesAt(bytes32) view returns (uint64)",
  "function earlyCloseViews(bytes32) view returns (uint64)",
  "function officialTally(bytes32) view returns (uint32,uint32,uint32)",
  "function commitments(bytes32,address) view returns (bytes32,uint64,uint256,bool,bool)",
]);

export function configuredContractAddress() {
  const value = process.env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS;
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error("Monad contract address is not configured");
  return value as `0x${string}`;
}
