/**
 * Parse multiple artifacts from AI response content
 * Supports both single artifact and multiple artifacts with ids/titles
 */

interface ParsedArtifact {
  id: string;
  title: string;
  content: string;
}

/**
 * Extract all artifacts from content
 * Supports formats:
 * - <artifact>content</artifact>
 * - <artifact id="x" title="y">content</artifact>
 * - <artifact id="x" name="y" type="z">content</artifact>
 */
export function parseMultipleArtifacts(content: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = [];

  // Match all artifact tags with optional id, title/name, and type attributes
  // Support both title= and name= for compatibility
  const artifactRegex = /<artifact(?:\s+id="([^"]*)")?(?:\s+(?:title|name)="([^"]*)")?(?:\s+type="([^"]*)")?(?:\s+[^>]*)?>([.\s\S]*?)<\/artifact>/g;

  let match;
  let index = 1;

  while ((match = artifactRegex.exec(content)) !== null) {
    const id = match[1] || `artifact-${index}`;
    const title = match[2] || `Document ${index}`;
    // match[3] is type (email, document, etc) - we can ignore for now
    const artifactContent = match[4].trim();

    artifacts.push({
      id,
      title,
      content: artifactContent
    });

    index++;
  }

  // Fallback to simple artifact tags if no matches found
  if (artifacts.length === 0) {
    const simpleMatch = content.match(/<artifact>([\s\S]*?)<\/artifact>/);
    if (simpleMatch && simpleMatch[1]) {
      artifacts.push({
        id: 'artifact-1',
        title: 'Document',
        content: simpleMatch[1].trim()
      });
    }
  }

  return artifacts;
}

/**
 * Extract content without artifact tags (for display in chat)
 */
export function extractContentWithoutArtifacts(content: string): string {
  // Remove all artifact tags and their content, including wrapper <artifacts> tags
  return content
    .replace(/<artifacts>[\s\S]*?<\/artifacts>/g, '')  // Remove wrapper tags
    .replace(/<artifact(?:\s+[^>]*)?>[\s\S]*?<\/artifact>/g, '')  // Remove individual artifact tags
    .trim();
}

/**
 * Check if content contains artifacts
 */
export function hasArtifacts(content: string): boolean {
  return /<artifact(?:\s+[^>]*)?>/.test(content);
}
