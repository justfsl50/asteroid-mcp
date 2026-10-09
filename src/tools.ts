/**
 * Curated 14 Core Axis Colleges ERP Tools registered on the official McpServer.
 *
 * Designed with first-principles token efficiency (~950 tokens total schema),
 * deterministic routing, and zero binary context hazards.
 *
 * Passing `--all-tools` or `ASTEROID_TOOLS=all` loads the legacy 33-tool diagnostic suite.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { client } from "./client.js";
import { formatResponse } from "./format.js";

export function registerTools(server: McpServer, options: { allTools?: boolean } = {}): void {
  const loadAll = options.allTools || process.env.ASTEROID_TOOLS === "all" || process.argv.includes("--all-tools");

  // ── 1. Authentication & Student Profile ───────────────────────────────────

  server.tool(
    "sign_in",
    "Log in to Axis ERP with student username and password. Automatically creates and saves session token so all other tools work seamlessly without needing a password again.",
    {
      userId: z.string().describe("Your student ERP username / URN / CRN (e.g. 2023bcs084)"),
      password: z.string().describe("Your student ERP account password"),
      institute: z.string().optional().default("AXIS719").describe("Campus institute code: AXIS719 (AITM), AXIS720 (AIFT), AXIS721 (AIA), AXIS722 (ABS), AXIS723 (AIPM), AXISKN115 (AIHE), AXISPHARMACY, or AXISDIPLOMA. Defaults to AXIS719."),
    },
    async (args) => {
      try {
        const res = await client.signIn(args.userId, args.password, args.institute);
        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully authenticated as **${res.userId}** (${res.institute}). Session securely initialized and cached locally.`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `❌ Login failed: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    "me",
    "Returns the signed-in student profile: name, URN, roll number, program, branch, semester, section, and campus institute.",
    {},
    async () => {
      const data = await client.get("/v1/me");
      return {
        content: [{ type: "text", text: formatResponse("me", data) }],
      };
    }
  );

  // ── 2. Daily Driver: Dashboard & Attendance ──────────────────────────────

  server.tool(
    "dashboard",
    "[PRIORITY 1 - DEFAULT DAILY DRIVER] PRIMARY TOOL: Use for 'today's attendance', 'classes today', 'am I marked present', 'overall attendance %', or 'can I bunk'. Returns today's classes with live marking badges (Present ✅, Absent ❌, Pending ⏳) AND overall attendance (exact, rounded up, rounded down) plus safe skips in ONE single call.",
    {
      date: z.string().optional().describe("Date as dd-Mmm-yyyy or YYYY-MM-DD. Omit for today."),
      month: z.string().optional().describe("Month as YYYY-MM, MMM (Sep), or 1-12. Omit for cumulative attendance."),
      classesLeft: z.number().int().min(0).max(60).optional().describe("Lectures remaining this semester to project final percentage."),
    },
    async (args) => {
      const data = await client.get("/v1/dashboard", args);
      return {
        content: [{ type: "text", text: formatResponse("dashboard", data, args) }],
      };
    }
  );

  server.tool(
    "attendance",
    "[PRIORITY 2 - SUBJECT AUDIT] Full subject-by-subject percentage audit table with attended/total counts and safe skips per course.",
    {
      detail: z.boolean().optional().default(true).describe("Pass true for subject breakdown table. Defaults to true."),
      month: z.string().optional().describe("Month as YYYY-MM, MMM (Sep), or 1-12. Omit for cumulative figure."),
      classesLeft: z.number().int().min(0).max(60).optional().describe("Lectures remaining this semester to project final percentage."),
    },
    async (args) => {
      const data = await client.get("/v1/attendance", { ...args, detail: args.detail ?? true });
      return {
        content: [{ type: "text", text: formatResponse("attendance", data, args) }],
      };
    }
  );

  // ── 3. Schedule: Today & Weekly Timetable ────────────────────────────────

  server.tool(
    "today",
    "[PRIORITY 2 - TODAY'S SCHEDULE] Today's lecture schedule with start/end times, room locations, teacher names, and live attendance badges.",
    {
      date: z.string().optional().describe("Date as dd-Mmm-yyyy or YYYY-MM-DD. Omit for today."),
    },
    async (args) => {
      const data = await client.get("/v1/today", args);
      return {
        content: [{ type: "text", text: formatResponse("today", data, args) }],
      };
    }
  );

  server.tool(
    "timetable",
    "[PRIORITY 2 - WEEKLY SCHEDULE] Full 5-day Monday-Friday weekly lecture timetable grid with subjects, timings, faculty, and room numbers.",
    {
      date: z.string().optional().describe("Date to anchor the week (dd-Mmm-yyyy or YYYY-MM-DD). Defaults to active week."),
    },
    async (args) => {
      const data = await client.get("/v1/timetable", args);
      return {
        content: [{ type: "text", text: formatResponse("timetable", data, args) }],
      };
    }
  );

  // ── 4. Academics: Marks, Syllabus, Subjects & Notes ──────────────────────

  server.tool(
    "marks",
    "[PRIORITY 3 - EXAM RESULTS] Internal sessional exam marks (First Sessional, CT-1, CT-2, Assignments), marks obtained, and full performance summary.",
    {
      roll: z.string().optional().describe("Student roll number. Omit to use the profile roll number."),
      exam: z.string().optional().describe("Specific exam category (e.g. 'CT-1', 'First Sessional', 'Assignment-1'). Omit to retrieve full student performance summary across all exams and assignments."),
    },
    async (args) => {
      if (!args.exam) {
        const summary = await client.get("/v1/exam_summary", args);
        return {
          content: [{ type: "text", text: formatResponse("exam_summary", summary, args) }],
        };
      }
      const data = await client.get("/v1/exam_result", args);
      return {
        content: [{ type: "text", text: formatResponse("exam_result", data, args) }],
      };
    }
  );

  server.tool(
    "syllabus",
    "[PRIORITY 3 - SYLLABUS COVERAGE] Unit-by-unit syllabus coverage report: units (Unit 1 to 5), topics taught, and completion % for any subject.",
    {
      subject: z.string().optional().describe("Subject name or code (e.g. BCS701 or 'Artificial Intelligence'). Omit for best covered subject."),
      detail: z.boolean().optional().default(false).describe("Pass true to include planned-vs-actual completion dates per topic."),
    },
    async (args) => {
      const data = await client.get("/v1/syllabus", args);
      return {
        content: [{ type: "text", text: formatResponse("syllabus", data, args) }],
      };
    }
  );

  server.tool(
    "subjects",
    "[PRIORITY 4 - ENROLLED COURSES] Current semester enrolled subjects list with course codes, theory/practical type, and syllabus completion %.",
    {},
    async () => {
      const data = await client.get("/v1/subjects");
      return {
        content: [{ type: "text", text: formatResponse("subjects", data) }],
      };
    }
  );

  server.tool(
    "question_bank",
    "[PRIORITY 4 - STUDY MATERIALS & NOTES] Faculty lecture notes, unit study materials, and past question papers with direct browser download links.",
    {
      subjectId: z.string().optional().describe("Internal subject ID from subjects tool. Omit for all subjects."),
    },
    async (args) => {
      const data = await client.get("/v1/question_bank", args);
      return {
        content: [{ type: "text", text: formatResponse("question_bank", data, args) }],
      };
    }
  );

  server.tool(
    "assignments",
    "[PRIORITY 4 - COURSE ASSIGNMENTS] Active homework and sessional assignments across all subjects with due dates, max marks, and direct download links.",
    {
      number: z.number().int().min(1).max(5).optional().describe("Assignment number (1 to 5). Omit to list all active assignments."),
    },
    async (args) => {
      const data = await client.get("/v1/assignments", args);
      return {
        content: [{ type: "text", text: formatResponse("assignments", data, args) }],
      };
    }
  );

  // ── 5. Campus & Administration ───────────────────────────────────────────

  server.tool(
    "fees",
    "[PRIORITY 3 - ACCOUNTS & DUES] Fee payment history, transactions, official fee receipts, and department no-dues clearance status.",
    {},
    async () => {
      const data = await client.get("/v1/fees");
      return {
        content: [{ type: "text", text: formatResponse("fees", data) }],
      };
    }
  );

  server.tool(
    "notices",
    "[PRIORITY 3 - CIRCULARS & NOTICES] Official college circulars and announcements feed with smart pagination.",
    {
      limit: z.number().int().min(1).max(50).optional().default(12).describe("Maximum recent notices to return (default 12 to conserve tokens)."),
    },
    async (args) => {
      const data = await client.get("/v1/notices");
      return {
        content: [{ type: "text", text: formatResponse("notices", data, args) }],
      };
    }
  );

  server.tool(
    "calendar",
    "[PRIORITY 4 - ACADEMIC CALENDAR] Unified university academic calendar: commencement of classes, holidays, sessional test dates, and semester exams.",
    {
      calendarId: z.string().optional().describe("Optional calendar ID from availableCalendars. Defaults to student's university calendar (AKTU/CSJMU/BTEUP)."),
    },
    async (args) => {
      const data = await client.get("/v1/calendar", args);
      return {
        content: [{ type: "text", text: formatResponse("calendar", data, args) }],
      };
    }
  );

  server.tool(
    "class_coordinators",
    "[PRIORITY 4 - CLASS & SECTION COORDINATORS] Faculty class coordinators scoped to student's program, branch, semester, section, and institute.",
    {},
    async () => {
      const data = await client.get("/v1/class_coordinators");
      return {
        content: [{ type: "text", text: formatResponse("class_coordinators", data) }],
      };
    }
  );

  // ── 6. Legacy / Diagnostics Suite (Only if --all-tools requested) ──────────

  if (loadAll) {
    server.tool(
      "institutes",
      "List the 8 supported Axis Colleges institutes and login GUIDs.",
      {},
      async () => {
        const data = await client.get("/v1/institutes");
        return { content: [{ type: "text", text: formatResponse("institutes", data) }] };
      }
    );

    server.tool(
      "today_attendance",
      "Alias for dashboard: today's class marking badges and overall percentage.",
      { date: z.string().optional() },
      async (args) => {
        const data = await client.get("/v1/dashboard", args);
        return { content: [{ type: "text", text: formatResponse("dashboard", data, args) }] };
      }
    );

    server.tool(
      "exams",
      "List examination categories (CT-1, CT-2, Pre-University PUT, Sessional Tests).",
      {},
      async () => {
        const data = await client.get("/v1/exams");
        return { content: [{ type: "text", text: formatResponse("exams", data) }] };
      }
    );

    server.tool(
      "exam_summary",
      "Overall examination performance summary for enrolled semester.",
      { roll: z.string().optional() },
      async (args) => {
        const data = await client.get("/v1/exam_summary", args);
        return { content: [{ type: "text", text: formatResponse("exam_summary", data, args) }] };
      }
    );

    server.tool(
      "exam_result",
      "Subject-wise internal exam marks and sessional grades.",
      { roll: z.string().optional(), exam: z.string().optional() },
      async (args) => {
        const data = await client.get("/v1/exam_result", args);
        return { content: [{ type: "text", text: formatResponse("exam_result", data, args) }] };
      }
    );

    server.tool(
      "calendar_list",
      "List of academic calendar sessions available in deployment.",
      {},
      async () => {
        const data = await client.get("/v1/calendar_list");
        return { content: [{ type: "text", text: formatResponse("calendar_list", data) }] };
      }
    );

    server.tool(
      "library",
      "Library card status: issued books, overdue books, and fine charges.",
      {},
      async () => {
        const data = await client.get("/v1/library");
        return { content: [{ type: "text", text: formatResponse("library", data) }] };
      }
    );

    server.tool(
      "hostel",
      "Hostel residency status, room allocation, and registration dates.",
      {},
      async () => {
        const data = await client.get("/v1/hostel");
        return { content: [{ type: "text", text: formatResponse("hostel", data) }] };
      }
    );

    server.tool(
      "transport",
      "Bus transportation registration status and list of bus routes.",
      {},
      async () => {
        const data = await client.get("/v1/transport");
        return { content: [{ type: "text", text: formatResponse("transport", data) }] };
      }
    );

    server.tool(
      "leave",
      "Student leave balances (Casual, Medical, On-Duty).",
      {},
      async () => {
        const data = await client.get("/v1/leave");
        return { content: [{ type: "text", text: formatResponse("leave", data) }] };
      }
    );

    server.tool(
      "leave_config",
      "Institute leave policy configuration.",
      {},
      async () => {
        const data = await client.get("/v1/leave_config");
        return { content: [{ type: "text", text: formatResponse("leave_config", data) }] };
      }
    );

    server.tool(
      "grievances",
      "Status of student grievances submitted to college departments.",
      {},
      async () => {
        const data = await client.get("/v1/grievances");
        return { content: [{ type: "text", text: formatResponse("grievances", data) }] };
      }
    );

    server.tool(
      "classes",
      "Recorded online video lectures library.",
      { limit: z.number().int().optional().default(15) },
      async (args) => {
        const data = await client.get("/v1/classes");
        return { content: [{ type: "text", text: formatResponse("classes", data, args) }] };
      }
    );

    server.tool(
      "polls",
      "Active student voting polls and surveys.",
      { search: z.string().optional() },
      async (args) => {
        const data = await client.get("/v1/polls", args);
        return { content: [{ type: "text", text: formatResponse("polls", data, args) }] };
      }
    );

    server.tool(
      "poll",
      "Options and tallies for a poll by ID.",
      { pid: z.string() },
      async (args) => {
        const data = await client.get("/v1/poll", args);
        return { content: [{ type: "text", text: formatResponse("poll", data, args) }] };
      }
    );

    server.tool(
      "academic_settings",
      "Institute academic policies and attendance threshold.",
      {},
      async () => {
        const data = await client.get("/v1/academic_settings");
        return { content: [{ type: "text", text: formatResponse("academic_settings", data) }] };
      }
    );

    server.tool(
      "notifications",
      "Recent notifications and real-time message alerts.",
      {},
      async () => {
        const data = await client.get("/v1/notifications");
        return { content: [{ type: "text", text: formatResponse("notifications", data) }] };
      }
    );

    server.tool(
      "meetings",
      "Live virtual classroom links and online meeting connections.",
      { date: z.string().optional() },
      async (args) => {
        const data = await client.get("/v1/meetings", args);
        return { content: [{ type: "text", text: formatResponse("meetings", data, args) }] };
      }
    );

    server.tool(
      "academic_history",
      "Complete university academic and enrollment record.",
      {},
      async () => {
        const data = await client.get("/v1/academic_history");
        return { content: [{ type: "text", text: formatResponse("academic_history", data) }] };
      }
    );

    server.tool(
      "password_status",
      "Check whether college ERP mandates password change.",
      {},
      async () => {
        const data = await client.get("/v1/password_status");
        return { content: [{ type: "text", text: formatResponse("password_status", data) }] };
      }
    );
  }
}
