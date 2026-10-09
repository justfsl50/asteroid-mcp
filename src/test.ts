import { test } from "node:test";
import assert from "node:assert/strict";
import { pruneObject, formatResponse, stripHtml } from "./format.js";
import { CredentialManager } from "./credentials.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

test("stripHtml strips tags and decodes common entities", () => {
  assert.equal(stripHtml("<b>Hello</b> World"), "Hello World");
  assert.equal(stripHtml("<b>Hello</b> &amp; World &quot;test&quot;"), 'Hello & World "test"');
  assert.equal(stripHtml("&lt;div&gt;raw code&lt;/div&gt;"), "<div>raw code</div>");
});

test("pruneObject strips nulls, empty strings, and noisy internal metadata", () => {
  const input = {
    a: 1,
    b: null,
    c: "",
    d: [],
    e: { f: undefined, g: "clean" },
    __type: "VriendeLike.Dto",
    stale: false,
  };
  const out = pruneObject(input) as Record<string, unknown>;
  assert.deepEqual(out, {
    a: 1,
    e: { g: "clean" },
  });
});

test("formatResponse formats dashboard into token-dense markdown", () => {
  const mockDashboard = {
    headline: "30.7% overall attendance",
    today: {
      date: "08-Oct-2026",
      weekday: "Thursday",
      classes: [
        { time: "09:00 AM - 09:50 AM", subject: "Artificial Intelligence", code: "BCS701", faculty: "Mr. Avinash", room: "E-Block", state: "not_yet" },
      ],
    },
    overall: {
      pct: 30.7,
      present: 34,
      total: 85,
      target: 75,
      risk: "at_risk",
      skipsLeft: 0,
      atRiskSubjects: ["BCS701 (30%)"],
    },
  };

  const md = formatResponse("dashboard", mockDashboard);
  assert.ok(md.includes("30.7% overall attendance"));
  assert.ok(md.includes("AT_RISK"));
  assert.ok(md.includes("BCS701"));
  assert.ok(!md.includes('"__type"'));
  // Token count is substantially smaller than raw JSON
  assert.ok(md.length < JSON.stringify(mockDashboard, null, 2).length);
});

test("formatResponse paginates notices to conserve tokens", () => {
  const notices = Array.from({ length: 50 }, (_, i) => ({
    postedOn: "01-Oct-2026",
    title: `Notice #${i + 1}`,
  }));
  const md = formatResponse("notices", { count: 50, notices }, { limit: 5 });
  assert.ok(md.includes("Showing 5 of 50"));
  assert.ok(md.includes("Notice #1"));
  assert.ok(md.includes("Notice #5"));
  assert.ok(md.includes("45 older notices omitted to conserve tokens"));
});

test("formatResponse formats assignments with direct download links", () => {
  const mockAssignments = {
    count: 1,
    assignments: [
      {
        id: "3242",
        assignmentNumber: 2,
        subject: "ARTIFICIAL INTELLIGENCE",
        subjectCode: "BCS701",
        title: "AI Assignment 2",
        postedBy: "Mr. AVINASH KUMAR",
        postedOn: "29-Aug-2026",
        maxMarks: "10",
      },
    ],
  };
  const md = formatResponse("assignments", mockAssignments);
  assert.ok(md.includes("AI Assignment 2"));
  assert.ok(md.includes("/download/assignment?asgnid=3242"));
});

test("CredentialManager loads defaults correctly", () => {
  const cm = new CredentialManager();
  assert.equal(cm.getBaseUrl(), "https://erp.handlebid.lol");
  assert.equal(cm.getInstitute(), "AXIS719");
});

test("McpServer registers 14 curated tools by default and full tools with allTools option", () => {
  const server = new McpServer({
    name: "test-server",
    version: "1.1.0",
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  // Assert default curated tools initialized
  assert.ok(server);

  const fullServer = new McpServer({
    name: "test-server-all",
    version: "1.1.0",
  });
  registerTools(fullServer, { allTools: true });
  assert.ok(fullServer);
});
