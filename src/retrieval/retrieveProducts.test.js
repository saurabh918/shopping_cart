import { normalizeQuery, parsePriceFilter, retrieveProducts } from "./retrieveProducts";

function matchPrices(result) {
  return result.matches.map((m) => m.product.price);
}

function matchIds(result) {
  return result.matches.map((m) => m.product.id);
}

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
    expect(result.matches.length).toBeGreaterThan(0);
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

  it("returns iPhone products for a product-line query", () => {
    const result = retrieveProducts("Show me iPhone products", { limit: 10 });
    const ids = result.matches.map((m) => m.product.id);
    expect(ids).toEqual(expect.arrayContaining([0, 1]));
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(3);
    expect(result.matches.every((m) => m.product.name.toLowerCase().includes("iphone"))).toBe(true);
  });

  it("does not invent camera information", () => {
    const result = retrieveProducts("Which product has the best camera?");
    expect(result.matches).toEqual([]);
    expect(result.unsupportedTerms).toContain("camera");
    expect(result.message.toLowerCase()).toMatch(/does not contain/);
  });

  describe("price filter queries", () => {
    it("parses supported under/below/less-than patterns", () => {
      expect(parsePriceFilter("show me products under 500")).toEqual({
        operator: "lt",
        threshold: 500,
      });
      expect(parsePriceFilter("products below $500")).toEqual({
        operator: "lt",
        threshold: 500,
      });
      expect(parsePriceFilter("products less than 500")).toEqual({
        operator: "lt",
        threshold: 500,
      });
      expect(parsePriceFilter("anything cheaper than $500")).toEqual({
        operator: "lt",
        threshold: 500,
      });
      expect(parsePriceFilter("items more than 1000")).toEqual({
        operator: "gt",
        threshold: 1000,
      });
      expect(parsePriceFilter("products over 1000")).toEqual({
        operator: "gt",
        threshold: 1000,
      });
    });

    it("returns products under 500 with strict less-than comparison", () => {
      const result = retrieveProducts("Show me products under 500", { limit: 10 });
      const prices = matchPrices(result);
      expect(prices.length).toBeGreaterThan(0);
      expect(prices.every((p) => p < 500)).toBe(true);
      const seedMatches = retrieveProducts("Show me products under 500", { limit: 500 }).matches;
      const seedIds = seedMatches.map((m) => m.product.id);
      expect(seedIds).toEqual(expect.arrayContaining([1, 5]));
      expect(seedIds).not.toContain(0);
    });

    it("returns products below $500", () => {
      const result = retrieveProducts("Products below $500", { limit: 10 });
      expect(matchPrices(result).every((p) => p < 500)).toBe(true);
    });

    it("returns products less than 500", () => {
      const result = retrieveProducts("Products less than 500", { limit: 10 });
      expect(matchPrices(result).every((p) => p < 500)).toBe(true);
    });

    it("returns products over 1000 with strict greater-than comparison", () => {
      const result = retrieveProducts("Products over 1000", { limit: 10 });
      const prices = matchPrices(result);
      expect(prices.length).toBeGreaterThan(0);
      expect(prices.every((p) => p > 1000)).toBe(true);
      const seedMatch = retrieveProducts("Products over 1000", { limit: 500 }).matches.find(
        (m) => m.product.id === 2,
      );
      expect(seedMatch?.product.price).toBe(1499);
    });

    it("returns no matches for under 100 when catalog has none", () => {
      const result = retrieveProducts("Products under 100", { limit: 10 });
      expect(result.matches).toEqual([]);
      expect(result.message.toLowerCase()).toMatch(/filter/);
      expect(result.unsupportedTerms).toEqual([]);
    });

    it("does not treat rated above 4 as a price filter", () => {
      expect(parsePriceFilter("show me products rated above 4")).toBeNull();
    });

    it("returns only laptops under 500 (no mobile leakage)", () => {
      const result = retrieveProducts("Show me laptops under 500", { limit: 10 });
      const prices = matchPrices(result);
      expect(prices.length).toBeGreaterThan(0);
      expect(prices.every((p) => p < 500)).toBe(true);
      expect(result.matches.some((m) => m.product.id > 5)).toBe(true);
      expect(
        result.matches.every((m) => {
          const name = m.product.name.toLowerCase();
          return name.includes("macbook") || name.includes("laptop") || name.includes("notebook");
        }),
      ).toBe(true);
    });
  });

  describe("Step 4 retrieval improvements", () => {
    it("returns all Macbook-line products for which MacBooks do you have?", () => {
      const result = retrieveProducts("which MacBooks do you have?");
      const ids = matchIds(result);
      expect(ids).toEqual(expect.arrayContaining([2, 3, 4, 5]));
      expect(result.matches.every((m) => m.product.name.toLowerCase().includes("macbook"))).toBe(
        true,
      );
    });

    it("show me MacBooks uses Macbook family matching", () => {
      const result = retrieveProducts("show me MacBooks");
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.every((m) => m.product.name.toLowerCase().includes("macbook"))).toBe(
        true,
      );
    });

    it("which iPhones are available returns iPhone products", () => {
      const result = retrieveProducts("which iPhones are available?");
      const ids = matchIds(result);
      expect(ids).toEqual(expect.arrayContaining([0, 1]));
      expect(result.matches.every((m) => m.product.name.toLowerCase().includes("iphone"))).toBe(
        true,
      );
    });

    it("show me laptops uses rating/stock browse ranking not only seed ids 2-4", () => {
      const result = retrieveProducts("Show me laptops");
      expect(result.matches.length).toBe(10);
      const topThreeIds = result.matches.slice(0, 3).map((m) => m.product.id);
      expect(topThreeIds).not.toEqual([2, 3, 4]);
    });

    it("laptops under $1000 keeps USD filtering and cheapest-first order", () => {
      const result = retrieveProducts("laptops under $1000");
      const prices = matchPrices(result);
      expect(prices.length).toBeGreaterThan(0);
      expect(prices.every((p) => p < 1000)).toBe(true);
      for (let i = 1; i < prices.length; i += 1) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it("laptops under ₹70000 rejects INR price filtering", () => {
      const result = retrieveProducts("laptops under ₹70000");
      expect(result.matches).toEqual([]);
      expect(result.message.toLowerCase()).toMatch(/usd-style|inr/);
      expect(result.unsupportedTerms).toContain("INR price filter");
    });

    it("laptop with 16GB RAM does not return generic laptops", () => {
      const result = retrieveProducts("laptop with 16GB RAM");
      expect(result.matches).toEqual([]);
      expect(result.unsupportedTerms.length).toBeGreaterThan(0);
    });

    it("laptop with 512GB SSD does not return generic laptops", () => {
      const result = retrieveProducts("laptop with 512GB SSD");
      expect(result.matches).toEqual([]);
    });

    it("laptop for programming does not return generic laptops", () => {
      const result = retrieveProducts("laptop for programming");
      expect(result.matches).toEqual([]);
      expect(result.message).toMatch(/programming use-case/);
    });

    it("good laptop for students does not return generic laptops", () => {
      const result = retrieveProducts("good laptop for students");
      expect(result.matches).toEqual([]);
    });

    it("laptop for office work does not return generic laptops", () => {
      const result = retrieveProducts("laptop for office work");
      expect(result.matches).toEqual([]);
    });
  });

  describe("structured category and rating filters", () => {
    it("returns laptop-category products for laptop queries", () => {
      const result = retrieveProducts("Show me laptops", { limit: 10 });
      expect(result.matches.length).toBeGreaterThan(0);
      expect(
        result.matches.every((m) => {
          const name = m.product.name.toLowerCase();
          return name.includes("macbook") || name.includes("laptop") || name.includes("notebook");
        }),
      ).toBe(true);
      expect(result.matches.some((m) => m.product.name.toLowerCase().includes("iphone"))).toBe(
        false,
      );
    });

    it("returns mobile-category products for mobile queries", () => {
      const result = retrieveProducts("Show me mobile products", { limit: 10 });
      const ids = matchIds(result);
      expect(ids.length).toBe(10);
      expect(
        result.matches.every((m) => {
          const name = m.product.name.toLowerCase();
          return name.includes("iphone") || name.includes("phone") || name.includes("mobile");
        }),
      ).toBe(true);
      expect(ids.some((id) => id > 5)).toBe(true);
    });

    it("enforces ratings > 4 for rated above 4", () => {
      const result = retrieveProducts("Show me products rated above 4", { limit: 10 });
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.every((m) => m.product.ratings > 4)).toBe(true);
    });

    it("keeps keyword ranking for high rating without numeric filter", () => {
      const result = retrieveProducts("Show products with a high rating");
      expect(result.matches.length).toBeGreaterThan(0);
      const top = result.matches[0].product;
      expect(top.ratings).toBeGreaterThanOrEqual(4);
    });
  });
});
