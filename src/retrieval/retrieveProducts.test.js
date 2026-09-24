import { normalizeQuery, retrieveProducts } from "./retrieveProducts";

describe("normalizeQuery", () => {
  it("handles empty and invalid input", () => {
    expect(normalizeQuery("").tokens).toEqual([]);
    expect(normalizeQuery("   ").tokens).toEqual([]);
    expect(normalizeQuery(null).tokens).toEqual([]);
    expect(normalizeQuery(undefined).tokens).toEqual([]);
  });

  it("lowercases and trims text", () => {
    const result = normalizeQuery("  Which IPHONE 6S  ");
    expect(result.normalized).toBe("which iphone 6s");
    expect(result.tokens).toContain("iphone");
    expect(result.tokens).toContain("6s");
  });
});

describe("retrieveProducts (keyword-based, not vector search)", () => {
  it("returns a safe empty result for empty queries", () => {
    const result = retrieveProducts("");
    expect(result.matches).toEqual([]);
    expect(result.message).toMatch(/enter a question/i);
  });

  it("returns in-stock products for stock questions", () => {
    const result = retrieveProducts("Which products are in stock?", { limit: 10 });
    const ids = result.matches.map((m) => m.product.id);
    expect(ids).toEqual(expect.arrayContaining([0, 1, 2, 3]));
    expect(ids).not.toContain(4);
    expect(ids).not.toContain(5);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("returns fast delivery products", () => {
    const result = retrieveProducts("Which product has fast delivery?");
    const ids = result.matches.map((m) => m.product.id);
    expect(ids).toEqual(expect.arrayContaining([0, 2]));
    expect(result.matches.every((m) => m.product.fastDelivery)).toBe(true);
  });

  it("prioritizes higher ratings", () => {
    const result = retrieveProducts("Show products with a high rating");
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0].product;
    expect(top.ratings).toBeGreaterThanOrEqual(4);
  });

  it("finds price for a named product", () => {
    const result = retrieveProducts("What is the price of iPhone 6S?");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].product.id).toBe(0);
    expect(result.matches[0].product.price).toBe(799);
  });

  it("does not invent camera information", () => {
    const result = retrieveProducts("Which product has the best camera?");
    expect(result.matches).toEqual([]);
    expect(result.unsupportedTerms).toContain("camera");
    expect(result.message.toLowerCase()).toMatch(/does not contain/);
  });
});
