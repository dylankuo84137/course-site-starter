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

## 1. What is an "AI-Friendly Website"? How does it help teachers?

This website is not just a platform for displaying course materials, but a "structured database" designed for AI.

Simply put, we have organized **detailed data of all courses** on the website—from course introductions and syllabi to the **complete text content** of every worksheet, script, and story draft—into an "AI Index File" named `ai-index.json`.

**What are the benefits for teachers?**

You can provide this index file to Large Language Models (such as ChatGPT, Claude, Gemini, etc.), turning AI into a teaching assistant that best understands the "CiXin Curriculum Map". You can:

*   **Quickly Query and Integrate:** Search for specific subject materials across courses and grade levels.
*   **Deep Analysis and Comparison:** Analyze teaching methods and content differences between different courses.
*   **Efficiently Create Teaching Resources:** Let AI automatically generate new worksheets, activity plans, scripts, etc., based on existing materials.

---

## 2. What data can AI read from the website?

Once you provide the `ai-index.json` file to the AI, it can immediately grasp the following information:

| Data Type | Content Examples |
| :--- | :--- |
| **Course Basic Data** | Course name, grade, semester, field, instructor |
| **Course Details** | Course introduction, teaching objectives, teacher introduction |
| **Full Text of Materials** | **Full text of all PDFs and Google Docs**, for example:<br> - Worksheet<br> - Syllabus<br> - Play Script<br> - Story |
| **Full Material List** | **Names** and **tags** of workbooks, photos, chalkboard drawings, sheet music, etc. |
| **Multimedia File Info** | Links and descriptions of song audio files and videos |

**Key Advantage:** AI no longer guesses, but can **directly read and understand** the **content** of every PDF material you upload, making its output much closer to your actual teaching needs.

---

## 3. How to start? Two main methods

You can choose one of the following two methods to let AI read the website data according to your needs.

### Method 1: Download the Index File (Recommended for most complete information)

This method allows AI to obtain the most complete data, including the full text of all course PDFs, resulting in the most accurate analysis.

**Step 1: Download the AI Index File**

1.  Open the following link in your browser:
    *   <a href="{{ site.url }}/ai-index.json" target="_blank">{{ site.url }}/ai-index.json</a>
2.  The browser will display a page in JSON format. Please right-click and select "Save As" to save the file to your computer. The filename will be `ai-index.json`.

**Step 2: Upload the file to the AI Chatroom**

1.  Open your preferred AI tool (e.g., ChatGPT, Claude, Gemini, etc.).
2.  In the chat box, find the **Attach File** button (usually a paperclip 📎 icon).
3.  Select the `ai-index.json` file you just downloaded and upload it.

**Step 3: Start asking!**

After the file is successfully uploaded, you can start giving instructions to the AI. It is recommended to first use a sentence to let the AI understand the content of this file:

> "This is my school's course database, containing introductions for all courses, material lists, and the full text of PDF materials. Please answer my subsequent questions based on the content of this file."

### Method 2: Use Google NotebookLM (Most convenient, suitable for quick analysis)

If you don't want to download files, Google's NotebookLM tool can directly read public data on the website, which is very convenient.

**Step 1: Enter NotebookLM and Add Source**

1.  Go to the <a href="https://notebooklm.google.com/" target="_blank">Google NotebookLM</a> website.
2.  Create a new Notebook.
3.  In the "Sources" section on the left, click "Add new source" and select "Website".

**Step 2: Paste the URL**

In the popup window, paste the URL you want to analyze. You can choose:
*   **Analyze the entire website:** Paste the homepage URL `{{ site.url }}/`
*   **Analyze a specific course:** Paste the URL of a single course, e.g., `{{ site.url }}/courses/2a-nenggao-113-summer/`

NotebookLM will automatically crawl the web page content as a data source.

**Step 3: Start asking!**

After the data source is processed, you can start asking questions in the chat box below. Since NotebookLM already knows the data source, you can ask directly:

> "Based on the source, summarize the teaching objectives of this course."
> "Design three extension discussion questions for this course."
> "Find all scripts or stories used in this course and list their titles."

---

## 4. Prompt Examples: From Inquiry to Creation

You can copy or modify the following examples to explore the powerful features of AI.

