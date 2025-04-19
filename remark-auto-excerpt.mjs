// src/remark/auto-excerpt.js
import { visit, EXIT } from 'unist-util-visit';
import { toString as mdast_to_string } from 'mdast-util-to-string';

/**
 * Options for the remark-auto-excerpt plugin.
 * @typedef {object} Options
 * @property {number} [maxLength=160] - The maximum length of the excerpt.
 * @property {string} [ellipsis='...'] - The string to append if truncated.
 * @property {string} [excerptSeparator='\n\n'] - How user-defined excerpts are separated (not used in auto-generation but good practice for related features).
 */

/**
 * A remark plugin to automatically generate an excerpt from the first paragraphs.
 * @param {Options} [options={}] - Configuration options.
 */
export function remarkAutoExcerpt(options = {}) {
  const { maxLength = 200, enoughLength = 100, maxParagraph = 2, ellipsis = '...' } = options;

  return (tree, { data }) => {
    let excerpt = '';
    let currentLength = 0;
    let currentParagraph = 0; // Track the number of paragraphs processed
    let isTruncated = false;

    visit(tree, 'paragraph', (node) => {
      // Stop processing if we've reached the desired length
      currentParagraph++;
      if (currentParagraph > maxParagraph || currentLength >= enoughLength) {
        return EXIT; // Stop visiting further paragraphs
      }

      const text = mdast_to_string(node); // Get plain text content of the paragraph
      if (!text) return; // Skip empty paragraphs

      const spaceNeeded = excerpt.length > 0 ? 1 : 0; // Need space separator?
      const remainingSpace = maxLength - currentLength - spaceNeeded;

      if (remainingSpace <= 0) {
          // No space left even for a separator or more text
          isTruncated = true; // Mark as truncated even if we add nothing more
          return EXIT;
      }

      let textToAdd = '';

      if (text.length <= remainingSpace) {
        // The whole paragraph fits
        textToAdd = text;
      } else {
        // Need to truncate this paragraph
        // Try to truncate at the last space before the limit
        let truncatedText = text.slice(0, remainingSpace);
        const lastSpaceIndex = truncatedText.lastIndexOf(' ');
        if (lastSpaceIndex > 0) { // Found a space to break at
             truncatedText = truncatedText.slice(0, lastSpaceIndex);
        } // else: just cut mid-word if no space found or it's a single long word

        textToAdd = truncatedText;
        isTruncated = true; // Mark that we truncated
      }

      // Add separator if needed
      if (spaceNeeded) {
        excerpt += ' ';
        currentLength += 1;
      }

      excerpt += textToAdd;
      currentLength += textToAdd.length;


      // If we truncated within this paragraph, stop processing further
      if (isTruncated) {
        return EXIT;
      }
    });

    // Add ellipsis if the content was indeed truncated
    if (isTruncated && excerpt.length > 0) {
        // Ensure no trailing space before ellipsis
        excerpt = excerpt.trimEnd() + ellipsis;
    }

    // Store the excerpt in file.data to be accessible in Astro frontmatter
    // console.log(`Excerpt: ${excerpt}`);
    data.astro.frontmatter.excerpt = excerpt;
  };
}
