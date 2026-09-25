import { retrieveProducts, parsePriceFilter } from "./retrieveProducts";
import { getStagingProductKnowledgeBase, STAGING_CATALOG_SIZE } from "./stagingKnowledgeBase";
import { deriveCategoryForId } from "../../scripts/lib/deriveCategory";
import { productCategory } from "./structuredFilters";

const STAGING_SEED = 20250925;
const STAGING_RECORDS = getStagingProductKnowledgeBase();
const STAGING_IDS = new Set(STAGING_RECORDS.map((p) => p.id));

/** @type {Record<string, { totalEligible: number, returned: number, notes: string[] }>} */
const report = {};

function isStagingLaptop(product) {
  if (product.id <= 5) {
    return product.name.toLowerCase().includes("macbook");
  }
  return deriveCategoryForId(product.id, STAGING_SEED) === "laptops";
}

function isStagingMobile(product) {
  if (product.id <= 5) {
    return product.name.toLowerCase().includes("iphone");
  }
  return deriveCategoryForId(product.id, STAGING_SEED) === "mobiles";
}

function catalogLaptopsUnder(records, threshold) {
  return records.filter((p) => isStagingLaptop(p) && Number(p.price) < threshold);
}

function assertAllInStaging(matches) {
  const ids = matches.map((m) => m.product.id);
  expect(new Set(ids).size).toBe(ids.length);
  ids.forEach((id) => expect(STAGING_IDS.has(id)).toBe(true));
}

