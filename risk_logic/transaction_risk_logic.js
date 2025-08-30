import { supabase } from '../utils/supabase';

// -----------------------------
// Thresholds & Constants
// -----------------------------
const RISK_THRESHOLDS = {
  block: 100,     // if user risk >= 100, block all future transactions
  review: 50,      // if user risk >= 50, flag for manual review
  revoke_access: 150      // if user continues to transact even after multiple blocks, revoke access
};

const RULES = {
  MAX_TIP_UNVERIFIED: 50,   // max tip allowed for unverified user
  MAX_TIP_VERIFIED: 500,    // max tip allowed for verified user
  MAX_TIPS_PER_HOUR: 10,    // frequency control
  SMURFING_WINDOW: 60 * 1000,  // 1 minute window (ms)
  SMURFING_COUNT: 5         // >5 small tips in 1 min = suspicious
};

/**
 * Runs risk logic on a new transaction
 * @param {Object} transaction - contains {user_id, creator_id, amount, timestamp}
 * @returns {String} decision string e.g. "Blocked: Tip Limit Exceeded"
 */
export async function evaluateTransaction(transaction) {

  const { user_id, amount, timestamp } = transaction;

  // 1. Fetch user
  let { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (userError) throw userError;

  let riskEvents = [];
  let decision = "Transaction Approved";
  let failure = false;

  // === Rule 1: Tip limits based on verification ===
  if (!user.verified && amount > RULES.MAX_TIP_UNVERIFIED) {
    riskEvents.push({ risk_factor: "Tip Limit Exceeded", points: 40 });
    decision = "Blocked: Tip Limit Exceeded";
    failure = true;

  } else if (user.verified && amount > RULES.MAX_TIP_VERIFIED) {
    riskEvents.push({ risk_factor: "Tip Limit Exceeded", points: 40 });
    decision = "Blocked: Tip Limit Exceeded";
    failure = true;
  }

  // === Rule 2: Frequency control (max tips per hour) ===
  let { data: recentTips } = await supabase
    .from("transactions")
    .select("transaction_id, timestamp")
    .eq("user_id", user_id)
    .gte("timestamp", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (recentTips && recentTips.length >= RULES.MAX_TIPS_PER_HOUR) {
    riskEvents.push({ risk_factor: "High Frequency", points: 20 });
    if (decision === "Transaction Approved") decision = "Blocked: Too Many Tips in 1 Hour";
    failure = true;
  }

  // === Rule 3: Smurfing (many small tips in 1 min) ===
  let { data: smurfingTips } = await supabase
    .from("transactions")
    .select("transaction_id, amount, timestamp")
    .eq("user_id", user_id)
    .gte("timestamp", new Date(Date.now() - RULES.SMURFING_WINDOW).toISOString());

  if (smurfingTips && smurfingTips.length >= RULES.SMURFING_COUNT && amount < 20) {
    riskEvents.push({ risk_factor: "Smurfing Behavior", points: 30 });
    if (decision === "Transaction Approved") decision = "Blocked: Smurfing Detected";
    failure = true;
  }

  // === Rule 4: Risk score thresholds ===
  let totalRiskPoints = riskEvents.reduce((sum, e) => sum + e.points, 0);
  let newRiskScore = (user.risk_score || 0) + totalRiskPoints;
  let watchlist = false;

  if (newRiskScore >= RISK_THRESHOLDS.block) {
    decision = "Blocked: Risk Score Threshold Exceeded";
    failure = true;
  } else if (newRiskScore >= RISK_THRESHOLDS.review && decision === "Transaction Approved") {
    decision = "Review: Risk Score Threshold Exceeded";
    watchlist = true;
  }

  // === 5. Insert into transactions ===
  const { data: insertedTx, error: txError } = await supabase
    .from("transactions")
    .insert([{
      user_id,
      receiver_id: transaction.receiver_id,
      amount,
      timestamp,
      status: decision,
      transaction_score: totalRiskPoints,
      failure_flag: failure,
      session_id: transaction.session_id,
      type: transaction.type,
    }])
    .select()
    .single();

  if (txError) throw txError;

  // === 6. Insert risk events ===
  for (let ev of riskEvents) {
    await supabase.from("risk_events").insert([{
      transaction_id: insertedTx.transaction_id,
      user_id,
      risk_factor: ev.risk_factor,
      points_added: ev.points,
      created_at: timestamp
    }]);
  }

  // === 7. Update user ===
  await supabase.from("users")
    .update({
      risk_score: newRiskScore,
      total_tips_sent: failure ? user.total_tips_sent : (user.total_tips_sent || 0) + 1,
      total_amount_sent: failure ? user.total_amount_sent : (user.total_amount_sent || 0) + amount,
      watchlist_flag: watchlist,
      access: !(newRiskScore > RISK_THRESHOLDS.revoke_access),
    })
    .eq("user_id", user_id);

  console.log(failure);
  return failure; //decision
}