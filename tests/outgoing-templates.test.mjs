import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTGOING_TEMPLATE_KEYS,
  outgoingTemplateContent,
} from "../app/outgoing-templates.ts";

test("provides five editable official letter templates plus custom mode", () => {
  assert.deepEqual(OUTGOING_TEMPLATE_KEYS, [
    "custom",
    "invitation",
    "notice",
    "recommendation",
    "assignment",
    "reply",
  ]);
});

test("every official template is available in all three languages", () => {
  for (const locale of ["tet", "pt", "id"]) {
    for (const key of OUTGOING_TEMPLATE_KEYS.slice(1)) {
      assert.ok(outgoingTemplateContent(key, locale).length > 40);
    }
  }
});

test("custom mode starts with an empty editable letter", () => {
  assert.equal(outgoingTemplateContent("custom", "tet"), "");
});
