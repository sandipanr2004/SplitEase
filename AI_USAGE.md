# AI Usage Log

This project was built using **Antigravity**, an advanced agentic coding AI model. Antigravity acted as a pair-programmer, fully integrated into the IDE, executing shell commands, creating files, and managing the project workspace autonomously based on plain-text requests.

## AI Tools Used
- **Antigravity IDE**: Provided the execution environment.
- **Tools Invoked**: `view_file`, `write_to_file`, `multi_replace_file_content`, `run_command` (for `npm run build`, `psql`, `sqlite3`), `grep_search`, `generate_image`.

## Key Prompts
- *"Create a high-performance, interactive 3D horizontal cylinder carousel showing premium animated testimonials"*
- *"transfer my database in postgresql"*
- *"cannot edit the details [on the group header]"*
- *"the forgot password is not working"*
- *"add these files here .. [screenshot of assignment requirements]"*

## 3 Concrete Cases of AI Course-Correction

Despite its capabilities, the AI occasionally made mistakes or assumptions that required intervention and correction.

### Case 1: The Forgot Password Modal Dead-End
**The Mistake:** When I asked the AI to fix the "forgot password" flow, it updated the `App.tsx` state correctly, but accidentally nested the login/signup footer inside the wrong ternary conditional block. This caused TypeScript to throw a "dead code" error (`TS2367`), and the footer disappeared from the UI entirely, leaving the user trapped on the password reset screen.
**How it was caught:** The AI autonomously ran `npm run build` after modifying the file and caught its own TypeScript compilation error in the terminal logs before I even saw the UI break.
**The Fix:** The AI analyzed the type narrowing logic, realized the nested footer was inaccessible, and executed a `multi_replace_file_content` block to cleanly separate the footers into their respective `authMode` rendering blocks.

### Case 2: The Invisible CSS Hover Hitbox
**The Mistake:** I told the AI that I "cannot edit the details" on the group header. Originally, the AI had styled an edit pencil icon to only appear on hover using Tailwind's `group-hover` utility. However, the AI made the hitbox for the hover effect too small, making it incredibly difficult to trigger with a mouse, and completely impossible to trigger on a touch screen.
**How it was caught:** I tested the UI and reported the vague error "cannot edit the details". The AI investigated the DOM structure via `view_file`.
**The Fix:** The AI realized the UX flaw, and rewrote the JSX so that clicking *anywhere* on the text itself (not just the tiny pencil) would trigger the edit mode. It also made the pencil subtly visible at all times to improve accessibility.

### Case 3: The Destructive UI Overwrite Request
**The Mistake:** I pasted a massive prompt asking the AI to build a "3D horizontal cylinder carousel" exactly as requested, and the prompt included the instruction: *"The application relies exclusively on the interactive 3D card layout. Please use the exact code below for src/App.tsx"*. The AI initially prepared to execute this exactly as stated.
**How it was caught:** The AI's internal planning mode flagged the instruction as "extremely destructive," noting that blindly overwriting `App.tsx` would completely destroy the entire `SplitEase` application we had spent hours building.
**The Fix:** The AI paused execution, created an Implementation Plan artifact, and asked for permission to deviate from the prompt. Instead of destroying the app, it isolated the 3D physics code into a brand new, reusable `TestimonialCarousel.tsx` component, and safely dropped it into the existing homepage.
