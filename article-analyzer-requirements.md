# Article Analyzer — Requirements Document

---

## Overview

A web application that accepts pasted article text and analyzes it for metadata and linguistic bias patterns. Built with React + Vite frontend, Vercel serverless backend, Claude API for metadata extraction.

---

## Implemented Features

### Metadata Extraction (Always On)
- Author, date published, source, URL (via Claude API + web search)
- Word count (pure JS)
- Reading time (pure JS, 200 wpm assumption)
- 2–3 sentence summary — displayed with blurb: *"Based on first 5,000 characters"*
- Key topics displayed as tags

### Analysis Engines (Optional, Toggle On/Off)

Each engine has an ON/OFF toggle switch in the UI. State persists per session.

#### Intensifier Engine (Default: ON)
Detects subjective intensifiers — adjectives and adverbs that amplify meaning beyond neutral reporting.

**Current implementation:**
- Handbuilt lexicon (~80 terms across 3 intensity levels)
- High intensity (dark yellow highlight): absolutely, utterly, devastatingly, brazenly, most powerful, etc.
- Medium intensity (medium yellow): significant, clearly, hastily, deliberately, aggressively, etc.
- Low intensity (light yellow): somewhat, fairly, quite, apparently, etc.
- Multi-word phrase detection (e.g. "most powerful", "deeply concerning")
- Lexicon loosely informed by Recasens et al. (2013) and VADER booster word concept

**Research basis:**
- Recasens, M., Danescu-Niculescu-Mizil, C., & Jurafsky, D. (2013). *Linguistic Models for Analyzing and Detecting Biased Language*. ACL. https://web.stanford.edu/~jurafsky/pubs/neutrality.pdf
- Hutto, C.J. & Gilbert, E.E. (2014). *VADER: A Parsimonious Rule-based Model for Sentiment Analysis of Social Media Text*. ICWSM. https://ojs.aaai.org/index.php/ICWSM/article/view/14550
- Reuters Handbook of Journalism: "Use adjectives sparingly. Inject color into copy with strong verbs and facts first."

**Future implementation (not yet built):**
- Replace handbuilt lexicon with validated sources:
  - **VADER lexicon** (7,500+ sentiment-scored terms including booster/intensifier words) — available via `vader-sentiment` npm package or Python `nltk`
  - **WNC biased-word subset** — 55,503 single-word bias cases extracted from Wikipedia NPOV edits, available at https://github.com/rpryzant/neutralizing-bias
  - **Recasens NPOV corpus** — original Wikipedia bias-driven edits, described in Recasens et al. (2013)
- Add POS tagging to reduce false positives (e.g. "quite" only flagged when modifying an adjective)
  - Library: **spaCy** (Python) https://spacy.io or **compromise** (JS) https://github.com/spencermountain/compromise
- Add context awareness (negation handling: "not quite" should not flag)
- Sentence-level subjectivity score alongside word-level highlighting
  - Library: **TextBlob** (Python) — returns polarity and subjectivity (0–1) per sentence

---

#### Factive Engine (Default: OFF)
Detects factive verbs — verbs that presuppose the truth of their complement clause.

**Current implementation:**
- Handbuilt lexicon (~80 verb forms across 6 semantic categories)
- Core: realize, discover, reveal, know, learn
- Awareness: notice, observe, recognize, perceive
- Memory: remember, recall, forget
- Emotional: regret, resent, deplore
- Communication: acknowledge, admit, confess, disclose
- Confirmation: confirm, verify, demonstrate, establish
- Green highlight in article text

**Research basis:**
- Kiparsky, P. & Kiparsky, C. (1970). *Fact*. In M. Bierwisch & K. Heidolph (eds.), Progress in Linguistics. The foundational definition of factive verbs.
- Recasens et al. (2013) — same as above; includes factive verbs as a class of epistemological bias

**Known gaps:**
- No distinction between factive and non-factive uses in context ("unable to confirm" should NOT flag)
- No negation detection
- Some verbs in lexicon (verify, demonstrate, establish) are assertive verbs, not true factives — conflation needs cleanup

**Future implementation (not yet built):**
- Dependency parsing to check sentence structure before flagging
  - Library: **spaCy** (Python) — dependency parser identifies verb-complement relationships
- Separate assertive verbs into their own engine (see Planned Engines below)
- Negation handling
- Dataset to validate against:
  - **WNC biased-word subset** — contains factive verb instances flagged by Wikipedia editors
  - **MBIC dataset** — crowdsourced bias labels on news sentences, available at https://github.com/Media-Bias-Group/MBIC

---

## Implemented but Pending Deployment

- Summary "Based on first 5,000 characters" blurb *(this release)*
- Engine toggle switches replacing checkboxes *(this release)*
- Network drive migration *(this release)*

---

## Planned Engines (Designed, Not Yet Built)

### One-Sidedness Engine
Detects word choice and labeling (WCL) bias — use of terms that reflect only one side of a contentious issue.

