// Server component — receives the decision as a prop from the root layout.
import { Footer } from './Footer';

export function FooterWrapper({ show }: { show: boolean }) {
    if (!show) return null;
    return <Footer />;
}
