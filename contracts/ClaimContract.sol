// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPolicyContract {
    function hasSubscription(address patient) external view returns (bool);
    function calculateClaimPayout(address patient, uint256 claimAmount)
        external view returns (uint256 patientPays, uint256 insurerPays);
    function getPolicyIdForPatient(address patient) external view returns (uint256);
    function getPolicyNameForPatient(address patient) external view returns (string memory);
}

interface IHospitalRegistry {
    function isHospitalApproved(address hospital) external view returns (bool);
    function getHospitalName(address hospital) external view returns (string memory);
}

interface IUserRegistry {
    function checkPatientRegistered(address patient) external view returns (bool);
    function checkPatientApproved(address patient) external view returns (bool);
    function getPatientName(address patient) external view returns (string memory);
}

contract ClaimContract {

    address public insurer;
    IPolicyContract   public policyContract;
    IHospitalRegistry public hospitalRegistry;
    IUserRegistry     public userRegistry;

    struct Claim {
        uint256 claimId;
        address patientAddress;
        address hospitalAddress;
        string  patientName;
        string  hospitalName;
        uint256 policyId;
        string  policyName;
        string  treatmentName;
        string  treatmentDate;
        string  description;
        uint256 claimAmount;
        uint256 patientPays;
        uint256 insurerPays;
        string  ipfsCID;
        string  status;
        string  rejectionReason;
        uint256 submittedOn;
        uint256 confirmedOn;
        uint256 settledOn;
    }

    uint256 public claimCount;
    uint256 public contractBalance;

    mapping(uint256 => Claim)         public claims;
    mapping(address => uint256[])     public patientClaims;
    mapping(address => uint256[])     public hospitalClaims;
    mapping(address => bool)          public hasPendingClaim;
    mapping(bytes32 => bool)          public documentHashUsed;

    uint256[] public allClaimIds;

    event ClaimSubmitted(uint256 claimId, address patient, address hospital, uint256 amount);
    event ClaimConfirmed(uint256 claimId, address patient);
    event ClaimCancelled(uint256 claimId, address patient);
    event ClaimApproved(uint256 claimId, address hospital, uint256 payout);
    event ClaimRejected(uint256 claimId, string reason);
    event FundsDeposited(address insurer, uint256 amount);
    event FundsWithdrawn(address insurer, uint256 amount);

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer allowed!");
        _;
    }

    modifier onlyApprovedHospital() {
        require(hospitalRegistry.isHospitalApproved(msg.sender), "Hospital not approved!");
        _;
    }

    constructor(
        address _policyContract,
        address _hospitalRegistry,
        address _userRegistry
    ) {
        insurer          = msg.sender;
        policyContract   = IPolicyContract(_policyContract);
        hospitalRegistry = IHospitalRegistry(_hospitalRegistry);
        userRegistry     = IUserRegistry(_userRegistry);
    }

    function submitClaim(
        address patientAddress,
        string memory treatmentName,
        string memory treatmentDate,
        string memory description,
        uint256 claimAmount,
        string memory ipfsCID
    ) public onlyApprovedHospital {
        require(userRegistry.checkPatientRegistered(patientAddress),  "Patient not registered!");
        require(userRegistry.checkPatientApproved(patientAddress),    "Patient KYC not approved!");
        require(policyContract.hasSubscription(patientAddress),       "Patient has no active policy!");
        require(!hasPendingClaim[patientAddress],                     "Patient already has a pending claim!");
        require(claimAmount > 0,                                      "Claim amount must be greater than 0!");
        require(bytes(treatmentName).length > 0,                      "Treatment name required!");
        require(bytes(ipfsCID).length > 0,                            "IPFS document required!");

        (uint256 patientPays, uint256 insurerPays) =
            policyContract.calculateClaimPayout(patientAddress, claimAmount);

        string memory patientName  = userRegistry.getPatientName(patientAddress);
        string memory hospitalName = hospitalRegistry.getHospitalName(msg.sender);

        // Pull actual policyId and policyName from subscription
        uint256 policyId       = policyContract.getPolicyIdForPatient(patientAddress);
        string memory policyName = policyContract.getPolicyNameForPatient(patientAddress);

        claimCount++;
        claims[claimCount] = Claim({
            claimId:         claimCount,
            patientAddress:  patientAddress,
            hospitalAddress: msg.sender,
            patientName:     patientName,
            hospitalName:    hospitalName,
            policyId:        policyId,
            policyName:      policyName,
            treatmentName:   treatmentName,
            treatmentDate:   treatmentDate,
            description:     description,
            claimAmount:     claimAmount,
            patientPays:     patientPays,
            insurerPays:     insurerPays,
            ipfsCID:         ipfsCID,
            status:          "AwaitingConfirmation",
            rejectionReason: "",
            submittedOn:     block.timestamp,
            confirmedOn:     0,
            settledOn:       0
        });

        allClaimIds.push(claimCount);
        patientClaims[patientAddress].push(claimCount);
        hospitalClaims[msg.sender].push(claimCount);
        hasPendingClaim[patientAddress] = true;

        emit ClaimSubmitted(claimCount, patientAddress, msg.sender, claimAmount);
    }

    function confirmClaim(uint256 claimId) public {
        Claim storage c = claims[claimId];
        require(c.claimId != 0,                 "Claim not found!");
        require(c.patientAddress == msg.sender, "Only patient can confirm!");
        require(keccak256(bytes(c.status)) == keccak256(bytes("AwaitingConfirmation")), "Claim not awaiting confirmation!");
        c.status      = "Pending";
        c.confirmedOn = block.timestamp;
        emit ClaimConfirmed(claimId, msg.sender);
    }

    function cancelClaim(uint256 claimId) public {
        Claim storage c = claims[claimId];
        require(c.claimId != 0,                 "Claim not found!");
        require(c.patientAddress == msg.sender, "Only patient can cancel!");
        require(keccak256(bytes(c.status)) == keccak256(bytes("AwaitingConfirmation")), "Can only cancel awaiting claims!");
        c.status = "Cancelled";
        hasPendingClaim[msg.sender] = false;
        emit ClaimCancelled(claimId, msg.sender);
    }

    function approveClaim(uint256 claimId) public onlyInsurer {
        Claim storage c = claims[claimId];
        require(c.claimId != 0, "Claim not found!");
        require(keccak256(bytes(c.status)) == keccak256(bytes("Pending")), "Claim is not pending!");
        require(address(this).balance >= c.insurerPays, "Insufficient contract funds!");
        c.status    = "Approved";
        c.settledOn = block.timestamp;
        hasPendingClaim[c.patientAddress] = false;
        payable(c.hospitalAddress).transfer(c.insurerPays);
        emit ClaimApproved(claimId, c.hospitalAddress, c.insurerPays);
    }

    function rejectClaim(uint256 claimId, string memory reason) public onlyInsurer {
        Claim storage c = claims[claimId];
        require(c.claimId != 0, "Claim not found!");
        require(keccak256(bytes(c.status)) == keccak256(bytes("Pending")), "Claim is not pending!");
        require(bytes(reason).length > 0, "Rejection reason required!");
        c.status          = "Rejected";
        c.rejectionReason = reason;
        c.settledOn       = block.timestamp;
        hasPendingClaim[c.patientAddress] = false;
        emit ClaimRejected(claimId, reason);
    }

    function depositFunds() public payable onlyInsurer {
        require(msg.value > 0, "Must deposit more than 0!");
        contractBalance += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    function withdrawFunds(uint256 amount) public onlyInsurer {
        require(amount > 0,                      "Amount must be greater than 0!");
        require(address(this).balance >= amount, "Insufficient balance!");
        contractBalance -= amount;
        payable(insurer).transfer(amount);
        emit FundsWithdrawn(msg.sender, amount);
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getClaim(uint256 claimId) public view returns (Claim memory) { return claims[claimId]; }
    function getAllClaims() public view returns (uint256[] memory) { return allClaimIds; }
    function getPatientClaims(address patient) public view returns (uint256[] memory) { return patientClaims[patient]; }
    function getHospitalClaims(address hospital) public view returns (uint256[] memory) { return hospitalClaims[hospital]; }
    function getClaimCount() public view returns (uint256) { return claimCount; }
    function checkHasPendingClaim(address patient) public view returns (bool) { return hasPendingClaim[patient]; }

    function getClaimsByStatus(string memory status) public view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allClaimIds.length; i++) {
            if (keccak256(bytes(claims[allClaimIds[i]].status)) == keccak256(bytes(status))) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allClaimIds.length; i++) {
            if (keccak256(bytes(claims[allClaimIds[i]].status)) == keccak256(bytes(status))) {
                result[index++] = allClaimIds[i];
            }
        }
        return result;
    }

    receive() external payable {
        contractBalance += msg.value;
    }
}
