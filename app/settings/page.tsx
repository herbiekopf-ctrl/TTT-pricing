export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <div className="card">
        <p>API keys are configured via env vars: GOOGLE_PLACES_API_KEY, YELP_API_KEY.</p>
        <p>Collector toggles: ENABLE_GOOGLE, ENABLE_YELP, ENABLE_SCRAPING, ENABLE_DELIVERY.</p>
        <p>Rate limits and display rules: COLLECTOR_RPS, ROUNDING_INCREMENT.</p>
      </div>
    </div>
  );
}
