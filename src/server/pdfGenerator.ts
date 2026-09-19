/**
 * Minimalist yet 100% valid multi-page PDF generator without binary dependencies
 * Creates real PDF documents readable by PDF.js, Adobe Acrobat, and browsers.
 */
export function generateBookPdfBuffer(
  title: string,
  author: string,
  category: string,
  pagesCount: number = 5
): Buffer {
  const objects: string[] = [];
  
  // Object 1: Catalog
  objects[1] = `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`;

  // Object 3: Font
  objects[3] = `3 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`;

  const pageObjectIds: number[] = [];
  let currentObjId = 4;

  const chapters = [
    {
      heading: "Preface & Introduction",
      body: [
        `Welcome to the digital edition of "${title}" by ${author}.`,
        `Preserved and distributed via the KitabKhana Digital Library & Archive.`,
        "This edition has been curated for scholars, bibliophiles, and readers worldwide.",
        "Equipped with digital ownership verification and Cloudflare R2 object storage.",
      ],
    },
    {
      heading: "Chapter I: The Classical Foundations",
      body: [
        "In the tranquil halls of the ancient academies, words carried the weight of civilizations.",
        "Literature bridges generations, speaking across centuries and continents with quiet resonance.",
        "Every page transcribed represents a dedication to preserving cultural knowledge for all humankind.",
      ],
    },
    {
      heading: "Chapter II: Verses & Reflections",
      body: [
        "The mind seeks clarity through the cadence of language and the depth of poetic thought.",
        "Like the luminous traditions of Rekhta and timeless universal literature,",
        "ideas flow beyond temporal borders into the shared treasury of human imagination.",
      ],
    },
    {
      heading: "Chapter III: The Search for Meaning",
      body: [
        "Knowledge unfolds in layers, beckoning the inquisitive mind to peer beyond the obvious.",
        "In quiet contemplation, the reader discovers not only the mind of the author,",
        "but the unspoken harmonies of their own inner life.",
      ],
    },
    {
      heading: "Afterword & Provenance",
      body: [
        `Title: ${title}`,
        `Author: ${author}`,
        `Collection: ${category}`,
        "Digital Archive: KitabKhana International Library",
        "License: Authorized Digital Marketplace Edition. All Rights Reserved.",
      ],
    },
  ];

  for (let i = 0; i < pagesCount; i++) {
    const pageObjId = currentObjId++;
    const contentObjId = currentObjId++;
    pageObjectIds.push(pageObjId);

    const chapter = chapters[i % chapters.length];
    const isCover = i === 0;

    let stream = "";
    if (isCover) {
      // Cover page
      stream = `
BT
/F1 26 Tf
50 720 Td
(${escapePdfText(title)}) Tj
/F1 16 Tf
0 -40 Td
(By ${escapePdfText(author)}) Tj
/F1 12 Tf
0 -30 Td
(Category: ${escapePdfText(category)}) Tj
0 -50 Td
(-------------------------------------------------------) Tj
0 -30 Td
(KITABKHANA DIGITAL LIBRARY & ARCHIVE) Tj
0 -20 Td
(Preserving World Literature & Thought) Tj
0 -400 Td
(Page 1 of ${pagesCount}) Tj
ET`;
    } else {
      // Content page
      let bodyCommands = "";
      for (const line of chapter.body) {
        bodyCommands += `0 -24 Td\n(${escapePdfText(line)}) Tj\n`;
      }

      stream = `
BT
/F1 18 Tf
50 730 Td
(${escapePdfText(chapter.heading)}) Tj
/F1 12 Tf
0 -40 Td
(${escapePdfText(title)} - ${escapePdfText(author)}) Tj
0 -20 Td
(---------------------------------------------------------------------------------) Tj
${bodyCommands}
/F1 10 Tf
0 -360 Td
(Page ${i + 1} of ${pagesCount} - KitabKhana Digital Edition) Tj
ET`;
    }

    const streamLength = Buffer.byteLength(stream, "utf-8");

    objects[pageObjId] = `${pageObjId} 0 obj
<< /Type /Page
   /Parent 2 0 R
   /MediaBox [0 0 595 842]
   /Contents ${contentObjId} 0 R
   /Resources << /Font << /F1 3 0 R >> >>
>>
endobj`;

    objects[contentObjId] = `${contentObjId} 0 obj
<< /Length ${streamLength} >>
stream
${stream}
endstream
endobj`;
  }

  // Object 2: Pages
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[2] = `2 0 obj
<< /Type /Pages
   /Kids [ ${kidsStr} ]
   /Count ${pageObjectIds.length}
>>
endobj`;

  // Assemble PDF
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const xref: number[] = [0];

  for (let i = 1; i < objects.length; i++) {
    if (!objects[i]) continue;
    xref[i] = Buffer.byteLength(pdf, "utf-8");
    pdf += objects[i] + "\n";
  }

  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;

  for (let i = 1; i < objects.length; i++) {
    const offset = xref[i] || 0;
    const padded = String(offset).padStart(10, "0");
    pdf += `${padded} 00000 n \n`;
  }

  pdf += `trailer
<< /Size ${objects.length}
   /Root 1 0 R
>>
startxref
${xrefStart}
%%EOF\n`;

  return Buffer.from(pdf, "utf-8");
}

function escapePdfText(text: string): string {
  return text.replace(/[()\\]/g, "\\$&");
}
