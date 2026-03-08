// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PolicyContract {

    address public insurer;

    // ================================
    // STRUCTS
    // ================================

    struct PolicyInput {
        string  policyName;
        uint256 coverageLimit;
        uint256 premiumAmount;   // Monthly premium in Wei
        uint256 validityPeriod;  // In years
        uint256 copayPercent;    // Co-pay % patient pays (e.g. 10 = 10%)
        uint256 deductible;      // Fixed amount patient pays first (in Wei)
        uint256 waitingPeriod;   // Days before claims allowed (e.g. 30)
        string  ipfsCID;
        string  covered;
        string  excluded;
    }

    struct Policy {
        uint256 policyId;
        string  policyName;
        uint256 coverageLimit;
        uint256 premiumAmount;
        uint256 validityPeriod;
        uint256 copayPercent;
        uint256 deductible;
        uint256 waitingPeriod;
        string  ipfsCID;
        string  covered;
        string  excluded;
        string  status;
        uint256 timestamp;
    }

    struct Subscription {
        address patientAddress;
        uint256 policyId;
        string  policyName;
        uint256 premiumAmount;
        uint256 coverageLimit;
        uint256 copayPercent;
        uint256 deductible;
        uint256 waitingPeriod;
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

    // ================================
    // STORAGE
    // ================================

    uint256 public policyCount;
    uint256 public subscriptionCount;

    mapping(uint256 => Policy)          public policies;
    mapping(address => Subscription)    public subscriptions;
    mapping(address => PaymentRecord[]) public paymentHistory;
    mapping(address => bool)            public hasSubscription;

    uint256[] public allPolicyIds;

    // ================================
    // EVENTS
    // ================================

    event PolicyCreated(uint256 policyId, string policyName);
    event PolicySubscribed(address patient, uint256 policyId, string policyName);
    event MonthlyPremiumPaid(address patient, uint256 amount, uint256 monthNumber);
    event PolicySuspended(address patient, string reason);
    event PolicyReactivated(address patient);

    // ================================
    // MODIFIERS
    // ================================

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer allowed!");
        _;
    }

    modifier hasActiveSub() {
        require(hasSubscription[msg.sender], "No subscription found!");
        _;
    }

    // ================================
    // CONSTRUCTOR
    // ================================

    constructor() {
        insurer = msg.sender;
    }

    // ================================
    // CREATE POLICY (Insurer only)
    // ================================

    function createPolicy(PolicyInput memory input) public onlyInsurer {
        require(input.copayPercent <= 100, "Co-pay cannot exceed 100%!");
        require(input.waitingPeriod <= 365, "Waiting period cannot exceed 365 days!");

        policyCount++;

        policies[policyCount] = Policy({
            policyId:       policyCount,
            policyName:     input.policyName,
            coverageLimit:  input.coverageLimit,
            premiumAmount:  input.premiumAmount,
            validityPeriod: input.validityPeriod,
            copayPercent:   input.copayPercent,
            deductible:     input.deductible,
            waitingPeriod:  input.waitingPeriod,
            ipfsCID:        input.ipfsCID,
            covered:        input.covered,
            excluded:       input.excluded,
            status:         "Active",
            timestamp:      block.timestamp
        });

        allPolicyIds.push(policyCount);
        emit PolicyCreated(policyCount, input.policyName);
    }

    // ================================
    // SUBSCRIBE POLICY — First Month
    // ================================

    function subscribePolicy(uint256 policyId) public payable {
        require(!hasSubscription[msg.sender], "Already subscribed!");
        require(policyId > 0 && policyId <= policyCount, "Invalid policy!");

        Policy memory p = policies[policyId];
        require(keccak256(bytes(p.status)) == keccak256(bytes("Active")), "Policy is not active!");
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
            coverageLimit:      p.coverageLimit,
            copayPercent:       p.copayPercent,
            deductible:         p.deductible,
            waitingPeriod:      p.waitingPeriod,
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

    // ================================
    // PAY MONTHLY PREMIUM
    // ================================

    function payMonthlyPremium() public payable hasActiveSub {
        Subscription storage sub = subscriptions[msg.sender];

        require(
            keccak256(bytes(sub.subscriptionStatus)) != keccak256(bytes("Expired")),
            "Policy has expired!"
        );
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

    // ================================
    // CHECK & UPDATE STATUS
    // ================================

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

    // ================================
    // WAITING PERIOD CHECK (Phase 2 - Claims)
    // ================================

    function isWaitingPeriodOver(address patient) public view returns (bool) {
        if (!hasSubscription[patient]) return false;
        return true;
    }

    // ================================
    // CLAIM PAYOUT CALCULATION (Phase 2 - Claims)
    // Returns how much patient pays vs insurer pays
    // ================================

    function calculateClaimPayout(address patient, uint256 claimAmount) public view returns (
        uint256 patientPays,
        uint256 insurerPays
    ) {
        require(hasSubscription[patient], "No subscription found!");
        Subscription memory sub = subscriptions[patient];

        // Patient pays deductible first
        uint256 afterDeductible = claimAmount > sub.deductible
            ? claimAmount - sub.deductible
            : 0;

        // Co-pay applied on remaining amount
        uint256 copayAmount = (afterDeductible * sub.copayPercent) / 100;

        // Final split
        patientPays = sub.deductible + copayAmount;
        insurerPays = afterDeductible - copayAmount;

        // Cannot exceed coverage limit
        if (insurerPays > sub.coverageLimit) {
            insurerPays = sub.coverageLimit;
        }
    }

    // ================================
    // VIEW FUNCTIONS
    // ================================

    function getAllPolicies() public view returns (uint256[] memory) {
        return allPolicyIds;
    }

    function getPolicy(uint256 policyId) public view returns (Policy memory) {
        return policies[policyId];
    }

    function getSubscription(address patient) public view returns (Subscription memory) {
        return subscriptions[patient];
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
}
