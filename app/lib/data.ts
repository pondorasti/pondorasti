import analysis from '../amex-analysis.json';

export type Transaction = {
  date: string;
  card: 'Gold' | 'Platinum';
  description: string;
  amount: number;
  transaction_type: string;
  category: string;
  reward_category?: string;
  parent_category?: string | null;
  copilot_name?: string | null;
  reward_eligible: string;
};

export const transactions = analysis.transactions as Transaction[];
export const eligibleTransactions = transactions.filter(
  (item) => item.reward_eligible === 'Yes' && item.amount > 0,
);

export const money = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});
export const preciseMoney = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
});
export const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function rewardCategory(item: Transaction) {
  return item.reward_category ?? item.category;
}

export function multiplier(card: Transaction['card'], category: string) {
  if (category === 'Flights') return card === 'Platinum' ? 5 : 3;
  if (card === 'Gold' && (category === 'Dining' || category === 'Groceries')) return 4;
  return 1;
}

export function bestMultiplier(category: string) {
  if (category === 'Flights') return 5;
  if (category === 'Dining' || category === 'Groceries') return 4;
  return 1;
}

export function displayMerchant(item: Transaction) {
  if (item.copilot_name) return item.copilot_name;
  return item.description.split(/\s{2,}/)[0].trim();
}

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const categoryIcons: Record<string, string> = {
  Restaurants: '🍽️', Groceries: '🛒', 'Travel & Vacation': '🏖️',
  Transportation: '🚇', Shops: '🛍️', Transit: '🚋', Subscriptions: '📺',
  Healthcare: '🩺', 'Personal Care': '💆', Entertainment: '🎭',
  Services: '🛠️', Other: '📦',
};

export const misroutedTransactions = eligibleTransactions
  .filter(
    (item) => item.card === 'Platinum' && ['Dining', 'Groceries'].includes(rewardCategory(item)),
  )
  .sort((a, b) => b.date.localeCompare(a.date));

const spend = eligibleTransactions.reduce((sum, item) => sum + item.amount, 0);
const current = eligibleTransactions.reduce(
  (sum, item) => sum + item.amount * multiplier(item.card, rewardCategory(item)), 0,
);
const optimized = eligibleTransactions.reduce(
  (sum, item) => sum + item.amount * bestMultiplier(rewardCategory(item)), 0,
);

export const metrics = {
  spend,
  current,
  optimized,
  missed: optimized - current,
  misrouted: misroutedTransactions.reduce((sum, item) => sum + item.amount, 0),
};

const categoryMap = new Map<string, { spend: number; count: number; current: number; optimized: number }>();
for (const item of eligibleTransactions) {
  const row = categoryMap.get(item.category) ?? { spend: 0, count: 0, current: 0, optimized: 0 };
  row.spend += item.amount;
  row.count += 1;
  row.current += item.amount * multiplier(item.card, rewardCategory(item));
  row.optimized += item.amount * bestMultiplier(rewardCategory(item));
  categoryMap.set(item.category, row);
}

export const categories = [...categoryMap.entries()]
  .map(([name, values]) => ({
    name,
    slug: categorySlug(name),
    icon: categoryIcons[name] ?? '📦',
    ...values,
    share: values.spend / spend,
    missed: values.optimized - values.current,
  }))
  .sort((a, b) => b.spend - a.spend);

const latestTransactionMonth = eligibleTransactions
  .map((item) => item.date.slice(0, 7))
  .sort()
  .at(-1);

