const ClaimContract     = artifacts.require("ClaimContract");
const PolicyContract   = artifacts.require("PolicyContract");
const HospitalRegistry = artifacts.require("HospitalRegistry");
const UserRegistry     = artifacts.require("UserRegistry");

module.exports = async function (deployer) {
  // Get already-deployed contract addresses
  const policy   = await PolicyContract.deployed();
  const hospital = await HospitalRegistry.deployed();
  const user     = await UserRegistry.deployed();

  // Deploy ClaimContract with the 3 addresses
  await deployer.deploy(
    ClaimContract,
    policy.address,
    hospital.address,
    user.address
  );

  console.log("ClaimContract deployed at:", (await ClaimContract.deployed()).address);
};