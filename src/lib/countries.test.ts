import { describe, expect, it } from "bun:test";
import { DESTINATION_COUNTRIES } from "./countries";

describe("destination countries", () => {
  it("includes the 249 ISO world destinations rather than nationality labels", () => {
    expect(DESTINATION_COUNTRIES).toHaveLength(249);
    expect(DESTINATION_COUNTRIES.find((country) => country.code === "EG")?.name_ar).toBe("مصر");
    expect(DESTINATION_COUNTRIES.find((country) => country.code === "SD")?.name_en).toBe("Sudan");
    expect(DESTINATION_COUNTRIES.find((country) => country.code === "JP")?.name_en).toBe("Japan");
  });
});