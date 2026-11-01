import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { DESTINATION_COUNTRIES } from "./countries";

describe("destination countries", () => {
  it("includes the 249 ISO world destinations rather than nationality labels", () => {
    assert.equal(DESTINATION_COUNTRIES.length, 249);
    assert.equal(DESTINATION_COUNTRIES.find((country) => country.code === "EG")?.name_ar, "مصر");
    assert.equal(DESTINATION_COUNTRIES.find((country) => country.code === "SD")?.name_en, "Sudan");
    assert.equal(DESTINATION_COUNTRIES.find((country) => country.code === "JP")?.name_en, "Japan");
  });
});