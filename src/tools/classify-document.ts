import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getAnthropicClient, classifierModel } from '../shared/claude-client.js';
import { logger } from '../shared/logger.js';

const documentTypeEnum = z.enum([
  'id_card',
  'pension_statement',
  'gemel_statement',
  'policy_document',
  'loan_document',
  'severance_form',
  'salary_slip',
  'medical_form',
  'power_of_attorney',
  'unknown',
]);

const inputSchema = z.object({
  document_text: z
    .string()
    .min(1)
    .describe(
      'Plain-text content extracted from the document (OCR output or text body). Hebrew or English.',
    ),
  filename: z.string().optional().describe('Original filename for context.'),
});

const CONFIDENCE_THRESHOLD = 0.75;

interface ClassificationOutput {
  document_type: z.infer<typeof documentTypeEnum>;
  confidence: number;
  reasoning: string;
  hebrew_label: string;
  requires_review: boolean;
}

const HEBREW_LABELS: Record<z.infer<typeof documentTypeEnum>, string> = {
  id_card: 'תעודת זהות',
  pension_statement: 'דוח קרן פנסיה',
  gemel_statement: 'דוח קופת גמל / קרן השתלמות',
  policy_document: 'פוליסת ביטוח',
  loan_document: 'מסמך הלוואה',
  severance_form: 'טופס פיצויים',
  salary_slip: 'תלוש שכר',
  medical_form: 'הצהרת בריאות / מסמך רפואי',
  power_of_attorney: 'ייפוי כוח',
  unknown: 'לא ידוע',
};

export const classifyDocumentTool = betaZodTool({
  name: 'classify_document',
  description:
    'Classify a document into one of the known insurance/pension document types using Claude Haiku. Returns document_type, confidence (0-1), reasoning, hebrew_label, and requires_review flag (true if confidence < 0.75).',
  inputSchema,
  run: async (input) => {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: classifierModel(),
      max_tokens: 1024,
      system:
        'You are a Hebrew/English document classifier for an Israeli financial planning office. Identify the document type from this taxonomy ONLY: id_card, pension_statement, gemel_statement, policy_document, loan_document, severance_form, salary_slip, medical_form, power_of_attorney, unknown. Respond with strict JSON: {"document_type": "<type>", "confidence": <0-1>, "reasoning": "<short>"}',
      messages: [
        {
          role: 'user',
          content: `Filename: ${input.filename ?? '(unknown)'}\n\nContent:\n${input.document_text.slice(0, 8000)}`,
        },
      ],
    });

    // Extract text from the first text block
    let raw = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        raw += block.text;
      }
    }

    let parsed: { document_type: string; confidence: number; reasoning: string };
    try {
      // Strip code fences if Claude wrapped the JSON
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      logger.warn({ raw }, 'classify_document.parse_failed');
      const fallback: ClassificationOutput = {
        document_type: 'unknown',
        confidence: 0,
        reasoning: 'Classifier output was not valid JSON.',
        hebrew_label: HEBREW_LABELS.unknown,
        requires_review: true,
      };
      return JSON.stringify(fallback);
    }

    const typeResult = documentTypeEnum.safeParse(parsed.document_type);
    const docType = typeResult.success ? typeResult.data : 'unknown';
    const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0));
    const result: ClassificationOutput = {
      document_type: docType,
      confidence,
      reasoning: parsed.reasoning ?? '',
      hebrew_label: HEBREW_LABELS[docType],
      requires_review: confidence < CONFIDENCE_THRESHOLD || docType === 'unknown',
    };

    logger.info(
      {
        tool: 'classify_document',
        documentType: result.document_type,
        confidence: result.confidence,
        requiresReview: result.requires_review,
      },
      'tool.executed',
    );
    return JSON.stringify(result);
  },
});
