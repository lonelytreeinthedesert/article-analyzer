# Article Analyzer - Bias Detection Feature Design Document

## Document Information
**Version:** 1.0  
**Date:** February 12, 2026  
**Author:** Design Team  
**Status:** Draft for Implementation

---

## 1. Executive Summary

This document outlines the design for adding bias detection capabilities to the Article Analyzer application. The feature will identify, highlight, and quantify various types of linguistic bias in news articles, enabling users to critically assess media content through automated analysis of language patterns.

---

## 2. Current Implementation Requirements

### 2.1 Overview
The Article Analyzer shall detect and highlight the following bias indicators in article text, providing counts and highlighting in the metadata panel.

### 2.2 Detection Categories

#### 2.2.1 One-Sided Terms
**Definition:** Words that reflect only one side of a contentious issue (Recasens et al., 2013).

**Requirements:**
- Detect words and phrases that inherently favor one perspective
- Highlight with **two different colors** to distinguish:
  - **Color 1 (e.g., Blue):** Terms favoring Position A (e.g., pro-regulation perspective)
  - **Color 2 (e.g., Red):** Terms favoring Position B (e.g., anti-regulation perspective)
- Display count for each side in metadata panel

**Examples:**
- Position A terms: "climate denier," "reckless deregulation," "dismantling protections"
- Position B terms: "regulatory overreach," "job-killing regulations," "government interference"

**Implementation Notes:**
- Requires context-specific lexicon building
- Must account for article topic/domain
- Manual review and categorization needed for initial lexicon

---

#### 2.2.2 Subjective Intensifiers
**Definition:** Adjectives or adverbs that reinforce or amplify the meaning of a sentence (Recasens et al., 2013).

**Requirements:**
- Identify adjectives and adverbs that strengthen sentiment
- Highlight in text with **distinct color** (e.g., Yellow)
- Provide total count in metadata panel
- Group by intensity level (optional: low/medium/high)

**Examples:**
- High intensity: "devastating," "wildly," "sheer," "utterly," "completely"
- Medium intensity: "significant," "seriously," "clearly," "major"
- Low intensity: "somewhat," "fairly," "rather," "quite"

**Implementation Method:**
1. Part-of-Speech (POS) tagging to identify adjectives/adverbs
2. Sentiment analysis to determine amplification effect
3. Compare against baseline neutral language

---

#### 2.2.3 Factive Verbs
**Definition:** Verbs that presuppose the truth of their complement clause (Kiparsky & Kiparsky, 1970).

**Requirements:**
- Detect verbs that assume truth of following statement
- Highlight in text with **distinct color** (e.g., Green)
- Display count in metadata panel
- Show alternative neutral verbs as suggestions (optional)

**Common Factive Verbs:**
- realize, discover, reveal, know, regret, learn, acknowledge, admit, confirm, demonstrate, prove (when used factively)

**Examples:**
- Factive: "Trump **revealed** that regulations were burdensome" (presupposes they ARE burdensome)
- Neutral: "Trump **said/claimed** that regulations were burdensome" (reports statement only)

**Implementation Method:**
- Lexicon-based detection using predefined list of factive verbs
- Context analysis to distinguish factive vs. non-factive usage

---

#### 2.2.4 Entailments
**Definition:** Words that imply additional meaning beyond their literal definition (Recasens et al., 2013).

**Requirements:**
- Detect words with strong implied meanings
- Highlight in text with **distinct color** (e.g., Purple)
- Display count in metadata panel
- Show entailed meaning on hover (optional)

**Examples:**
- "murder" → entails "kill unlawfully and with premeditation"
- "coerced" → entails "forced unwillingly"
- "abandoned" → entails "left with neglect/desertion"

**Implementation Method:**
- Lexicon of common entailment verbs/nouns
- Pattern matching for verb + preposition combinations
- Semantic analysis for implied meanings

**Future Enhancement Note:**
Research methods to measure intensity of entailment words (e.g., murder > killed > ended). Explore semantic similarity and emotional valence scoring.

---

