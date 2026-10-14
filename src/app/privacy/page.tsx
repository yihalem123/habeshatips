import { Prose } from "@/components/prose";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <Prose title="Privacy">
      <p>Draft policy. To be reviewed before launch.</p>
      <p>We store your phone number to log you in and to deliver tips you subscribed to. We store payment references returned by the payment provider; we never see card or wallet credentials. We do not sell or share your data. You can ask for your account and data to be deleted at any time.</p>
    </Prose>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;
