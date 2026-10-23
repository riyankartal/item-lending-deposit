// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ItemLendingDeposit
/// @notice Escrow contract for item lending deposits denominated in USDC.
/// @dev Uses basis points for fees and OpenZeppelin SafeERC20 for transfers.
contract ItemLendingDeposit is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Loan lifecycle statuses.
    enum LoanStatus {
        Open,
        Active,
        PendingReturn,
        Completed,
        Cancelled
    }

    /// @notice Return resolution types for confirmReturn.
    /// @dev 0 = OnTime, 1 = Late, 2 = Damaged, 3 = NotReturned.
    uint8 private constant RETURN_TYPE_ON_TIME = 0;
    uint8 private constant RETURN_TYPE_LATE = 1;
    uint8 private constant RETURN_TYPE_DAMAGED = 2;
    uint8 private constant RETURN_TYPE_NOT_RETURNED = 3;

    /// @notice Platform fee in basis points (1.9%).
    uint256 public constant PLATFORM_FEE_BPS = 190;

    /// @notice Late fee charged per full day overdue in basis points (2% per day).
    uint256 public constant LATE_FEE_BPS_PER_DAY = 200;

    /// @notice Lender grace period after returnDate to confirm return.
    uint256 public constant LENDER_GRACE_PERIOD = 7 days;

    /// @notice Basis points denominator.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Platform fee wallet receiving lock fee.
    address public immutable platformWallet;

    /// @notice USDC token address used by this escrow.
    address public immutable USDC;

    IERC20 private immutable usdcToken;

    struct Loan {
        uint256 loanId;
        address lender;
        address borrower;
        string itemName;
        string itemDescription;
        uint256 depositAmount;
        uint256 escrowAmount;
        uint256 returnDate;
        LoanStatus status;
        uint256 createdAt;
        uint256 lockedAt;
        string handoverPhotoUrl;
        string returnPhotoUrl;
        uint256 returnSignaledAt;
        bool extensionRequested;
        uint256 extensionDays;
        bool extensionApproved;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) private lenderLoans;
    mapping(address => uint256[]) private borrowerLoans;
    mapping(address => uint256) public pendingClaims;

    uint256 private loanCounter;
    uint256 private activeLoanCount;

    event LoanCreated(
        uint256 indexed loanId,
        address indexed lender,
        string itemName,
        uint256 depositAmount,
        uint256 returnDate
    );

    event DepositLocked(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 depositAmount,
        uint256 platformFee,
        uint256 escrowAmount
    );

    event ReturnConfirmed(
        uint256 indexed loanId,
        uint8 returnType,
        uint256 daysOverdue,
        uint256 lateFee,
        uint256 damageDeduction,
        uint256 borrowerRefund,
        uint256 lenderPayout
    );

    event LoanCancelled(uint256 indexed loanId);
    event ExtensionRequested(uint256 indexed loanId, address indexed borrower, uint256 extraDays);
    event ExtensionApproved(uint256 indexed loanId, uint256 newReturnDate);
    event ExtensionRejected(uint256 indexed loanId);
    event ReturnSignaled(uint256 indexed loanId, address indexed borrower, uint256 signalTimestamp);
    event EscrowExpiryClaimed(uint256 indexed loanId, address indexed borrower, uint256 escrowAmount);
    event FundsClaimed(address indexed recipient, uint256 amount);
    event PlatformWalletSet(address platformWallet);

    /// @notice Initializes the contract with the USDC token address.
    /// @param usdcAddress USDC token contract address (Arc Testnet: 0x3600...0000).
    /// @param platformWalletAddress Platform wallet receiving lock fees.
    constructor(address usdcAddress, address platformWalletAddress) {
        require(usdcAddress != address(0), "USDC is zero address");
        require(platformWalletAddress != address(0), "Platform wallet is zero address");
        USDC = usdcAddress;
        usdcToken = IERC20(usdcAddress);
        platformWallet = platformWalletAddress;

        emit PlatformWalletSet(platformWalletAddress);
    }

    /// @notice Creates a new loan offer.
    /// @param itemName Name of the item being lent.
    /// @param itemDescription Description of the item.
    /// @param depositAmount Deposit amount in USDC (6 decimals).
    /// @param returnDate Unix timestamp by which the item must be returned.
    /// @param handoverPhotoUrl Optional URL to handover proof image.
    function createLoan(
        string calldata itemName,
        string calldata itemDescription,
        uint256 depositAmount,
        uint256 returnDate,
        string calldata handoverPhotoUrl
    ) external {
        require(bytes(itemName).length > 0, "Item name required");
        require(depositAmount > 0, "Deposit must be > 0");
        require(returnDate > block.timestamp, "Return date must be future");

        uint256 newLoanId = ++loanCounter;
        Loan storage loan = loans[newLoanId];

        loan.loanId = newLoanId;
        loan.lender = msg.sender;
        loan.itemName = itemName;
        loan.itemDescription = itemDescription;
        loan.depositAmount = depositAmount;
        loan.returnDate = returnDate;
        loan.status = LoanStatus.Open;
        loan.createdAt = block.timestamp;
        loan.handoverPhotoUrl = handoverPhotoUrl;

        lenderLoans[msg.sender].push(newLoanId);

        emit LoanCreated(newLoanId, msg.sender, itemName, depositAmount, returnDate);
    }

    /// @notice Locks deposit for an open loan and starts escrow.
    /// @param loanId Loan identifier.
    function lockDeposit(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.Open, "Loan is not open");

        uint256 platformFee = (loan.depositAmount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 escrowAmount = loan.depositAmount - platformFee;

        loan.borrower = msg.sender;
        loan.escrowAmount = escrowAmount;
        loan.status = LoanStatus.Active;
        loan.lockedAt = block.timestamp;

        borrowerLoans[msg.sender].push(loanId);
        activeLoanCount += 1;

        usdcToken.safeTransferFrom(msg.sender, address(this), loan.depositAmount);
        if (platformFee > 0) {
            usdcToken.safeTransfer(platformWallet, platformFee);
        }

        emit DepositLocked(loanId, msg.sender, loan.depositAmount, platformFee, escrowAmount);
    }

    /// @notice Cancels an open loan before a borrower locks the deposit.
    /// @param loanId Loan identifier.
    function cancelLoan(uint256 loanId) external {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(msg.sender == loan.lender, "Only lender");
        require(loan.status == LoanStatus.Open, "Loan cannot be cancelled");

        loan.status = LoanStatus.Cancelled;

        emit LoanCancelled(loanId);
    }

    /// @notice Borrower signals that the item was returned.
    /// @param loanId Loan identifier.
    /// @param returnPhotoUrl Optional URL to return proof image.
    function signalReturn(uint256 loanId, string calldata returnPhotoUrl) external {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(msg.sender == loan.borrower, "Only borrower");
        require(loan.returnSignaledAt == 0, "Return already signaled");

        loan.returnSignaledAt = block.timestamp;
        loan.returnPhotoUrl = returnPhotoUrl;

        emit ReturnSignaled(loanId, msg.sender, block.timestamp);
    }

    /// @notice Confirms return outcome and settles escrow between lender and borrower.
    /// @param loanId Loan identifier.
    /// @param returnType 0=OnTime, 1=Late, 2=Damaged, 3=NotReturned.
    /// @param damageBps Damage deduction in basis points (used only when returnType=2).
    function confirmReturn(uint256 loanId, uint8 returnType, uint256 damageBps) external nonReentrant {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(msg.sender == loan.lender, "Only lender");
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(returnType <= RETURN_TYPE_NOT_RETURNED, "Invalid return type");
        require(damageBps <= BPS_DENOMINATOR, "damageBps too high");

        if (returnType != RETURN_TYPE_DAMAGED) {
            require(damageBps == 0, "damageBps only for damaged return");
        }

        uint256 escrowAmount = loan.escrowAmount;
        uint256 daysOverdue;
        uint256 lateFee;
        uint256 damageDeduction;
        uint256 borrowerRefund;
        uint256 lenderPayout;

        if (returnType == RETURN_TYPE_ON_TIME) {
            borrowerRefund = escrowAmount;
        } else if (returnType == RETURN_TYPE_LATE || returnType == RETURN_TYPE_DAMAGED) {
            uint256 referenceTimestamp = loan.returnSignaledAt;
            if (referenceTimestamp == 0) {
                referenceTimestamp = block.timestamp;
            }

            if (referenceTimestamp > loan.returnDate) {
                daysOverdue = (referenceTimestamp - loan.returnDate) / 1 days;
            }

            lateFee = (escrowAmount * daysOverdue * LATE_FEE_BPS_PER_DAY) / BPS_DENOMINATOR;
            if (lateFee > escrowAmount) {
                lateFee = escrowAmount;
            }

            if (returnType == RETURN_TYPE_DAMAGED) {
                damageDeduction = (escrowAmount * damageBps) / BPS_DENOMINATOR;
                uint256 maxDamageDeduction = escrowAmount - lateFee;
                if (damageDeduction > maxDamageDeduction) {
                    damageDeduction = maxDamageDeduction;
                }
            }

            lenderPayout = lateFee + damageDeduction;
            borrowerRefund = escrowAmount - lenderPayout;
        } else {
            lenderPayout = escrowAmount;
        }

        loan.status = LoanStatus.Completed;
        activeLoanCount -= 1;

        if (lenderPayout > 0) {
            pendingClaims[loan.lender] += lenderPayout;
        }
        if (borrowerRefund > 0) {
            pendingClaims[loan.borrower] += borrowerRefund;
        }

        emit ReturnConfirmed(
            loanId,
            returnType,
            daysOverdue,
            lateFee,
            damageDeduction,
            borrowerRefund,
            lenderPayout
        );
    }

    /// @notice Borrower claims escrow after lender grace period expires without confirmation.
    /// @param loanId Loan identifier.
    function claimExpiredEscrow(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(msg.sender == loan.borrower, "Only borrower");
        require(block.timestamp > loan.returnDate + LENDER_GRACE_PERIOD, "Grace period not expired");

        uint256 escrowAmount = loan.escrowAmount;
        uint256 actualOverdueDays = (block.timestamp - loan.returnDate) / 1 days;
        uint256 maxOverdueDaysForFullFee = (BPS_DENOMINATOR + LATE_FEE_BPS_PER_DAY - 1) / LATE_FEE_BPS_PER_DAY;
        if (actualOverdueDays > maxOverdueDaysForFullFee) {
            actualOverdueDays = maxOverdueDaysForFullFee;
        }

        loan.status = LoanStatus.Completed;
        activeLoanCount -= 1;

        pendingClaims[loan.borrower] += escrowAmount;

        emit EscrowExpiryClaimed(loanId, loan.borrower, escrowAmount);
    }

    /// @notice Claims accumulated pending funds for the caller.
    function claimFunds() external nonReentrant {
        uint256 amount = pendingClaims[msg.sender];
        require(amount > 0, "No funds to claim");

        pendingClaims[msg.sender] = 0;
        usdcToken.safeTransfer(msg.sender, amount);

        emit FundsClaimed(msg.sender, amount);
    }

    /// @notice Borrower requests a return-date extension.
    /// @param loanId Loan identifier.
    /// @param extraDays Number of additional days requested.
    function requestExtension(uint256 loanId, uint256 extraDays) external {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(msg.sender == loan.borrower, "Only borrower");
        require(extraDays > 0, "extraDays must be > 0");

        loan.extensionRequested = true;
        loan.extensionDays = extraDays;
        loan.extensionApproved = false;

        emit ExtensionRequested(loanId, msg.sender, extraDays);
    }

    /// @notice Lender approves a requested extension.
    /// @param loanId Loan identifier.
    function approveExtension(uint256 loanId) external {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(msg.sender == loan.lender, "Only lender");
        require(loan.extensionRequested, "No extension requested");

        uint256 newReturnDate = loan.returnDate + (loan.extensionDays * 1 days);
        loan.returnDate = newReturnDate;
        loan.extensionApproved = true;
        loan.extensionRequested = false;

        emit ExtensionApproved(loanId, newReturnDate);
    }

    /// @notice Lender rejects a requested extension.
    /// @param loanId Loan identifier.
    function rejectExtension(uint256 loanId) external {
        Loan storage loan = loans[loanId];

        require(loan.lender != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(msg.sender == loan.lender, "Only lender");
        require(loan.extensionRequested, "No extension requested");

        loan.extensionRequested = false;
        loan.extensionDays = 0;

        emit ExtensionRejected(loanId);
    }

    /// @notice Returns a loan by ID.
    /// @param loanId Loan identifier.
    /// @return Loan full loan struct.
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        Loan memory loan = loans[loanId];
        require(loan.lender != address(0), "Loan does not exist");
        return loan;
    }

    /// @notice Returns all loan IDs created by a lender.
    /// @param lender Lender address.
    function getLenderLoans(address lender) external view returns (uint256[] memory) {
        return lenderLoans[lender];
    }

    /// @notice Returns all loan IDs accepted by a borrower.
    /// @param borrower Borrower address.
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    /// @notice Returns the number of currently active loans.
    function getActiveLoanCount() external view returns (uint256) {
        return activeLoanCount;
    }

    /// @notice Returns total number of loans created.
    function getTotalLoanCount() external view returns (uint256) {
        return loanCounter;
    }
}
