//
// Functions for encryption / decryption
//
// I have not made a module of this, since the debugging in chrome debug is harder with modules
// Import into html-file  <script src="lib/pragma-encryption-lib.js"></script>  to get functions available
// 

// Constants
const nodeCrypto = require('crypto');
const cipher = 'aes-128-cbc';  // Cipher for encryption / decryption of own secrets

// Encryption / Decryption
function encrypt( secretToEncrypt, password){
    // Example use :
    //
    // password = 'mypassword';
    //
    // encryptedSecret = encrypt( 'abc', password);
    // console.log(encryptedSecret); 
    
    // Encrypt
    var mykey = nodeCrypto.createCipher( cipher, password);
    var encryptedSecret = mykey.update(secretToEncrypt, 'utf8', 'hex')
    encryptedSecret += mykey.final('hex');
    
    return encryptedSecret
} 
function decrypt( stringToDecrypt, password){    
    // Example use :
    //
    // password = 'mypassword';
    // encryptedSecret = '34feb914c099df25794bf9ccb85bea72';
    //
    // decryptedSecret = decrypt( encryptedSecret, password);
    // console.log(decryptedSecret); 
    
    // Decrypt
    var mykey = nodeCrypto.createDecipher( cipher, password);
    var decryptedSecret = mykey.update( stringToDecrypt, 'hex', 'utf8');
    decryptedSecret += mykey.final('utf8');
    
    return decryptedSecret;
}
