import { SignUp } from "@clerk/nextjs";
import AuthFrame, { clerkAppearance } from "../../../../components/AuthFrame";
import { FREE_JOB_LIMIT } from "../../../../lib/plans";

export default function SignUpPage() {
    return (
        <AuthFrame
            title="Start with your next application."
            line={`Free for up to ${FREE_JOB_LIMIT} applications. No card required.`}
        >
            <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/dashboard"
                appearance={clerkAppearance}
            />
        </AuthFrame>
    );
}
