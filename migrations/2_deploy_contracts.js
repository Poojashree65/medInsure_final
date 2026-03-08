const HospitalRegistry = artifacts.require("HospitalRegistry");
const UserRegistry = artifacts.require("UserRegistry");
const PolicyContract = artifacts.require("PolicyContract");

module.exports = function (deployer) {
  deployer.deploy(HospitalRegistry);
  deployer.deploy(UserRegistry);
  deployer.deploy(PolicyContract);
};
