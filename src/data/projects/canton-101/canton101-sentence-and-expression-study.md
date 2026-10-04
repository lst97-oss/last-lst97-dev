# How a themed sentence teaches a word, and how a learner gets from a song to a dictionary entry

- **Category:** Learning Experience
- **Source ID:** canton101-sentence-and-expression-study
- **URL:** https://www.lst97.dev/projects/canton-101
- **Visibility:** Private

The premise of the product is that meaning lives in context. Knowing 佢 means "he/she" is close to useless if a learner cannot hear it inside real speech, and knowing a word from a dictionary list is close to useless if they cannot meet it in a sentence they would actually say.

So every surface is a way of reading the same corpus. A themed sentence is not a separate feature with its own content — it is the lexical corpus, read in sentence order, with per-word annotation layered on top. The lexicon and the sentence view are two projections of one spine.

## Sentence annotation is derived from the corpus

A themed sentence is tokenised per word, and each word carries its part of speech and its readings. That annotation is not written by hand for each sentence; it is resolved from the lexical corpus the learner already searches.

This is the property that makes the product scalable. Adding a sentence does not mean annotating it, because the annotation is a lookup. It also means the annotation cannot be wrong relative to the dictionary — the reading shown in a sentence is the same reading shown on the entry, because it is the same record.

## A sentence page is several layers at once

Opening a sentence shows more than the text. The learner sees the sentence's structure, each word's readings and part of speech, a scene illustration, and a translation. Related sentences are offered alongside.

Each of those layers answers a question the others cannot. The per-word readings and parts of speech let a learner who can read the sentence's shape see what each piece is — that 嘅 is a particle and not a noun is exactly the kind of thing a dictionary entry alone will not tell you. The scene illustration supplies the situation the sentence belongs to, which is the thing a learner is actually missing when they meet a word on a dictionary page. The translation gives the meaning in a language they read fluently.

The internationalisation matters here in a way that is easy to understate. The interface is available in several languages, and translations of learning content are prepared content rather than an afterthought — because a translation generated at request time for a pedagogical sentence is a translation nobody reviewed.

## Expressions and vocabulary plans

Above individual sentences sit vocabulary plans: themed groupings of vocabulary that build toward a task rather than a topic. Browsing an expression opens the same sentence-and-annotation view.

The link between the two levels is what makes a plan worth following. A plan is a sequence of sentences chosen so the vocabulary builds, and every word in it is a real corpus entry with real readings — so a learner who does not know a word in a plan has somewhere to go immediately, rather than being told to look it up elsewhere and lose the thread.

## From a lyric line to a dictionary entry

The lyric corpus links back to the same spine. Songs are stored with searchable lines, tagged by artist, lyricist and theme, and each line's tokens are linked to dictionary entries.

That link is what makes the product's central promise work in both directions. A learner reading a lyric meets an unfamiliar word inside a line they are actually listening to — the context they would have chosen themselves — and the word is a link to its entry. They go word → song rather than stopping at a dictionary page. And a learner browsing a dictionary entry sees real lines from the lyric corpus that contain the word, so the entry is anchored in real usage rather than in an invented example sentence.

## Karaoke as the timing view of the same content

The karaoke view adds the one thing the corpus cannot carry in text: when each word lands. Line text, per-word readings and translation all stay synchronised with the audio, and the highlight advances from the stored timings.

This is why karaoke is not a separate subsystem as far as the content model is concerned. It reads the same lyric lines and the same dictionary links, and adds the timing interval to each word. A learner can sing along, then tap any word and land on the entry they just heard it used in.

## The practice loop closes it

The practice loop is where the spine becomes retention rather than exposure. Flashcards and echo or speaking challenges grade an attempt, return a score and feedback, and can replay the audio. Progress accrues XP, levels and streaks per account.

Recording a progress event per graded attempt is idempotent, so re-attempting an exercise does not double-count. And the rewards are attached to the same vocabulary and sentences the learner is studying, which keeps the loop pointed at content rather than at the score.