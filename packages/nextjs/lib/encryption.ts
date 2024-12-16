// This is a basic implementation. Need more robust encryption library if this becomes real.
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "no-fallback-key";

export const encrypt = (text: string): string => {
  try {
    // More secure implementation using the encryption key
    const timestamp = Date.now();
    const data = `${text}:${timestamp}`;
    // Create a signature using the key
    const signature = btoa(encodeURIComponent(`${data}:${ENCRYPTION_KEY}`));
    return btoa(
      encodeURIComponent(
        JSON.stringify({
          data,
          signature,
          timestamp,
        }),
      ),
    );
  } catch (error) {
    console.error("Encryption error:", error);
    return "";
  }
};

export const decrypt = (encrypted: string): string => {
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(encrypted)));

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

    const [data] = decoded.data.split(":");
    return data;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Invalid data");
  }
};