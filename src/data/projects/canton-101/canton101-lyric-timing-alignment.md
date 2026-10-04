# How a song gets word-level timings, and why nothing is smoothed over

- **Category:** Timing Alignment
- **Source ID:** canton101-lyric-timing-alignment
- **URL:** https://www.lst97.dev/projects/canton-101
- **Visibility:** Private

Karaoke is the part of Canto101 that either works or is obviously broken. Romanisation tells a learner what a syllable sounds like; it does not tell them when it lands. Without timing, a learner can read the lyric line but has no way to know where in the song their part begins. Everything else in the product can degrade gracefully. This cannot — if the highlight drifts, the practice tool teaches the wrong thing.

The song import pipeline is the longest in the system, and its defining property is that it never invents a boundary it did not measure.

## Audio retrieval

The pipeline starts with a song selected in the app. The audio is retrieved by a download micro-service — the browser never fetches media directly, and neither does the API server reaching out to a third party. Keeping retrieval in its own small service means the part that touches an external media source has a blast radius of exactly one service.

The retrieved audio is a real recording of a real song by its rights holders. It is used under fair-use for study; the lyrics and recordings remain the property of their rights holders, and the repository license governs redistribution. That is a constraint on the product, not an implementation detail.

## Vocals isolation

Before words can be mapped to time, the audio has to be prepared. The full mix contains instrumentation, and instrumentals are dense, percussive and unmodulated in exactly the ways that defeat alignment. The recording is separated so the vocal component is isolated and the words can be located against a comparatively clean signal.

This stage is deliberately part of the pipeline rather than a preprocessing step done once by hand. Doing it in the pipeline means every imported song goes through the same preparation, so the timings in the corpus have the same character throughout instead of being a mix of hand-prepared and machine-prepared songs.

## Word-to-time mapping

An alignment micro-service takes the prepared audio and produces, for each word in the lyric, the interval during which it is sung. The output is per character or per word depending on the script — Cantonese lyrics mix characters and Latin words — and the karaoke playhead consumes exactly those intervals.

The alignment runs in a micro-service rather than in the API server for the same reason everything else is: it is slow, and it depends on model weights and a runtime the product server does not want to host. The API server calls it over a signed internal request and never exposes it to the browser.

## Validation and quality scoring

Alignment output is not trusted on sight. A result that is subtly wrong — everything shifted by half a second, or one repeated word collapsing two occurrences — produces karaoke that looks plausible and teaches the wrong timing. So every result is validated and quality-scored before it is stored.

The validation step checks the things that make an alignment usable: that the timings are ordered and within the duration of the recording, that every word in the lyric has a corresponding interval, that intervals do not overlap illegitimately, and that the total aligned span is consistent with the song's length. The score captures how confident the result is, so a low-quality alignment can be surfaced for review rather than shipped as fact.

## Stored with the original values

The timings are persisted with the song, and the original values are kept auditable. This is the part that distinguishes the system from one that quietly repairs bad output.

A pipeline that sees an implausible alignment will often "fix" it by clamping, extending or interpolating. That produces a result that looks correct and is not: a learner practising against it is practising a timing that was never performed. So the stored record keeps the raw output as well as anything derived from it, and a correction is a review decision that a person makes, not a transformation the pipeline performs silently.

Provenance travels with the result. Every set of timings knows which audio it was computed against, what preparation produced it, and what the validation step concluded. When a song's timings turn out to be wrong, that record is what makes the failure diagnosable rather than mysterious.

## From timings to the karaoke experience

Two things consume the stored timings. Karaoke playback advances the highlight from the intervals, so the highlighted word follows the melody and the playhead is scrubbable rather than simulated. And the lyric lines are linked to dictionary entries, so a learner can move from a word in a song to its entry — readings, meanings, component characters — without leaving the page.

A storefront-style guarantee applies here as it does elsewhere in the platform: anything uncertain is surfaced for review instead of silently smoothed over. The timing is the pedagogical claim the product makes, so it is the one place where being confidently wrong is worst.