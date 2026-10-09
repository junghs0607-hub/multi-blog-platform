export type AssetCategory =
  | "KR_STOCK"       // 국내주식
  | "US_STOCK"       // 해외주식 (미국 등)
  | "ETF"            // ETF
  | "COVERED_CALL"   // 커버드콜 ETF
  | "FUND"           // 펀드
  | "BOND"           // 채권
  | "CRYPTO"         // 가상자산
  | "REAL_ESTATE"    // 부동산
  | "CASH"           // 현금 (원화)
  | "FX"             // 외화 (달러, 엔화, 유로 등)
  | "COMMODITY"      // 금/원자재
  | "OTHER";         // 기타 자산

export type Currency = "KRW" | "USD" | "JPY" | "EUR" | "CNY" | "GBP";

export type AccountType =
  | "BROKERAGE"        // 일반 증권계좌
  | "ISA"              // ISA (개인종합자산관리계좌)
  | "PENSION"          // 연금저축펀드
  | "IRP"              // 개인형 퇴직연금 (IRP)
  | "BANK"             // 은행 예적금
  | "CRYPTO_EXCHANGE"  // 가상자산 거래소
  | "WALLET"           // 개인지갑 (메타마스크 등)
  | "REAL_ESTATE"      // 부동산/실물자산
  | "OTHER";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  provider: string; // e.g. "토스증권", "미래에셋", "업비트", "신한은행"
  accountNumber?: string;
  balanceKRW: number;
  color?: string;
  icon?: string;
  isTaxAdvantaged?: boolean;
}

export interface AssetItem {
  id: string;
  category: AssetCategory;
  name: string;
  code: string; // Ticker / Code (e.g. 005930, AAPL, BTC, SCHD)
  market?: string; // KOSPI, KOSDAQ, NASDAQ, NYSE, UPBIT, BINANCE, KB부동산, KRX 등
  currency: Currency;
  accountId: string;
  accountName?: string;
  
  // Basic quantity & price
  quantity: number;
  avgBuyPrice: number; // in original currency
  currentPrice: number; // in original currency
  previousClosePrice?: number;
  change24h?: number;
  change24hPercent?: number;

  // Valuations
  valuationKRW: number;
  valuationUSD: number;
  investedKRW: number;
  investedUSD: number;
  pnlKRW: number;
  pnlPercent: number;
  realizedPnlKRW?: number;

  // Dividends / Distributions / Income
  dividendYield?: number; // % annual
  dividendPerShare?: number; // annual
  annualExpectedDividendKRW?: number;
  dividendFrequency?: "monthly" | "quarterly" | "semiannual" | "annual" | "none";
  exDividendDate?: string; // YYYY-MM-DD
  dividendPayDate?: string; // YYYY-MM-DD
  dividendGrowthRate?: number; // % 3Y/5Y CAGR

  // Custom classification
  customTags?: string[]; // e.g. ['배당주', '커버드콜', '미국빅테크', '안전자산', '성장주']
  sector?: string; // IT, 반도체, 금융, 헬스케어, 부동산, 크립토 등
  country?: "KR" | "US" | "GLOBAL" | "OTHER";
  riskLevel?: "HIGH" | "MEDIUM_HIGH" | "MEDIUM" | "LOW_RISK" | "SAFE";

  // Category specific fields:
  // 1. Stock / ETF
  per?: number;
  pbr?: number;
  eps?: number;
  roe?: number;
  marketCapKRW?: number;
  volume24h?: number;
  high52w?: number;
  low52w?: number;
  
  // 2. ETF / Covered Call
  nav?: number;
  expenseRatio?: number; // % (총보수)
  underlyingIndex?: string;
  manager?: string; // 운용사 (e.g. 미래에셋, 삼성, Vanguard, JP모건)
  isCoveredCall?: boolean;
  distributionYield?: number;

  // 3. Fund
  fundType?: string;
  durationMonths?: number;

  // 4. Bond
  couponRate?: number; // % annual
  maturityDate?: string; // YYYY-MM-DD
  bondFaceValue?: number;
  couponPaymentSchedule?: string; // "매월 15일", "분기 3/6/9/12월", etc.
  expectedAnnualCouponKRW?: number;

  // 5. Crypto
  exchange?: "UPBIT" | "BITHUMB" | "COINONE" | "BINANCE" | "COINBASE" | "WALLET";
  isStaked?: boolean;
  stakedAmount?: number;
  stakingApy?: number; // %
  accumulatedStakingRewardKRW?: number;
  kimchiPremiumPercent?: number; // %
  walletAddress?: string;

