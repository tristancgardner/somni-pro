

Below is a concise **step-by-step** set of **Cursor** instructions explaining how to implement and use the updated single-file Identify Speakers flow **with** a lighter prompt **and** a front-end that supports:

1. **Single or multiple file** selection (loop approach).
2. **One** updated route that returns `speakerLabels`.
3. **Front-end** UI for reviewing labels, optional manual edits, and then saving to S3.

---

## 1) **Replace Your Current `route.ts`** Code

1. **Open** `app/api/agents/identify-speakers/route.ts` in Cursor.
2. **Paste** the updated code from the snippet above.
3. **Save** the file.
   * This ensures your prompt is simpler about “unknown” labels.
   * The route returns `speakerLabels` of the form:
     ```json
     {
       "SPEAKER_00": { "role": "Interviewee", "name": "Liz" },
       "SPEAKER_01": { "role": "Interviewer", "name": "Interviewer" }
     }
     ```

---

## 2) **In Your Front-End** (e.g. `IdentifySpeakersAgent.tsx`)

You already have:

* A **table** for user context (the “Name” | “Position” rows).
* A **button** to “Run Identify Speakers.”
* Logic that **fetches** the transcript and calls `/api/agents/identify-speakers`.
* UI to **edit** or **approve** results, then **save** to S3.

### Steps to Update for Multiple Files (if needed)

1. **Open** `IdentifySpeakersAgent.tsx` in Cursor.
2. Locate your `handleIdentifySpeakers()` function.
3. Instead of only handling `selectedFiles[currentFileIndex]`, you can **loop** through `selectedFiles`. For example:
   ```ts
   async function handleIdentifySpeakers() {
     if (!selectedFiles || selectedFiles.length === 0) {
       toast.error("No files selected");
       return;
     }
     const userContext = buildUserContext();
     for (let i = 0; i < selectedFiles.length; i++) {
       await processOneFile(selectedFiles[i], userContext);
     }
     toast.success("Identify Speakers complete for all selected files!");
   }
   ```
4. “ **processOneFile** ” would handle:
   * **Fetch** transcript from `/api/fetch-transcription`.
   * **POST** to `/api/agents/identify-speakers` with `{ fileName, transcript, userContext }`.
   * **Store** or display `data.speakerLabels`.
5. If you **already** prefer a one-file-at-a-time approach (like your `currentFileIndex` state), keep that logic but remove mention of multiple calls.

---

## 3) **Testing** in Cursor

1. **Save** changes to both `route.ts` and your front-end.
2. **Open** your local dev URL in a browser (e.g. `localhost:3000/file-viewer`).
3. **Select** one or more files.
4. **Click** the “Identify Speakers” button.
5. **Observe** the logs in your console or dev tools to see the new minimal prompt + `speakerLabels` results.
6. **Approve** or **edit** the speaker labels, and confirm it saves to S3.

---

## 4) **Possible Prompt Text** in “Build User Context”

1. Let the user type in lines like:
   ```
   Tristan G. | The Interviewer
   Michael Smith | CEO of CarolinaEast
   Jane Doe | Director of Marketing
   ```
2. In your “buildUserContext” function, just join those lines with `. ` to form a short paragraph:
   ```ts
   function buildUserContext() {
     return contextRows
       .filter(row => row.name && row.position)
       .map(row => `${row.name} is ${row.position}`)
       .join(". ") + ".";
   }
   ```
3. Now each file’s GPT call sees the same snippet:
   ```
   Additional context about possible speakers:
   Tristan G. is The Interviewer. Michael Smith is CEO of CarolinaEast. Jane Doe is Director of Marketing.
   ```

That’s it! GPT should interpret any “UNKNOWN” speaker label in each file as potentially one of those known individuals, or “Unknown” if there’s insufficient text.

---

### Quick Recap

1. **Route** : Use the lighter prompts for role + name inference, returning a minimal `speakerLabels`.
2. **Front-End** :

* Loop or single-file approach.
* Give GPT the same context snippet for each call.
* Show + confirm or auto-save.

With these changes, you keep a simpler context and fully handle single/multi-file flows in your existing front-end.
