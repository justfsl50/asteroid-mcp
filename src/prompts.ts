/**
 * Pre-built Model Context Protocol Prompts for Axis ERP.
 *
 * Provides ready-to-use assistant templates in Claude Desktop:
 *   - daily_brief: morning lecture briefing and alerts
 *   - bunk_calculator: intelligent safe-to-skip analysis
 *   - exam_prep: syllabus and study material readiness
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "daily_brief",
    "Morning briefing with today's classes, attendance health, and circulars.",
    {},
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Please give me my daily briefing using the 'dashboard' and 'notices' tools:\n1. Today's class schedule, timings, and classroom locations.\n2. My current overall attendance percentage and risk status.\n3. How many classes I can afford to skip today.\n4. Any urgent recent circulars or announcements posted this week.",
          },
        },
      ],
    })
  );

  server.prompt(
    "bunk_calculator",
    "Calculate exact lectures needed to reach 75% or safe headroom to skip.",
    {
      subject: z.string().optional().describe("Specific subject name or code (e.g. BCS701). Leave empty for overall attendance."),
    },
    (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please calculate my bunk analysis using the 'attendance' tool (with detail=true):\n` +
              (args.subject ? `Focus on the subject: "${args.subject}".\n` : "Check my overall attendance and per-subject risk.\n") +
              `Tell me:\n1. How many more classes I can safely skip while staying above 75%.\n` +
              `2. If I am below 75%, how many consecutive classes I MUST attend to recover.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "exam_prep",
    "Check examination schedule, syllabus progress, and study materials.",
    {},
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Help me prepare for exams using the 'exams', 'subjects', and 'question_bank' tools:\n1. List my upcoming or active exam types.\n2. Check syllabus coverage across my subjects and identify which ones lag behind.\n3. List available study materials, unit notes, and question papers for my weak subjects.",
          },
        },
      ],
    })
  );
}
