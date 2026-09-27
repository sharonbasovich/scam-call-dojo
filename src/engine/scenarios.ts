import type { Scenario } from './types';

// Every organisation, person and number below is fictional. 555-01xx numbers are reserved for fiction.
export const SCENARIOS: Scenario[] = [
  {
    id: 'bank',
    title: 'The Frozen Account',
    belt: 'white',
    callerName: 'Northmark Bank Fraud Dept.',
    callerNumber: '+1 (555) 010-0142',
    avatar: 'NB',
    blurb: 'Your “bank” spotted a suspicious charge and needs one tiny code.',
    voice: { pitch: 0.9, rate: 1.05, deapiVoice: 'am_onyx' },
    turns: [
      { line: 'Hi, this is Daniel from the Northmark Bank fraud department. We flagged a charge of $849 at an electronics store. Did you make that purchase?' },
      {
        line: 'I thought not. I can see the card ending in 0000 is at risk. To stop the charge, I need to verify you. We just sent a six-digit verification code to your phone. Can you read it back to me?',
        pushback: 'I understand you are careful, that is good. But this charge goes through in the next 10 minutes. We just sent a six-digit verification code. Read it to me and I cancel it right now.',
      },
      {
        line: 'The system is showing the code expired. Your account will be frozen permanently unless we move your balance to a safe account today. Stay on the line, and do not call the branch, they cannot see this case.',
        exploit: 'Thank you. The charge is blocked. Last step: to keep your money safe, we move your balance into a secure holding account. Stay on the line and do not call the branch, they cannot see this case.',
      },
      { line: 'Your case number is 5-5-5. I am trying to help you here. Should I read you the safe account details now?' },
    ],
    giveUp: 'Fine. If your money disappears, that is on you.',
    win: 'Perfect. Transfer is set up. Have a great day.',
    tell: 'A bank will never ask you to read back a code it just texted you, or move money to a “safe account”.',
    safeScript: '“I don’t give out codes on incoming calls. I’ll hang up and call the number on the back of my card.”',
    quickReplies: {
      risky: ['Yes, what do you need?', 'Okay, the code is 4 8 1 5 1 6', 'I’ll stay on the line.'],
      safe: ['I’ll call the number on the back of my card.', 'I don’t share codes. Goodbye.'],
    },
  },
  {
    id: 'internship',
    title: 'The Dream Internship',
    belt: 'yellow',
    callerName: 'Pineview Labs Hiring Team',
    callerNumber: '+1 (555) 010-0177',
    avatar: 'PL',
    blurb: 'A remote internship, no interview, $45/hour. Just one small starter fee.',
    voice: { pitch: 1.15, rate: 1.1, deapiVoice: 'af_nova' },
    turns: [
      { line: 'Hi! It’s Priya from the Pineview Labs hiring team. Congratulations, you have been selected for our remote software internship. $45 an hour, fully remote, no interview needed!' },
      {
        line: 'We just need to ship your work laptop. There’s a small refundable equipment fee of $300 for the starter kit, and you get it back on your first paycheque.',
        pushback: 'I get it, lots of fake offers out there! But we have 40 candidates waiting, so I need your answer in the next 30 minutes or the spot goes to someone else. There’s just a small refundable equipment fee of $300.',
      },
      {
        line: 'Since you’re a student, you can pay with gift cards from any store. Scratch the back and read me the numbers. Please don’t mention the fee to your school career office, it confuses their system.',
        exploit: 'Amazing! The fastest way is gift cards from any store. Scratch the back and read me the numbers. And please don’t mention the fee to your career office, it confuses their system.',
      },
      { line: 'I also need your full name, date of birth and a photo of your ID for payroll. Can you send those right now?' },
    ],
    giveUp: 'Okay, your loss. This offer expires today.',
    win: 'You’re all set! Welcome to the team. The laptop ships… eventually.',
    tell: 'Real employers pay you. They never charge a fee, and never take gift cards.',
    safeScript: '“Please email the offer from your company domain. I’ll check it with my career centre before paying anything.”',
    quickReplies: {
      risky: ['Oh wow, yes! What do I need to do?', 'Okay, I’ll buy the gift cards.', 'I won’t tell the career office.'],
      safe: ['I’ll check with my career centre first.', 'Employers don’t charge fees. This is a scam. Bye.'],
    },
  },
  {
    id: 'boss',
    title: 'The Boss in a Meeting',
    belt: 'orange',
    callerName: 'Dana (Manager)',
    callerNumber: '+1 (555) 010-0123',
    avatar: 'D',
    blurb: 'Your part-time job manager needs a quiet favour before a client meeting.',
    voice: { pitch: 1.0, rate: 1.15, deapiVoice: 'af_sky' },
    turns: [
      { line: 'Hey, it’s Dana. I’m on a new number, my phone died. Quick favour, I’m about to walk into a client meeting. Are you free for two minutes?' },
      {
        line: 'I need you to grab four $100 gift cards for client thank-you gifts. The company will reimburse you by end of day. Can you do it right now?',
        pushback: 'Come on, it’s me. I’m slammed and I need this in the next 20 minutes. Don’t you trust me? Just grab four $100 gift cards and I’ll reimburse you by end of day.',
      },
      {
        line: 'Keep this between us, it’s a surprise for the team. Don’t call the office line, I’m in the meeting. Just scratch the backs and text me the codes.',
        exploit: 'You’re a lifesaver. Keep this between us, it’s a surprise. Don’t call the office line. Just scratch the backs and send me the codes.',
      },
      { line: 'Actually, can you make it eight cards? I’ll owe you big time.' },
    ],
    giveUp: 'Wow. Okay. I’ll remember this.',
    win: 'Got them, thanks! Talk soon.',
    tell: 'A “new number” plus gift cards plus “keep it quiet” is the classic boss scam.',
    safeScript: '“I’ll call you back on the number I already have for you, and check with the office.”',
    quickReplies: {
      risky: ['Sure, what do you need?', 'Okay, I’ll get the gift cards.', 'I’ll keep it quiet.'],
      safe: ['I’ll call you back on your old number.', 'I’ll check with the office first. Bye.'],
    },
  },
  {
    id: 'parcel',
    title: 'The Stuck Parcel',
    belt: 'green',
    callerName: 'SwiftParcel Dispatch',
    callerNumber: '+1 (555) 010-0188',
    avatar: 'SP',
    blurb: 'Your package is held at customs. A tiny fee and one app gets it moving.',
    voice: { pitch: 0.95, rate: 1.0, deapiVoice: 'bm_fable' },
    turns: [
      { line: 'Hello, this is SwiftParcel dispatch. We have a package in your name held at the depot. Our records show an unpaid customs fee of $2.99.' },
      {
        line: 'If the fee is not paid within 2 hours, the parcel is returned to sender. I will text you a link. Please confirm your home address and card number so I can release it.',
        pushback: 'It is just $2.99, but the parcel expires in 2 hours and is then returned. Please confirm your home address and card number and we are done.',
      },
      {
        line: 'Our payment page is down, so please download the QuickHelp app so I can guide you through the screen share. It takes one minute.',
        exploit: 'The card was declined by our system. Please download the QuickHelp app so I can guide you through screen share. One minute.',
      },
      { line: 'Once you are connected, open your banking app and I will do the rest. Do not hang up, or the release is cancelled.' },
    ],
    giveUp: 'Parcel returned to sender. Goodbye.',
    win: 'Screen share connected. Thank you, I can see everything now.',
    tell: 'Couriers do not phone for card numbers or ask you to install screen-sharing apps.',
    safeScript: '“I’ll check the tracking number myself on the courier’s official website.”',
    quickReplies: {
      risky: ['Okay, how do I pay?', 'Sure, I’ll download the app.', 'My address is 123 Fake Street.'],
      safe: ['I’ll check tracking on the official website.', 'I didn’t order anything. Goodbye.'],
    },
  },
  {
    id: 'crypto',
    title: 'The Recovery Agent',
    belt: 'blue',
    callerName: 'CoinHaven Recovery Unit',
    callerNumber: '+1 (555) 010-0199',
    avatar: 'CH',
    blurb: 'They found the crypto you lost. They just need a release fee… in crypto.',
    voice: { pitch: 0.85, rate: 0.95, deapiVoice: 'am_echo' },
    turns: [
      { line: 'Good afternoon. I’m Agent Cole with the CoinHaven recovery unit, badge number 4471. We traced funds stolen from an exchange, and your wallet is on our list.' },
      {
        line: 'Good news, we can recover 100% of the funds, guaranteed. There is a one-time release fee, paid in Bitcoin to our wallet address, and the money is back in your account within the hour.',
        pushback: 'I understand the doubt, many victims feel that way. But this recovery window closes today and the funds are permanently lost after that. The release fee is paid in Bitcoin to our wallet address.',
      },
      {
        line: 'To match you to the funds, I need your wallet recovery phrase. It’s confidential, don’t share this call with anyone, it could compromise the investigation.',
        exploit: 'Excellent. To match you to the funds, I also need your wallet recovery phrase. It’s confidential, don’t share this call with anyone.',
      },
      { line: 'I’m trying to help you get your money back. Are you ready to send the fee now?' },
    ],
    giveUp: 'Then the funds are gone. Your choice.',
    win: 'Fee received. Your case is… processing.',
    tell: 'Recovery services that charge up-front fees in crypto are a second scam aimed at past victims.',
    safeScript: '“I’ll report this through my exchange’s official support and the police, not through you.”',
    quickReplies: {
      risky: ['Really? How do I pay the fee?', 'Okay, I’ll send the Bitcoin.', 'I won’t tell anyone.'],
      safe: ['I’ll contact my exchange through the official app.', 'Recovery fees are a scam. Goodbye.'],
    },
  },
  {
    id: 'grandparent',
    title: 'The Family Emergency',
    belt: 'black',
    callerName: 'Unknown',
    callerNumber: '+1 (555) 010-0111',
    avatar: '?',
    blurb: 'Crying voice, a car accident, bail money. The hardest call to hang up on.',
    voice: { pitch: 1.2, rate: 1.2, deapiVoice: 'af_alloy' },
    turns: [
      { line: 'Hey… it’s me. Please don’t freak out. I was in a car accident and I’m kind of in trouble. Please help, I’m really scared.' },
      {
        line: 'The police say I need $2,000 for bail or I stay in jail tonight. My lawyer, Mr. Hale, can take it by wire transfer or gift cards. Can you help me right now?',
        pushback: 'Please, I don’t have time, they only gave me one call. I need the money within the hour. You can use a wire transfer or gift cards. Please help.',
      },
      {
        line: 'And please, please don’t tell Mom and Dad. I’m so embarrassed. Just keep this between us, okay?',
        exploit: 'Thank you, thank you. And please don’t tell Mom and Dad, keep this between us. My lawyer will call you with the details.',
      },
      { line: 'This is Mr. Hale, the lawyer. I’m an officer of the court. Please confirm your full name and home address so I can arrange a courier for the cash.' },
    ],
    giveUp: '…fine. *click*',
    win: 'A courier will be there in 30 minutes. Thank you.',
    tell: 'A panicked “it’s me” with secrecy and bail money is the grandparent scam. Voices can be faked; family can always be called back.',
    safeScript: '“I love you. I’m hanging up to call you, and your parents, on the numbers I have.”',
    quickReplies: {
      risky: ['Oh no! What do you need?', 'Okay, I’ll send the money.', 'I won’t tell your parents.'],
      safe: ['I’m going to call you back on your usual number.', 'I’ll check with your parents first. Bye.'],
    },
  },
];

export function getScenario(id: string): Scenario {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown scenario: ${id}`);
  return s;
}
