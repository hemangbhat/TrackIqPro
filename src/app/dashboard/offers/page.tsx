import OfferMatrix from "../../../../components/OfferMatrix";
import { OfferIntelligenceSection } from "../../../../components/intelligence/OfferIntelligenceSection";

export default function OffersPage() {
    return (
        <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
            <OfferMatrix />
            <OfferIntelligenceSection />
        </div>
    );
}