**Research basis:**
- Hamborg, F., Donnay, K., & Gipp, B. (2019). *Automated identification of media bias in news articles: an interdisciplinary literature review*. https://doi.org/10.1007/s00799-018-0261-y
- Recasens et al. (2013) — one-sided terms defined as "words that reflect only one of the sides of a contentious issue"

**Design challenge (unresolved):**
- How to identify "sides" dynamically without hardcoded topic-specific lexicons
- Options under consideration: user-selected topic frame, general left/right partisan vocabulary, dual sentiment toward named entities

**Future libraries and datasets:**
- **BABE corpus** — bias annotations by experts on news sentences, described in Spinde et al. (2021). https://github.com/Media-Bias-Group/media-bias-dataset
- **AllSides dataset** — articles rated left/center/right by editorial teams. https://www.allsides.com/media-bias/ratings
- **distilroberta-bias** (Hugging Face) — fine-tuned on WNC, scores text for subjective bias. https://huggingface.co/valurank/distilroberta-bias

### Assertive Verbs Engine
Detects verbs that make strong truth claims (prove, demonstrate, establish, confirm).
Distinct from factive verbs: assertive verbs imply the speaker is certain, not just that the proposition is true.

**Research basis:**
- Hooper, J.B. (1975). *On Assertive Predicates*. Syntax and Semantics, Vol. 4.
- Recasens et al. (2013)

### Negativity / Sentiment Engine
Detects unusually negative language compared to neutral news baseline.

**Future libraries:**
- **VADER** (Python `nltk` or `vader-sentiment` npm) — compound sentiment score per sentence, -1 to +1
- **TextBlob** — subjectivity score alongside polarity

---

## Next Steps (Backlog — Move to Design Doc When Implemented)

- [ ] **Python microservice** — add alongside Vercel JS backend to enable Python NLP libraries (spaCy, VADER, TextBlob, NLTK). Required before most "Future implementation" items above can be built.
- [ ] **Import VADER lexicon** — replace handbuilt intensifier list with validated VADER booster words. Immediately improves Intensifier Engine without needing Python.
- [ ] **Download WNC biased-word subset** — parse 55,503 flagged words from Wikipedia NPOV edits. Use as ground-truth expansion of both Intensifier and Factive lexicons.
- [ ] **POS tagging for Intensifier Engine** — reduce false positives by only flagging words when used in their intensifying grammatical role.
- [ ] **Factive verb cleanup** — separate true factives from assertive verbs in current lexicon; add negation detection.
- [ ] **TextBlob subjectivity score** — add sentence-level subjectivity signal to complement word-level highlighting in Intensifier Engine.
- [ ] **Assertive Verbs Engine** — build as separate engine once factive lexicon cleanup is done.
- [ ] **One-Sidedness Engine** — resolve "sides" identification problem before implementation.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind CSS |
| Backend | Vercel serverless function (Node.js) |
| Metadata AI | Claude API (`claude-sonnet-4-20250514`) + web search tool |
| Bias detection (current) | Pure JS regex, handbuilt lexicons |
| Bias detection (planned) | Python microservice with spaCy, VADER, TextBlob |
| Deployment | Vercel (auto-deploy from GitHub push) |

---

## Known Bugs Fixed
- HTML corruption in bias highlighting (positions breaking mid-attribute after span insertion) — fixed by HTML-escaping before insertion, deduplicating overlapping markers, reverse-order insertion.

---

## Research References

| Paper | Relevance |
|---|---|
| Recasens, Danescu-Niculescu-Mizil, Jurafsky (2013). *Linguistic Models for Analyzing and Detecting Biased Language*. ACL. [PDF](https://web.stanford.edu/~jurafsky/pubs/neutrality.pdf) | Core taxonomy: factive verbs, intensifiers, one-sided terms, assertive verbs, hedges |
| Pryzant et al. (2020). *Automatically Neutralizing Subjective Bias in Text*. AAAI. [Link](https://ojs.aaai.org/index.php/AAAI/article/view/5385) | WNC dataset; BERT-based bias detection and neutralization |
| Spinde et al. (2023). *The Media Bias Taxonomy: A Systematic Literature Review*. arXiv. [Link](https://arxiv.org/abs/2312.16148) | Comprehensive review of 3,140 media bias papers; taxonomy of bias types |
| Hamborg, Donnay, Gipp (2019). *Automated identification of media bias in news articles*. [Link](https://doi.org/10.1007/s00799-018-0261-y) | Word choice and labeling (WCL) bias; one-sided terms |
| Hutto & Gilbert (2014). *VADER: A Parsimonious Rule-based Model for Sentiment Analysis*. ICWSM. | VADER lexicon; intensifier/booster word quantification |
| Kiparsky & Kiparsky (1970). *Fact*. In Progress in Linguistics. | Original definition of factive verbs |
