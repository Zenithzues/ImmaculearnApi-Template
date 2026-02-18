import fs from 'fs/promises';
import path from 'path';
import FileModel from '../models/MySQL/FileModel.js';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

const TMP_DIR = path.join('src/data/tmp');

export async function createFile({
  title,
  space_id,
  owner_id,
  group_id,
  content = ''
}) {
  const fileModel = new FileModel();

  await fs.mkdir(TMP_DIR, { recursive: true });

  // sanitize filename
  const safeTitle = title.replace(/[^\w\d-_ ]+/g, '').trim();
  const timestamp = Date.now();


//   const filename = `${safeTitle}.html`; // or .docx later
  const filename = `${safeTitle}_o${owner_id}_${timestamp}.html`;
  const filePath = path.join(TMP_DIR, filename);

  // 1. create physical temp file
  await fs.writeFile(filePath, content, 'utf8');

  // 2. save DB record
  const file = await fileModel.create_file({
    space_id,
    owner_id,
    group_id,
    filename,
    content,
    path: filePath,
    cld_url: null,
    public_id: null,
    mimetype: 'text/html',
    size: Buffer.byteLength(content),
    status: "local",
  });

  return file;
}



export async function updateDraft({
  file_id,
  content
}) {
  const fileModel = new FileModel();

  // 1️⃣ Get file info from DB
  const file = await fileModel.findById(file_id);
  if (!file) throw new Error('File not found');

  // 2️⃣ Determine temp file path
  let filePath = file.path;
  if (!filePath) {
    // If path does not exist (first draft), generate one
    const safeTitle = file.filename.replace(/[^\w\d-_ ]+/g, '').trim();
    const timestamp = Date.now();
    const filename = `${safeTitle}_o${file.owner_id}_${timestamp}.html`;
    filePath = path.join(TMP_DIR, filename);
  }

  // 3️⃣ Ensure temp directory exists
  await fs.mkdir(TMP_DIR, { recursive: true });

  // 4️⃣ Write draft content to temp file
  await fs.writeFile(filePath, content, 'utf8');

  // 5️⃣ Update DB
  await fileModel.saveDraft(file_id, content);

  // Optionally update the path in DB if it was null
  if (!file.path) {
    await fileModel.updateCloudInfo(file_id, {
      cloud_url: null,
      public_id: null,
      status: 'drafted',
      path: filePath
    });
  }

  return {
    file_id,
    path: filePath,
    content
  };
}


export async function createDocxFromHtml(file) {
  const safeTitle = file.filename.replace(/[^\w\d-_ ]+/g, '').trim();
  const docxFilename = `${safeTitle}.docx`;
  const docxPath = path.join(TMP_DIR, docxFilename);

  const htmlLines = file.content.split(/\n|<br\s*\/?>/i);

  const children = htmlLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Function to extract inline color from style="color:#XXXXXX"
      const extractColor = (html) => {
        const match = html.match(/color\s*:\s*#?([0-9a-fA-F]{3,6})/i);
        return match ? match[1] : "000000"; // fallback black
      };

      const color = extractColor(line);

      // H1
      const h1Match = line.match(/<h1>(.*?)<\/h1>/i);
      if (h1Match) {
        return new Paragraph({
          children: [
            new TextRun({
              text: h1Match[1],
              bold: true,
              color,
              size: 32, // 16pt
            }),
          ],
          spacing: { after: 200 },
        });
      }

      // H2
      const h2Match = line.match(/<h2>(.*?)<\/h2>/i);
      if (h2Match) {
        return new Paragraph({
          children: [
            new TextRun({
              text: h2Match[1],
              bold: true,
              color,
              size: 28, // 14pt
            }),
          ],
          spacing: { after: 150 },
        });
      }

      // Bold and Italic in paragraphs
      let text = line.replace(/<b>(.*?)<\/b>/gi, (_, m) => m);
      text = text.replace(/<strong>(.*?)<\/strong>/gi, (_, m) => m);
      text = text.replace(/<i>(.*?)<\/i>/gi, (_, m) => m);
      text = text.replace(/<em>(.*?)<\/em>/gi, (_, m) => m);

      return new Paragraph({
        children: [
          new TextRun({
            text,
            color, // user color if exists, else fallback black
            size: 24, // 12pt
          }),
        ],
        spacing: { after: 120 },
      });
    });

  const doc = new Document({
    sections: [{ children }],
  });

  await fs.mkdir(TMP_DIR, { recursive: true });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(docxPath, buffer);

  return {
    path: docxPath,
    filename: docxFilename,
  };
}