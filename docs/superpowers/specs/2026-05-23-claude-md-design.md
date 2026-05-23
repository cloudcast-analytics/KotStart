---
name: claude-md-design
description: Design spec for the CLAUDE.md orientation file for the KotStart project
metadata:
  type: project
---

# CLAUDE.md Design Spec

**Date:** 2026-05-23

## Goal

Create a single `CLAUDE.md` at the project root that gives an AI assistant (Claude) a complete mental model of the KotStart codebase without reading any source files.

## Audience

AI assistant (Claude Code). The file is auto-loaded at session start and must be concise enough to fit comfortably in the context window.

## Scope

Orientation and architecture only — not coding conventions or rules.

## Sections

1. **Project identity** — app name, domain, stack, hosting, mobile-first intent
2. **File map** — annotated directory tree of all meaningful files
3. **Domain model** — table of all TypeScript interfaces with key fields and notes
4. **Data layer** — how `data.ts` works, mock vs Supabase switch, read/write functions, photo upload
5. **Routes** — table of all React Router routes and their components
6. **Key patterns** — AppShell wrapping, wizard state, cn utility, PDF, Framer Motion
7. **Environment variables** — what's needed, what happens without them
8. **Deployment** — Railway project details, Node 20 requirement, server.js SPA server
9. **Testing** — test framework, count, how to run

## Format

Dense reference card style: tables and short bullet points. No prose narrative. All facts verifiable from current source code.
