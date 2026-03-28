export interface Quote {
    text: string;
    author: string;
}

export const quotes: Quote[] = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Excellence is not a skill, it's an attitude.", author: "Ralph Marston" },
    { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
    { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
    { text: "Small progress is still progress.", author: "Unknown" },
    { text: "Work hard in silence, let success make the noise.", author: "Frank Ocean" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream bigger. Do bigger.", author: "Unknown" },
    { text: "Little things make big days.", author: "Unknown" },
    { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
    { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
    { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
    { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
    { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
    { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
    { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
    { text: "There are no shortcuts to any place worth going.", author: "Beverly Sills" },
    { text: "If you genuinely want something, don't wait for it — teach yourself to be impatient.", author: "Gurbaksh Chahal" },
    { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "The secret to getting ahead is getting started.", author: "Agatha Christie" },
    { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
    { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
    { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Perseverance is not a long race; it is many short races one after the other.", author: "Walter Elliot" },
    { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "If you can dream it, you can achieve it.", author: "Zig Ziglar" },
    { text: "Don't limit your challenges. Challenge your limits.", author: "Jerry Dunn" },
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "Either you run the day, or the day runs you.", author: "Jim Rohn" },
    { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
    { text: "The secret of success is to do the common thing uncommonly well.", author: "John D. Rockefeller Jr." },
    { text: "I never dreamed about success. I worked for it.", author: "Estée Lauder" },
    { text: "Success is not how high you have climbed, but how you make a positive difference.", author: "Roy T. Bennett" },
    { text: "You have to fight through some bad days to earn the best days of your life.", author: "Unknown" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { text: "Do what you have to do until you can do what you want to do.", author: "Oprah Winfrey" },
    { text: "Rise up, start fresh, see the bright opportunity in each day.", author: "Unknown" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
    { text: "Be so good they can't ignore you.", author: "Steve Martin" },
    { text: "Your work is going to fill a large part of your life. Do great work.", author: "Steve Jobs" },
    { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
    { text: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker" },
    { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
    { text: "People who succeed have momentum. The more they succeed, the more they want to succeed.", author: "Tony Robbins" },
];

/** Returns the quote of the day — same quote for everyone on the same calendar day */
export function getQuoteOfTheDay(): Quote {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return quotes[dayOfYear % quotes.length];
}
