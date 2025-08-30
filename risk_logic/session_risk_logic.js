import { supabase } from '../utils/supabase';

/**
 * Evaluate a session for compliance and risk, ext: should be recalled on all sessions that are not status = reviewed or paid / a new function made for reviews
 * @param {String} session_id 
 */
export async function evaluateSession(session_id) {
    // Fetch session data
    const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_id", session_id)
        .single();

    if (sessionError) throw sessionError;

    const creator_id = session.user_id;

    // Get transactions in this session
    const { data: sessionTxs, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("session_id", session_id);

    if (txError) throw txError;

    const totalTxs = sessionTxs.length;

    // True iff all tx are blocked or approved, not review (since further actions required)
    const allFinalized = sessionTxs.every(tx =>
        !tx.status.startsWith("Review")
    );

    let suspiciousFlags = [];

    // Analyse in session suspicious patterns
    if (totalTxs > 0) {
        // Pattern 1: Large tip ratio attributed to single user
        const tipperCounts = sessionTxs.reduce((acc, tx) => {
            acc[tx.user_id] = (acc[tx.user_id] || 0) + 1;
            return acc;
        }, {});
        const maxTipper = Object.entries(tipperCounts).sort((a, b) => b[1] - a[1])[0];
        const maxTipperRatio = maxTipper[1] / totalTxs;

        if (maxTipperRatio > 0.8) {
            suspiciousFlags.push("Dominant Tipper (>80% of tips from one user)");
        }

        // Pattern 2: Micro-tip ratio: tips under 5 coins
        const microTipCount = sessionTxs.filter(tx => tx.amount < 5).length;
        const microTipRatio = microTipCount / totalTxs;
        if (microTipRatio > 0.7) {
            suspiciousFlags.push("High Micro-tip Ratio (>70% of tips under 5 coins)");
        }

        // Pattern 3: Failure rate
        const failureCount = sessionTxs.filter(tx => tx.failure_flag).length;
        const failureRate = failureCount / totalTxs;
        if (failureRate > 0.5) {
            suspiciousFlags.push("High Failure Rate (>50%)");
        }
    }


    // Calculate current session's individual risk score
    const sessionTxIds = sessionTxs.map(tx => tx.transaction_id);

    let sessionRiskScore = 0;

    if (sessionTxIds.length > 0) {
        const { data: sessionRiskEvents, error: riskError } = await supabase
            .from("risk_events")
            .select("points_added")
            .in("transaction_id", sessionTxIds);

        if (riskError) throw riskError;

        sessionRiskScore = sessionRiskEvents.reduce((sum, ev) => sum + ev.points_added, 0);
    }

    // Calculate average risk events per session (last 2 weeks only)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Get creator's sessions in last 2 weeks
    const { data: recentSessions, error: recentSessionsError } = await supabase
        .from("sessions")
        .select("session_id")
        .eq("user_id", creator_id)
        .gte("start_time", twoWeeksAgo);

    if (recentSessionsError) throw recentSessionsError;

    const recentSessionIds = recentSessions.map(s => s.session_id);

    let totalRiskEvents = 0;

    if (recentSessionIds.length > 0) {
        // Fetch transactions for recent sessions
        const { data: recentTxs, error: txsError } = await supabase
            .from("transactions")
            .select("transaction_id")
            .in("session_id", recentSessionIds);

        if (txsError) throw txsError;

        const recentTxIds = recentTxs.map(tx => tx.transaction_id);

        // Fetch risk events for those transactions
        const { data: riskEvents, error: riskError } = await supabase
            .from("risk_events")
            .select("event_id")
            .in("transaction_id", recentTxIds);

        if (riskError) throw riskError;

        totalRiskEvents = riskEvents.length;
    }

    // If user has extremely suspicious activity, their subsequent sessions will be flagged until the average can be brought down within last 2 weeks
    const avgRiskEventsPerSession = recentSessionIds.length > 0
        ? totalRiskEvents / recentSessionIds.length
        : 0;

    const isFlagged = avgRiskEventsPerSession > 10 || suspiciousFlags.length > 0; //these flags can be further used for logging purposes

    // Update session stats
    const updates = {
        reviewed_at: new Date().toISOString(),
        is_flagged: isFlagged,
        status: isFlagged ? "flagged" : session.status,
        risk_score: sessionRiskScore,
    };

    if (allFinalized) {
        updates.status = "reviewed";
    }

    const { error: updateError } = await supabase
        .from("session_stats")
        .update(updates)
        .eq("session_id", session_id);

    if (updateError) throw updateError;

    return updates.status;
}