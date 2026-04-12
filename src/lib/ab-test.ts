/**
 * A/B Testing Utility
 * 
 * Provides simple variant assignment and persistence for experiments.
 */
export function getExperimentVariant(experimentName: string, variants: string[] = ['A', 'B']): string {
  const storageKey = `ab_test_${experimentName}`;
  const savedVariant = localStorage.getItem(storageKey);

  if (savedVariant && variants.includes(savedVariant)) {
    return savedVariant;
  }

  // Randomly assign a variant
  const newVariant = variants[Math.floor(Math.random() * variants.length)];
  localStorage.setItem(storageKey, newVariant);
  
  // Log assignment for analytics
  console.log(`[AB Test] Assigned variant ${newVariant} for ${experimentName}`);
  
  return newVariant;
}

/**
 * Tracks a conversion event for an experiment.
 */
export function trackExperimentConversion(experimentName: string, event: string) {
  const variant = localStorage.getItem(`ab_test_${experimentName}`);
  console.log(`[AB Test] Tracked ${event} for ${experimentName} (Variant: ${variant})`);
  
  // Integrate with real analytics provider here
  // window.analytics.track(event, { experimentName, variant });
}
