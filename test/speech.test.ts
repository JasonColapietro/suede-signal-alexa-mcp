import assert from "node:assert/strict";
import { test } from "node:test";
import { compareReports, describeLane, plain, shortFix, spokenHost, summarizeReport } from "../src/speech.js";
import { perfectReport, strongReport, weakReport } from "./fixtures.js";

test("plain decodes entities and speaks ampersands", () => {
  assert.equal(plain("Metadata &amp; Sharing"), "Metadata and Sharing");
  assert.equal(plain("A & B"), "A and B");
  assert.equal(plain("it&#39;s"), "it's");
});

test("shortFix keeps only the action", () => {
  assert.equal(shortFix("Add /llms.txt: a short markdown file."), "Add /llms.txt");
  assert.equal(
    shortFix("Break content into H2 sections. AI engines cite passages."),
    "Break content into H2 sections",
  );
  assert.equal(shortFix("Use exactly one H1 that states the answer."), "Use exactly one H1 that states the answer");
});

test("spokenHost drops scheme, www and path", () => {
  assert.equal(spokenHost("https://www.example.com/pricing"), "example.com");
  assert.equal(spokenHost("not a url"), "not a url");
});

test("summary leads with grade and caps fixes at three", () => {
  const text = summarizeReport(weakReport);
  assert.match(text, /^example\.com gets an F for AI visibility, 17 out of 100\./);
  assert.match(text, /strongest area is AI crawler access; citability needs the most work/);
  assert.match(text, /Top 3 fixes: Add \/llms\.txt; Use exactly one H1 .*; and Break content into H2 sections\.$/);
  assert.doesNotMatch(text, /Thin pages/);
  assert.doesNotMatch(text, /&amp;|https?:/);
});

test("summary handles a single fix and a clean sweep", () => {
  assert.match(summarizeReport(strongReport), /gets an A .* Top fix: Convert key points to bullet lists\.$/);
  const perfect = summarizeReport(perfectReport);
  assert.match(perfect, /Every area scores 100\./);
  assert.match(perfect, /Every check passed/);
});

test("comparison names the leader and the costliest gap", () => {
  const text = compareReports(weakReport, strongReport);
  assert.match(text, /^seo\.suedeai\.ai leads, 97 to 17 for AI visibility\./);
  assert.match(text, /example\.com trails most on citability, 0 versus 88\./);
  assert.match(text, /The first fix there: Use exactly one H1/);
});

test("comparison when ahead everywhere", () => {
  assert.match(compareReports(strongReport, weakReport), /matches or beats example\.com in every area\./);
  assert.match(compareReports(strongReport, strongReport), /are tied at 97/);
});

test("lane detail lists failed checks", () => {
  const text = describeLane(weakReport, "citability");
  assert.match(text, /scores 0 out of 100 on citability\. 1 of 5 checks passed\./);
  assert.match(text, /To fix: Use exactly one H1 .*; Break content into H2 sections; and Thin pages don't get cited\.$/);
  assert.match(describeLane(strongReport, "trust"), /Every check in that area passed\./);
});

test("shortFix drops a trailing ', the ...' reason", () => {
  assert.equal(
    shortFix("Convert key points to bullet lists, the format AI answers extract most often."),
    "Convert key points to bullet lists",
  );
});
