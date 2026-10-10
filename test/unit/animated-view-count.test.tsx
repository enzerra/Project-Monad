import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatedViewCount, getViewCountChange } from "../../src/components/animated-view-count";

describe("observed YouTube view counter", () => {
  it("preserves digit places through a thousands rollover and shows the exact delta", () => {
    const before = getViewCountChange(999, 999);
    const after = getViewCountChange(999, 1002);
    expect(after.delta).toBe(3);
    expect(after.direction).toBe(1);
    expect(after.glyphs.map(glyph => glyph.character).join("")).toBe("1.002");
    expect(after.glyphs.at(-1)?.key).toBe(before.glyphs.at(-1)?.key);
  });
  it("allows a genuine YouTube correction to roll down instead of inflating the count", () => {
    expect(getViewCountChange(12000, 11973)).toMatchObject({ delta: -27, direction: -1 });
  });
  it("does not invent an increase for an unchanged cached observation", () => {
    expect(getViewCountChange(12000, 12000)).toMatchObject({ delta: 0, direction: 0 });
  });
  it("renders the real initial total on the server without a fake entrance or increase", () => {
    const html = renderToStaticMarkup(createElement(AnimatedViewCount, { value: 12000 }));
    expect(html).toContain('aria-label="12.000"');
    expect(html).not.toContain("view-count-delta");
    expect(html).not.toContain("translateY");
  });
});
