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

export const benefits = [
  { timing: 'By Aug 31', title: 'Gold dining credit', amount: '$10', text: 'Use at an eligible partner before the monthly credit resets.', tone: 'gold', status: 'Use next' },
  { timing: 'By Aug 31', title: 'Digital entertainment', amount: '$10', text: 'About $10 remained available for August at review time.', tone: 'platinum', status: 'Use next' },
  { timing: 'By Sep 30', title: 'Resy + lululemon', amount: '$134', text: '$100 quarterly Resy credit plus about $34 at lululemon.', tone: 'platinum', status: 'Upcoming' },
  { timing: 'By Dec 31', title: 'Gold Resy credit', amount: '$50', text: 'Second-half dining credit at participating Resy restaurants.', tone: 'gold', status: 'Upcoming' },
  { timing: 'By Dec 31', title: 'Hotel + airline', amount: '$500', text: '$300 prepaid hotel credit plus $200 airline incidental credit.', tone: 'platinum', status: 'Upcoming' },
  { timing: 'At renewal', title: 'CLEAR+ renewal', amount: 'Covered', text: 'Already active. Keep Platinum as the payment card when it renews.', tone: 'clear', status: 'On autopilot' },
  { timing: 'Personal preference', title: 'Dunkin’ credit', amount: '$0 value', text: 'Not part of your routine. Ignore it instead of manufacturing spend.', tone: 'muted', status: 'Skip' },
];

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
