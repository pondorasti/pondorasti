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

export const benefits = [
  { card: 'Gold', timing: 'Aug 31', title: 'Dining credit', used: usedBenefitCredit('AMEX Dining Credit'), available: 10, leftLabel: '$10', text: 'Use the remaining monthly credit at an eligible dining partner.', tone: 'gold', status: 'Use next' },
  { card: 'Platinum', timing: 'Aug 31', title: 'Digital entertainment credit', used: usedBenefitCredit('Platinum Digital Entertainment Credit'), available: 10, leftLabel: '$10', text: 'About $10 remained in the current monthly benefit at review time.', tone: 'platinum', status: 'Use next' },
  { card: 'Platinum', timing: 'Sep 30', title: 'Resy credit', used: usedBenefitCredit('Platinum Resy Credit'), available: 100, leftLabel: '$100', text: 'The current quarterly Resy benefit remains available.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Sep 30', title: 'lululemon credit', used: usedBenefitCredit('Platinum Lululemon Credit'), available: 34, leftLabel: '$34', text: 'About $34 remains in the current quarterly benefit.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Gold', timing: 'Dec 31', title: 'Resy credit', used: usedBenefitCredit('Gold Resy Credit'), available: 50, leftLabel: '$50', text: 'The second-half Resy benefit remains available.', tone: 'gold', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Dec 31', title: 'Hotel credit', used: usedBenefitCredit('Platinum Hotel Credit'), available: 300, leftLabel: '$300', text: 'Use the current half-year credit on an eligible prepaid Amex Travel hotel.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Dec 31', title: 'Airline fee credit', used: usedBenefitCredit('Platinum Airline Fee Credit'), available: 200, leftLabel: '$200', text: 'Incidental-fee credit remains available with your selected airline.', tone: 'platinum', status: 'Upcoming' },
  { card: 'Platinum', timing: 'Used YTD', title: 'Uber One credit', used: usedBenefitCredit('Platinum Uber One Credit'), available: 0, leftLabel: '$0', text: 'The annual membership credit has already posted.', tone: 'platinum', status: 'Used' },
  { card: 'Platinum', timing: 'At renewal', title: 'CLEAR+', used: usedBenefitCredit('CLEAR'), available: 219, leftLabel: '$219', text: 'Your active membership is set to renew on Platinum.', tone: 'clear', status: 'Scheduled' },
  { card: 'Gold', timing: 'Personal choice', title: 'Dunkin’ credit', used: usedBenefitCredit('Dunkin'), available: 0, leftLabel: '$0 value', text: 'Not part of your routine, so it carries no personal value here.', tone: 'muted', status: 'Skip' },
];

export const benefitValueCaptured = benefits.reduce((sum, benefit) => sum + benefit.used, 0);
export const benefitValueAvailable = benefits.reduce((sum, benefit) => sum + benefit.available, 0);

export const enrollments = [
  ['Hilton Honors Gold', 'Platinum'],
  ["Hertz President’s Circle", 'Platinum'],
  ['Hertz Five Star', 'Gold'],
  ['Leaders Club Sterling', 'Optional'],
];

export const offers = [
  { label: 'Available · Platinum', title: '$200 back on Lufthansa', text: 'Spend $1,000 through Amex Travel. Your YTD Lufthansa activity was close to the threshold.', action: 'Check before the next booking', fit: 'High fit' },
  { label: 'Added · Gold', title: '$150 back at Function Health', text: 'Spend $799. You already showed some Function Health spend, so this may fit naturally.', action: 'Only pursue planned care', fit: 'Medium fit' },
  { label: 'Added · Platinum', title: '$40 back on Airbnb', text: 'Spend $80 or more. Useful if an eligible stay is already planned.', action: 'Use Platinum at checkout', fit: 'High fit' },
  { label: 'Available · Amazon', title: 'Pay with Points promotion', text: 'Relevant to your Amazon spend, but the implied point value is only about 1.08¢.', action: 'Use only for the discount', fit: 'Low value' },
  { label: 'Skip duplicate', title: 'Annual Uber One credit', text: 'Platinum already earned the annual credit. Avoid a second overlapping membership benefit on Gold.', action: 'Keep one membership', fit: 'Skip' },
];
