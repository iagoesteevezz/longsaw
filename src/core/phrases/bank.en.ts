/**
 * Redacciones en inglés del banco de frases, por id de situación (bank.ts).
 * La lógica de cuándo aplica cada situación es la misma; aquí solo cambia el
 * texto. Mismos marcadores que en español ({A}, {B}, {n}…) y mismas reglas:
 * tercera persona, humor sí, diagnósticos no. tests/phrases.test.ts comprueba
 * que no falta ninguna situación ni sobra ningún marcador.
 */
export const EN_LINES: Record<string, string[]> = {
  /* Mensajes */
  'messages.solo': [
    'Only {A} talks here. Less a chat, more a diary with an audience.',
    '{A} carries the whole conversation solo: {n} messages and not a single echo.',
    'A monologue by {A} in {n} acts. The audience has yet to clap.',
  ],
  'messages.lopsided': [
    '{A} writes {x} times more than {B}. If this were a podcast, {B} would be the one nodding along.',
    '{A} sends {x} messages for every one from {B}. Someone’s keyboard is running hot.',
    'Share of the mic: {pct}% for {A}. {B} says little, but maybe picks the moments well.',
  ],
  'messages.more': [
    '{A} talks a bit more ({pct}%), but {B} is far from silent.',
    'Slight edge to {A}: {diff} more messages. Nothing a long voice note from {B} can’t fix.',
    '{A} sings lead, but {B} does backing vocals with gusto.',
  ],
  'messages.even': [
    'A near-perfect split: {pa}% vs {pb}%. A notary couldn’t make it more even.',
    'You talk almost exactly the same amount. A real dialogue, not two crossed monologues.',
    'A dead heat in messages. Nobody can accuse anybody of not writing.',
  ],

  /* Tiempo de respuesta */
  'response.single': [
    'Without replies from both sides there’s nothing to time. The stopwatch is bored.',
    'Measuring reply times takes two people replying. Not yet.',
  ],
  'response.bothFast': [
    'You both reply in under two minutes. Phone glued to your hand, or telepathy?',
    'Record-breaking replies on both sides: {ma} and {mb}. This isn’t a chat, it’s a tennis match.',
    'Nobody keeps anybody waiting: both medians are under two minutes.',
  ],
  'response.gap': [
    '{A} takes {ma} to reply; {B}, {mb}. One lives in the chat, the other is just visiting.',
    '{B} replies {x} times faster than {A}. The patience of {B} is endless.',
    'While {B} replies in {mb}, {A} takes {ma}. Each in their own emotional time zone.',
    '{A} thinks it over: a {ma} median. {B} is at {mb}. Two very different rhythms.',
  ],
  'response.bothSlow': [
    'Nobody’s in a hurry here: {ma} and {mb} medians. A slow-cooked chat.',
    'Calm replies on both sides. Yours is less a chat and more a correspondence.',
    'Neither {A} nor {B} lives glued to the phone, and it shows. And that’s fine.',
  ],
  'response.slight': [
    '{B} replies a little sooner ({mb}) than {A} ({ma}). A small gap, but it’s there.',
    '{A} takes a bit longer. Nothing serious: {ma} vs {mb}.',
    '{B} has the edge on speed, without anyone losing their patience.',
  ],
  'response.even': [
    'Nearly identical times: {ma} and {mb}. You’re in sync.',
    'Neither side faster, neither slower: the same reply rhythm.',
    'You reply just as fast as each other. Nobody gets to say “you always take forever”.',
  ],

  /* Primer mensaje */
  'first.old': [
    'This message from {A} is more than {y} years old. A lot has happened since.',
    '{y} years later, you’re still here. And it all started with {A} writing this.',
  ],
  'first.question': [
    'It all started with a question from {A}. A good way to open the door.',
    '{A} opened the chat with a question. Curiosity started it all.',
  ],
  'first.greeting': [
    'It all started with a hello from {A}. Classic, polite, no risks taken.',
    'A “hi” from {A}, and here we are. Great chats start like this.',
  ],
  'first.default': [
    '{A} broke the ice. Without this message, nothing that follows would exist.',
    'Message zero was written by {A}. Every great chat starts with someone taking the leap.',
    'First message: {A}. The rest is history (and {n} messages).',
  ],

  /* Quién inicia */
  'init.few': ['Too few conversations to draw conclusions, but so far {A} is the one who opens the chat.'],
  'init.dominant': [
    '{A} starts {pct}% of conversations. If {A} doesn’t write, nobody talks.',
    '{A} is almost always the one who gets things going. {B} waits to be found.',
    'Initiative: {A} {pct}%, {B} {pct2}%. A relationship with a clear starter motor.',
  ],
  'init.leans': [
    '{A} usually makes the first move ({pct}%), though {B} reaches out now and then too.',
    'A slight lean: {A} starts the conversation a bit more often than {B}.',
    '{A} is slightly ahead on initiative, but it’s no problem.',
  ],
  'init.even': [
    'Shared initiative: you both write first about equally. That’s how it should be.',
    'Nobody chases anybody here: {pa}% and {pb}% of conversations started.',
    'A tie on initiative. You both reach out, and that’s what counts.',
  ],

  /* Multimedia */
  'media.none': [
    'Not one photo, voice note or sticker. Pure text chat, like the old days.',
    'Zero media. Yours is the written word.',
  ],
  'media.audio': [
    '{A} sends {n} voice notes. A personal podcast, no subscription needed.',
    '{A} would rather talk than type: {n} voice notes. {B} already has the headphones on.',
    'With {n} voice notes, {A} could launch a weekly podcast.',
  ],
  'media.sticker': [
    '{A} answers with stickers {n} times. Why type when there’s a sticker for everything?',
    '{n} stickers from {A}. That collection deserves a museum.',
    '{A} has a sticker for every occasion, and proves it {n} times.',
  ],
  'media.photo': [
    '{A} shares {n} photos. Photojournalism of everyday life.',
    'With {n} photos from {A}, this chat is practically an album.',
    '{A} shows everything: {n} pictures and counting.',
  ],
  'media.unknown': [
    '{n} files from {A}, but Android doesn’t say if they were photos, voice notes or memes. A mystery.',
    '{A} sends more media ({n}). What exactly? Only your camera roll knows.',
    'The Android export hides it all behind “Media omitted”. We know how many, not what: {A} wins with {n}.',
  ],
  'media.general': [
    '{A} sends more media than {B}: {n} vs {m}.',
    'Between photos, voice notes and stickers, {A} is ahead.',
  ],

  /* Mensaje más largo */
  'longest.novel': [
    '{A} once wrote a {n}-word message. That’s not a message, that’s a chapter.',
    '{n} words from {A} in a single message. Grab popcorn before reading.',
  ],
  'longest.mid': [
    'The longest message from {A} has {n} words. Just enough to say something important.',
    '{A} got inspired once and let out {n} words in a row.',
  ],
  'longest.short': [
    'Not even the longest message goes past {n} words. Straight to the point.',
    'Brevity is your thing: the record stands at {n} words.',
  ],

  /* Eliminados */
  'deleted.none': [
    'Nobody has deleted anything. Total transparency (or a lot of confidence).',
    'Zero deleted messages. Writing without a safety net… and without regrets.',
  ],
  'deleted.one': [
    '{A} has deleted {n} messages. What was there, we’ll never know.',
    '{A} has the most regrets: {n} deleted messages.',
    '{n} messages deleted by {A}. The “delete for everyone” button knows them well.',
  ],
  'deleted.even': ['A tie in regrets.', 'You delete about the same. Secrets split down the middle.'],

  /* Rachas */
  'streak.epic': [
    '{n} days in a row talking. Not even the gym gets that kind of commitment.',
    'A {n}-day streak without missing one. This is a tradition now.',
  ],
  'streak.long': [
    'Your best streak: {n} days in a row. Not bad at all.',
    '{n} days without stopping. That’s having things to tell each other.',
  ],
  'streak.short': [
    'The longest streak is {n} days. Yours is more of an on-and-off thing.',
    'You talk in bursts, not daily: a record of {n} days in a row.',
  ],

  /* Interés */
  'interest.fading': [
    'Interest has dropped over time: you started stronger than you’re ending.',
    'The interest curve is heading downhill. The first weeks shone brighter.',
  ],
  'interest.gap': [
    '{A} ({hi}) puts more energy into the chat than {B} ({lo}). The scales are tipping.',
    'There’s a {d}-point interest gap in favour of {A}. You can tell who’s pulling.',
    '{A} is all in; {B} is more in battery-saver mode.',
  ],
  'interest.bothHigh': [
    'High interest on both sides. You can tell from a mile away.',
    '{A} and {B} both score above 65. Chat chemistry confirmed.',
  ],
  'interest.low': [
    'Neither side is going out of their way for this chat. Maybe you’re more of an in-person thing.',
    'Low-ish interest on both sides. The chat isn’t your favourite place.',
  ],
  'interest.even': [
    'Matched interest: {hi} and {lo}. Nobody chases, nobody runs.',
    'You both put the same into the chat. Balance, at last.',
  ],

  /* Vistos */
  'seen.none': [
    'Nobody leaves anybody on read. Every message here gets an answer.',
    'Zero suspicious read receipts. A chat with manners.',
  ],
  'seen.one': [
    '{A} leaves {n} messages that needed an answer unanswered. {B} has noticed, for sure.',
    '{n} left-on-reads from {A}. Reading, yes; replying, that’s another story.',
    '{A} is quick with the blue ticks and slow with the replies: {n} times.',
  ],
  'seen.even': ['You leave each other on read about equally. A tie in absent-mindedness.', 'Read receipts split: {n} and {m}. Nobody gets to cast the first stone.'],

  /* Silencios */
  'silence.end': [
    'The chat ends with {A} writing without a reply for {n} days. That silence says something.',
    'The last {n} days: only {A} writes. On the other side, nothing.',
  ],
  'silence.long': [
    'There was a {n}-day silence. What matters is you came back.',
    '{n} days without talking at some point. Relationships have pauses too.',
  ],
  'silence.none': [
    'Not one long silence in the whole chat. There’s always something to say.',
    'You never go many days without writing. Total consistency.',
  ],
  'silence.some': ['The odd {n}-day silence, nothing out of the ordinary.', 'Pauses now and then, like in any healthy chat.'],

  /* Palabras */
  'words.emoji': [
    'The go-to emoji of {A} is {e}: {n} times.',
    '{A} uses {e} like punctuation ({n} times).',
    '{e} is the signature of {A}. It shows up {n} times.',
  ],
  'words.top': [
    'Favourite word of {A}: “{w}”. Said {n} times.',
    '“{w}” comes out of the fingers of {A} {n} times. Official catchphrase.',
    '{A} can’t live without saying “{w}”. {n} times prove it.',
  ],
  'words.none': ['Not one standout emoji in the whole chat. Serious people.', 'Few repeated words and hardly any emoji. Restraint is your style.'],

  /* Vuestro idioma */
  'shared.many': [
    'You have {n} words and expressions in common. Your own language, under construction.',
    '“{w}” is so yours it should be in the dictionary.',
    'When you both say “{w}”, you get each other without explaining.',
  ],
  'shared.some': ['Few shared expressions, but “{w}” is already your thing.', 'The start of a shared language: “{w}”.'],
  'shared.none': ['You don’t have your own language yet. Give it time.', 'Each of you talks your own way: no shared expression stands out.'],

  /* Red flags */
  'flags.many': [
    '{n} red flags according to the numbers. Not a verdict, but food for thought.',
    'Quite a few red signals. Check the evidence before jumping to conclusions.',
  ],
  'flags.some': ['A stray red flag, nothing a conversation can’t fix.', 'There’s the odd warning, but the rest of the chat makes up for it.'],
  'flags.green': ['Zero red flags and a few green ones. This looks good.', 'Only green signals. May it last.'],
  'flags.neutral': ['No red alarms: a pretty calm chat.', 'Nothing serious in sight. A nuance here and there, that’s all.'],

  /* Risas */
  'laughs.none': ['Not a single “haha” in the whole chat. Are you sure you like each other?', 'Zero written laughs. Either it’s all very serious or you laugh in person.'],
  'laughs.lead': [
    '{A} laughs {n} times and the official laugh is “{s}”. {B}, {m}.',
    'Laugh-o-meter: {A} {n}, {B} {m}. {A} finds almost everything funny.',
    '{A} is the perfect audience: {n} laughs. Got a joke? Tell it to {A}.',
  ],
  'laughs.even': [
    'You laugh the same amount: {n} and {m}. Same sense of humour, or the same memes.',
    'A tie in laughs. You crack each other up, which is a lot.',
    'Laughs split evenly. Comedy chemistry confirmed.',
  ],

  /* Cariño */
  'affection.none': ['Not one “love you” or ❤️. Affection on silent mode.', 'Here, affection isn’t written, it’s assumed.'],
  'affection.lead': [
    '{A} hands out {n} signs of affection; {B}, {m}. Someone is more the saying-it type.',
    '{A} is all kisses and hearts ({n}). {B} shows it in other ways… or not.',
    'Written-affection meter: {A} {n}, {B} {m}.',
  ],
  'affection.even': [
    'Affection split evenly: {n} and {m}. You both say it.',
    'The same level of tenderness on both sides. Genuinely lovely.',
    'You both drop a “{w}” easily.',
  ],

  /* Pullitas */
  'insults.none': ['Not one tease. Either very polite or not close enough yet.', 'Zero affectionate insults. Institutional respect.'],
  'insults.some': [
    '{A} lets out {n} friendly insults (“{w}” is the favourite). That’s affection, in another language.',
    '“{w}”, says {A}, and doesn’t mean it. {n} times.',
    '{A} teases easily: {n} times. You only tease like that when you care.',
  ],

  /* Saludos */
  'greetings.morning': [
    '{A} says good morning {n} times. Better than any alarm clock.',
    'The “good morning” in this chat comes from {A} ({n} times).',
  ],
  'greetings.night': ['{A} says good night {n} times. The last thing {B} reads before sleeping.', '{n} good nights from {A}. Official bedtime ritual.'],
  'greetings.none': ['Nobody says hi here: straight into the topic.', 'Zero greetings. Straight to the point from the first message.'],
  'greetings.general': ['{A} greets more ({n} greetings). Manners first.', 'Greetings: {A} {n}, {B} {m}. Courtesy costs nothing.'],

  /* Lo que notamos */
  night: [
    '{A} writes {pct}% of their messages between midnight and 6 am. A true night owl.',
    'The small hours belong to {A}: {pct}% of their messages.',
    '{A} keeps vampire hours: lots of chatting in the middle of the night.',
  ],
  morning: ['{A} gets up early to write: {pct}% of their messages before 9.', '{A} chats with the first coffee of the day.'],
  hour: ['Your peak hour: {h}:00. That’s when you write the most.', 'At {h}:00 the chat is on fire.'],
  weekday: ['Your favourite day to talk: {d}.', 'On {d} the chat livens up like never before.', 'Statistically, {d} belong to you.'],
  weekdayQuiet: ['On {d} the chat goes quieter.', 'Slowest day: {d}. A weekly rest.'],
  questions: ['{A} asks more: {n} questions vs {m}. Not short on curiosity.', '{A} is the one asking the questions in this chat ({n}).'],
  doubleText: ['{A} sends messages in bursts. No waiting for a reply to keep going.', 'Double texting is the favourite sport of {A}.'],
  closer: ['{A} gets the last word {pct}% of the time.', '{A} almost always closes the conversation.'],
  edits: ['{A} edits their messages {n} times. Keyboard perfectionism.', '{n} edited messages from {A}. No room for typos here.'],
  calls: ['{n} missed calls from {A}. Persistence, analogue edition.', '{A} calls and nobody picks up: {n} missed calls.'],
  peakDay: ['On {date} you sent each other {n} messages. What happened that day?', 'Record day: {n} messages on {date}. Something big happened.'],
  bigVolume: ['{n} messages in total. Printed out, you’d need several bookshelves.', 'You’re at {n} messages. This is a saga now.'],
  month: ['{m} was your star month: {n} messages.', 'In {m} the chat never stopped. Your most intense month.'],
  favWord: ['“{w}” is the word {A} uses most.', 'Catchphrase detected for {A}: “{w}”.'],
};
