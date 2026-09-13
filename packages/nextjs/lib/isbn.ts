// Recognizing book numbers in what a scanner reads or a person types. Used in the browser and on
// the server, so it has no dependencies.

const digitsOf = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

/** True if the last digit of a 13-digit EAN (which includes every ISBN-13) is its check digit. */
export function hasValidEan13CheckDigit(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const sum = [...code.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(code[12]);
}

/** True if a 10-character ISBN (digits, possibly ending in X) has a valid check digit. */
export function hasValidIsbn10CheckDigit(code: string): boolean {
  if (!/^\d{9}[\dX]$/.test(code)) return false;
  const sum = [...code].reduce((total, char, index) => total + (char === "X" ? 10 : Number(char)) * (10 - index), 0);
  return sum % 11 === 0;
}

/** The ISBN-13 for a valid ISBN-10 (prefix 978, new check digit). */
export function isbn10To13(isbn10: string): string {
  const body = "978" + isbn10.slice(0, 9);
  const sum = [...body].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}

const isBookland = (ean13: string) => ean13.startsWith("978") || ean13.startsWith("979");

/** A typed ISBN (10 or 13 digits, spaces and hyphens allowed) as a valid ISBN-13, or null. */
export function parseTypedIsbn(input: string): string | null {
  const code = digitsOf(input);
  if (code.length === 13) return isBookland(code) && hasValidEan13CheckDigit(code) ? code : null;
  if (code.length === 10) return hasValidIsbn10CheckDigit(code) ? isbn10To13(code) : null;
  return null;
}

export type ScannedBarcode =
  | { kind: "isbn"; isbn13: string }
  // UPC codes (common on mass-market paperbacks and magazines) and other EANs identify a product,
  // not a book edition: the ISBN is usually printed near the barcode instead.
  | { kind: "store-code" }
  | { kind: "unreadable" };

/** What a barcode the camera read means for cataloging. */
export function classifyBarcode(rawValue: string, format?: string): ScannedBarcode {
  const code = digitsOf(rawValue);
  if (format && format !== "ean_13") return /^\d+$/.test(code) ? { kind: "store-code" } : { kind: "unreadable" };
  if (!hasValidEan13CheckDigit(code)) return { kind: "unreadable" };
  return isBookland(code) ? { kind: "isbn", isbn13: code } : { kind: "store-code" };
}
