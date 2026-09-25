import {
  parsePriceFilter,
  parseRatingFilter,
  parseCategoryFilter,
  parseStructuredQuery,
  productMatchesStructured,
} from "./structuredFilters";

describe("structuredFilters parsing", () => {
  it("parses price under/below without treating rating above as price", () => {
    expect(parsePriceFilter("show me products under 500")).toEqual({
      operator: "lt",
      threshold: 500,
    });
    expect(parsePriceFilter("show me products rated above 4")).toBeNull();
  });

  it("parses rating above as strict gt", () => {
    expect(parseRatingFilter("show me products rated above 4")).toEqual({
      operator: "gt",
      threshold: 4,
    });
  });

  it("parses rated N and above as gte", () => {
    expect(parseRatingFilter("products rated 4 and above")).toEqual({
      operator: "gte",
      threshold: 4,
    });
  });

  it("parses rating at least as gte", () => {
    expect(parseRatingFilter("rating at least 4")).toEqual({
      operator: "gte",
      threshold: 4,
    });
  });

  it("parses rating below as lt", () => {
    expect(parseRatingFilter("products rated below 4")).toEqual({
      operator: "lt",
      threshold: 4,
    });
  });

  it("normalizes category tokens", () => {
    expect(parseCategoryFilter("show me laptops")).toBe("laptop");
    expect(parseCategoryFilter("show me laptop")).toBe("laptop");
    expect(parseCategoryFilter("show me notebooks")).toBe("laptop");
    expect(parseCategoryFilter("show me mobile products")).toBe("mobile");
    expect(parseCategoryFilter("show me phones")).toBe("mobile");
    expect(parseCategoryFilter("which phone has the best camera")).toBeNull();
  });

  it("combines filters in parseStructuredQuery", () => {
    const structured = parseStructuredQuery("show me laptops under 500 with fast delivery");
    expect(structured.category).toBe("laptop");
    expect(structured.priceFilter).toEqual({ operator: "lt", threshold: 500 });
    expect(structured.fastDelivery).toBe(true);
    expect(structured.ratingFilter).toBeNull();
  });
});

describe("productMatchesStructured AND semantics", () => {
  const laptopCheapFast = {
    id: 1,
    name: "Core Laptop",
    price: 400,
    ratings: 3,
    fastDelivery: true,
    searchText: "core laptop category laptop category notebook",
  };
  const mobileCheap = {
    id: 2,
    name: "Nova Phone",
    price: 400,
    ratings: 3,
    fastDelivery: true,
    searchText: "nova phone category mobile category phone",
  };

  it("requires category and price together", () => {
    const structured = parseStructuredQuery("laptops under 500");
    expect(productMatchesStructured(laptopCheapFast, structured)).toBe(true);
    expect(productMatchesStructured(mobileCheap, structured)).toBe(false);
  });

  it("requires ratings > threshold for above filter", () => {
    const structured = parseStructuredQuery("rated above 4");
    expect(productMatchesStructured({ ...laptopCheapFast, ratings: 5 }, structured)).toBe(true);
    expect(productMatchesStructured({ ...laptopCheapFast, ratings: 4 }, structured)).toBe(false);
  });
});