【Role Setting Prompt】
"You are a senior curriculum consultant at CiXin Waldorf School. Please read the ai-index.json I uploaded. This is the school's complete course database, including course introductions, tags, instructors, and material lists. Please answer my questions based on the content of this file."

## **4-1. Beginning Teacher**

Style: Seeks concrete guidance, relies on existing frameworks

**AI Role:** Hand-holding Assistant

### **A. Getting up to speed with unfamiliar courses**

* Prompt:
  "I am going to teach 'Nenggao Mountain' for the second grade, but I haven't fully grasped the key points yet. Please analyze the introduction and materials of this course and tell me in bullet points: What are the three core teaching objectives of this course? If I were to introduce this class to children in one sentence, what should I say?"
* Prompt:
  "Please list all materials for teacher 'Lin Xinhong' for this semester. Please specifically mark which are 'Must-read texts' and which are 'Handouts for students', and include file download links so I can download them quickly for preparation."

### **B. Transforming Teaching Content**

* Prompt:
  "I am reading the script for 'Nenggao Mountain', but I'm afraid my storytelling will be too boring. Please help me design an opening remark suitable for the tone of second-grade children, full of imagery, to arouse their curiosity about this story."
* Prompt:
  "Based on the story content of this course, please generate a homework assignment for me. I want three simple Q&A questions (to check comprehension) and one drawing question (draw the most impressive scene)."

## **4-2. Regular Teacher**

Style: Skilled, seeks breakthroughs, attempts cross-domain connections

**AI Role:** Brainstorming Partner

### **A. Finding Interdisciplinary Inspiration**

* Prompt:
  "I am planning a course that combines 'History' and 'Geography'. Please search the database to see if any teachers have made similar attempts before? Please list the relevant course names and tell me how they connected these two concepts."
* Prompt:
  "I want to add artistic elements to my nature course. Please help me find if there are any nature main lesson blocks (e.g., Animals, Plants) that use 'Songs' or 'Drama'? Please list the track names or script titles for my reference."

### **B. Deepening and Innovation**

* Prompt:
  "Please analyze all versions of the 'Journey to the West' course in the database (different grades or different teachers). Please compare the differences in guiding focus when dealing with the character 'Sun Wukong'. I want to find an entry point I haven't tried yet."
* Prompt:
  "I want to adapt the story of 'Nenggao Mountain' into an outdoor wide game. Based on the levels in the script (e.g., forest, river), please help me design rules for five checkpoint activities suitable for group play by the whole class."

## **4-3. Lead Teacher**

Style: Macro-view, focuses on systematicity, dedicated to mentoring juniors

**AI Role:** Research & Mentoring Secretary

### **A. Curriculum Mapping and Asset Inventory**

* Prompt:
  "Please scan all courses from grades 1 to 6 in the school and check the coverage of the theme 'Local Culture'. Please list relevant courses by grade and tell me which grade has the fewest relevant courses, where we might need to strengthen."
* Prompt:
  "Please calculate the distribution of all digital materials (PDFs, Videos) in the database. Which subject has the richest digital resources? Which subject is most lacking? Please give me the data, I will use it to plan the focus of material development for next year."

### **B. Experience Inheritance and Mentoring**

* Prompt:
  "I am mentoring a new teacher who has just taken over the first grade. Please help me organize all 'Morning Circle Songs' and 'Story Outlines' for the first grade in the database into a 'First Week Teaching Starter Pack' so that he can prepare according to this list."
* Prompt:
  "Please analyze the teaching style of teacher 'Wang Wanting'. Based on her course introductions and tags, summarize her three most valued teaching core values (e.g., Willpower, Aesthetics...), and cite corresponding courses as examples. I want to use this to discuss with intern teachers what the CiXin teaching style is."

---

## 5. Important Notices

*   **Content Licensing:** All content on this site is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en" target="_blank">CC BY-NC-SA</a>. If you wish to share the data you produce, please do so in the same manner, attribute the source, and **do not use it for commercial purposes**.
*   **Double Check:** Although AI-generated content is fast, it still requires final review and adjustment by you, the professional teacher, to ensure it meets your teaching goals and student needs.

Hope this guide helps you start a new journey of collaboration with AI, making lesson preparation and instructional design easier and more interesting!