#### 2.2.5 Assertive Verbs
**Definition:** Verbs that present statements with high certainty or claim to prove/demonstrate truth.

**Requirements:**
- Detect verbs that make strong truth claims
- Highlight in text with **distinct color** (e.g., Orange)
- Display count in metadata panel
- Differentiate from hedged language

**Common Assertive Verbs:**
- proves, demonstrates, confirms, establishes, shows, verifies, validates, certifies

**Examples:**
- Assertive: "The study **proves** the policy is ineffective"
- Neutral: "The study **suggests** the policy may be ineffective"
- Hedged: "The study **indicates possible** ineffectiveness"

**Implementation Method:**
- Lexicon-based detection
- Strength-of-claim scoring (high/medium/low)

**Future Enhancement Note:**
Implement fact-checking integration:
- When assertive verb detected, check if claim is:
  - **Verified:** "Yes, this has been proven effective through [source]"
  - **Unverified:** "This claim has not been independently verified"
  - **Contradicted:** "Evidence suggests the opposite: [counter-source]"
- Requires integration with fact-checking APIs or databases

---

#### 2.2.6 Unusually Negative Language
**Definition:** Language that uses negative emotion words at rates significantly higher than baseline neutral news coverage.

**Requirements:**
- Detect negative sentiment that exceeds normal journalism baselines
- Highlight negative terms in text with **distinct color** (e.g., Dark Red)
- Provide negativity score/percentage in metadata panel
- Compare against baseline neutral news corpus

**Implementation Method - Phase 1 (Current):**
**Use VADER (Valence Aware Dictionary for Sentiment Reasoning)**
- Compound sentiment score ranging from -1 (most negative) to +1 (most positive)
- Scores below -0.5 indicate strong negative sentiment
- Calculate average sentiment per sentence and overall article
- Flag sentences exceeding negativity threshold

**VADER Benefits:**
- Excellent discriminatory capabilities (proven in research)
- Accounts for context (negations, intensifiers, punctuation)
- Free and open-source
- Well-validated for social media and news text

**Display in Metadata:**
- Overall negativity score: -0.75 (Highly Negative)
- Negative sentences: 12 of 45 (27%)
- Comparison: 2.5x more negative than neutral news baseline

**Alternative Methods for Future Consideration:**

**Option A: LIWC (Linguistic Inquiry and Word Count)**
- Emotional Tone score (1-100 percentile)
- Negative emotion word percentage
- Requires licensing ($90+)
- Better for psychological analysis

**Option B: Custom Baseline Comparison**
- Build corpus of neutral news articles on similar topics
- Calculate negative word ratio baseline
- Flag articles exceeding baseline by statistical threshold (e.g., 2 SD)

**Option C: Linguistic Positivity Bias Detection**
- Humans naturally use more positive than negative words
- Calculate positive/negative word ratio
- Unusually negative = ratio significantly below human baseline

**Option D: Multi-method Ensemble**
- Combine VADER + LIWC + Baseline comparison
- Average scores for robustness
- Higher accuracy but more complex

---

### 2.3 User Interface Requirements

#### 2.3.1 Text Highlighting
- Each bias type highlighted with unique color in left panel (article text)
- Color legend displayed prominently
- Highlighting toggleable by category (user can show/hide specific types)
- Hover over highlighted text shows:
  - Bias type name
  - Explanation/definition
  - Suggested neutral alternative (where applicable)

#### 2.3.2 Metadata Panel Display
**Add new section: "Bias Analysis"**

Display format:
```
BIAS ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━

One-Sided Terms
├─ Pro-Position A: 5 instances
└─ Pro-Position B: 3 instances

Subjective Intensifiers: 12 instances
├─ High intensity: 4
├─ Medium intensity: 6
└─ Low intensity: 2

Factive Verbs: 3 instances

Entailments: 7 instances

Assertive Verbs: 2 instances

Negativity Analysis
├─ VADER Score: -0.68 (Highly Negative)
├─ Negative sentences: 15/48 (31%)
└─ Comparison: 2.8x baseline
```