const trendMonths: string[] = [];
if (latestTransactionMonth) {
  const latest = new Date(`${latestTransactionMonth}-01T12:00:00Z`);
  const cursor = new Date(Date.UTC(latest.getUTCFullYear(), 0, 1, 12));
  while (cursor <= latest) {
    trendMonths.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
}

export const categoryMonthlySpend = trendMonths.map((month) => {
  const point: Record<string, string | number> = {
    month,
    label: new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short' }),
  };
  for (const category of categories) point[category.name] = 0;
  for (const item of eligibleTransactions) {
    if (item.date.startsWith(month)) point[item.category] = Number(point[item.category]) + item.amount;
  }
  return point;
});

function usedBenefitCredit(description: string) {
  return transactions
    .filter((item) => item.amount < 0 && item.description.includes(description))
    .reduce((sum, item) => sum - item.amount, 0);
}

const elapsedBenefitMonths = latestTransactionMonth ? Number(latestTransactionMonth.slice(5, 7)) : 0;
const platinumUberCashUsed = elapsedBenefitMonths === 12 ? 200 : Math.min(elapsedBenefitMonths * 15, 200);
const goldUberCashUsed = Math.min(elapsedBenefitMonths * 10, 120);

type BenefitItem = {
  card: 'Gold' | 'Platinum';
  timing: string;
  title: string;
  used: number;
  usedLabel: string | null;
  available: number;
  leftLabel: string;
  text: string;
  tone: string;
  status: string;
  additionalAnnualValue?: number;
};

export const benefits: BenefitItem[] = [
  { card: 'Gold', timing: 'Aug 31', title: 'Dining credit', used: usedBenefitCredit('AMEX Dining Credit'), usedLabel: null, available: 10, leftLabel: '$10', text: 'Use the remaining monthly credit at an eligible dining partner.', tone: 'gold', status: 'Use next' },
  { card: 'Platinum', timing: 'Aug 31', title: 'Digital entertainment credit', used: usedBenefitCredit('Platinum Digital Entertainment Credit'), usedLabel: null, available: 10, leftLabel: '$10', text: 'About $10 remained in the current monthly benefit at review time.', tone: 'platinum', status: 'Use next' },
  { card: 'Platinum', timing: 'Sep 30', title: 'Resy credit', used: usedBenefitCredit('Platinum Resy Credit'), usedLabel: null, available: 100, leftLabel: '$100', text: 'The current quarterly Resy benefit remains available.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Sep 30', title: 'lululemon credit', used: usedBenefitCredit('Platinum Lululemon Credit'), usedLabel: null, available: 34, leftLabel: '$34', text: 'About $34 remains in the current quarterly benefit.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Gold', timing: 'Dec 31', title: 'Resy credit', used: usedBenefitCredit('Gold Resy Credit'), usedLabel: null, available: 50, leftLabel: '$50', text: 'The second-half Resy benefit remains available.', tone: 'gold', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Dec 31', title: 'Hotel credit', used: usedBenefitCredit('Platinum Hotel Credit'), usedLabel: null, available: 300, leftLabel: '$300', text: 'Use the current half-year credit on an eligible prepaid Amex Travel hotel.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Dec 31', title: 'Airline fee credit', used: usedBenefitCredit('Platinum Airline Fee Credit'), usedLabel: null, available: 200, leftLabel: '$200', text: 'Incidental-fee credit remains available with your selected airline.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Used YTD', title: 'Uber One credit', used: usedBenefitCredit('Platinum Uber One Credit'), usedLabel: null, available: 0, leftLabel: '$0', text: 'The annual membership credit has already posted.', tone: 'platinum', status: 'Used' },
  { card: 'Platinum', timing: 'Used YTD', title: 'CLEAR+', used: 219, usedLabel: null, available: 0, leftLabel: '$0', text: 'Assumed fully used for the current benefit year.', tone: 'clear', status: 'Used' },
  { card: 'Platinum', timing: 'Monthly', title: 'Uber Cash', used: platinumUberCashUsed, usedLabel: null, available: 200 - platinumUberCashUsed, leftLabel: money.format(200 - platinumUberCashUsed), text: 'Assumed fully used every month; December includes the extra $20.', tone: 'platinum', status: 'Used monthly' },
  { card: 'Gold', timing: 'Monthly', title: 'Uber Cash', used: goldUberCashUsed, usedLabel: null, available: 120 - goldUberCashUsed, leftLabel: money.format(120 - goldUberCashUsed), text: 'Assumed fully used every month alongside Platinum Uber Cash.', tone: 'gold', status: 'Used monthly' },
  { card: 'Platinum', timing: 'Monthly', title: 'Walmart+ credit', used: usedBenefitCredit('Walmart+'), usedLabel: null, available: 0, leftLabel: '$13/mo', text: 'Covers one eligible monthly Walmart+ membership after enrollment.', tone: 'external', status: 'Check', additionalAnnualValue: 155 },
  { card: 'Platinum', timing: 'Dec 31', title: 'Saks credit', used: usedBenefitCredit('Saks'), usedLabel: null, available: 0, leftLabel: '$50', text: 'Up to $50 remains in the second half of the year after enrollment.', tone: 'external', status: 'Check', additionalAnnualValue: 100 },
  { card: 'Platinum', timing: 'Dec 31', title: 'Equinox credit', used: usedBenefitCredit('Equinox'), usedLabel: null, available: 0, leftLabel: '$300/yr', text: 'Optional annual credit for an eligible club membership or digital subscription.', tone: 'external', status: 'Optional', additionalAnnualValue: 300 },
  { card: 'Platinum', timing: 'Dec 31', title: 'Oura Ring credit', used: usedBenefitCredit('Oura'), usedLabel: null, available: 0, leftLabel: '$200/yr', text: 'Optional annual credit on an eligible Oura Ring purchase.', tone: 'external', status: 'Optional', additionalAnnualValue: 200 },
  { card: 'Platinum', timing: 'Every 4 years', title: 'Global Entry or TSA PreCheck', used: 0, usedLabel: 'Check date', available: 0, leftLabel: '$120 / $85', text: 'Eligibility depends on when the last application credit was used.', tone: 'external', status: 'Periodic' },
  { card: 'Gold', timing: 'Personal choice', title: 'Dunkin’ credit', used: usedBenefitCredit('Dunkin'), usedLabel: null, available: 0, leftLabel: '$0 value', text: 'Not part of your routine, so it carries no personal value here.', tone: 'muted', status: 'Skip' },
];

export const benefitValueCaptured = benefits.reduce((sum, benefit) => sum + benefit.used, 0);
export const benefitValueAvailable = benefits.reduce((sum, benefit) => sum + benefit.available, 0);
export const additionalAnnualBenefitValue = benefits.reduce((sum, benefit) => sum + (benefit.additionalAnnualValue ?? 0), 0);

export const accessBenefits = [
  { name: 'Global Lounge Collection', card: 'Platinum', status: 'Included' },
  { name: 'Priority Pass', card: 'Platinum', status: 'Enroll' },
  { name: 'Hilton Honors Gold', card: 'Platinum', status: 'Enroll' },
  { name: 'Marriott Bonvoy Gold', card: 'Platinum', status: 'Enroll' },
  { name: 'Leaders Club Sterling', card: 'Platinum', status: 'Enroll' },
  { name: 'Hertz President’s Circle', card: 'Platinum', status: 'Enroll' },
  { name: 'Avis Preferred', card: 'Platinum', status: 'Enroll' },
  { name: 'National Emerald Club Executive', card: 'Platinum', status: 'Enroll' },
  { name: 'Hertz Five Star', card: 'Gold', status: 'Enroll' },
  { name: 'Fine Hotels + Resorts', card: 'Platinum', status: 'Included' },
  { name: 'The Hotel Collection', card: 'Both', status: 'Included' },
];

export const protectionBenefits = [
  { name: 'Trip cancellation & interruption', card: 'Platinum' },
  { name: 'Trip delay insurance', card: 'Both' },
  { name: 'Baggage insurance plan', card: 'Both' },
  { name: 'Car rental loss & damage', card: 'Both' },
  { name: 'Purchase protection', card: 'Both' },
  { name: 'Extended warranty', card: 'Both' },
];

export const offers = [
  { label: 'Available · Platinum', title: '$200 back on Lufthansa', text: 'Spend $1,000 through Amex Travel. Your YTD Lufthansa activity was close to the threshold.', action: 'Check before the next booking', fit: 'High fit' },
  { label: 'Added · Gold', title: '$150 back at Function Health', text: 'Spend $799. You already showed some Function Health spend, so this may fit naturally.', action: 'Only pursue planned care', fit: 'Medium fit' },
  { label: 'Added · Platinum', title: '$40 back on Airbnb', text: 'Spend $80 or more. Useful if an eligible stay is already planned.', action: 'Use Platinum at checkout', fit: 'High fit' },
  { label: 'Available · Amazon', title: 'Pay with Points promotion', text: 'Relevant to your Amazon spend, but the implied point value is only about 1.08¢.', action: 'Use only for the discount', fit: 'Low value' },
  { label: 'Skip duplicate', title: 'Annual Uber One credit', text: 'Platinum already earned the annual credit. Avoid a second overlapping membership benefit on Gold.', action: 'Keep one membership', fit: 'Skip' },
];
