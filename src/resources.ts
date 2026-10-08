/**
 * Model Context Protocol Resources for Axis ERP.
 *
 * Exposes live student documents that Claude and other AI models
 * can attach and reference in context:
 *   - erp://attendance (live percentage, risk, bunk headroom)
 *   - erp://timetable (complete weekly schedule)
 *   - erp://profile (student identity details)
 *   - erp://notices (latest circulars)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "./client.js";
import { formatResponse } from "./format.js";

export function registerResources(server: McpServer): void {
  server.resource(
    "attendance-report",
    "erp://attendance",
    {
      description: "Live student attendance record with attended/total counts, overall percentage, risk verdict, and bunk headroom.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const data = await client.get("/v1/attendance");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: formatResponse("attendance", data),
          },
        ],
      };
    }
  );

  server.resource(
    "weekly-timetable",
    "erp://timetable",
    {
      description: "Full weekly timetable matrix with lecture periods, room numbers, and faculty names.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const data = await client.get("/v1/timetable");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: formatResponse("timetable", data),
          },
        ],
      };
    }
  );

  server.resource(
    "student-profile",
    "erp://profile",
    {
      description: "Signed-in student profile with roll number, semester, branch, and student ID.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const data = await client.get("/v1/me");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: formatResponse("me", data),
          },
        ],
      };
    }
  );

  server.resource(
    "recent-notices",
    "erp://notices",
    {
      description: "Latest official college notices and circulars.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const data = await client.get("/v1/notices");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: formatResponse("notices", data, { limit: 15 }),
          },
        ],
      };
    }
  );
}
