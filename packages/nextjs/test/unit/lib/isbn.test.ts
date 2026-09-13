// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  classifyBarcode,
  hasValidEan13CheckDigit,
  hasValidIsbn10CheckDigit,
  isbn10To13,
  parseTypedIsbn,
} from "~~/lib/isbn";

describe("check digits", () => {
  it.each(["9780063345164", "9780306406157", "9798886450002", "0036000291452"])("accepts EAN-13 %s", code => {
    expect(hasValidEan13CheckDigit(code)).toBe(true);
  });

  it.each(["9780063345165", "978006334516", "97800633451644", "978006334516X"])("rejects EAN-13 %s", code => {
    expect(hasValidEan13CheckDigit(code)).toBe(false);
  });

  it.each(["0306406152", "080442957X", "0063345161"])("accepts ISBN-10 %s", code => {
    expect(hasValidIsbn10CheckDigit(code)).toBe(true);
  });

  it.each(["0306406153", "08044295X7", "030640615"])("rejects ISBN-10 %s", code => {
    expect(hasValidIsbn10CheckDigit(code)).toBe(false);
  });

  it("converts ISBN-10 to ISBN-13", () => {
    expect(isbn10To13("0306406152")).toBe("9780306406157");
    expect(isbn10To13("0063345161")).toBe("9780063345164");
    expect(isbn10To13("080442957X")).toBe("9780804429573");
  });
});

describe("parseTypedIsbn", () => {
  it.each([
    ["9780063345164", "9780063345164"],
    ["978-0-06-334516-4", "9780063345164"],
    [" 978 0063345164 ", "9780063345164"],
    ["0-06-334516-1", "9780063345164"],
    ["080442957x", "9780804429573"],
  ])("reads %j", (typed, isbn13) => {
    expect(parseTypedIsbn(typed)).toBe(isbn13);
  });

  it.each(["", "12345", "9780063345165", "0036000291452", "0306406153", "978006334516a"])("rejects %j", typed => {
    expect(parseTypedIsbn(typed)).toBeNull();
  });
});

describe("classifyBarcode", () => {
  it("recognizes a book's ISBN barcode", () => {
    expect(classifyBarcode("9780063345164", "ean_13")).toEqual({ kind: "isbn", isbn13: "9780063345164" });
    expect(classifyBarcode("9798886450002")).toEqual({ kind: "isbn", isbn13: "9798886450002" });
  });

  it("calls UPC and non-book EAN codes store codes", () => {
    expect(classifyBarcode("036000291452", "upc_a")).toEqual({ kind: "store-code" });
    expect(classifyBarcode("0036000291452", "ean_13")).toEqual({ kind: "store-code" });
    expect(classifyBarcode("96385074", "ean_8")).toEqual({ kind: "store-code" });
  });

  it("ignores misreads that fail the check digit", () => {
    expect(classifyBarcode("9780063345165", "ean_13")).toEqual({ kind: "unreadable" });
    expect(classifyBarcode("hello", "qr_code")).toEqual({ kind: "unreadable" });
  });
});
