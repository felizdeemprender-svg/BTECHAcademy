
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-course-topics.ts';
import '@/ai/flows/generate-quiz-questions.ts';
import '@/ai/flows/extract-document-text-flow.ts';
import '@/ai/flows/generate-course-structure.ts';
import '@/ai/flows/evaluate-quiz-performance.ts';
import '@/ai/flows/moderate-content-flow.ts';
import '@/ai/flows/generate-student-profile.ts';
import '@/ai/flows/generate-tag-suggestions.ts';
import '@/ai/flows/generate-moderation-suggestions.ts';
import '@/ai/flows/refine-variant-flow.ts';
import '@/ai/flows/generate-coordination-plan.ts';
import '@/ai/flows/generate-template-collection.ts';
import '@/ai/flows/generate-campaign-assets.ts';
import '@/ai/flows/generate-sales-copy.ts';
import '@/ai/flows/tutor-chat-flow.ts';
import '@/ai/flows/check-ai-health.ts';
