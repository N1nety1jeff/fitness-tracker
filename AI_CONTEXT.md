# 🤖 PROJECT AI CONTEXT (Cycle Tracker)

This file is for AI agents (Antigravity, Claude Code, etc.) to understand the project state at a glance.

## 🏗 Tech Stack
-   **Framework**: Next.js 16 (App Router)
-   **Styling**: Tailwind CSS v4 (using `@tailwindcss/postcss`)
-   **Database**: Supabase
-   **State Management**: Zustand
-   **Features**: PWA (Manifest included), Web Worker Timer

## 🌍 Current Environment
-   **Host**: GitHub Codespaces
-   **Node Version**: v20.x
-   **Status**: Development server setup in progress.

## ⚠️ Known Blockers (2026-03-19)
1.  **Tailwind Oxide Binary Error**: The development server (`next dev`) fails with `Cannot find native binding` for `@tailwindcss/oxide-linux-x64-gnu`. 
    -   *Attempted Fixes*: `npm install`, `rm -rf node_modules`, forcing the platform-specific package. 
    -   *Current Theory*: Mismatch between Windows-created `package-lock.json` and Linux Codespace architecture.
2.  **Supabase Auth**: Not yet implemented. Using dummy `user_id` (`00000000...`) and relaxed RLS policies for testing.

## 🎯 Next Objectives
-   Fix Tailwind binary issue.
-   Bind real data to Dashboard (Phase 7).
-   Implement Workout Persistence (saving sets to Supabase).
-   Calculate progress/progression.

## 🔗 Supabase Config
-   **Project ID**: bmcwdfnybujxcfziaspj
-   **Public URL**: https://bmcwdfnybujxcfziaspj.supabase.co
