/**
 * Token-Efficiency Engine for asteroid-mcp.
 *
 * Maximizes context efficiency when communicating with Claude and LLMs:
 *   1. Recursively removes nulls, undefined values, and empty objects/arrays.
 *   2. Formats high-level tools (dashboard, attendance, timetable, notices,
 *      question_bank, class_coordinators, calendar) into dense Markdown.
 *   3. Strips HTML markup and legacy ASP.NET artifacts (__type, ViewState).
 *   4. Generates direct clickable browser download links for question papers.
 */
import { CredentialManager } from "./credentials.js";

/** Remove HTML tags and decode common entities. */
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Recursively prune nulls, undefined, empty strings, and internal metadata. */
export function pruneObject<T>(input: T): T {
  if (input === null || input === undefined) return undefined as unknown as T;

  if (Array.isArray(input)) {
    const cleaned = input
      .map(pruneObject)
      .filter((v) => v !== undefined && v !== null && v !== "");
    return cleaned as unknown as T;
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      // Exclude noisy internal fields
      if (k === "__type" || k === "stale" || k === "rawLength" || k === "viewState") continue;
      const cleaned = pruneObject(v);
      if (
        cleaned !== undefined &&
        cleaned !== null &&
        cleaned !== "" &&
        !(Array.isArray(cleaned) && cleaned.length === 0) &&
        !(typeof cleaned === "object" && Object.keys(cleaned).length === 0)
      ) {
        out[k] = cleaned;
      }
    }
    return out as unknown as T;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return undefined as unknown as T;
    if (trimmed.includes("<") && trimmed.includes(">")) {
      return stripHtml(trimmed) as unknown as T;
    }
    return trimmed as unknown as T;
  }

  return input;
}

/**
 * Format tool result into token-optimized output.
 * Renders dense Markdown for narrative tools, and pruned JSON for data tables.
 */
