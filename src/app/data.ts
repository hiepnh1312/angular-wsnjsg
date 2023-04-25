import { User, STATUSES, Message } from './models';

export const RANDOM_MSGS = [
  'I don’t know. What do you think?',
  'Has that been your experience too?',
  'Has that ever happened to you?',
  'Why do you think that is (the case)?',
  'Is that a good thing or a bad thing?',
  'Okay, I’m totally changing the topic now, but I was wondering …',
  'Not to go off topic, but I recently heard that …',
  'That reminds me …',
  'Oh hey. Did you hear that …',
  'Speaking of [horses], I found out that …',
  'I’m not keeping you from something, am I?',
  'Sorry for taking up so much of your time. Do you need to take off?',
  'I just realised you’re probably in the middle of something. Do you have time to chat?',
  'Let me know if you need to get going. I don’t want to take up all your time.',
  'Well, if you ever want to chat again, I’m usually here [every Monday afternoon].',
  'Let me give you my email address. If you’re ever in the area again it’d be great to meet up.',
  'Feel free to call me if you want to hang out. Here, I’ll give you my number.',
  'I really enjoyed our chat. Thanks so much.',
  'It was really nice meeting you.',
  'I had a great time talking with you. Hope to see you again soon.',
  'Actually, that happened to me once. It was really [annoying].',
  'I totally agree. The same thing happened to me too.',
  'That’s pretty common. I heard that a lot of people had the same experience.',
  'Hey, I better get going. I have a long day tomorrow.',
  'Hey Guys. Sorry, but I have to run. It was great chatting with you all.',
  'Oh man, it’s getting late. I better head out.',
  'Alright guys. Time for me to go. Have a good one.',
  'Do you have a recommendation on any good dishes?',
  'What would you recommend for someone who hasn’t eaten here before?',
  'What is the best drink here?',
  'Do you know if the [chow mein] is any good?',
  'Have you ever had the [asparagus]?',
  'If you had to eat just one meal for the rest of your life, what would it be?',
  'What is your favourite dessert?',
  'What is your favourite spicy dish?” (They don’t like spicy? Great! Ask them why, and keep the conversation going.)',
];

export const TYPE_OF_MSG: any = ['replies', 'sent'];

export const getRandom = (items) =>
  items[Math.floor(Math.random() * items.length)];

export function generateMessage(length) {
  return Array.from({ length }).map(
    () => new Message(getRandom(TYPE_OF_MSG), getRandom(RANDOM_MSGS))
  );
}

export const MESSAGES = [];

export const USERS = [
  new User(
    'Louis Litt',
    STATUSES.BUSY,
    'http://emilcarlsson.se/assets/louislitt.png',
    generateMessage(10)
  ),
  new User(
    'Harvey Specter',
    STATUSES.ONLINE,
    'http://emilcarlsson.se/assets/harveyspecter.png',
    generateMessage(7)
  ),
  new User(
    'Aman Yadav',
    STATUSES.OFFLINE,
    'http://emilcarlsson.se/assets/rachelzane.png',
    generateMessage(6)
  ),
  new User(
    'Sharmila',
    STATUSES.BUSY,
    'http://emilcarlsson.se/assets/donnapaulsen.png',
    generateMessage(11)
  ),
  new User(
    'Harold Gunderson',
    STATUSES.OFFLINE,
    'http://emilcarlsson.se/assets/jessicapearson.png'
  ),
  new User(
    'Samu Raunela',
    STATUSES.BUSY,
    'http://emilcarlsson.se/assets/haroldgunderson.png',
    generateMessage(4)
  ),
];
