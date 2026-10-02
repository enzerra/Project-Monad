// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HiveCallV2} from "../contracts/HiveCallV2.sol";

interface VmDeploy {
    function envUint(string calldata key) external returns (uint256);
    function addr(uint256 privateKey) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployHiveCallV2 {
    VmDeploy private constant vm = VmDeploy(address(uint160(uint256(keccak256("hevm cheat code")))));
    error WrongChain();

    function run() external returns (HiveCallV2 deployed) {
        if (block.chainid != 10143) revert WrongChain();
        uint256 deployerKey = vm.envUint("RELAYER_PRIVATE_KEY");
        address operator = vm.addr(deployerKey);
        vm.startBroadcast(deployerKey);
        deployed = new HiveCallV2(operator, operator);
        vm.stopBroadcast();
    }
}
