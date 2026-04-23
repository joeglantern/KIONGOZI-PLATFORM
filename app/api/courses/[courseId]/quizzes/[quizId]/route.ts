import { NextRequest, NextResponse } from 'next/server';
import { authorizeQuizAccess } from '@/lib/quiz/access';

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