export function formatResponse(toolName: string, data: unknown, args: Record<string, unknown> = {}): string {
  if (!data) return "No data returned.";

  const pruned = pruneObject(data) as any;
  const baseUrl = process.env.ASTEROID_URL || "https://erp.handlebid.lol";

  switch (toolName) {
    case "me": {
      const lines: string[] = [];
      lines.push(`### 🎓 Student Profile: ${pruned.name || "Student"}`);
      lines.push(`- **URN / Roll No**: \`${pruned.urn || "-"}\` | **Login ID**: \`${pruned.loginId || "-"}\``);
      lines.push(`- **Class & Program**: **${pruned.program || ""} ${pruned.branch || ""}**`);
      lines.push(`- **Semester & Section**: **Semester ${pruned.sem || "-"}**, **Section ${pruned.section || "A"}**`);
      lines.push(`- **Campus Institute**: **${pruned.institute || "AXIS719"}**`);
      if (pruned.studentId) lines.push(`- **Student ID**: ${pruned.studentId}`);
      return lines.join("\n");
    }

    case "dashboard": {
      const today = pruned.today || {};
      const overall = pruned.overall || {};
      const classes = today.classes || [];
      const counts = today.counts || {};
      const lines: string[] = [];

      const pctVal = typeof overall.pct === "number" ? overall.pct : Number(overall.pct || 0);
      const floorPct = Math.floor(pctVal);
      const ceilPct = Math.ceil(pctVal);

      lines.push(`### 📊 Academic Dashboard: ${pruned.headline || ""}`);
      lines.push(`- **Overall Attendance**: **${pctVal}%** (Round Down: ${floorPct}% | Round Up: ${ceilPct}%) — ${overall.present || 0}/${overall.total || 0} attended — **${(overall.risk || "unknown").toUpperCase()}**`);
      lines.push(`- **Bunk Headroom**: ${overall.skipsLeft || 0} classes can be safely skipped while staying ≥${overall.target || 75}% target.`);
      if (overall.atRiskSubjects?.length) {
        lines.push(`- **⚠️ At-Risk Subjects (<${overall.target || 75}%)**: ${overall.atRiskSubjects.join(", ")}`);
      }

      lines.push(`\n#### 📅 Today's Classes & Marking Status (${today.date || "Today"}, ${today.weekday || ""}):`);
      if (counts.total !== undefined) {
        lines.push(`- **Today's Tally**: ${counts.present || 0} Present ✅ | ${counts.absent || 0} Absent ❌ | ${counts.unmarked || 0} Pending ⏳ (${counts.total} total lectures)`);
      }

      if (classes.length === 0) {
        lines.push("No scheduled classes today.");
      } else {
        for (const c of classes) {
          const st = c.state || "";
          const badge = st === "present" ? "✅ Present"
            : st === "absent" ? "❌ Absent"
            : st === "unmarked_past" ? "⚠️ Unmarked Past (Class ended)"
            : "⏳ Pending";
          lines.push(`- **${c.time || ""}**: **${c.subject || ""}** (${c.code || ""}) — *${c.faculty || "Faculty N/A"}* [${c.room || "Room N/A"}] ➔ ${badge}`);
        }
      }
      return lines.join("\n");
    }

    case "attendance": {
      const lines: string[] = [];
      const pctVal = typeof pruned.overallPct === "number" ? pruned.overallPct : Number(pruned.overallPct || 0);
      const floorPct = Math.floor(pctVal);
      const ceilPct = Math.ceil(pctVal);

      lines.push(`### 📋 Attendance Report (as of ${pruned.asOf || "latest"})`);
      lines.push(`- **Overall**: ${pruned.present || 0} / ${pruned.total || 0} (**${pctVal}%** | Round Down: ${floorPct}% | Round Up: ${ceilPct}%) | **Target**: ${pruned.target || 75}%`);
      lines.push(`- **Status**: **${(pruned.risk || "safe").toUpperCase()}** | **Safe Skips Remaining**: ${pruned.skipsLeft || 0}`);

      if (pruned.subjects?.length) {
        lines.push("\n| Subject | Code | Attended | Total | % | Status |");
        lines.push("|---|---|---|---|---|---|");
        for (const s of pruned.subjects) {
          const sPct = typeof s.pct === "number" ? s.pct : Number(s.pct || 0);
          lines.push(`| ${s.name} | ${s.code || "-"} | ${s.present} | ${s.total} | ${sPct}% | ${s.risk || "ok"} |`);
        }
      } else if (pruned.hint) {
        lines.push(`\n*Note: ${pruned.hint}*`);
      }
      return lines.join("\n");
    }

    case "today": {
      const classes = pruned.classes || [];
      const counts = pruned.counts || {};
      const lines: string[] = [];
      lines.push(`### 📅 Lecture Schedule & Marking Status: ${pruned.date || ""} (${pruned.weekday || ""})`);
      lines.push(`- **Status Tally**: ${counts.present || 0} Present ✅ | ${counts.absent || 0} Absent ❌ | ${counts.unmarked || 0} Pending ⏳ (${counts.total || classes.length} total)`);
      if (pruned.summary) lines.push(`- **Summary**: ${pruned.summary}\n`);

      for (const c of classes) {
        const st = c.state || "";
        const badge = st === "present" ? "✅ Present"
          : st === "absent" ? "❌ Absent"
          : st === "unmarked_past" ? "⚠️ Unmarked Past (Class ended)"
          : "⏳ Pending";
        lines.push(`- **${c.time || ""}**: **${c.subject || ""}** (${c.code || ""}) ➔ ${badge}`);
        lines.push(`  - Faculty: ${c.faculty || "N/A"} | Location: ${c.room || "Room N/A"}`);
      }
      return lines.join("\n");
    }

    case "notices": {
      const notices = pruned.notices || [];
      const limit = Number(args.limit || 12);
      const visible = notices.slice(0, limit);
      const lines: string[] = [];

      lines.push(`### 📢 College Circulars & Notices (Showing ${visible.length} of ${pruned.count || notices.length})`);
      for (const n of visible) {
        const date = n.postedOn || "";
        const title = n.title || n.subject || "Notice";
        const link = n.attachmentUrl || n.url || n.fileUrl ? ` [View Attachment](${n.attachmentUrl || n.url || n.fileUrl})` : "";
        lines.push(`- **${date}**: ${title}${link}`);
      }
      if (notices.length > limit) {
        lines.push(`\n*...and ${notices.length - limit} older notices omitted to conserve tokens. Pass limit parameter to see more.*`);
      }
      return lines.join("\n");
    }

    case "timetable": {
      const week = pruned.week || {};
      const days = Object.keys(week);
      const lines: string[] = [];

      lines.push(`### 🗓️ Weekly Timetable (5-Day Teaching Grid)`);
      for (const day of days) {
        const slots = week[day]?.slots || [];
        lines.push(`\n#### ${day} (${slots.length} periods):`);
        for (const s of slots) {
          if (s.type === "break" || s.subject === "LUNCH") {
            lines.push(`- *${s.time}*: 🍱 ${s.subject}`);
          } else {
            lines.push(`- **${s.time}**: ${s.subject} (${s.code || ""}) — ${s.faculty || ""} [${s.room || s.kind || "Class"}]`);
          }
        }
      }
      return lines.join("\n");
    }

    case "subjects": {
      const subjects = pruned.subjects || [];
      const lines: string[] = [];
      lines.push(`### 📚 Enrolled Subjects (${subjects.length} total, Avg Syllabus Coverage: ${pruned.syllabusCoverageAvg || 0}%)`);
      lines.push("| # | Subject | Code | Type | Syllabus % |");
      lines.push("|---|---|---|---|---|");
      for (const s of subjects) {
        lines.push(`| ${s.sno || "-"} | ${s.subject} | ${s.subjectId || "-"} | ${s.type || "Theory"} | ${s.syllabusCoverage || 0}% |`);
      }
      return lines.join("\n");
    }

    case "syllabus": {
      const lines: string[] = [];
      lines.push(`### 📖 Syllabus Coverage: ${pruned.subject || "Course"}`);
      lines.push(`- **Completion**: **${pruned.coveragePct || 0}%** | Faculty: ${pruned.faculty || "Faculty"} | Section: ${pruned.section || "-"}`);
      if (pruned.units?.length) {
        for (const u of pruned.units) {
          lines.push(`\n#### 📌 ${u.unit || "Unit"}: ${u.title || ""}`);
          if (u.topics?.length) {
            for (const t of u.topics) {
              const statusBadge = t.completed ? "✅ Completed" : "⏳ Planned";
              lines.push(`- ${t.name || t.topic} — ${statusBadge}`);
            }
          }
        }
      } else if (pruned.topics?.length) {
        for (const t of pruned.topics) {
          lines.push(`- ${t.title || t.topic || t.name}`);
        }
      } else if (pruned.available?.length) {
        lines.push("\nAvailable subjects with syllabus:");
        for (const av of pruned.available) {
          lines.push(`- **${av.subject}**: ${av.coveragePct || 0}% coverage`);
        }
      }
      return lines.join("\n");
    }

    case "question_bank": {
      const subjects = pruned.subjects || [];
      const lines: string[] = [];
      lines.push(`### 📂 Question Papers & Lecture Notes (${pruned.subjectCount || subjects.length} subjects available)`);

      let totalPapers = 0;
      for (const s of subjects) {
        const papers = s.papers || [];
        if (!papers.length) continue;
        totalPapers += papers.length;
        lines.push(`\n#### 📘 ${s.subject}:`);
        for (const p of papers) {
          const encTitle = encodeURIComponent(String(p.title || `paper_${p.qbid}`));
          const downloadUrl = `${baseUrl}/download/paper?qbid=${p.qbid}&title=${encTitle}`;
          lines.push(`- **${p.title}** (${p.mode || "Notes"}) — Posted by *${p.postedBy || "Faculty"}* on ${p.postedOn || ""} ➔ [📥 Direct Download File](${downloadUrl})`);
        }
      }

      if (totalPapers === 0) {
        lines.push("No question papers currently uploaded for enrolled subjects.");
      }
      return lines.join("\n");
    }

    case "assignments": {
      const items = pruned.assignments || [];
      const lines: string[] = [];
      lines.push(`### 📝 Course Assignments (${pruned.count || items.length} active)`);
      if (pruned.categories?.length) {
        const catSummary = pruned.categories
          .map((c: any) => `Assignment ${c.assignmentNumber}: ${c.count}`)
          .join(" | ");
        lines.push(`*Categories: ${catSummary}*`);
      }

      if (!items.length) {
        lines.push("No active assignments currently posted for your subjects.");
        return lines.join("\n");
      }

      let currentNum = -1;
      for (const a of items) {
        if (a.assignmentNumber !== currentNum) {
          currentNum = a.assignmentNumber;
          lines.push(`\n#### 📌 ASSIGNMENT ${currentNum}:`);
        }
        const encTitle = encodeURIComponent(String(a.title || `assignment_${a.id}`));
        const downloadUrl = `${baseUrl}/download/assignment?asgnid=${a.id}&title=${encTitle}`;
        const maxMarks = a.maxMarks ? ` | Max Marks: **${a.maxMarks}**` : "";
        lines.push(`- **${a.subject}** (${a.subjectCode || ""}): **${a.title}**${maxMarks}`);
        lines.push(`  - Posted by *${a.postedBy || "Faculty"}* on ${a.postedOn || ""} ➔ [📥 Direct Download Assignment](${downloadUrl})`);
      }
      return lines.join("\n");
    }

    case "class_coordinators": {
      const cls = pruned.studentClass || {};
      const lines: string[] = [];
      const classHeading = cls.program && cls.branch
        ? `${cls.program} ${cls.branch} (Sem ${cls.sem || "-"}, Section ${cls.section || "A"})`
        : "Class Coordinators";

      lines.push(`### 👨‍🏫 Class Coordinators: ${classHeading}`);
      lines.push(`- **Institute**: **${pruned.institute || "Axis Colleges"}** (\`${pruned.instituteCode || "AXIS719"}\`)`);

      const coordinators = pruned.coordinators || [];
      if (coordinators.length === 0) {
        lines.push("No coordinator records found.");
      } else {
        for (const c of coordinators) {
          lines.push(`\n- **${c.name}** (${c.designation || "Class Coordinator"})`);
          if (c.coordinatorOf) lines.push(`  - **Coordinator Of**: ${c.coordinatorOf}`);
          if (c.email) lines.push(`  - **Email**: \`${c.email}\``);
          if (c.phone) lines.push(`  - **Contact**: \`${c.phone}\``);
        }
      }
      return lines.join("\n");
    }

    case "calendar": {
      const events = pruned.events || [];
      const lines: string[] = [];
      lines.push(`### 📅 Academic Calendar: ${pruned.calendarName || "University Calendar"}`);
      lines.push(`- **Calendar ID**: \`${pruned.calendarId}\` | **Total Scheduled Events**: ${events.length}`);

      if (pruned.availableCalendars?.length > 1) {
        const listStr = pruned.availableCalendars.map((c: any) => `\`${c.id}\`: ${c.name}`).join(" | ");
        lines.push(`- **Available Sessions**: ${listStr}`);
      }

      if (events.length > 0) {
        lines.push("\n| Event / Particulars | Scheduled Dates |");
        lines.push("|---|---|");
        for (const ev of events) {
          lines.push(`| ${ev.particulars} | ${ev.dates} |`);
        }
      }
      return lines.join("\n");
    }

    default:
      // Fallback: dense JSON with 2-space indentation and all nulls stripped
      return JSON.stringify(pruned, null, 2);
  }
}
