# 🚀 Asteroid MCP — Axis Colleges Student ERP

> **Official Model Context Protocol (MCP) Server for Axis Colleges students.**  
> Connect Claude Desktop, Cursor, Zed, and AI agents directly to your live academic portal with token-efficient tooling, automatic session management, direct file downloads, and rich markdown summaries.

[![npm version](https://img.shields.io/npm/v/asteroid-mcp.svg)](https://www.npmjs.com/package/asteroid-mcp)
[![GitHub Repo](https://img.shields.io/badge/github-justfsl50%2Fasteroid--mcp-blue.svg)](https://github.com/justfsl50/asteroid-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)]()

---

## 🌟 Why Asteroid MCP?

College ERP systems return bloated JSON payloads with ASP.NET metadata (`__type`, `ViewState`), null fields, and hundreds of unparsed records that quickly burn through Claude context windows and token budgets.

**Asteroid MCP solves this with:**
- **📉 65–75% Token Reduction**: The built-in *Token-Efficiency Engine* prunes nulls/empty objects and formats complex payloads into dense Markdown tables and bullet points.
- **🔐 Frictionless Auth**: Log in once via the `sign_in` tool. Your session cookie is securely stored in `~/.asteroid/credentials.json` and reused across AI conversations.
- **🔄 Dual Transport (Stdio + SSE)**: Works locally via standard I/O (Claude Desktop, Cursor) or as a remote HTTP Server-Sent Events service (Claude Web, remote connectors).
- **🛠️ Complete 33-Tool Suite**: Full coverage of attendance, timetables, internal sessional marks, fee ledger, notices, admit cards, and bunk calculators.
- **📚 Resources & Prompts**: Includes native MCP Resources (`erp://attendance`, `erp://timetable`) and slash prompts (`daily_brief`, `bunk_calculator`, `exam_prep`).

---

## 🚀 Quick Setup

### Prerequisites
- Node.js >= 20 installed
- Clone or download this repository

```bash
cd c:\Users\Faisal\Desktop\asteroid-mcp
npm install
npm run build
```

---

## 💻 1. Claude Desktop Setup

Claude Desktop connects to MCP servers over standard input/output (**Stdio**).

### Configuration File Location:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
  *(typically `C:\Users\<YourUsername>\AppData\Roaming\Claude\claude_desktop_config.json`)*
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Add the Server:
Edit your `claude_desktop_config.json` file and add the `axis-erp` entry:

```json
{
  "mcpServers": {
    "axis-erp": {
      "command": "npx",
      "args": [
        "-y",
        "asteroid-mcp"
      ],
      "env": {
        "ASTEROID_URL": "https://erp.handlebid.lol"
      }
    }
  }
}
```

> **Note**: Because `asteroid-mcp` is published on npm, any student can simply use `npx -y asteroid-mcp` without cloning or building any code locally!
> Restart Claude Desktop after saving the config. You will see a hammer icon 🔨 in the bottom right corner showing 33 tools ready to use!

---

## 💻 2. Cursor / Zed / Windsurf Setup

### In Cursor IDE:
Create or edit `.cursor/mcp.json` in your workspace root:

```json
{
  "mcpServers": {
    "axis-erp": {
      "command": "node",
      "args": [
        "c:/Users/Faisal/Desktop/asteroid-mcp/dist/index.js"
      ]
    }
  }
}
```

---

## 🌐 3. Claude Web & Remote Connectors (SSE Mode)

For Claude Web or web-based AI tools that connect over HTTP Server-Sent Events (SSE):

```bash
# Start in SSE mode on port 3001
node dist/index.js --sse --port 3001
```

The server provides:
- **SSE Endpoint**: `http://127.0.0.1:3001/sse`
- **Message Receiver**: `http://127.0.0.1:3001/message`
- **Health Check**: `http://127.0.0.1:3001/health`

---

## 🤖 4. ChatGPT Plugin & Custom GPT Migration

> **OpenAI Notice: "GPTs will be retired on December 11. To keep using your GPTs, migrate them to a plugin by December 11."**

Because OpenAI is retiring standalone Custom GPTs in favor of the **standard Plugin/App ecosystem**, our live production backend (`https://erp.handlebid.lol`) natively serves the official OpenAI Plugin Manifest and OpenAPI 3.1 specification!

### Standard Plugin Endpoints:
- **Plugin Manifest**: `https://erp.handlebid.lol/.well-known/ai-plugin.json`
- **OpenAPI Schema**: `https://erp.handlebid.lol/openapi.json`
- **Logo (512x512 PNG)**: `https://erp.handlebid.lol/logo.png`
- **Legal & Privacy**: `https://erp.handlebid.lol/legal`

### Method A: Install as ChatGPT Plugin / Migrate GPT
1. In ChatGPT, navigate to **Plugins** -> **Plugin Store** -> **Develop your own plugin**.
2. Enter your domain:
   ```
   erp.handlebid.lol
   ```
3. ChatGPT will automatically discover `https://erp.handlebid.lol/.well-known/ai-plugin.json`, validate the OpenAPI 3.1 specification, and register all 33 student ERP tools.
4. If migrating an existing Custom GPT, click **Migrate to plugin** in "My GPTs" and provide the domain `erp.handlebid.lol`.

### Method B: Use as Custom Action (OpenAPI 3.1)
1. Go to [chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor).
2. Name your GPT: `Axis College Assistant`.
3. Under **Instructions**, paste:
   ```text
   You are an intelligent college assistant for Axis Colleges students.
   You have access to live ERP actions (attendance, timetable, sessional marks, ledger, and notices).
   When the student asks about attendance or schedule, use the available actions to fetch real-time data.
   Summarize attendance status clearly, highlighting any subjects below 75% target and computing how many classes can safely be skipped or need to be attended.
   ```
4. Scroll down to **Actions** and click **Create new action**.
5. Click **Import from URL** and paste:
   ```
   https://erp.handlebid.lol/openapi.json
   ```
6. ChatGPT will automatically parse all 33 ERP endpoints and register them as callable GPT actions.

---

## 🛠️ Curated MCP Tool Reference (15 Core Tools, ~980 Tokens)

Asteroid MCP v1.2.1 delivers a lean **15-Tool Curated Suite** that slashes system-prompt schema overhead by **72%** (from 3.4k tokens down to ~980 tokens).

| # | Tool Name | Priority | What it Provides | Token Savings |
|---|---|:---:|---|:---:|
| 1 | `sign_in` | Auth | Authenticate with Roll No & Password. Session cached in `~/.asteroid/credentials.json`. | Zero password repeats |
| 2 | `me` | Identity | Full student bio: URN, roll number, program, branch, semester, section, and institute. | Clean markdown |
| 3 | `dashboard` | **Priority 1** | **The #1 Daily Driver**: Today's classes with live marking badges (`Present ✅`, `Absent ❌`, `Pending ⏳`), overall attendance % (exact, round up, round down), and safe bunk headroom in 1 single call. | ⚡ **75% savings** |
| 4 | `attendance` | Priority 2 | Full subject-by-subject percentage audit table with attended/total counts, clean course names, and safe skips per course. | ⚡ **68% savings** |
| 5 | `today` | Priority 2 | Today's lecture schedule with start/end times, room locations, teacher names, and live attendance badges. | ⚡ **65% savings** |
| 6 | `timetable` | Priority 2 | Full 5-day Monday-Friday weekly lecture timetable grid with subjects, timings, faculty, and room numbers. | ⚡ **60% savings** |
| 7 | `marks` | Priority 3 | Sessional test scores (CT-1, CT-2, Pre-University PUT), mid-terms, assignment marks (e.g. 10/10), and complete gradebook. | Clean markdown |
| 8 | `assignments` | Priority 4 | Active homework and sessional assignments across all subjects with due dates, max marks, and **direct instant download links** (`[📥 Direct Download Assignment]`). | Clean files / No 404s |
| 9 | `syllabus` | Priority 3 | **Curriculum units (Unit 1 to 5), topics taught, and completion %** for any enrolled subject. Powers AI study planning and quizzing. | ⚡ High AI value |
| 10 | `subjects` | Priority 4 | Enrolled course list with subject codes, theory/practical type, and faculty syllabus completion % (10 subjects total). | Dense table |
| 11 | `question_bank`| Priority 4 | Previous year question papers and lecture notes with **direct clickable browser download links** (`[📥 Direct Download File](https://erp.handlebid.lol/download/paper?qbid=...)`). | Auto-downloads with clean filename |
| 12 | `fees` | Priority 3 | Academic session ledger (Debit/Credit balance), payment history, and department clearance / fine status. | Consolidated ledger |
| 13 | `notices` | Priority 3 | College circulars and announcements with smart pagination (`limit`). | ⚡ Paging enabled |
| 14 | `calendar` | Priority 4 | **Unified Academic Calendar**: Commencement of classes, festival holidays, sessional test dates, and semester exams dynamically matched to student's university (AKTU / CSJMU / BTEUP). | Unified session list |
| 15 | `class_coordinators` | Priority 4 | Assigned faculty coordinators mapped to department, year, and institute (`AXIS719`) with official email contacts. | Faculty-scoped |

> 💡 **Diagnostics Mode**: To run the full legacy 33-tool diagnostic suite, launch with `--all-tools` or set `ASTEROID_TOOLS=all`.

---

## ⚡ Token-Efficiency Architecture

Standard ERP JSON returns huge trees containing redundant ASP.NET structures.

### Raw JSON vs. Asteroid Token Engine:
```json
// RAW ERP JSON (approx. 1,450 tokens):
{
  "d": {
    "__type": "AxisERP.StudentProfileDto",
    "Status": "Success",
    "AttendancePercentage": 30.7,
    "ClassesAttended": 34,
    "TotalLectures": 85,
    "AtRiskSubjects": ["Artificial Intelligence"],
    "NullField1": null,
    "NullField2": null,
    "UnusedArray": []
  }
}
```

```markdown
<!-- ASTEROID DENSE MARKDOWN (approx. 110 tokens - 92% reduction): -->
### 📊 Academic Dashboard: 30.7% overall attendance
- **Overall Attendance**: 30.7% (34/85 lectures) — **AT_RISK**
- **Bunk Headroom**: 0 classes can be skipped while staying ≥75% target.
- **⚠️ At-Risk Subjects**: Artificial Intelligence (BCS701)

#### 📅 Today's Schedule (08-Oct-2026, Thursday):
- **09:00 AM - 09:50 AM**: Artificial Intelligence (BCS701) — *Mr. Avinash* [Room E-Block] ⏳ Pending
```

---

## 💡 Example Prompts to Try with Claude

Once connected to Claude Desktop, you can ask naturally:

1. **Daily Checkup**:  
   *"Claude, show my dashboard for today. What classes do I have and what's my attendance status?"*
2. **Bunk Calculation**:  
   *"Can I skip artificial intelligence tomorrow? How will it impact my 75% target?"*
3. **Internal Marks**:  
   *"Check my sessional marks and list any subject where I scored below 60%."*
4. **Fees**:  
   *"Do I have any pending fee dues for this semester?"*
5. **Notices**:  
   *"Are there any new notices regarding end-semester exams?"*

---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
```

---

## 📄 License
MIT © Faisal Ansari
