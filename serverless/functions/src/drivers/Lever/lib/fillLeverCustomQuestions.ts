import { LeverConfig } from "../config/config.js";
import {
  LeverCustomQuestionField,
  LeverFillQuestionError,
} from "../types/types.js";

import { leverInputHandlers } from "../handlers/inputHandlers.js";
import {
  checkKeywordExist,
  shuffleArray,
  sleep,
} from "../../../utils/general.js";
import { Engine } from "../../../types/shared.js";

export async function fillLeverCustomQuestions(engine: Engine) {
  console.log("Filling custom questions...");

  const customQuestionsSections = await engine.page.$$(
    LeverConfig.selectors.customQuestionsSectionsSelector
  );

  if (!customQuestionsSections) return;
  const indicesArray = Array.from(
    { length: customQuestionsSections.length },
    (_, i) => i
  );
  shuffleArray(indicesArray);
  for (const i of indicesArray) {
    const customQuestionsSection = customQuestionsSections[i];
    const customQuestionsSectionValue = await engine.page.evaluate(
      // @ts-expect-error Property 'value' does not exist on type 'Element'
      (element: { value: any }) => element.value,
      customQuestionsSection
    );

    if (!customQuestionsSectionValue) continue;

    const ustomQuestionsSectionParsedData = JSON.parse(
      // @ts-expect-error Property 'value' does not exist on type 'Element'
      customQuestionsSectionValue
    );
    const { fields, id } = ustomQuestionsSectionParsedData;

    const fieldsIdArray = Array.from({ length: fields.length }, (_, i) => i);
    shuffleArray(fieldsIdArray);

    for (const i of fieldsIdArray) {
      const field = fields[i];
      if (field.required) {
        console.log(`Filling required question: ${field.text}`);
        await handleCustomQuestion(engine, id, i, field);
      }
      await sleep(1000 + Math.random() * 1500);
    }

    await sleep(500 + Math.random() * 1000);
  }

  console.log("✅ All custom questions answered");
}

const handleCustomQuestion = async (
  engine: Engine,
  cardId: string,
  index: number,
  field: LeverCustomQuestionField
) => {
  let answered = false;

  for (const {
    keywords,
    targetAnswer,
    multipleAnswers,
  } of LeverConfig.questionKewordsByQuestionType) {
    if (checkKeywordExist(field.text, keywords)) {
      await answerQuestion(
        engine,
        cardId,
        index,
        field,
        targetAnswer(engine.candidate),
        multipleAnswers
      );
      answered = true;
    }
  }

  if (!answered) {
    throw new LeverFillQuestionError(
      LeverConfig.leverFillQuestionErrors.unableToFillRequiredQuestion
    );
  }
};

// TODO: use AI for some fields
const answerQuestion = async (
  engine: Engine,
  cardId: string,
  index: number,
  field: LeverCustomQuestionField,
  targetAnswer: string | string[],
  multipleAnswers?: string[]
) => {
  const fieldId = `field${index}`;
  const handlers = leverInputHandlers(
    engine,
    field,
    cardId,
    fieldId,
    targetAnswer,
    multipleAnswers
  );
  switch (field.type) {
    case "dropdown":
      return await handlers.handleDropdown();
    case "textarea":
      return await handlers.handleTextArea();
    case "text":
      return await handlers.handleText();
    case "multiple-select":
      return await handlers.handleMultipleSelect();
    case "multiple-choice":
      return await handlers.handleMultipleChoice();
    default:
      throw new LeverFillQuestionError(
        LeverConfig.leverFillQuestionErrors.unsupportedFieldType(field.type)
      );
  }
};
