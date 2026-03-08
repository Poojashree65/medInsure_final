// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HospitalRegistry {

    address public insurer;

    struct Hospital {
        uint hospitalId;
        string name;
        string location;
        string city;
        string state;
        string pincode;
        string licenseNumber;
        address walletAddress;
        string status;
        uint timestamp;
    }

    uint public hospitalCount = 0;

    mapping(address => Hospital) public hospitals;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public isApprovedHospital;

    event HospitalRegistered(uint hospitalId, string name, string city, address walletAddress, uint timestamp);

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer can do this");
        _;
    }

    constructor() {
        insurer = msg.sender;
    }

    function registerHospital(
        string memory _name,
        string memory _location,
        string memory _city,
        string memory _state,
        string memory _pincode,
        string memory _licenseNumber,
        address _walletAddress
    ) public onlyInsurer {
        require(!isRegistered[_walletAddress], "Hospital already registered");

        hospitalCount++;

        hospitals[_walletAddress] = Hospital(
            hospitalCount,
            _name,
            _location,
            _city,
            _state,
            _pincode,
            _licenseNumber,
            _walletAddress,
            "Active",
            block.timestamp
        );

        isRegistered[_walletAddress]       = true;
        isApprovedHospital[_walletAddress] = true;

        emit HospitalRegistered(hospitalCount, _name, _city, _walletAddress, block.timestamp);
    }

    function getHospital(address _walletAddress) public view returns (Hospital memory) {
        require(isRegistered[_walletAddress], "Hospital not registered");
        return hospitals[_walletAddress];
    }

    function checkHospital(address _walletAddress) public view returns (bool) {
        return isRegistered[_walletAddress];
    }

    // ================================
    // ADDED FOR CLAIM CONTRACT
    // ================================
    function isHospitalApproved(address _walletAddress) public view returns (bool) {
        return isApprovedHospital[_walletAddress];
    }

    function getHospitalName(address _walletAddress) public view returns (string memory) {
        require(isRegistered[_walletAddress], "Hospital not registered");
        return hospitals[_walletAddress].name;
    }
}
