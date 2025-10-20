// Test the artifact parser regex

const testContent = `
<artifacts>
<artifact id="starr-follow-up-email" name="Follow-up: Starr Indemnity & Liability Co." type="email">
Subject: Follow-up on Workers' Comp Submission

Dear Starr Team,
This is a follow-up email...
</artifact>

<artifact id="arch-follow-up-email" name="Follow-up: Arch Insurance Group" type="email">
Subject: Follow-up on Workers' Comp Submission

Dear Arch Team,
This is another follow-up email...
</artifact>
</artifacts>
`;

console.log('Testing artifact parser regex...\n');

const artifactRegex = /<artifact(?:\s+id="([^"]*)")?(?:\s+(?:title|name)="([^"]*)")?(?:\s+type="([^"]*)")?(?:\s+[^>]*)?>([.\s\S]*?)<\/artifact>/g;

let match;
let index = 0;
const artifacts = [];

while ((match = artifactRegex.exec(testContent)) !== null) {
  index++;
  const id = match[1] || `artifact-${index}`;
  const title = match[2] || `Document ${index}`;
  const type = match[3];
  const content = match[4].trim();

  console.log(`Artifact ${index}:`);
  console.log(`  ID: ${id}`);
  console.log(`  Title/Name: ${title}`);
  console.log(`  Type: ${type}`);
  console.log(`  Content length: ${content.length}`);
  console.log(`  Content preview: ${content.substring(0, 100)}...\n`);

  artifacts.push({ id, title, content });
}

console.log(`Total artifacts found: ${artifacts.length}`);
