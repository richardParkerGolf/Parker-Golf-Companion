const SHEETS = {
  categories: "Categories",
  curiosities: "Curiosities",
  explorations: "Explorations",
  tasks: "Tasks",
  curiosityExploration: "CuriosityExploration",
  explorationTask: "ExplorationTask",
  questions: "Questions",
  lessonFields: "LessonFields",
};

function doGet() {
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const data = {
      categories: readObjects_(book, SHEETS.categories).map(row => ({
        id: text_(row.CategoryID),
        name: text_(row.Name),
        sortOrder: number_(row.SortOrder),
      })),
      curiosities: readObjects_(book, SHEETS.curiosities).map(row => ({
        id: text_(row.CuriosityID),
        categoryId: text_(row.CategoryID),
        name: text_(row.Name),
        description: text_(row.Description),
        keywords: text_(row.Keywords),
        active: boolean_(row.Active),
        sortOrder: number_(row.SortOrder),
      })),
      explorations: readObjects_(book, SHEETS.explorations).map(row => ({
        id: text_(row.ExplorationID),
        name: text_(row.Name),
        description: text_(row.Description),
      })),
      tasks: readObjects_(book, SHEETS.tasks).map(row => ({
        id: text_(row.TaskID),
        name: text_(row.Name),
        purpose: text_(row.Purpose),
        setup: text_(row.Setup),
        instructions: text_(row.Instructions),
        observe: text_(row.Observe),
        coachPrompts: text_(row.CoachPrompts),
        reflection: text_(row.Reflection),
        estimatedMinutes: number_(row.EstimatedMinutes),
        equipment: text_(row.Equipment),
        notes: text_(row.Notes),
        active: boolean_(row.Active),
        taskType: text_(row.TaskType),
        source: text_(row.Source),
        taskStyle: text_(row.TaskStyle),
        difficulty: text_(row.Difficulty),
        environment: text_(row.Environment),
        ballOutcome: text_(row.BallOutcome),
      })),
      curiosityExploration: readObjects_(book, SHEETS.curiosityExploration).map(row => ({
        leftId: text_(row.CuriosityID),
        rightId: text_(row.ExplorationID),
        sortOrder: number_(row.SortOrder),
      })),
      explorationTask: readObjects_(book, SHEETS.explorationTask).map(row => ({
        leftId: text_(row.ExplorationID),
        rightId: text_(row.TaskID),
        sortOrder: number_(row.SortOrder),
      })),
      questions: readObjects_(book, SHEETS.questions).map(row => ({
        stage: text_(row.Stage),
        questionSet: text_(row.QuestionSet),
        question: text_(row.Question),
        active: boolean_(row.Active),
        sortOrder: number_(row.SortOrder),
      })),
      lessonFields: readObjects_(book, SHEETS.lessonFields).map(row => ({
        stage: text_(row.Stage),
        fieldKey: text_(row.FieldKey),
        label: text_(row.Label),
        placeholder: text_(row.Placeholder),
        active: boolean_(row.Active),
        sortOrder: number_(row.SortOrder),
      })),
    };

    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function readObjects_(book, sheetName) {
  const sheet = book.getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing sheet: " + sheetName);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(row => row.some(value => value !== ""))
    .map(row => headers.reduce((object, header, index) => {
      object[header] = row[index];
      return object;
    }, {}));
}

function text_(value) {
  return value == null ? "" : String(value).trim();
}

function number_(value) {
  return Number(value) || 0;
}

function boolean_(value) {
  return ["true", "yes", "1", "active"].includes(text_(value).toLowerCase());
}
