import { NextRequest, NextResponse } from 'next/server';
import { authorizeQuizAccess, authorizeInstructorCourseAccess } from '@/lib/quiz/access';

interface OptionPayload {
    id?: string;
    option_text: string;
    is_correct: boolean;
}

interface QuestionPayload {
    id?: string;
    question_text: string;
    question_type: string;
    points: number;
    options: OptionPayload[];
}

interface UpdateQuizBody {
    metadata: {
        title: string;
        description: string;
        passing_score: number;
        time_limit_minutes: number;
        module_id: string | null;
    };
    questions: QuestionPayload[];
}

type AnswerMap = Record<string, string>;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { courseId, quizId } = await params;
        const access = await authorizeQuizAccess(request, courseId, quizId);
        if ('error' in access) {
            return access.error;
        }

        const { serviceClient, quiz } = access;
        const { data: questionRows, error: questionError } = await serviceClient
            .from('quiz_questions')
            .select(`
                id,
                question_text,
                question_type,
                points,
                quiz_options (
                    id,
                    option_text
                )
            `)
            .eq('quiz_id', quizId)
            .order('order_index');

        if (questionError) {
            return NextResponse.json({ error: questionError.message }, { status: 500 });
        }

        return NextResponse.json({
            quiz,
            questions: (questionRows || []).map((question: any) => ({
                id: question.id,
                question_text: question.question_text,
                question_type: question.question_type,
                points: question.points,
                options: question.quiz_options || [],
            })),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to load quiz' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { courseId, quizId } = await params;
        const access = await authorizeQuizAccess(request, courseId, quizId);
        if ('error' in access) {
            return access.error;
        }

        const { serviceClient, user, quiz } = access;
        const body = await request.json();
        const answers = (body?.answers || {}) as AnswerMap;

        const { data: questionRows, error: questionError } = await serviceClient
            .from('quiz_questions')
            .select(`
                id,
                points,
                quiz_options (
                    id,
                    is_correct
                )
            `)
            .eq('quiz_id', quizId)
            .order('order_index');

        if (questionError) {
            return NextResponse.json({ error: questionError.message }, { status: 500 });
        }

        const questions = questionRows || [];
        if (questions.length === 0) {
            return NextResponse.json({ error: 'Quiz has no questions configured.' }, { status: 400 });
        }

        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach((question: any) => {
            totalPoints += question.points;
            const selectedOptionId = answers[question.id];
            const correctOption = (question.quiz_options || []).find((option: any) => option.is_correct);
            if (correctOption && selectedOptionId === correctOption.id) {
                earnedPoints += question.points;
            }
        });

        const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = finalScore >= (quiz.passing_score || 70);

        const { data: priorPass } = await serviceClient
            .from('quiz_attempts')
            .select('id')
            .eq('quiz_id', quizId)
            .eq('user_id', user.id)
            .eq('passed', true)
            .limit(1)
            .maybeSingle();

        const { error: attemptError } = await serviceClient
            .from('quiz_attempts')
            .insert({
                quiz_id: quizId,
                user_id: user.id,
                score: finalScore,
                passed,
            });

        if (attemptError) {
            return NextResponse.json({ error: attemptError.message }, { status: 500 });
        }

        let xpAwarded = false;
        let message = passed
            ? `You passed with ${finalScore}%.`
            : `You scored ${finalScore}%, which is below the ${quiz.passing_score}% required to pass.`;

        if (passed && !priorPass) {
            const { error: awardError } = await serviceClient.rpc('award_lms_action', {
                user_uuid: user.id,
                xp_amount: 50,
            });

            if (awardError) {
                return NextResponse.json({
                    error: 'Your attempt was saved, but the XP reward could not be applied.',
                    score: finalScore,
                    passed,
                }, { status: 500 });
            }

            xpAwarded = true;
            message = `You passed with ${finalScore}% and earned 50 XP.`;
        } else if (passed) {
            message = `You passed with ${finalScore}%. XP was already awarded on your first pass.`;
        }

        return NextResponse.json({
            score: finalScore,
            passed,
            xpAwarded,
            message,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to submit quiz' }, { status: 500 });
    }
}

// PUT — atomic update of quiz metadata + questions + options (instructor only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { courseId, quizId } = await params;
        const access = await authorizeInstructorCourseAccess(request, courseId);
        if ('error' in access) return access.error;

        const { serviceClient } = access;
        const body = await request.json() as UpdateQuizBody;
        const { metadata, questions } = body;

        if (!metadata.title?.trim()) {
            return NextResponse.json({ error: 'Quiz title is required.' }, { status: 400 });
        }

        // 1. Update quiz metadata
        const { error: quizError } = await serviceClient
            .from('quizzes')
            .update({
                module_id: metadata.module_id || null,
                title: metadata.title.trim(),
                description: metadata.description || null,
                passing_score: metadata.passing_score,
                time_limit_minutes: metadata.time_limit_minutes,
            })
            .eq('id', quizId);

        if (quizError) {
            return NextResponse.json({ error: quizError.message }, { status: 500 });
        }

        // 2. Get existing question IDs to detect deletions
        const { data: existingQuestions } = await serviceClient
            .from('quiz_questions')
            .select('id')
            .eq('quiz_id', quizId);

        const existingIds = new Set((existingQuestions ?? []).map((q: any) => q.id));
        const incomingIds = new Set(questions.filter(q => q.id).map(q => q.id as string));
        const toDeleteIds = [...existingIds].filter(id => !incomingIds.has(id));

        // 3. Delete removed questions (cascades to options via FK)
        if (toDeleteIds.length > 0) {
            await serviceClient.from('quiz_questions').delete().in('id', toDeleteIds);
        }

        // 4. Upsert questions and their options
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            let questionId = q.id;

            if (questionId) {
                await serviceClient
                    .from('quiz_questions')
                    .update({
                        question_text: q.question_text,
                        question_type: q.question_type,
                        points: q.points,
                        order_index: i,
                    })
                    .eq('id', questionId);
            } else {
                const { data: newQ, error: newQError } = await serviceClient
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
                if (newQError || !newQ) continue;
                questionId = newQ.id;
            }

            // Replace options for this question
            await serviceClient.from('quiz_options').delete().eq('question_id', questionId);
            const filledOptions = q.options.filter(o => o.option_text.trim());
            if (filledOptions.length > 0) {
                await serviceClient.from('quiz_options').insert(
                    filledOptions.map(o => ({
                        question_id: questionId,
                        option_text: o.option_text,
                        is_correct: o.is_correct,
                    }))
                );
            }
        }

        return NextResponse.json({ quizId });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to update quiz' }, { status: 500 });
    }
}
