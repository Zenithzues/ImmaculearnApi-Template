import fs from "fs";
import { google } from "googleapis";

async function uploadFile() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "src/core/serviceAccount_Immaculearn.json",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name: "test.txt", // Name on Drive
    parents: [process.env.FOLDER_ID], // Replace with your folder ID
  };

  const media = {
    mimeType: "text/plain",
    body: fs.createReadStream("src/utils/test.txt"), // Local file path
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, name",
  });

  console.log("Uploaded file:", response.data);
}

uploadFile().catch(console.error);
