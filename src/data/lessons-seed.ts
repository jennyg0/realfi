import type { Lesson } from '@/types/lessons';

export const LESSONS: Lesson[] = [
  {
    slug: 'stock-market-investing',
    title: 'Stock Market Investing',
    emoji: '🧠',
    summary: 'Learn what the stock market actually is, what you\'re buying, and how investors make money over time.',
    order: 1,
    xpReward: 100,
    sections: [
      {
        title: 'What the stock market actually is',
        content: `The stock market is like a giant marketplace — but instead of buying clothes or coffee, people buy and sell tiny pieces of companies called stocks. The market connects investors who want to buy and sell those shares every day.

Companies use this system to raise money, and investors use it to grow theirs. When you own a stock, you're literally a part-owner of that company. Prices go up and down every day based on what people think a company is worth, but over time, the market as a whole has historically grown — which is why investing consistently is so powerful.`,
      },
      {
        title: 'What you\'re buying',
        content: `Owning a stock means owning a share — a small fraction — of a company's total value.

When you invest in the stock market, there are two main ways to buy in: individual stocks and ETFs (exchange-traded funds).

**Individual stocks** mean you're buying shares of one company — like Apple or Shopify. If that company performs well, your investment can grow quickly. But if it struggles, your money can drop just as fast. It's higher risk, higher reward.

**ETFs** are bundles of many different stocks (sometimes hundreds) packaged into one investment. Instead of betting on one company, you're buying a piece of many — like owning a slice of the whole market. ETFs tend to grow steadily, with less volatility, making them a more stress-free choice for beginners.`,
      },
      {
        title: 'Why prices move',
        content: `Stock prices don't just change because a company made more money this quarter. They move because of expectations — what people believe will happen next. If investors think a company's future looks bright, demand for the stock rises, and so does the price. If confidence drops, prices can fall fast. That's why short-term movements can feel emotional — but zoom out, and you'll see that time rewards consistency over reaction.

Here's the good news for you: history shows that the stock market as a whole trends upward. Over the last century, the average long-term return of the stock market has been around 7–10% per year after inflation. That means even with occasional downturns, consistent investors typically see growth over time.`,
      },
      {
        title: 'How investors make money',
        content: `Most of your returns (the money you gain) will come from your investments growing in value — known as capital gains. For example, if you buy a stock at $100 and it rises to $130, you've earned a $30 gain.

Some companies also pay dividends, which are small cash payouts given to shareholders from the company's profits. Dividends typically range between 1% and 5% per year depending on the company. So while your main wealth comes from growth, dividends add steady income along the way — especially as your portfolio grows larger.`,
      },
      {
        title: 'What beginners should remember',
        content: `You don't have to be a stock-picking genius to invest. In fact, most successful investors simply buy broad funds that include many companies and hold them long-term. Small, steady investments can compound into something incredible over years.

Imagine you start investing $500 per month at age 30, earning a 7% average annual return. By age 60, that money could grow to over $610,000 — even though you only contributed $180,000 total. The rest comes from your money earning money over time.

The earlier you start, the harder your investments work for you. That's why experts say **time in the market beats timing the market**. You don't need to predict every move — you just need to keep showing up.`,
      },
    ],
    questions: [
      {
        question: 'What does owning a stock actually mean?',
        options: [
          'You loan money to a company',
          'You own a small piece of the company',
          'You are guaranteed profit',
          'You control the company\'s decisions',
        ],
        correctAnswerIndex: 1,
        explanation: 'When you buy stock, you become a part-owner (shareholder) of that company, even if it\'s just a tiny fraction.',
        order: 1,
      },
      {
        question: 'Which of the following is not a way investors typically make money from stocks?',
        options: [
          'Capital gains (selling at a higher price)',
          'Dividends (profit sharing)',
          'Guaranteed interest like a savings account',
          'Growth over time through reinvestment',
        ],
        correctAnswerIndex: 2,
        explanation: 'Stocks don\'t offer guaranteed interest like savings accounts. Returns come from growth (capital gains) and dividends, but they fluctuate.',
        order: 2,
      },
      {
        question: 'Why do stock prices move up and down so often?',
        options: [
          'Because of supply, demand, and investor expectations',
          'Because companies constantly change their share count',
          'Because the government adjusts them',
          'Because of inflation alone',
        ],
        correctAnswerIndex: 0,
        explanation: 'Stock prices reflect what investors believe a company will be worth in the future, driven by supply, demand, and expectations.',
        order: 3,
      },
      {
        question: 'What\'s the best strategy for most beginners?',
        options: [
          'Buying and selling daily to catch trends',
          'Investing consistently and holding long-term',
          'Only investing when the market looks "safe"',
          'Waiting until you can invest thousands at once',
        ],
        correctAnswerIndex: 1,
        explanation: 'Time in the market beats timing the market. Consistent, long-term investing tends to deliver better results than trying to time purchases.',
        order: 4,
      },
    ],
  },
  {
    slug: 'high-interest-savings',
    title: 'High-Interest Savings Accounts (HISA)',
    emoji: '💰',
    summary: 'Discover how HISAs work, why they\'re safe, and when to use them for your short-term savings goals.',
    order: 2,
    xpReward: 100,
    sections: [
      {
        title: 'What a HISA actually is',
        content: `A High-Interest Savings Account (HISA) is a safe, low-risk place to store your short-term money while still earning a bit of growth. It works just like a regular savings account, but pays you a higher interest rate — often between 2–4% per year.

You can withdraw money anytime, and your balance won't fluctuate. It's not investing — it's simply a smarter way to let your unused cash earn a little extra while it waits for its next purpose.`,
      },
      {
        title: 'How it works',
        content: `A common hesitation when putting your money in a HISA for the first time is wondering if there's any risk of losing your money or seeing it drop, but a HISA balance never dips below what you put in.

So, how can a bank afford to pay you interest? Banks use the money you deposit to fund loans and mortgages. The bank earns interest from borrowers, then shares a small portion of that profit with you through your HISA interest rate. That's why your money isn't just sitting idle — it's helping the bank operate, while you safely earn a return for letting them use it.

And to ease your mind even more, most accounts are protected by deposit insurance.`,
      },
      {
        title: 'HISA vs Investing',
        content: `Think of it like this: investing is about growing your future wealth, while a HISA is about protecting and optimizing your current cash.

Investing is about long-term growth with ups and downs along the way. A HISA is about stability — a guaranteed, predictable return. When you invest, your balance can rise or fall depending on the market. When you save in a HISA, your balance only moves in one direction: up.

A HISA is not meant to make you rich — it's meant to earn you a little extra risk-free on the money that can't be invested right now.`,
      },
      {
        title: 'What type of money belongs in a HISA',
        content: `A HISA is ideal for short-term goals and emergency savings — money you may need in the next one to three years. That could mean your vacation fund, next car purchase, a home down payment, or your emergency fund stash.

If you can't afford to risk it in the market or might need it quickly, it belongs in your HISA. Many people also use it as a holding spot for "cash in wait" — money they plan to invest soon but haven't yet decided where. It's your financial pause button: earning while it waits. A lot of HISA banks have now added more and more features, so some people keep all of their day-to-day cash in them too!`,
      },
      {
        title: 'How to get the most out of a HISA',
        content: `To make your HISA work for you, treat it like a living goal tracker.

**Nickname your accounts:** Label them clearly — "Emergency Fund," "Next Trip," or "New Apartment."

**Set goal amounts:** Decide how much you want to save and use the built-in progress bars many banks now offer to keep you motivated.

**Automate it:** Set up automatic transfers from your main account so money moves into your HISA before you even think about spending it.

**Celebrate milestones:** Watching your balance grow, even slowly, builds momentum. Small consistent deposits often do more than one-time lump sums.

The more you personalize and automate your HISA, the easier it becomes to stay consistent — and consistency is what actually builds savings.`,
      },
    ],
    questions: [
      {
        question: 'What\'s the main purpose of a HISA?',
        options: [
          'To safely earn interest on short-term savings',
          'To invest in company stocks',
          'To make guaranteed high profits',
          'To replace your chequing account',
        ],
        correctAnswerIndex: 0,
        explanation: 'A HISA is designed to earn interest on money you need in the short term, while keeping it safe and accessible.',
        order: 1,
      },
      {
        question: 'Why is a HISA considered low-risk?',
        options: [
          'Because the government controls its rate',
          'Because deposits are insured and not tied to the stock market',
          'Because banks promise high returns',
          'Because you can\'t withdraw your money',
        ],
        correctAnswerIndex: 1,
        explanation: 'HISAs are protected by deposit insurance and your balance doesn\'t fluctuate with markets, making them very low risk.',
        order: 2,
      },
      {
        question: 'What\'s the biggest difference between a HISA and investing?',
        options: [
          'A HISA is stable and predictable; investing can go up or down',
          'A HISA earns more than stocks',
          'A HISA is only for retirement savings',
          'Investing is risk-free when done online',
        ],
        correctAnswerIndex: 0,
        explanation: 'The key difference is stability: HISAs give predictable returns, while investments can fluctuate but offer higher growth potential.',
        order: 3,
      },
      {
        question: 'Which type of money should not go in a HISA?',
        options: [
          'Emergency savings',
          'Short-term goals',
          'Long-term investment money',
          'Vacation fund',
        ],
        correctAnswerIndex: 2,
        explanation: 'Money for long-term goals (5+ years) belongs in investments where it can grow more, not in a HISA with lower returns.',
        order: 4,
      },
    ],
  },
  {
    slug: 'investing-101',
    title: 'Investing 101',
    emoji: '💸',
    summary: 'Explore different types of investing — stocks, real estate, crypto, and businesses — and learn how to build a diversified approach.',
    order: 3,
    xpReward: 150,
    sections: [
      {
        title: 'What investing actually means',
        content: `Investing is how you turn your money into more money over time. Instead of sitting still in a savings account, your money is used to buy or fund assets that can grow in value or generate income — like stocks, real estate, or even your own business.

Every investment comes with some level of risk, but also the opportunity for your money to work harder than it can in a regular savings account. The goal isn't to gamble — it's to build wealth intentionally through growth and time.`,
      },
      {
        title: 'The stock market',
        content: `When most people think of investing, they think of the stock market. This is where you buy small pieces of companies — either as individual stocks or through ETFs and mutual funds that bundle many companies together.

Stocks can grow significantly over time but can also fluctuate daily. Historically, the stock market has returned around 7–10% per year on average, which makes it a powerful long-term wealth builder. It's accessible, easy to automate, and ideal for long-term goals like retirement or financial independence.`,
      },
      {
        title: 'Real estate',
        content: `Real estate investing means owning property that grows in value or generates income — like renting out a home, buying a vacation rental, or flipping houses. It's a tangible asset you can see and use, which makes it appealing to many people.

The benefits: steady appreciation, potential rental income, and tax advantages. The trade-off: it requires more capital upfront and comes with ongoing responsibilities like maintenance and management. For many, real estate complements stock market investing rather than replacing it.`,
      },
      {
        title: 'Cryptocurrency',
        content: `Cryptocurrency (like Bitcoin or Ethereum) is a digital form of investing. Instead of buying shares in companies, you're buying tokens that represent decentralized digital assets. Some people see crypto as "digital gold" — an alternative to traditional finance — while others use it for speculation or diversification.

The upside: it can grow fast. The downside: it can also drop fast. Crypto investing carries high risk and high volatility, so it's usually best as a small, experimental part of a broader portfolio — not the foundation.`,
      },
      {
        title: 'Businesses and angel investing',
        content: `Owning or investing in businesses is one of the most direct ways to build wealth. This could mean starting your own business, becoming a partner in someone else's, or investing early in startups (known as angel investing). The potential returns can be huge — but so can the risks, since most new businesses fail.

Still, this is how many people build significant wealth: by owning assets that create value, not just trading them. Even small side businesses can generate "extra income streams" that grow your financial freedom.`,
      },
      {
        title: 'The bottom line',
        content: `There's no single "right" way to invest — every type has its own pros, cons, and time horizons. The key is to build a mix that fits your goals and comfort level.

The best investors aren't just picking what's trendy — they're aligning their investments with their values, goals, and timelines.`,
      },
    ],
    questions: [
      {
        question: 'What\'s the main purpose of investing?',
        options: [
          'To grow your money over time by owning or funding assets',
          'To store money safely for short-term use',
          'To eliminate all financial risk',
          'To make fast profits',
        ],
        correctAnswerIndex: 0,
        explanation: 'Investing is about growing wealth over time by putting your money into assets that can appreciate or generate income.',
        order: 1,
      },
      {
        question: 'What\'s the average long-term return of the stock market?',
        options: [
          'Around 2–3% per year',
          'Around 7–10% per year',
          'Around 15–20% per year',
          'It doesn\'t grow on average',
        ],
        correctAnswerIndex: 1,
        explanation: 'Historically, the stock market has averaged 7–10% annual returns over the long term, though individual years vary widely.',
        order: 2,
      },
      {
        question: 'What\'s a key advantage of real estate investing?',
        options: [
          'It can appreciate in value and provide ongoing income',
          'It\'s completely risk-free',
          'It requires little to no upfront money',
          'It guarantees quick profits',
        ],
        correctAnswerIndex: 0,
        explanation: 'Real estate can grow in value over time (appreciation) and generate rental income, though it requires capital and management.',
        order: 3,
      },
      {
        question: 'What\'s one major characteristic of cryptocurrency investing?',
        options: [
          'It\'s stable and low-risk',
          'It\'s highly volatile and can rise or fall quickly',
          'It\'s insured by banks',
          'It pays guaranteed interest',
        ],
        correctAnswerIndex: 1,
        explanation: 'Crypto is known for high volatility — prices can swing dramatically in short periods, making it a high-risk investment.',
        order: 4,
      },
      {
        question: 'What does "angel investing" mean?',
        options: [
          'Investing early in startups or small businesses',
          'Buying stocks through a broker',
          'Donating to charity',
          'Investing in real estate syndicates',
        ],
        correctAnswerIndex: 0,
        explanation: 'Angel investing means providing early-stage funding to startups, often in exchange for equity. It\'s high risk but can have high rewards.',
        order: 5,
      },
      {
        question: 'What\'s the smartest overall investing strategy?',
        options: [
          'Pick one type and go all-in',
          'Diversify across different investment types based on your goals',
          'Only invest when markets are down',
          'Avoid investing altogether to stay safe',
        ],
        correctAnswerIndex: 1,
        explanation: 'Diversification across different asset types helps balance risk and return based on your personal goals and timeline.',
        order: 6,
      },
    ],
  },
  {
    slug: 'financial-freedom-number',
    title: 'Financial Freedom Number',
    emoji: '🔥',
    summary: 'Calculate your FIRE number, understand the 4% rule, and learn how to work toward financial independence.',
    order: 4,
    xpReward: 150,
    sections: [
      {
        title: 'What your FIRE number is (and why it matters)',
        content: `Your FIRE number represents the amount of money or investments you'd need to have to live off your portfolio — so work becomes a choice, not a requirement.

FIRE stands for Financial Independence, Retire Early, but it's really about freedom: the point where your investments generate enough income to cover your lifestyle. Once you know your number, you can start reverse-engineering your plan to reach it — one intentional decision at a time.`,
      },
      {
        title: 'How to calculate your FIRE number',
        content: `The classic formula is simple:

**FIRE Number = Annual Spending × 25**

That's based on the "4% rule," which assumes you can safely withdraw 4% of your investments per year without running out of money.

**Example:** If you spend $60,000 per year, you'd need $60,000 × 25 = $1.5 million invested.

This assumes your money continues to grow through investments while you withdraw small amounts annually. It's not an exact science, but it's a strong starting point to understand what financial freedom could look like for you.`,
      },
      {
        title: 'What the 4% rule actually means',
        content: `The 4% rule comes from research on how much you can withdraw from a diversified portfolio each year without depleting it. In theory, if your investments earn around 7% annually and you withdraw 4%, the remaining 3% keeps your money growing ahead of inflation.

But it's flexible — if the market dips or your lifestyle changes, you can adjust. Some people plan for 3.5% to be conservative, others for 5% if they expect part-time income or lower costs later. It's not about perfection — it's about direction.`,
      },
      {
        title: 'How to personalize your FIRE number',
        content: `Your number isn't just about math — it's about your life design. If you want to travel often, live in a high-cost city, or support family, your FIRE number will be higher. If your dream life is slower-paced, low-cost, or partly funded by side projects, it can be lower.

Here's how to personalize it:
1. Track your actual spending for a few months
2. Decide what "enough" looks like for you
3. Multiply that by 25 for a general goal — or 20–30x to see a range

Remember, the goal isn't just retiring early — it's creating a life where money gives you options.`,
      },
      {
        title: 'How to start working toward it',
        content: `Once you know your FIRE number, you can break it down into smaller milestones:

**Step 1:** Build your emergency fund and pay off high-interest debt.
**Step 2:** Start investing consistently — even small amounts.
**Step 3:** Increase your income over time to save and invest more.
**Step 4:** Track your net worth and progress yearly to stay motivated.

Financial independence doesn't happen overnight — but it does happen for people who stay consistent. Every dollar you save or invest moves you closer to freedom.`,
      },
    ],
    questions: [
      {
        question: 'What does FIRE stand for?',
        options: [
          'Financial Investing Retirement Equity',
          'Financial Independence, Retire Early',
          'Financial Income Return Evaluation',
          'Future Investment Retirement Earnings',
        ],
        correctAnswerIndex: 1,
        explanation: 'FIRE stands for Financial Independence, Retire Early — a movement focused on achieving financial freedom through saving and investing.',
        order: 1,
      },
      {
        question: 'What\'s the basic formula for calculating your FIRE number?',
        options: [
          'Monthly Spending × 12',
          'Annual Spending ÷ 4',
          'Annual Spending × 25',
          'Monthly Income × 25',
        ],
        correctAnswerIndex: 2,
        explanation: 'The FIRE number formula is Annual Spending × 25, based on the 4% withdrawal rule.',
        order: 2,
      },
      {
        question: 'What does the 4% rule represent?',
        options: [
          'How much interest your bank pays you',
          'The percent you can withdraw each year from your portfolio sustainably',
          'The maximum amount you should invest in stocks',
          'A government retirement guideline',
        ],
        correctAnswerIndex: 1,
        explanation: 'The 4% rule suggests you can withdraw 4% of your investment portfolio annually without running out of money over a 30-year retirement.',
        order: 3,
      },
      {
        question: 'If you spend $80,000 per year, what\'s your approximate FIRE number?',
        options: [
          '$800,000',
          '$2 million',
          '$3.5 million',
          '$1 million',
        ],
        correctAnswerIndex: 1,
        explanation: '$80,000 × 25 = $2,000,000. This is the amount you\'d need invested to withdraw $80,000 annually using the 4% rule.',
        order: 4,
      },
      {
        question: 'What\'s the real goal of knowing your FIRE number?',
        options: [
          'To retire as soon as possible',
          'To design a life where money gives you freedom and choice',
          'To compete with others\' net worth',
          'To avoid working altogether',
        ],
        correctAnswerIndex: 1,
        explanation: 'The FIRE number is about creating financial freedom and options, not necessarily about never working — it\'s about making work optional.',
        order: 5,
      },
    ],
  },
];
