export default function Privacy() {
    return (
        <div className="p-10 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4">At Sentinel AI, we prioritize your privacy. We collect minimal data required for scam detection including snippets of text or media you voluntarily submit.</p>
            <h2 className="text-xl font-bold mt-8 mb-4">Data Collection</h2>
            <p>We process data in real-time. Submissions are stored temporarily for analysis and deleted according to regular data retention policies.</p>
            <h2 className="text-xl font-bold mt-8 mb-4">Your Rights</h2>
            <p>Under India's DPDP Act 2023 and GDPR, you have the right to access, rectify, or delete your data. Contact us for requests.</p>
            <div className="mt-10">
                <a href="/" className="text-purple-600 font-bold hover:underline">← Back Home</a>
            </div>
        </div>
    );
}
