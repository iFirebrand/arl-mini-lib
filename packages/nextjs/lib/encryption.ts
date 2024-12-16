// This is a basic implementation. Need more robust encryption library if this becomes real.
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "no-fallback-key";

export const encrypt = (text: string): string => {
  try {
    const timestamp = Date.now();
    const data = `${text}:${timestamp}`;
    // Create a signature using the key
    const signature = btoa(encodeURIComponent(`${data}:${ENCRYPTION_KEY}`));
    const payload = {
      data,
      signature,
      timestamp,
    };
    console.log("Encrypting payload:", payload);
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  } catch (error) {
    console.error("Encryption error:", error);
    return "";
  }
};

export const decrypt = (encrypted: string): string => {
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(encrypted)));
    console.log("Decoded outer structure:", decoded);

    // Verify signature
    const expectedSignature = btoa(encodeURIComponent(`${decoded.data}:${ENCRYPTION_KEY}`));

    if (decoded.signature !== expectedSignature) {
      throw new Error("Invalid signature");
    }

    // Check if data is too old (optional)
    const age = Date.now() - decoded.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      // 24 hours
      throw new Error("Data has expired");
    }

    // Extract the JSON part before the timestamp
    const match = decoded.data.match(/(.*)}]}/);
    if (match && match[1]) {
      const fullData = match[1] + "}]}";
      console.log("Extracted data:", fullData);
      return fullData;
    }

    throw new Error("Could not extract valid JSON data");
  } catch (error) {
    console.error("Decryption error:", error, "Full stack:", error.stack);
    throw new Error("Invalid data");
  }
};
