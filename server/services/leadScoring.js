export function calculateLeadScore(contact, calls) {
  let score = 50; // Base score

  if (!calls || calls.length === 0) return score;

  const latestCall = calls[0];

  // Outcome scoring
  const outcomeScores = {
    'appointment_scheduled': 40,
    'interested': 30,
    'callback_requested': 20,
    'voicemail': 0,
    'no_answer': -5,
    'not_interested': -30,
    'wrong_number': -50,
    'do_not_call': -50
  };

  if (latestCall.outcome && outcomeScores[latestCall.outcome] !== undefined) {
    score += outcomeScores[latestCall.outcome];
  }

  // Duration bonus (longer calls = more engaged)
  if (latestCall.duration_seconds) {
    if (latestCall.duration_seconds > 120) score += 15;
    else if (latestCall.duration_seconds > 60) score += 10;
    else if (latestCall.duration_seconds > 30) score += 5;
  }

  // Multiple calls penalty/bonus
  if (calls.length > 3) score -= 10; // Too many attempts
  if (calls.length === 1 && latestCall.outcome === 'interested') score += 10;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}
