/**
 * Interfaz para contextos específicos de prompts por tabla
 */
export interface TableContextPrompts {
  purpose: string;
  queryInstructions: string;
  insertInstructions: string;
  updateInstructions: string;
  relationshipGuidance: string;
  businessLogic: string;
  criticalFields: string[];
  usageExamples: string[];
  aiTips: string[];
}