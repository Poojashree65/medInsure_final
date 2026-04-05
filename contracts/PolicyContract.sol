// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PolicyContract {

    address public insurer;

    struct PolicyInput {
        string  policyName;
        uint256 coverageLimit;
        uint256 premiumAmount;
        uint256 validityPeriod;
        string  ipfsCID;
        string  covered;
        string  excluded;
        uint256 deductible;
        uint256 copayPercentage;
    }

    struct Policy {
        uint256 policyId;
        string  policyName;
        uint256 coverageLimit;
        uint256 premiumAmount;
        uint256 validityPeriod;
        string  ipfsCID;
        string  covered;
        string  excluded;
        string  status;
        uint256 timestamp;
        uint256 deductible;
        uint256 copayPercentage;
    }

    struct Subscription {
        address patientAddress;
        uint256 policyId;
        string  policyName;
        uint256 premiumAmount;
        uint256 totalPaid;
        uint256 startDate;
        uint256 endDate;
        uint256 nextDueDate;
        uint256 monthsPaid;
        string  subscriptionStatus;
        string  paymentStatus;
        uint256 timestamp;
    }

    struct PaymentRecord {
        uint256 amount;
        uint256 paidOn;
        uint256 monthNumber;
        string  status;
    }

    uint256 public policyCount;
    uint256 public subscriptionCount;

    mapping(uint256 => Policy)          public policies;
    mapping(address => Subscription)    public subscriptions;
    mapping(address => PaymentRecord[]) public paymentHistory;
    mapping(address => bool)            public hasSubscription;

    uint256[] public allPolicyIds;

    event PolicyCreated(uint256 policyId, string policyName);
    event PolicySubscribed(address patient, uint256 policyId, string policyName);
    event MonthlyPremiumPaid(address patient, uint256 amount, uint256 monthNumber);
    event PolicySuspended(address patient, string reason);
    event PolicyReactivated(address patient);

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer allowed!");
        _;
    }

    modifier hasActiveSub() {
        require(hasSubscription[msg.sender], "No subscription found!");
        _;
    }

    constructor() {
        insurer = msg.sender;
    }

    function createPolicy(PolicyInput memory input) public onlyInsurer {
        require(input.copayPercentage <= 100, "Copay must be 0-100%");
        policyCount++;
        policies[policyCount] = Policy({
            policyId:        policyCount,
            policyName:      input.policyName,
            coverageLimit:   input.coverageLimit,
            premiumAmount:   input.premiumAmount,
            validityPeriod:  input.validityPeriod,
            ipfsCID:         input.ipfsCID,
            covered:         input.covered,
            excluded:        input.excluded,
            status:          "Active",
            timestamp:       block.timestamp,
            deductible:      input.deductible,
            copayPercentage: input.copayPercentage
        });
        allPolicyIds.push(policyCount);
        emit PolicyCreated(policyCount, input.policyName);
    }

    function subscribePolicy(uint256 policyId) public payable {
        require(!hasSubscription[msg.sender], "Already subscribed!");
        require(policyId > 0 && policyId <= policyCount, "Invalid policy!");
        Policy memory p = policies[policyId];
        require(msg.value == p.premiumAmount, "Incorrect premium amount!");
        payable(insurer).transfer(msg.value);
        uint256 start       = block.timestamp;
        uint256 end         = block.timestamp + (p.validityPeriod * 365 days);
        uint256 nextDueDate = block.timestamp + 30 days;
        subscriptions[msg.sender] = Subscription({
            patientAddress:     msg.sender,
            policyId:           policyId,
            policyName:         p.policyName,
            premiumAmount:      p.premiumAmount,
            totalPaid:          msg.value,
            startDate:          start,
            endDate:            end,
            nextDueDate:        nextDueDate,
            monthsPaid:         1,
            subscriptionStatus: "Active",
            paymentStatus:      "Paid",
            timestamp:          block.timestamp
        });
        hasSubscription[msg.sender] = true;
        subscriptionCount++;
        paymentHistory[msg.sender].push(PaymentRecord({
            amount:      msg.value,
            paidOn:      block.timestamp,
            monthNumber: 1,
            status:      "Paid"
        }));
        emit PolicySubscribed(msg.sender, policyId, p.policyName);
        emit MonthlyPremiumPaid(msg.sender, msg.value, 1);
    }

    function payMonthlyPremium() public payable hasActiveSub {
        Subscription storage sub = subscriptions[msg.sender];
        require(keccak256(bytes(sub.subscriptionStatus)) != keccak256(bytes("Expired")), "Policy has expired!");
        require(msg.value == sub.premiumAmount, "Incorrect premium amount!");
        require(block.timestamp >= sub.nextDueDate - 3 days, "Payment not due yet!");
        payable(insurer).transfer(msg.value);
        sub.totalPaid          += msg.value;
        sub.monthsPaid         += 1;
        sub.nextDueDate        += 30 days;
        sub.paymentStatus       = "Paid";
        sub.subscriptionStatus  = "Active";
        if (block.timestamp >= sub.endDate) {
            sub.subscriptionStatus = "Expired";
            sub.paymentStatus      = "Expired";
        }
        paymentHistory[msg.sender].push(PaymentRecord({
            amount:      msg.value,
            paidOn:      block.timestamp,
            monthNumber: sub.monthsPaid,
            status:      "Paid"
        }));
        emit MonthlyPremiumPaid(msg.sender, msg.value, sub.monthsPaid);
        emit PolicyReactivated(msg.sender);
    }

    function checkPaymentStatus(address patient) public {
        if (!hasSubscription[patient]) return;
        Subscription storage sub = subscriptions[patient];
        if (keccak256(bytes(sub.subscriptionStatus)) == keccak256(bytes("Expired"))) return;
        if (block.timestamp >= sub.endDate) {
            sub.subscriptionStatus = "Expired";
            sub.paymentStatus      = "Expired";
            return;
        }
        if (block.timestamp > sub.nextDueDate + 7 days) {
            sub.subscriptionStatus = "Suspended";
            sub.paymentStatus      = "Overdue";
            emit PolicySuspended(patient, "Payment overdue!");
            return;
        }
        if (block.timestamp >= sub.nextDueDate - 3 days) {
            sub.paymentStatus = "Due";
            return;
        }
        sub.paymentStatus = "Paid";
    }

    function getAllPolicies() public view returns (uint256[] memory) {
        return allPolicyIds;
    }

    function getPolicy(uint256 policyId) public view returns (Policy memory) {
        return policies[policyId];
    }

    function getSubscription(address patient) public view returns (Subscription memory) {
        return subscriptions[patient];
    }

    function getPolicyIdForPatient(address patient) public view returns (uint256) {
        return subscriptions[patient].policyId;
    }

    function getPolicyNameForPatient(address patient) public view returns (string memory) {
        return subscriptions[patient].policyName;
    }

    function getPaymentHistory(address patient) public view returns (PaymentRecord[] memory) {
        return paymentHistory[patient];
    }

    function checkActivePolicy(address patient) public view returns (bool) {
        return hasSubscription[patient];
    }

    function isPaymentDue(address patient) public view returns (bool) {
        if (!hasSubscription[patient]) return false;
        Subscription memory sub = subscriptions[patient];
        return block.timestamp >= sub.nextDueDate - 3 days;
    }

    function getDaysUntilDue(address patient) public view returns (uint256) {
        if (!hasSubscription[patient]) return 0;
        Subscription memory sub = subscriptions[patient];
        if (block.timestamp >= sub.nextDueDate) return 0;
        return (sub.nextDueDate - block.timestamp) / 1 days;
    }

    // ================================
    // ELIGIBILITY CHECK
    // ================================

    function checkEligibility(address patient) public view returns (
        bool   eligible,
        string memory policyName,
        uint256 coverageLimit,
        uint256 remainingCoverage,
        uint256 deductible,
        bool   deductibleMet,
        uint256 copayPercentage,
        string memory subscriptionStatus,
        string memory paymentStatus,
        string memory message
    ) {
        if (!hasSubscription[patient]) {
            return (false, "", 0, 0, 0, false, 0, "No Subscription", "N/A",
                "Patient does not have an active insurance policy");
        }
        Subscription memory sub = subscriptions[patient];
        Policy memory policy    = policies[sub.policyId];

        if (keccak256(bytes(sub.subscriptionStatus)) != keccak256(bytes("Active"))) {
            return (false, sub.policyName, policy.coverageLimit, 0, policy.deductible, false,
                policy.copayPercentage, sub.subscriptionStatus, sub.paymentStatus,
                string(abi.encodePacked("Policy is ", sub.subscriptionStatus, ". Please contact insurer.")));
        }
        if (keccak256(bytes(sub.paymentStatus)) == keccak256(bytes("Overdue"))) {
            return (false, sub.policyName, policy.coverageLimit, policy.coverageLimit,
                policy.deductible, false, policy.copayPercentage, sub.subscriptionStatus,
                sub.paymentStatus, "Payment is overdue. Please pay premium to restore coverage.");
        }
        if (block.timestamp > sub.endDate) {
            return (false, sub.policyName, policy.coverageLimit, 0, policy.deductible, false,
                policy.copayPercentage, "Expired", sub.paymentStatus,
                "Policy has expired. Please renew to continue coverage.");
        }
        return (true, sub.policyName, policy.coverageLimit, policy.coverageLimit,
            policy.deductible, false, policy.copayPercentage, sub.subscriptionStatus,
            sub.paymentStatus, "Patient is eligible for coverage. Treatment can proceed.");
    }

    function isEligible(address patient) public view returns (bool) {
        if (!hasSubscription[patient]) return false;
        Subscription memory sub = subscriptions[patient];
        return (
            keccak256(bytes(sub.subscriptionStatus)) == keccak256(bytes("Active")) &&
            keccak256(bytes(sub.paymentStatus))      != keccak256(bytes("Overdue")) &&
            block.timestamp <= sub.endDate
        );
    }

    // ================================
    // CLAIM PAYOUT CALCULATION
    // ================================

    function calculateClaimPayout(address patient, uint256 claimAmount) public view returns (
        uint256 patientPays,
        uint256 insurerPays
    ) {
        require(hasSubscription[patient], "No subscription found!");
        Subscription memory sub = subscriptions[patient];
        Policy memory policy    = policies[sub.policyId];

        uint256 afterDeductible = claimAmount > policy.deductible
            ? claimAmount - policy.deductible : 0;
        uint256 copayAmount = (afterDeductible * policy.copayPercentage) / 100;
        patientPays = policy.deductible + copayAmount;
        insurerPays = afterDeductible - copayAmount;
        if (insurerPays > policy.coverageLimit) {
            insurerPays = policy.coverageLimit;
        }
    }
}
