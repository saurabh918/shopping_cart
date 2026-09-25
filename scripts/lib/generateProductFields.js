const { faker } = require("@faker-js/faker");
const { buildBlurb, buildSearchText } = require("./buildProductText");
const { buildProductName } = require("./deriveCategory");
const { stableHash } = require("./assignExternalImage");

/** Share of generated laptops priced below 500 (deterministic per id + seed). */
const LAPTOP_BUDGET_SHARE_PERCENT = 28;

function priceRangeForCategory(category) {
  switch (category) {
    case "mobiles":
      return { min: 199, max: 999 };
    case "laptops":
      return { min: 500, max: 1999 };
    default:
      return { min: 19, max: 999 };
  }
}

function generateMobilePrice(productId, globalSeed) {
  faker.seed(globalSeed + productId * 9973);
  const { min, max } = priceRangeForCategory("mobiles");
  return faker.datatype.number({ min, max });
}

/**
 * Deterministic laptop pricing: ~28% budget (349–499), remainder standard (500–1999).
 */
function generateLaptopPrice(productId, globalSeed) {
  faker.seed(globalSeed + productId * 9973);
  const bucket = stableHash(`laptop-price:${globalSeed}:${productId}`) % 100;
  if (bucket < LAPTOP_BUDGET_SHARE_PERCENT) {
    return faker.datatype.number({ min: 349, max: 499 });
  }
  return faker.datatype.number({ min: 500, max: 1999 });
}

function generatePrice(category, productId, globalSeed) {
  if (category === "laptops") {
    return generateLaptopPrice(productId, globalSeed);
  }
  return generateMobilePrice(productId, globalSeed);
}

/**
 * fastDelivery true → deliveryDays 1–3; false → deliveryDays 3–7 (no contradiction).
 */
function generateDeliveryFields(productId, globalSeed) {
  faker.seed(globalSeed + productId * 9973 + 41);
  const fastDelivery = faker.datatype.boolean();
  const deliveryDays = fastDelivery
    ? faker.datatype.number({ min: 1, max: 3 })
    : faker.datatype.number({ min: 3, max: 7 });
  return { fastDelivery, deliveryDays };
}

function generateProductFields(productId, category, globalSeed) {
  faker.seed(globalSeed + productId * 9973);

  const price = generatePrice(category, productId, globalSeed);
  const inStock = faker.datatype.number({ min: 0, max: 15 });
  const stockStatus = inStock > 0 ? "in_stock" : "out_of_stock";
  const { fastDelivery, deliveryDays } = generateDeliveryFields(productId, globalSeed);
  const ratings = faker.datatype.number({ min: 1, max: 5 });
  const name = buildProductName(category, productId, globalSeed);

  const draft = {
    id: productId,
    name,
    price,
    inStock,
    fastDelivery,
    deliveryDays,
    ratings,
    stockStatus,
  };

  return {
    ...draft,
    blurb: buildBlurb(draft),
    searchText: buildSearchText(draft, category),
  };
}

module.exports = {
  LAPTOP_BUDGET_SHARE_PERCENT,
  priceRangeForCategory,
  generatePrice,
  generateDeliveryFields,
  generateProductFields,
};