#### 2.3.3 Interactivity
- Click on count in metadata → highlights all instances of that type in text
- Click individual highlighted term → shows detailed explanation panel
- Export bias report as separate document (PDF/DOCX)

---

## 3. Future Requirements & Research Directions

### 3.1 Neutral Verbs Analysis
**Research Question:** Do "neutral" reporting verbs actually carry subtle bias?

**Examples:**
- "claimed" → subtly implies doubt (not verified fact)
- "alleged" → implies unproven accusation
- "admitted" → implies reluctance or wrongdoing

**Future Implementation:**
- Build lexicon of supposedly neutral verbs
- Analyze connotative meanings and contexts
- Categorize by implied credibility:
  - High credibility: stated, reported, announced
  - Neutral: said, according to
  - Low credibility: claimed, alleged, purported
- Highlight and count in separate category

**Research Needed:**
- Literature review on verb choice and perceived credibility
- Corpus analysis of neutral verb usage patterns
- Context-dependent classification (same verb can vary by context)

---

### 3.2 Loaded Labels Detection
**Definition:** Nouns/noun phrases that carry inherent judgment or emotional weight.

**Examples:**
- "regime" vs. "government"
- "activist" vs. "advocate" vs. "extremist"
- "crisis" vs. "situation" vs. "challenge"

**Future Implementation:**
- Synonym analysis to identify loaded alternatives
- Context-appropriate neutrality suggestions
- Highlight loaded labels with unique color
- Count and categorize by emotional valence

**Research Needed:**
- Semantic frame analysis
- Cross-reference with journalism style guides
- Cultural/political context considerations

---

### 3.3 Adverb Intensity Analysis
**Research Question:** Can we quantify how much adverbs sway reader perception?

**Examples:**
- "deeply concerning" vs. "concerning"
- "wildly inaccurate" vs. "inaccurate"
- "completely wrong" vs. "wrong"

**Future Implementation:**
- Intensity scoring for common adverbs (1-10 scale)
- Calculate amplification factor
- Compare adverb + adjective combinations to base adjective sentiment
- Display intensity heatmap in metadata

**Research Needed:**
- Psycholinguistic studies on adverb amplification
- Corpus analysis of adverb frequency in neutral vs. biased sources
- Reader perception experiments

---

### 3.4 Entailment Intensity Measurement
**Research Question:** Can we measure how "loaded" an entailment word is?

**Examples (intensity scale):**
- Low: "ended" (neutral action)
- Medium: "killed" (negative action)
- High: "murdered" (illegal, immoral action)
- Very High: "brutally murdered" (intensified)

**Future Implementation:**
- Semantic similarity scoring
- Emotional valence intensity (using LIWC or VAD lexicons)
- Display intensity score next to highlighted entailments
- Suggest less intense alternatives

**Research Methods to Explore:**
- Word embedding distances (Word2Vec, GloVe)
- Valence-Arousal-Dominance (VAD) ratings
- Sentiment intensity lexicons (e.g., SentiStrength)
- Connotation frames analysis

---

### 3.5 Assertive Verb Fact-Checking Integration
**Goal:** Validate claims made with assertive verbs against authoritative sources.

**Implementation Plan:**
1. Detect assertive verb + claim structure
2. Extract claim as structured data
3. Query fact-checking APIs
4. Return verification status

**Display in UI:**
- Icon next to assertive verb
- Hover shows fact-check result and source
- Link to full fact-check article

---

## 4. References & Research Foundation

### Academic Sources
1. Recasens, M., Danescu-Niculescu-Mizil, C., & Jurafsky, D. (2013). Linguistic models for analyzing and detecting biased language. ACL.
2. Kiparsky, P., & Kiparsky, C. (1970). Fact. In Progress in Linguistics.
3. Hutto, C., & Gilbert, E. (2014). VADER: A parsimonious rule-based model for sentiment analysis. ICWSM.
4. Media Bias Taxonomy (2024). ArXiv systematic literature review.

---

**END OF DOCUMENT**
