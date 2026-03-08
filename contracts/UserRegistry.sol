// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UserRegistry {

    address public insurer;

    struct Patient {
        uint patientId;
        string name;
        string dob;
        string gender;
        string mobile;
        string email;
        string location;
        bool otpVerified;
        string aadharHash;
        string photoHash;
        address walletAddress;
        string status;
        uint timestamp;
    }

    struct PatientInput {
        string name;
        string dob;
        string gender;
        string mobile;
        string email;
        string location;
        bool otpVerified;
        string aadharHash;
        string photoHash;
    }

    uint public patientCount = 0;

    mapping(address => Patient) public patients;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public isApproved;
    mapping(string => bool) public aadharExists;

    address[] public pendingPatients;
    address[] public allPatients;

    event PatientRegistered(uint patientId, string name, address walletAddress, uint timestamp);
    event PatientApproved(address walletAddress, string name, uint timestamp);
    event PatientRejected(address walletAddress, string name, uint timestamp);

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer can do this");
        _;
    }

    constructor() {
        insurer = msg.sender;
    }

    function registerPatient(PatientInput memory input) public {
        require(!isRegistered[msg.sender],          "Patient already registered");
        require(!aadharExists[input.aadharHash],    "Aadhar already registered");
        require(input.otpVerified == true,          "OTP not verified");
        require(bytes(input.photoHash).length > 0,  "Photo not uploaded");
        require(bytes(input.aadharHash).length > 0, "Aadhar not provided");

        patientCount++;

        patients[msg.sender] = Patient(
            patientCount,
            input.name,
            input.dob,
            input.gender,
            input.mobile,
            input.email,
            input.location,
            input.otpVerified,
            input.aadharHash,
            input.photoHash,
            msg.sender,
            "Pending",
            block.timestamp
        );

        isRegistered[msg.sender]          = true;
        aadharExists[input.aadharHash]    = true;
        pendingPatients.push(msg.sender);
        allPatients.push(msg.sender);

        emit PatientRegistered(patientCount, input.name, msg.sender, block.timestamp);
    }

    function approvePatient(address _walletAddress) public onlyInsurer {
        require(isRegistered[_walletAddress], "Patient not registered");
        require(!isApproved[_walletAddress],  "Patient already approved");

        patients[_walletAddress].status = "Approved";
        isApproved[_walletAddress]      = true;

        emit PatientApproved(_walletAddress, patients[_walletAddress].name, block.timestamp);
    }

    function rejectPatient(address _walletAddress) public onlyInsurer {
        require(isRegistered[_walletAddress], "Patient not registered");

        patients[_walletAddress].status = "Rejected";

        emit PatientRejected(_walletAddress, patients[_walletAddress].name, block.timestamp);
    }

    function getPatient(address _walletAddress) public view returns (Patient memory) {
        require(isRegistered[_walletAddress], "Patient not registered");
        return patients[_walletAddress];
    }

    function getPendingPatients() public view returns (address[] memory) {
        return pendingPatients;
    }

    function getAllPatients() public view returns (address[] memory) {
        return allPatients;
    }

    function checkPatientApproved(address _walletAddress) public view returns (bool) {
        return isApproved[_walletAddress];
    }

    function checkPatientRegistered(address _walletAddress) public view returns (bool) {
        return isRegistered[_walletAddress];
    }

    // ================================
    // ADDED FOR CLAIM CONTRACT
    // ================================
    function getPatientName(address _walletAddress) public view returns (string memory) {
        require(isRegistered[_walletAddress], "Patient not registered");
        return patients[_walletAddress].name;
    }
}
