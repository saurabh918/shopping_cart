import { getSidebarBrowseCategories } from "./sidebarBrowseCategories";

describe("getSidebarBrowseCategories", () => {
  it("returns browse links only when matching product names exist", () => {
    const products = [
      { id: 0, name: "iPhone 6S" },
      { id: 2, name: "Macbook" },
      { id: 6, name: "Core Laptop 6" },
    ];
    const categories = getSidebarBrowseCategories(products);
    expect(categories.map((c) => c.label)).toEqual(["Laptops", "Macbooks", "Phones"]);
  });

  it("returns empty when no products match browse terms", () => {
    expect(getSidebarBrowseCategories([{ id: 1, name: "Widget" }])).toEqual([]);
  });
});
