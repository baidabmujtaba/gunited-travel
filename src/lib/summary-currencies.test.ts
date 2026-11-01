import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { summaryTotals } from "./summary-currencies";

describe("order summary currencies", () => {
  it("shows the same final USD total in SDG, USD, SAR and AED", () => {
    assert.deepEqual(summaryTotals(100, [
      { code: "SDG", rate: 2000, decimals: 2 },
      { code: "SAR", rate: 3.75, decimals: 2 },
      { code: "AED", rate: 3.6725, decimals: 2 },
    ]), [
      { code: "SDG", total: 200000 },
      { code: "USD", total: 100 },
      { code: "SAR", total: 375 },
      { code: "AED", total: 367.25 },
    ]);
  });
  it("never invents an unavailable exchange rate", () => {
    assert.equal(summaryTotals(100, [])[0].total, null);
  });
});