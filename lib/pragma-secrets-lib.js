//
// Functions for encryption / decryption
//
// I have not made a module of this, since the debugging in chrome debug is harder with modules
// Import into html-file  <script src="lib/pragma-secrets-lib.js"></script>  to get functions available
// 

// https://www.npmjs.com/package/@hackolade/keytar
const keytar = require('@hackolade/keytar');  // This version works for MacOs, Windows, Linux (with libsecret for linux)

// Service name for keytar (identifies your app in the keychain)
const SERVICE_NAME = 'Pragma-git secret';

// =============================================
// Save secret with URL as the key
// =============================================
async function saveSecret(url, secret) {
  // Store the entire secret object as JSON
  await keytar.setPassword(SERVICE_NAME, url, JSON.stringify(secret));
  console.log(`Secret saved for ${url}`);
}

// =============================================
// Retrieve secret by URL
// =============================================
async function getSecret(url) {
  // Retrieve the stored JSON
  const stored = await keytar.getPassword(SERVICE_NAME, url);
  
  if (!stored) {
    throw new Error(`No secret found for ${url}`);
  }

  // Parse and return the secret
  return JSON.parse(stored);
}

// =============================================
// Delete secret by URL
// =============================================
async function deleteSecret(url) {
  const deleted = await keytar.deletePassword(SERVICE_NAME, url);
  if (deleted) {
    console.log(`Secret deleted for ${url}`);
  }
  return deleted;
}
