---
layout: layouts/prose.njk
title: AI Application Guide
permalink: /en-US/ai-guide/
eleventyNavigation:
  key: ai-guide-en
---

<div style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;" aria-hidden="true" lang="en-US">
  AI Guide for Teachers: Using AI Tools with Course Archive
  ChatGPT Claude Gemini NotebookLM ai-index.json structured data
  Download index file, query courses, generate worksheets, teaching materials
  Cross-course analysis, lesson planning, educational resources
</div>

# AI Application Techniques for the Cixin Course Weaver: A Teacher's Guide

## 1. What is an "AI-Friendly Website"? How Does It Help Teachers?

This website is not just a platform for displaying course materials; it's a "structured database" designed for AI.

In simple terms, we have compiled all the detailed information for **every course on this site**—from course descriptions and syllabi to the **full text** of every worksheet, script, and story—into a single "AI index file" called `ai-index.json`.

**How does this benefit teachers?**

You can provide this index file to Large Language Models (like ChatGPT, Claude, Gemini, etc.), turning the AI into your expert teaching assistant on the "Cixin Course Archive." You can:

*   **Quickly Query and Integrate**: Search for teaching materials across different courses and grade levels.
*   **In-depth Analysis and Comparison**: Analyze the teaching methods and content differences between various courses.
*   **Efficiently Create Teaching Resources**: Have the AI automatically generate new worksheets, activity plans, scripts, and more, based on existing materials.

---

## 2. What Data on the Website Can the AI Access?

Once you provide the `ai-index.json` file to an AI, it can instantly access all the following information:

| Data Type | Example Content |
| :--- | :--- |
| **Basic Course Information** | Course name, grade level, semester, subject, instructor |
| **Detailed Course Content** | Course description, learning objectives, teacher introduction |
| **Full Text of Materials** | **The complete text of all PDFs and Google Docs**, such as:<br> - Worksheets<br> - Syllabi<br> - Play Scripts<br> - Stories |
| **List of All Materials** | The **names** and **tags** for workbooks, photos, blackboard drawings, sheet music, etc. |
| **Multimedia File Information** | Links and descriptions for audio songs and videos |

**Key Advantage**: The AI is no longer guessing. It can **directly read and understand the content** of every PDF you've uploaded, making its output much more relevant to your actual teaching.

---

## 3. How to Get Started: Two Main Methods

You can choose one of the following two methods to let the AI access the website's data, depending on your needs.

### Method 1: Download the Index File (Recommended, Most Complete Information)

This method gives the AI the most complete dataset, including the full text of all course PDFs, ensuring the most accurate analysis.

**Step 1: Download the AI Index File**

1.  Open the following link in your browser:
    *   <a href="{{ site.url }}/ai-index.json" target="_blank">{{ site.url }}/ai-index.json</a>
2.  Your browser will display a page with JSON-formatted text. Right-click on the page, select "Save As...", and save the file to your computer. The filename will be `ai-index.json`.

**Step 2: Upload the File to Your AI Chat Interface**

1.  Open your preferred AI tool (e.g., ChatGPT, Claude, Gemini).
2.  In the chat input area, find the **attach file** button (usually a paperclip 📎 icon).
3.  Select the `ai-index.json` file you just downloaded and upload it.

**Step 3: Start Asking Questions!**

Once the file is successfully uploaded, you can start giving the AI commands. It's a good idea to start with a sentence that tells the AI what the file is about:

> "This is my school's course database. It contains introductions, material lists, and the full text of PDF materials for all courses. Please use this file to answer my following questions."

### Method 2: Use Google NotebookLM (Most Convenient, Good for Quick Analysis)

If you prefer not to download files, Google's NotebookLM tool can directly read public data from the website, which is very convenient.

**Step 1: Go to NotebookLM and Add a New Source**

1.  Go to the <a href="https://notebooklm.google.com/" target="_blank">Google NotebookLM</a> website.
2.  Create a new Notebook.
3.  In the "Sources" panel on the left, click "Add new source," and then select "Website."

**Step 2: Paste the URL**

In the pop-up window, paste the URL you want to analyze. You can choose to:
*   **Analyze the entire site**: Paste the homepage URL `{{ site.url }}/`
*   **Analyze a specific course**: Paste the URL of a single course, for example, `{{ site.url }}/courses/2a-nenggao-113-summer/`

NotebookLM will automatically fetch the web page content to use as its source.

**Step 3: Start Asking Questions!**

After the source has been processed, you can start asking questions in the chat box at the bottom. Since NotebookLM already knows the source, you can ask directly:

> "Based on the source, summarize the learning objectives of this course."
> "Design three follow-up discussion questions for this course."
> "Find all the scripts or stories used in this course and list their titles."

---

## 4. Prompt Examples: From Inquiry to Creation

You can copy or modify the following examples to explore the powerful capabilities of the AI.

### A. Basic Queries and Data Organization

**Finding a specific course or teacher:**
*   `"List all the second-grade Natural Science main courses."`
*   `"Which courses has Wang Wan-Ting taught? Please list them in a table."`
*   `"I'm looking for courses related to 'environmental protection' or 'ecology'. What are the options?"`

**Summarizing course content:**
*   `"Help me summarize the course description, learning objectives, and main materials used in the 'Mt. Nenggao' course."`
*   `"List the filenames of all PDF worksheets for the 'Modern History' course."`

### B. Cross-Course Analysis and Comparison

**Comparing teaching design:**
*   `"Compare the second-grade 'Mt. Nenggao' and the fourth-grade 'Journey to the West' drama courses. What are the differences in their script themes and character settings?"`
*   `"Analyze the blackboard drawings across all courses and summarize the evolution of artistic style from lower to upper grades."`

**Finding common themes:**
*   `"Please find all courses and materials that mention 'solar terms' and explain the different perspectives they take."`
*   `"I want to design an activity about 'teamwork.' Please search all course data to find activities or stories that could serve as case studies."`

### C. Efficiently Create Teaching Materials (The Most Practical Part!)

**Designing worksheets:**
*   `"Based on the full script of the 'Mt. Nenggao' course, design a Mandarin language worksheet for second-graders, including 3 reading comprehension questions and 1 sentence-making exercise."`
*   `"Please read the 'Modern History' course materials and design a 5-question short-answer quiz for the midterm review."`

**Writing lesson and activity plans:**
*   `"I am a third-grade music teacher. Please find all the songs and sheet music from this database that are suitable for my teaching. Then, design a 40-minute lesson plan for one of the songs, including a warm-up, a development activity, and a conclusion."`
*   `"Using the workbook content from the 'Journey to the West' course as a reference, design a weekend outdoor light-and-shadow observation activity plan for fourth-graders."`

**Rewriting and Re-creating:**
*   `"Rewrite the 'Story' manuscript from the 'Journey to the West' course into a 500-word short article suitable for sharing during morning reading time."`
*   `"Expand the 'Mt. Nenggao' script by adding a new scene with the theme 'The Animals' Meeting,' and include two new characters."`

---

## 5. Important Notes

*   **Content License**: All content on this site is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en" target="_blank">CC BY-NC-SA</a>. If you share any materials you generate, you must do so under the same license, provide attribution, and **not use them for commercial purposes**.
*   **Always Verify**: While AI-generated content is produced quickly, it still needs to be reviewed and adjusted by you, the professional teacher, to ensure it meets your teaching goals and your students' needs.

We hope this guide helps you embark on a new journey of collaboration with AI, making lesson planning and instructional design easier and more enjoyable!
