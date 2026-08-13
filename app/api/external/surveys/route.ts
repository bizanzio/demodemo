import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateExternalService } from '@/lib/external-auth';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
    const auth = await authenticateExternalService(request);
    if (!auth.ok) return auth.response;

    const { requestId, service } = auth;

    try {
        const url = new URL(request.url);

        const limit = Math.min(
            Math.max(parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT)), 1),
            MAX_LIMIT
        );

        const afterId = url.searchParams.get('after_id');
        const since = url.searchParams.get('since');
        const until = url.searchParams.get('until');
        const page = parseInt(url.searchParams.get('page') || '0');
        const includeSubmission = url.searchParams.get('include_submission') !== 'false';

        const where: any = {};
        const orderBy: any = [{ submittedAt: 'asc' }, { id: 'asc' }];

        if (afterId) {
            const cursorRecord = await prisma.survey.findUnique({
                where: { id: afterId },
                select: { submittedAt: true, id: true },
            });

            if (!cursorRecord) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Survey with id '${afterId}' not found`,
                        code: 'INVALID_CURSOR',
                    },
                    { status: 400 }
                );
            }

            where.OR = [
                { submittedAt: { gt: cursorRecord.submittedAt } },
                {
                    submittedAt: { equals: cursorRecord.submittedAt },
                    id: { gt: cursorRecord.id },
                },
            ];
        }

        if (since) {
            const sinceDate = new Date(since);
            if (isNaN(sinceDate.getTime())) {
                return NextResponse.json(
                    { success: false, error: "'since' must be a valid ISO date", code: 'INVALID_DATE' },
                    { status: 400 }
                );
            }
            where.submittedAt = { ...where.submittedAt, gte: sinceDate };
        }

        if (until) {
            const untilDate = new Date(until);
            if (isNaN(untilDate.getTime())) {
                return NextResponse.json(
                    { success: false, error: "'until' must be a valid ISO date", code: 'INVALID_DATE' },
                    { status: 400 }
                );
            }
            where.submittedAt = { ...where.submittedAt, lte: untilDate };
        }

        const skip = page > 0 ? (page - 1) * limit : 0;

        const [surveys, total] = await Promise.all([
            prisma.survey.findMany({
                where,
                include: {
                    submission: {
                        select: {
                            rewardStatus: true,
                            voucherId: true,
                            voucherAmount: true,
                            rewardProcessedAt: true,
                            pointsStatus: true,
                            pointsEarned: true,
                            pointsTotal: true,
                            pointsProcessedAt: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: limit + 1, // +1 to detect if there are more results
            }),
            prisma.survey.count({ where }),
        ]);

        const hasMore = surveys.length > limit;
        const results = hasMore ? surveys.slice(0, limit) : surveys;
        const lastItem = results[results.length - 1];

        const formattedSurveys = results.map((survey) => {
            const base: Record<string, unknown> = {
                id: survey.id,
                ticketId: survey.ticketId,
                csatScore: survey.csatScore,
                npsScore: survey.npsScore,
                salespersonRating: survey.salespersonRating,
                foundEverything: survey.foundEverything,
                waitTimeRange: survey.waitTimeRange,
                comment: survey.comment,
                locale: survey.locale,
                submittedAt: survey.submittedAt.toISOString(),
            };

            if (includeSubmission && survey.submission) {
                const s = survey.submission;
                base.submission = {
                    rewardStatus: s.rewardStatus,
                    voucherId: s.voucherId,
                    voucherAmount: s.voucherAmount ? Number(s.voucherAmount) : null,
                    rewardProcessedAt: s.rewardProcessedAt?.toISOString() ?? null,
                    pointsStatus: s.pointsStatus,
                    pointsEarned: s.pointsEarned ? Number(s.pointsEarned) : null,
                    pointsTotal: s.pointsTotal ? Number(s.pointsTotal) : null,
                    pointsProcessedAt: s.pointsProcessedAt?.toISOString() ?? null,
                };
            }

            return base;
        });

        console.log(
            `[${requestId}] ✅ External API (${service}): ${results.length}/${total} surveys returned`
        );

        return NextResponse.json({
            success: true,
            data: {
                surveys: formattedSurveys,
                pagination: {
                    total,
                    limit,
                    returned: results.length,
                    has_more: hasMore,
                    next_cursor: hasMore && lastItem ? lastItem.id : null,
                },
            },
            meta: {
                request_id: requestId,
                service,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error(`[${requestId}] ❌ External API surveys error:`, error.message);
        return NextResponse.json(
            { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
