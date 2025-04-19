import getReadingTime from 'reading-time';
import { toString as mdast_to_string } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return (tree, { data }) => {
    const textOnPage = mdast_to_string(tree);
    const readingTime = getReadingTime(textOnPage);
    // readingTime.text will give us minutes read as a friendly string,
    // i.e. "3 min read"
    data.astro.frontmatter.minutesRead = readingTime.minutes;
  };
}
