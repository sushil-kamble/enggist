# Ideas for Balanced Content Distribution Across Sources

## Problem
Uneven distribution of posts across sources:
- Cloudflare Blog: 45 posts
- GitHub Engineering: 44 posts
- Microsoft Azure Blog: 32 posts
- Engineering at Meta: 21 posts
- Pinterest Engineering: 17 posts
- Netflix Tech Blog: 13 posts
- Airbnb Engineering: 11 posts
- Slack Engineering: 10 posts
- Dropbox Tech Blog: 0 posts (newly added)
- Salesforce Engineering: 0 posts (newly added)

Goal: Prevent any single source from dominating the feed while ensuring all sources get fair representation.

## Solution Ideas

### 1. Weighted Randomization in Display
- Instead of showing posts chronologically or by source, use a weighted random selection that inversely weights by source frequency
- Sources with fewer posts get higher probability of being shown
- Formula: `weight = 1 / (total_posts_from_source)`
- Advantages: Natural diversity, simple to implement
- Disadvantages: May show less relevant content

### 2. Source Rotation/Round-Robin
- Cycle through sources ensuring each gets representation
- Show 1-2 posts from Source A, then 1-2 from Source B, etc.
- Prevents any single source from dominating the feed
- Advantages: Guaranteed equal representation
- Disadvantages: May disrupt chronological ordering

### 3. Maximum Posts Per Source Per Page/View
- Cap how many posts from a single source can appear in one view (e.g., max 3 posts from any source in top 20)
- Forces diversity even if Cloudflare has 45 posts
- Advantages: Easy to implement, maintains some natural ordering
- Disadvantages: May hide good content from active sources

### 4. Boost Factor for Underrepresented Sources
- Apply a multiplier to ranking scores for sources with fewer posts
- Example: Posts from sources with <15 posts get 2x boost in relevance scoring
- Advantages: Works with existing ranking system
- Disadvantages: Requires tuning the multiplier values

### 5. Time-Window Balancing
- Show "1 post per source from last 7 days" before showing second post from any source
- Ensures recent coverage from all active sources
- Advantages: Focuses on freshness and diversity
- Disadvantages: May leave gaps if sources don't post regularly

### 6. Interleaving Algorithm
- Similar to how search engines blend results
- Create separate ranked lists per source, then interleave them (take top from Source A, top from Source B, second from Source A, etc.)
- Advantages: Maintains relevance within each source while ensuring diversity
- Disadvantages: More complex implementation

### 7. Quota-Based Display
- Allocate slots: "Show posts from at least 5 different sources in top 10 results"
- Fill quota first, then add remaining posts by relevance
- Advantages: Guaranteed minimum diversity
- Disadvantages: May force inclusion of less relevant posts

### 8. Diversity Score in Ranking
- Add a diversity component to your sorting algorithm
- `final_score = relevance_score + (diversity_bonus based on source distribution)`
- Advantages: Flexible, can be tuned based on user feedback
- Disadvantages: Requires careful balancing of weights

## Recommended Approach

**Combining #3 (Maximum Caps) + #6 (Interleaving)**

This approach is effective and relatively easy to implement:

1. Create separate post lists per source
2. Interleave them (round-robin style)
3. Cap maximum consecutive posts from same source at 2-3
4. This ensures balanced representation while still showing quality content

### Implementation Strategy
- Focus on the display/sorting layer, not the data fetching layer
- Keep collecting all posts from all sources as-is
- Apply balancing logic when presenting results to users
- Can be implemented in the frontend or backend sorting logic

### Additional Considerations
- Monitor user engagement to see if balanced display improves or hurts metrics
- Consider A/B testing different approaches
- May want to make this configurable so users can choose "balanced" vs "chronological" view