describe("staging retrieval (structured filters + staging KB)", () => {
  it("uses the 1,000-product staging catalog", () => {
    expect(STAGING_CATALOG_SIZE).toBe(1000);
    expect(STAGING_RECORDS.length).toBe(1000);
  });

  describe("category queries", () => {
    it("Show me laptops — laptop category only, plural supported", () => {
      const query = "Show me laptops";
      const matches = retrieveProducts(query, { records: STAGING_RECORDS, limit: 1000 }).matches;
      report[query] = {
        totalEligible: STAGING_RECORDS.filter(isStagingLaptop).length,
        returned: matches.length,
        notes: ["Structured category filter"],
      };
      expect(matches.length).toBeGreaterThan(0);
      assertAllInStaging(matches);
      expect(matches.every((m) => isStagingLaptop(m.product))).toBe(true);
      expect(matches.some((m) => isStagingMobile(m.product))).toBe(false);
    });

    it("Show me laptop products — same as laptops", () => {
      const matches = retrieveProducts("Show me laptop products", {
        records: STAGING_RECORDS,
        limit: 1000,
      }).matches;
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => isStagingLaptop(m.product))).toBe(true);
    });

    it("Show me notebooks — laptop category", () => {
      const matches = retrieveProducts("Show me notebooks", {
        records: STAGING_RECORDS,
        limit: 1000,
      }).matches;
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => isStagingLaptop(m.product))).toBe(true);
    });

    it("Show me mobile products — mobile only at default minScore", () => {
      const query = "Show me mobile products";
      const matches = retrieveProducts(query, { records: STAGING_RECORDS, limit: 1000 }).matches;
      report[query] = {
        totalEligible: STAGING_RECORDS.filter(isStagingMobile).length,
        returned: matches.length,
        notes: ["Structured category filter; minScore not applied on structured path"],
      };
      expect(matches.length).toBeGreaterThan(0);
      assertAllInStaging(matches);
      expect(matches.every((m) => isStagingMobile(m.product))).toBe(true);
      expect(matches.every((m) => productCategory(m.product) === "mobile")).toBe(true);
    });
  });

  describe("price queries", () => {
    it("Show me products under 500 — strict price only", () => {
      const matches = retrieveProducts("Show me products under 500", {
        records: STAGING_RECORDS,
        limit: 1000,
      }).matches;
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => m.product.price < 500)).toBe(true);
    });

    it("Show me laptops under 500 — laptop AND price", () => {
      const query = "Show me laptops under 500";
      const matches = retrieveProducts(query, { records: STAGING_RECORDS, limit: 1000 }).matches;
      const eligible = catalogLaptopsUnder(STAGING_RECORDS, 500);
      report[query] = {
        totalEligible: eligible.length,
        returned: matches.length,
        notes: ["Structured AND: category + price"],
      };
      expect(parsePriceFilter(query.toLowerCase())).toEqual({ operator: "lt", threshold: 500 });
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBe(eligible.length);
      assertAllInStaging(matches);
      expect(matches.every((m) => m.product.price < 500)).toBe(true);
      expect(matches.every((m) => isStagingLaptop(m.product))).toBe(true);
      expect(matches.some((m) => isStagingMobile(m.product))).toBe(false);
    });
  });

  describe("rating queries", () => {
    it("Show me products rated above 4 — strict ratings > 4", () => {
      const query = "Show me products rated above 4";
      const matches = retrieveProducts(query, { records: STAGING_RECORDS, limit: 1000 }).matches;
      const eligible = STAGING_RECORDS.filter((p) => p.ratings > 4);
      report[query] = {
        totalEligible: eligible.length,
        returned: matches.length,
        notes: ["Structured rating filter operator gt"],
      };
      expect(matches.length).toBe(eligible.length);
      assertAllInStaging(matches);
      expect(matches.every((m) => m.product.ratings > 4)).toBe(true);
      expect(matches.some((m) => m.product.ratings <= 4)).toBe(false);
    });
  });

  describe("delivery queries", () => {
    it("Show me products with fast delivery", () => {
      const query = "Show me products with fast delivery";
      const matches = retrieveProducts(query, { records: STAGING_RECORDS, limit: 1000 }).matches;
      report[query] = {
        totalEligible: STAGING_RECORDS.filter((p) => p.fastDelivery).length,
        returned: matches.length,
        notes: ["Structured fastDelivery filter"],
      };
      expect(matches.length).toBeGreaterThan(0);
      assertAllInStaging(matches);
      expect(matches.every((m) => m.product.fastDelivery === true)).toBe(true);
      expect(
        matches.filter((m) => m.product.fastDelivery && m.product.deliveryDays > 3).length,
      ).toBe(0);
    });

    it("Show me laptops with fast delivery", () => {
      const matches = retrieveProducts("Show me laptops with fast delivery", {
        records: STAGING_RECORDS,
        limit: 1000,
      }).matches;
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => isStagingLaptop(m.product) && m.product.fastDelivery)).toBe(
        true,
      );
    });
  });

  describe("combined filters", () => {
    it("Show me laptops under 500 with fast delivery — AND of all constraints", () => {
      const query = "Show me laptops under 500 with fast delivery";
      const matches = retrieveProducts(query, { records: STAGING_RECORDS, limit: 1000 }).matches;
      const ideal = STAGING_RECORDS.filter(
        (p) => isStagingLaptop(p) && p.price < 500 && p.fastDelivery,
      );
      report[query] = {
        totalEligible: ideal.length,
        returned: matches.length,
        notes: ["Structured AND: category + price + fast delivery"],
      };
      expect(matches.length).toBe(ideal.length);
      expect(matches.every((m) => m.product.price < 500)).toBe(true);
      expect(matches.every((m) => isStagingLaptop(m.product))).toBe(true);
      expect(matches.every((m) => m.product.fastDelivery)).toBe(true);
    });
  });

  it("prints staging retrieval report metrics", () => {
    // eslint-disable-next-line no-console
    console.log("STAGING_RETRIEVAL_REPORT", JSON.stringify(report, null, 2));
    expect(Object.keys(report).length).toBeGreaterThanOrEqual(5);
  });
});

describe("browser vs server catalog size (documentation)", () => {
  it("server production catalog matches 1,000-product canonical catalog", () => {
    const { getProductKnowledgeBase } = require("../../netlify/lib/catalog.cjs");
    expect(getProductKnowledgeBase({ ASSISTANT_CATALOG_MODE: "production" }).length).toBe(1000);
  });

  it("browser production catalog matches server production count", () => {
    jest.resetModules();
    const { getProductKnowledgeBase: browserKb } = require("../data/productCatalog");
    const { getProductKnowledgeBase: serverKb } = require("../../netlify/lib/catalog.cjs");
    expect(browserKb().length).toBe(1000);
    expect(serverKb({ ASSISTANT_CATALOG_MODE: "production" }).length).toBe(1000);
  });

  it("browser staging KB helper exposes 1000 products", () => {
    expect(STAGING_RECORDS.length).toBe(1000);
  });
});
