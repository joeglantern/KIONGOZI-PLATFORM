import { NextRequest, NextResponse } from 'next/server';
import { authorizeInstructorCourseAccess } from '@/lib/quiz/access';

interface OptionPayload {
    option_text: string;
    is_correct: boolean;
}

interface QuestionPayload {
    question_text: string;
    question_type: string;
    points: number;
    options: OptionPayload[];
}

interface SaveQuizBody {
    metadata: {
        title: string;
        description: string;
        passing_score: number;
        time_limit_minutes: number;
        module_id: string | null;
    };
    questions: QuestionPayload[];
}

// POST — create a new quiz with all questions and options in one request
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { courseId } = await params;
        const access = await authorizeInstructorCourseAccess(request, courseId);
        if ('error' in access) return access.error;

        const { serviceClient } = access;
        const body = await request.json() as SaveQuizBody;
        const { metadata, questions } = body;

        if (!metadata.title?.trim()) {
            return NextResponse.json({ error: 'Quiz title is required.' }, { status: 400 });
        }

        const { data: quiz, error: quizError } = await serviceClient
            .from('quizzes')
            .insert({
                course_id: courseId,
                module_id: metadata.module_id || null,
                title: metadata.title.trim(),
                description: metadata.description || null,
                passing_score: metadata.passing_score,
                time_limit_minutes: metadata.time_limit_minutes,
            })
            .select('id')
            .single();

        if (quizError || !quiz) {
            return NextResponse.json({ error: quizError?.message ?? 'Failed to create quiz.' }, { status: 500 });
        }

        await saveQuestionsAndOptions(serviceClient, quiz.id, questions);

        return NextResponse.json({ quizId: quiz.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to save quiz.' }, { status: 500 });
    }
}

async function saveQuestionsAndOptions(
    serviceClient: any,
    quizId: string,
    questions: QuestionPayload[]
) {
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const { data: questionRow, error: questionError } = await serviceClient
            .from('quiz_questions')
            .insert({
                quiz_id: quizId,
                question_text: q.question_text,
                question_type: q.question_type,
                points: q.points,
                order_index: i,
            })
            .select('id')
            .single();

        if (questionError || !questionRow) continue;

        const filledOptions = q.options.filter(o => o.option_text.trim());
        if (filledOptions.length > 0) {
            await serviceClient.from('quiz_options').insert(
                filledOptions.map(o => ({
                    question_id: questionRow.id,
                    option_text: o.option_text,
                    is_correct: o.is_correct,
                }))
            );
        }
    }
}
