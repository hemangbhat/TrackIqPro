import { SignIn } from "@clerk/nextjs";
import AuthFrame, { clerkAppearance } from "../../../../components/AuthFrame";

export default function SignInPage() {
    return (
        <AuthFrame title="Back to your search." line="Your applications, notes and offers are where you left them.">
            <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/dashboard"
                appearance={clerkAppearance}
            />
        </AuthFrame>
    );
}
