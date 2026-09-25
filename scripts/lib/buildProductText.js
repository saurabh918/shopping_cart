function buildBlurb(product) {
  const {
    name,
    price,
    inStock,
    ratings,
    deliveryDays,
    fastDelivery,
    stockStatus,
  } = product;

  const stockPhrase =
    stockStatus === "out_of_stock" || inStock <= 0
      ? "There are 0 units in stock (out of stock)."
      : `There are ${inStock} units in stock.`;

  const deliveryPhrase = `Estimated delivery is ${deliveryDays} day${deliveryDays === 1 ? "" : "s"}.`;

  const fastPhrase = fastDelivery
    ? "Fast delivery is available for this item."
    : "Fast delivery is not available for this item.";

  let blurb =
    `${name} is listed at $${price}. ${stockPhrase} `
    + `The rating is ${ratings} out of 5. ${deliveryPhrase} ${fastPhrase}`;

  if (stockStatus === "out_of_stock" && fastDelivery) {
    blurb +=
      " Fast delivery is marked as available in the catalog, but the item is out of stock.";
  }

  return blurb;
}

const { getSearchTextCategoryKeywords } = require("./deriveCategory");

function buildSearchText(product, category) {
  const {
    name,
    price,
    inStock,
    ratings,
    deliveryDays,
    fastDelivery,
    stockStatus,
  } = product;

  const categoryParts = category ? getSearchTextCategoryKeywords(category) : [];

  const parts = [
    name.toLowerCase(),
    ...categoryParts,
    String(price),
    "price",
    stockStatus === "out_of_stock" ? "out of stock" : `${inStock} in stock`,
    "rating",
    `${ratings} out of 5`,
    "delivery",
    `${deliveryDays} days`,
    fastDelivery ? "fast delivery available" : "fast delivery not available",
  ];

  return parts.join(" ");
}

module.exports = {
  buildBlurb,
  buildSearchText,
};
