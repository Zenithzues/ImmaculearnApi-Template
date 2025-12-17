import express from "express";
import fs from "fs";
import { google } from "googleapis";
import open from "open";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const TOKEN_PATH = "token.json";

const credentials = JSON.parse(fs.readFileSync("src/core/oauth_Immaculearn.json"));
const { client_id, client_secret, redirect_uris } = credentials.web; // web client

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0] // e.g., http://localhost:3000/oauth2callback
);

const app = express();

// Step 1: Start authorization
app.get("/", async (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  // Open browser automatically
  await open(authUrl);

  res.send(
    "Browser opened for Google authorization. After allowing access, Google will redirect to /oauth2callback."
  );
});

// Step 2: Handle the redirect/callback
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send("No code received!");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send("Authorization successful! You can close this tab.");
    console.log("Token saved to", TOKEN_PATH);

    // Optional: upload a file immediately
    await uploadFile();
  } catch (err) {
    console.error(err);
    res.send("Error retrieving access token");
  }
});

// Step 3: Upload a file
async function uploadFile() {
  const drive = google.drive({ version: "v3", auth: oAuth2Client });
  const filePath = "test.txt";

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  const fileMetadata = { name: "test_web_oauth.txt" };
  const media = { mimeType: "text/plain", body: fs.createReadStream(filePath) };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, name",
  });

  console.log("Uploaded file:", response.data);
}

// Step 4: Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT} to start OAuth flow`);
});