  // 6. Real Estate
  propertyType?: "APARTMENT" | "OFFICETEL" | "VILLA" | "COMMERCIAL" | "LAND" | "OTHER";
  address?: string;
  areaPyeong?: number; // 평수
  purchaseDate?: string;
  loanAmount?: number; // 대출원금 (주담대)
  loanInterestRate?: number; // % 대출금리
  monthlyLoanInterest?: number; // 월 대출이자
  leaseDeposit?: number; // 임대보증금 (전세/월세 보증금)
  monthlyRentIncome?: number; // 월세 수입
  acquisitionTax?: number; // 취득세
  holdingTaxAnnual?: number; // 재산세/종부세
  maintenanceCostMonthly?: number; // 관리비

  // 7. Cash & FX
  fxBuyRate?: number;
  fxCurrentRate?: number;
  fxGainLossKRW?: number;

  // 8. Commodity
  commodityType?: "GOLD" | "SILVER" | "OIL" | "COPPER" | "OTHER";
  unit?: "g" | "don(3.75g)" | "oz" | "barrel" | "kg";

  notes?: string;
  updatedAt?: string;
}

export type TransactionType =
  | "BUY"               // 매수
  | "SELL"              // 매도
  | "DEPOSIT"           // 입금
  | "WITHDRAW"          // 출금
  | "DIVIDEND"          // 배당금 수령
  | "DISTRIBUTION"      // ETF 분배금 수령
  | "INTEREST"          // 채권/예금 이자
  | "RENT"              // 부동산 월세 수입
  | "FX_EXCHANGE"       // 환전
  | "TRANSFER"          // 거래소/지갑 간 자산이동
  | "STAKING_REWARD"    // 스테이킹 보상 수령
  | "FEE"               // 수수료
  | "TAX";              // 세금

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD HH:mm
  assetId?: string;
  assetName: string;
  code?: string;
  category: AssetCategory;
  type: TransactionType;
  quantity?: number;
  price?: number; // in transaction currency
  currency: Currency;
  amountKRW: number;
  amountForeign?: number;
  feeKRW?: number;
  taxKRW?: number;
  realizedPnlKRW?: number;
  accountId: string;
  accountName?: string;
  targetAccountId?: string; // for transfer / FX
  notes?: string;
}

export interface WatchlistItem {
  id: string;
  code: string;
  name: string;
  category: AssetCategory;
  currency: Currency;
  currentPrice: number;
  change24h: number;
  changePercent: number;
  high52w?: number;
  low52w?: number;
  marketCapKRW?: number;
  dividendYield?: number;
  sparkline: number[];
}

export type AlertCondition =
  | "TARGET_PRICE_ABOVE"
  | "TARGET_PRICE_BELOW"
  | "PERCENT_CHANGE_UP"
  | "PERCENT_CHANGE_DOWN"
  | "EX_DIVIDEND_SOON"
  | "EARNINGS_RELEASE";

export interface PriceAlert {
  id: string;
  assetId: string;
  assetName: string;
  code: string;
  category: AssetCategory;
  conditionType: AlertCondition;
  targetValue: number;
  currentValue: number;
  isTriggered: boolean;
  isEnabled: boolean;
  createdAt: string;
  triggeredAt?: string;
  message?: string;
}

export interface EconomicEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  title: string;
  category: "DIVIDEND" | "EARNINGS" | "FOMC" | "CPI" | "PPI" | "GDP" | "INTEREST_RATE" | "CRYPTO" | "OTHER";
  country: "KR" | "US" | "GLOBAL";
  importance: "HIGH" | "MEDIUM" | "LOW";
  actual?: string;
  forecast?: string;
  previous?: string;
  relatedAsset?: string;
  description?: string;
}

export interface MarketIndex {
  id: string;
  name: string;
  code: string;
  category: "KR_INDEX" | "US_INDEX" | "GLOBAL_INDEX" | "FX" | "COMMODITY" | "CRYPTO";
  value: number;
  change: number;
  changePercent: number;
  unit?: string;
  sparkline: number[];
  high52w?: number;
  low52w?: number;
}

export interface PortfolioGroup {
  id: string;
  name: string;
  description?: string;
  targetPercent: number;
  color?: string;
  assetIds: string[];
}

export interface MonthlyDividendSummary {
  month: number; // 1-12
  year: number;
  expectedKRW: number;
  actualKRW: number;
  items: {
    assetName: string;
    code: string;
    category: AssetCategory;
    amountKRW: number;
    payDate: string;
    status: "PAID" | "PENDING";
  }[];
}

export interface AIAnalysisResult {
  healthScore: number; // 0-100
  diversificationScore: number;
  dividendScore: number;
  riskScore: number;
  summary: string;
  dailySummary: string;
  assetHighlights: {
    title: string;
    description: string;
    sentiment: "POSITIVE" | "WARNING" | "NEUTRAL";
  }[];
  recommendations: string[];
  rebalancingTips: string[];
  monthlyReport: string;
}
