import { Prose } from "@/components/prose";

export const metadata = { title: "Terms" };

export default function Terms() {
  return (
    <Prose title="Terms of service">
      <p>Draft terms. To be reviewed by counsel before launch.</p>
      <h2>Service</h2>
      <p>HabeshaTips provides opinions and analysis about soccer matches. It does not accept bets, hold funds, or act as a bookmaker. Tips are not financial advice.</p>
      <h2>Subscriptions</h2>
      <p>A subscription gives access to one room&apos;s picks for 30 days from payment. There is no automatic renewal. Fees are not refundable because of losing tips; refunds are given for technical failures that prevented access.</p>
      <h2>Eligibility</h2>
      <p>You must be at least 18 years old and allowed to use this service under the laws that apply to you.</p>
      <h2>Record</h2>
      <p>Published tips are immutable. Where a correction is necessary, a new tip is published that references the original; the original remains visible.</p>
    </Prose>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
