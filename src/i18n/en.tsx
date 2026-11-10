/** Interface texts in English. Same shape as es.tsx (type `Dict`). */
import type { ReactNode } from 'react';
import type { ParseWarning, Relation } from '../core/types';
import type { CardId } from '../lib/relations';
import type { Dict } from './es';

const rom = (r: Relation) => r === 'pareja' || r === 'ex' || r === 'ligue';

export const en: Dict = {
  meta: {
    title: 'Longsaw · What does your chat say?',
    description: 'Analyse your WhatsApp chat right in your browser and see what your relationship looks like in numbers.',
  },
  common: {
    privacy: 'Privacy',
    back: '← Back',
    githubAria: 'GitHub of iagoesteevezz (opens in a new tab)',
    toDark: 'Switch to dark mode',
    toLight: 'Switch to light mode',
    darkTitle: 'Dark mode',
    lightTitle: 'Light mode',
    switchLang: 'Cambiar a español',
    switchLangShort: 'ES',
    persons: ['Person A', 'Person B'],
    otherPerson: 'The other person',
    you: 'You',
    howData: 'How we handle your data',
    pct: (n: number) => `${n}%`,
  },
  errors: {
    GROUP: 'This looks like a group chat. For now we only analyse chats between two people.',
    NO_TXT_IN_ZIP: 'The .zip doesn’t contain the chat’s .txt file. Export it again from WhatsApp.',
    NOT_WHATSAPP: 'We don’t recognise this file as a WhatsApp chat. Export the chat from WhatsApp → More → Export chat.',
    EMPTY: 'The chat has no messages from people.',
    generic: 'Something went wrong reading the chat. Try exporting it again.',
  },
  warning: (w: ParseWarning): string => {
    switch (w.code) {
      case 'single': return 'Only one person has written in this chat: many comparisons won’t apply.';
      case 'orphans': return `${w.n} lines before the first message were ignored.`;
      case 'oddLines': return 'Some oddly formatted lines were treated as system notices.';
      case 'unordered': return 'Some dates are out of order; check the file isn’t mixed up.';
    }
  },
  relations: {
    amistad: 'Friend',
    pareja: 'Partner',
    ex: 'Ex',
    ligue: 'Crush / date',
    familia: 'Family',
    trabajo: 'Colleague',
    otro: 'Other',
  },
  cardCopy: (id: CardId, r: Relation) => {
    const table: Record<CardId, { kicker: string; title: string }> = {
      messages: { kicker: 'Messages', title: 'Who talks more?' },
      response: { kicker: 'Reply time', title: rom(r) ? 'Who’s glued to their phone?' : 'Who replies first?' },
      first: { kicker: 'The first message', title: 'How it all began' },
      initiator: { kicker: 'Who starts', title: rom(r) ? 'Who texts first?' : 'Who starts the conversation?' },
      media: { kicker: 'Photos, voice notes and stickers', title: 'What words can’t hold' },
      lexicon: { kicker: 'Laughs, love and teasing', title: r === 'trabajo' ? 'The tone of the chat' : 'How you talk to each other' },
      longest: { kicker: 'Longest message', title: 'The essay' },
      deleted: { kicker: 'Deleted messages', title: 'What we’ll never know' },
      timeline: { kicker: 'How it went', title: 'Your story in the chat' },
      interest: {
        kicker: 'Interest level',
        title:
          r === 'ligue' ? 'Do they like you?' : r === 'ex' ? 'Who’s still more hooked?' : r === 'pareja' ? 'Who puts in more?' : r === 'familia' ? 'Who’s more attentive?' : r === 'trabajo' ? 'Engagement in the chat' : 'Who’s keener to talk?',
      },
      seen: { kicker: r === 'trabajo' ? 'Unanswered messages' : 'Left on read', title: 'Questions into the void' },
      silence: { kicker: rom(r) ? 'Possible block' : 'Long silences', title: rom(r) ? 'Blocked, or just vanished?' : 'The longest pauses' },
      words: { kicker: 'Words and emoji', title: 'What you say most' },
      shared: { kicker: 'Your language', title: 'Things only you two say' },
      flags: { kicker: 'Red flags and patterns', title: 'What the numbers say' },
      style: { kicker: rom(r) ? 'Attachment style (lite version)' : 'Communication style', title: 'What we noticed' },
      meaning: { kicker: 'What they really mean', title: 'Live translation' },
      move: { kicker: 'The move', title: 'So, what now?' },
    };
    return table[id];
  },

  upload: {
    fileAria: 'Exported WhatsApp chat file',
    h1: ['What does', 'your chat', 'say about you?'],
    lead: 'Upload an exported WhatsApp chat and find out who writes more, who takes longer to reply, who laughs more and who sends more voice notes. Free, instant, and your chat never leaves your phone.',
    choose: 'Choose file',
    demo: 'Try with a sample chat',
    openSaved: 'Open the report you saved →',
    dropHint: '…or drop the exported .txt or .zip here.',
    privacyStrong: 'Everything happens in your browser. Nothing is uploaded.',
    privacyRest: 'No accounts, no servers and no external AI.',
    exportTitle: 'Export your chat in 20 seconds',
    exportLead: 'Only chats between two people. Works with iPhone and Android, in English or Spanish.',
    steps: [
      ['Open the chat in WhatsApp', 'The one with the person you want to analyse.'],
      ['Tap their name (iPhone) or ⋮ → More (Android) → Export chat', 'Choose “Without media”: it’s faster and we still count photos, voice notes and stickers.'],
      ['Save it and upload it here', 'The iPhone .zip or the Android .txt, as it is.'],
    ],
    cardsTitle: '18 cards about you two',
    cardsLead: 'With exact numbers and comments with a bit of bite (and love). All free.',
    discover: [
      'Who talks more?', 'Reply times', 'Who texts first', 'Photos, voice notes and stickers', 'Laughs, love and teasing', 'The longest message',
      'Left on read', 'Long silences', 'Your words', 'Red flags', 'Interest level', 'So, what now?',
    ],
    samples: [
      'Sam sends 47 voice notes. A personal podcast, no subscription needed.',
      'Alex starts 78% of conversations. If Alex doesn’t write, nobody talks.',
      'Sam’s laugh sounds like “hahaha”. Record: “hahahahahahaha”.',
    ],
    privacyTitle: 'Your chat never leaves this device',
    privacyItems: [
      ['Analysed here', 'The file is read in your browser. Check the “Network” tab: no request goes out.'],
      ['We keep nothing', 'Close the tab and it’s gone. It’s only saved if you ask, and on your device.'],
      ['Names hidden when sharing', 'Cards and the PDF show “Person A” and “Person B” by default.'],
    ],
    analyzeMine: 'Analyse my chat',
    footer: 'longsaw is not affiliated with WhatsApp. The readings are entertainment, not a diagnosis.',
  },

  hero: {
    script: [
      'so are you coming tonight? 👀',
      'of course! been thinking about it all day',
      'what time should we meet?',
      'hahaha at 9, don’t be late 😂',
      'I’m never late',
      'sure, sure… see you later ❤️',
    ],
    typing: 'typing…',
    online: 'online',
    yourReport: 'Your report',
    headline: 'You write the same, but Sam laughs more',
    you: 'You',
    pct: (n: number) => `${n}%`,
    stats: [
      ['2 min', 'your replies'],
      ['6 min', 'Sam’s replies'],
      ['3 😂', 'laughs'],
    ],
    perHour: 'messages per hour',
  },

  loading: {
    steps: ['Reading file', 'Anonymising', 'Crunching numbers', 'Writing your report'],
    kicker: 'One moment',
    h1: ['Reading', 'your chat'],
    progress: 'Analysis progress',
    done: 'done',
    privacy: 'None of this leaves your browser.',
  },

  setup: {
    backAria: 'Choose another file',
    online: 'online',
    typing: 'typing…',
    typingAria: 'longsaw is typing',
    today: 'Today',
    notice: '🔒 This chat is analysed in your browser. Nothing is uploaded and nobody else can read it.',
    hi: 'Hi! 👋 I’ve read your chat.',
    stats: (n: string, from: string, to: string): [string, ReactNode] => [
      `That’s ${n} messages, from ${from} to ${to}. A few quick questions before the report.`,
      <>That’s <b>{n} messages</b>, from {from} to {to}. A few quick questions before the report.</>,
    ],
    whoQ: 'Which of the two are you?',
    guessPlaceholder: (g: string) => `One of you appears as “${g}” in the file: I’d say that’s you 👀`,
    guess: (g: string) => `I’d say you’re ${g}, but confirm it for me 👀`,
    iAmPlaceholder: (raw: string) => `I’m “${raw}”`,
    iAm: (raw: string) => `I’m ${raw}`,
    nameQ: (raw: string) => `The file calls you “${raw}” 😅 What’s your name? That way the sentences will read right.`,
    relQ: (me: string, other: string) => `${me ? `Great, ${me}! ` : 'Great! '}And who is ${other || 'the other person'} to you?`,
    relHint: 'It changes the tone, the sections and the advice in the report.',
    aliasQ: (other: string) => `How should ${other || 'the other person'} appear in the report? You can use a nickname.`,
    done: ['Done! I’ve got everything I need 🙌', 'When you share cards or the PDF, names are hidden by default. Shall I analyse it?'],
    waiting: 'longsaw is typing…',
    whoGroup: 'Who are you?',
    msgShort: 'msgs',
    namePh: 'Your name or nickname',
    relGroup: 'Type of relationship',
    aliasGroup: 'The other person’s name',
    keepAs: (n: string) => `Keep it as “${n}”`,
    aliasPh: 'Or type a nickname',
    settingsShow: 'Advanced settings',
    settingsHide: 'Hide settings',
    analyze: 'Analyse chat →',
    change: 'change ·',
    changeTitle: 'Change answer',
    changeAria: (t: string) => `${t}. Tap to change your answer`,
    send: 'Send',
    gap: 'New conversation after a silence of',
    seen: 'Count as “left on read” if no reply within',
    silence: 'Long silence / possible block from',
    hours: 'h',
    days: 'days',
  },

  report: {
    newAria: 'longsaw: analyse another chat',
    wipe: 'Delete everything',
    kicker: 'Report',
    youAnd: (other: string) => `You and ${other}`,
    heroStats: ['messages', 'days', 'chats'],
    showNames: 'Show names when sharing or downloading',
    hideNames: 'Hide names on screen too',
    saved: '✓ Saved in this browser',
    save: 'Save report on this device',
    saveNote: 'Saves only the report (not the chat). “Delete everything” removes it.',
    creatingImage: 'Creating image…',
    generatingPdf: 'Generating PDF…',
    translating: 'Translating the report…',
    otherLang: 'This saved report was created in Spanish. To see it in English, analyse the chat again.',
  },

  pdf: {
    title: (a: string, b: string) => `${a} and ${b}`,
    kicker: 'CHAT REPORT',
    stats: ['messages', 'days of chat', 'conversations', 'day streak'],
    split: 'Message split',
    noticed: 'What we noticed',
    footer: 'Generated in your browser: the chat was never uploaded anywhere. The readings are entertainment, not a diagnosis.',
    file: 'longsaw-report.pdf',
    shareTitle: 'My Longsaw report',
  },

  card: {
    share: '↗︎ Share',
    shareAria: (k: string) => `Share card: ${k}`,
    watermark: 'analysed in the browser',
    explain: 'How is it calculated?',
    split: 'Message split',
  },

  messages: {
    inDays: (n: string) => `messages in ${n} days`,
    words: (n: string) => `${n} words`,
  },
  response: {
    median: 'Median · how long they usually take',
    meanOf: (name: string) => `${name}’s average`,
    summary: 'Median or average?',
    explain: (p: { a: string; pa: string; b: string; pb: string }): ReactNode => (
      <>
        <p>The <b>median</b> (the big number) is the typical reply: half the time they answer faster and half the time slower. A couple of 8-hour replies don’t move it.</p>
        <p>The <b>average</b> (below) adds up all the times and divides: a few very slow replies push it up. That’s why it’s usually much higher than the median.</p>
        <p>We only count a reply when the speaker changes within the same conversation. If more time passes than the “new conversation” threshold, that counts as initiative, not a slow reply.</p>
        <p>The slowest 10% of replies: {p.a} {p.pa}, {p.b} {p.pb}.</p>
      </>
    ),
  },
  first: {
    none: 'We couldn’t find the first message.',
    by: (year: number, name: string) => `${year} · written by ${name}`,
  },
  initiator: {
    writesFirst: 'Texts first',
    share: (pct: number, n: string) => `${pct}% of ${n} conversations`,
    bar: 'Conversation starts',
    closes: (name: string, n: number) => `${name} ends ${n} conversations`,
    explain: (h: number): ReactNode => (
      <p>A “new conversation” starts when someone writes after more than <b>{h} hours</b> of silence. You can change that threshold in the report settings.</p>
    ),
  },
  longest: {
    words: (name: string, n: string) => `${name} · ${n} words`,
    noText: (name: string) => `${name} has no text messages.`,
  },
  deleted: {
    summary: 'How do we know?',
    explain: 'WhatsApp leaves “You deleted this message” / “This message was deleted” (and the Spanish versions) in the export. The deleted content isn’t in the file: nobody can recover it, us included.',
  },
  timeline: {
    days: 'Days in the chat',
    streak: 'Longest streak',
    daysUnit: 'days',
    activeDays: (n: string) => `${n} days with messages`,
    monthsAria: 'Messages per month for each person',
    mostActive: (m: string, n: string) => `🔥 Busiest month: ${m} (${n} messages)`,
    leastActive: (m: string, n: string) => `🧊 Quietest month: ${m} (${n})`,
    peak: (d: string, n: number) => `📈 Record day: ${d} with ${n} messages`,
    hoursQ: 'What time do you talk?',
    hoursAria: 'Messages per hour of the day',
    hourTitle: (h: number, v: number) => `${h}:00 · ${v} messages`,
  },
  interest: {
    evolution: 'Trend (4 stretches of the chat)',
    evolutionAria: 'Interest trend for each person',
    summary: 'How is it calculated? (always visible)',
    intro: 'It’s a 0–100 score built from objective signals in the chat. Each signal has an absolute scale, so you can both have a lot (or little) interest at the same time:',
    signal: 'Signal (weight)',
    weight: (w: number) => `${w}%`,
    scales: 'Scales: replying instantly = 100 and taking 24 h = 0 (log scale); 12+ words per message = 100; 25% of messages with a question = 100; starting 2 out of 3 conversations = 100. It doesn’t measure feelings: it measures behaviour in the chat.',
  },
  seen: {
    lead: 'Times each person left a message that needed an answer unanswered',
    waited: 'The longest waits',
    never: '…never got a reply',
    until: (d: string) => `⏳ ${d} until the reply`,
    estimate: (h: number) =>
      `An estimate. The WhatsApp export doesn’t say whether a message was read (the blue ticks). We count “left on read” when someone asked a question or followed up with several messages and the other person took more than ${h} h to answer (or never did).`,
  },
  silence: {
    days: (n: number) => `${n} days`,
    endText: (name: string, n: number) => `${name} wrote ${n} messages without a reply until the end of the chat.`,
    longestText: 'was your longest silence. But the chat doesn’t end with a single voice.',
    none: (d: number) => `No silence longer than ${d} days. No disappearing acts. 🙌`,
    since: (date: string) => `from ${date}`,
    mutual: 'both silent',
    only: (name: string, n: number) => `only ${name} was writing (${n} messages)`,
    untilEnd: ' · until the end',
    estimate: 'It’s an inference, not a fact: the export doesn’t say whether anyone blocked anyone. A one-sided silence fits a block, someone who stopped replying, or you talking somewhere else (in person, calls, another app).',
  },
  words: {
    note: 'Filler words (“the”, “que”, “de”…) are skipped in English and Spanish. Laughs are grouped: “hahahah” = “haha”.',
  },
  shared: {
    none: 'You don’t have your own language yet: no expression is used enough by both of you.',
    summary: 'Why these?',
    explain: (): ReactNode => (
      <p>These are words and two-word expressions that <b>both</b> of you use at least 3 times, ranked by how shared they are (not by what one person repeats). We don’t have a dictionary of “what everyone says”, so take it as your language within this chat.</p>
    ),
  },
  flags: {
    sev: { red: 'Red flag', yellow: 'Heads-up', green: 'Green flag' },
    none: 'No clear red or green flags: a fairly neutral chat.',
    evidence: (n: number) => `See evidence from the chat (${n})`,
  },
  style: {
    noticed: 'What we noticed',
    disclaimer: 'This is entertainment, not clinical psychology. A chat is a small part of a relationship and nobody “is” an attachment style because of how they text.',
  },
  meaning: {
    none: 'We didn’t find key ambiguous messages. You understand each other pretty well.',
    disclaimer: 'Possible interpretations, not certainties. If it really matters, ask.',
  },
  media: {
    rows: { photo: 'Photos', audio: 'Voice notes', video: 'Videos', sticker: 'Stickers & GIFs', other: 'Docs, contacts, locations', unknown: 'Unspecified' },
    summary: 'How do we count without seeing the files?',
    explain: (): ReactNode => (
      <p>
        When exporting <b>without media</b>, WhatsApp replaces each photo, voice note or sticker with a notice such as “image omitted”, “audio omitted” or “&lt;Media omitted&gt;”, in your phone’s language. We count those notices and remove them from the text analysis: they never show up in the word ranking.
      </p>
    ),
    unknown: (): ReactNode => (
      <p>
        <b>“Unspecified”</b>: the Android export uses the same “&lt;Media omitted&gt;” for everything, so we know how many files there are but not whether they were photos, voice notes or videos. The iPhone export does say.
      </p>
    ),
  },
  lexicon: {
    rows: { laughs: 'Laughs', affection: 'Love', insults: 'Teasing', greetings: 'Greetings' },
    quote: (s: string) => `“${s}”`,
    summary: 'What counts as what?',
    explain: (): ReactNode => (
      <>
        <p><b>Laughs</b>: haha, lol, lmao, jaja, xd… (however long) and 😂🤣😆.</p>
        <p><b>Love</b>: “love you”, “miss you”, “babe”, “honey”, “xoxo”… plus hearts and 😘🥰.</p>
        <p><b>Teasing</b>: friendly insults (“silly”, “dummy”, “idiot”…). We can’t tell the tone: jokes and serious ones count the same.</p>
        <p><b>Greetings</b>: hi, hello, hey, good morning, good night… ☀️ = good morning, 🌙 = good night.</p>
      </>
    ),
  },

  privacy: {
    title: 'Privacy, plainly',
    blocks: [
      ['Your chat never leaves your device', 'The file is read and analysed inside your browser (in a Web Worker). Nothing is uploaded to any server. You can check in the “Network” tab of the developer tools: analysing makes no requests.'],
      ['We keep nothing unless you ask', 'Close the tab and everything is gone. Only if you press “Save on this device” do we store the report (stats and a few quoted lines, never the whole chat) in your browser’s local storage. “Delete everything” removes it and destroys the process holding the chat in memory.'],
      ['No external AI, no payments', 'The report texts come from rules and a bank of phrases shipped with the website itself: nothing is sent to any AI model or server. The site is free and has no accounts, so there’s nothing to pay and no payment data to store.'],
      ['No trackers', 'We use no cookies, analytics, pixels, or third-party fonts or scripts. The site makes no requests to other domains.'],
      ['About the other person', 'A chat belongs to the other person too. Use it wisely: share cards with names hidden (the default) and don’t post their messages without permission.'],
      ['What the report is (and isn’t)', 'The statistics are exact for the file. “Left on read”, “possible block”, “interest level” and the styles are estimates and entertainment readings based on timings and text, not a diagnosis or a truth about anyone.'],
    ],
  },
};
