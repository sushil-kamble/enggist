This file defines **general rules and best practices** for AI coding agents (e.g., Claude Code, OpenAI Codex, Copilot Agents, etc.) working within this repository.

---

## 🧠 Purpose

This repository may be used with autonomous or semi-autonomous coding agents.  
These rules ensure consistency, safety, and quality across all automated code changes.

---

## ⚙️ Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Serve production build locally
pnpm start

# Lint code
pnpm lint

🧩 Repository Structure (Typical)
src/               # Main source code
- components/        # UI components or modules
- lib/               # Utilities, APIs, helpers
- tests/             # Test files (Optional, include only when asked)
public/            # Static assets


Rule: Follow existing file organization.
If unclear, infer from similar files instead of inventing new structures.

🧱 Architectural Conventions
- Prefer React Server Components (RSC) by default in Next.js App Router.
- Use Next.js Route Handlers (src/app/api/.../route.ts) over App Routes
- Motion Library
import * as motion from "motion/react-client" // Server component
import { motion } from "motion/react" // Client component
- Tailwind CSS v4
Configure Context7 MCP Tailwind syntax checker (if available) to validate classes and avoid hallucinated v3 utilities.
Tailwind CSS has global.css. approach. Please refer the sample global.css (Note this is just the sample)
- Google Fonts (Next.js Standard). Use Next.js Font Optimization (next/font/google) instead of <link> tags.
- Use React Icons for all iconography (react-icons package).

## 🌐 MCP Servers

- **Sequential Thinking**: Use to break down and reason through complex tasks step by step.
- **shadcn**: Use for working with shadcn components—including fetching up-to-date component info, availability, and examples; reach for this MCP whenever the task even brushes against shadcn UI so we avoid guessing.
- **Context7**: Use to retrieve the latest documentation for technologies such as Next.js, Tailwind CSS, Motion.dev, and any future libraries adopted in this project.
