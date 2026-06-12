**Context:**
Please refactor the following two components based on the specifications below.

**Global Constraints:**
1.  **Preserve Logic:** You **MUST** retain all existing `i18nMacro`, `materialHelpers`, and variable definitions (`set ...`). Do not lose any conditional logic.
2.  **Styling:** Use Tailwind CSS utility classes. Remove any old BEM-style CSS classes (e.g., `course-info-card--has-hero`).

---

#### **Task 1: Refactor `course-info-card.njk` (Hero Section)**
**Goal:** Convert the current card layout into a full-width, centered **Hero Section**.

**Visual Specifications:**
1.  **Container:**
    * Use a semantic `<section>` tag.
    * Full width (`w-full`), centered text (`text-center`), vertical padding (`py-10`).
    * Background: White (`bg-white`).
2.  **Element Order & Styling:**
    * **1. Badges (Top):**
        * Display `courseDomain` and `courseUnit` here.
        * **Style:** Rounded "Pills" (`rounded-full`, `px-3`, `py-1`, `text-sm`, `font-medium`).
        * **Colors:**
            * `courseDomain`: Orange theme (e.g., `bg-orange-100 text-orange-800`).
            * `courseUnit`: Gray/Stone theme (e.g., `bg-stone-100 text-stone-600`).
        * Layout: Centered row with a small gap (`flex justify-center gap-2`).
    * **2. Title (Middle):**
        * Tag: `<h1>`.
        * Style: Large and bold (`text-3xl md:text-4xl font-bold`), dark text color, margin bottom.
    * **3. Metadata (Bottom):**
        * Display `courseGrade`, `courseSemester`, and `courseTeacher` in separate rows.
        * Style: `text-stone-600`, slightly larger text for the grade (`text-lg`), standard size for others.
        * Layout: Use a vertical stack with small spacing (`space-y-2`).

---

#### **Task 2: Refactor `course-breadcrumb.njk` (Sticky Navbar)**
**Goal:** Create a modern, sticky navigation header with a glassmorphism effect. Isolate the "Course Switcher" to a secondary bar.

**Structure & Layout:**

**Part A: The Main Navbar (`<nav>`)**
1.  **Positioning:** Sticky to top (`sticky top-0 z-50`), with a glass effect (`bg-white/90 backdrop-blur border-b border-stone-200`).
2.  **Container:** Flexbox row (`flex items-center justify-between`), standard height (`h-16`).
3.  **Mobile Behavior:** Allow horizontal scrolling (`overflow-x-auto`) and hide scrollbars if possible.
4.  **Left Side (Breadcrumbs):**
    * Format: `Home > Courses > Current Course Title`.
    * Style: Simple text links, stone colors. Truncate the current course title on mobile to prevent overflow.
5.  **Right Side (Action Tabs):**
    * **Logic:** Use existing `materialHelpers` to check availability.
    * **Items:**
        1.  **"Course Home"**: Always visible button/tab.
        2.  **"Innovation"**: Visible if `courseInnovations` exists (keep existing logic).
        3.  **"Materials" Dropdown**: A native `<select>` containing all other materials (Syllabus, Workbook, Photos, etc.).
    * **Active State:** The current active tab/page should look distinct (e.g., `bg-[#FFFBF0] text-[#D4A373] ring-1 ring-[#D4A373]/20`). Default state should be subtle gray/stone.

**Part B: The Course Switcher (Secondary Bar)**
1.  **Location:** Move the "Switch Course" dropdown **outside** and **below** the main `<nav>`.
2.  **Style:** A thin, subtle bar (e.g., `bg-stone-50 border-b py-2`).
3.  **Alignment:** Align the dropdown to the right side of the container.

---
