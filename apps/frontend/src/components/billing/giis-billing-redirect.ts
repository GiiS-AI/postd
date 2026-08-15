'use client';

export const GIIS_BILLING_URL = 'https://chat.giis.ai/app/settings/billing';

export const isEmbeddedInGiiS = () =>
  typeof window !== 'undefined' && window.self !== window.top;

export const redirectTopToGiiSBilling = () => {
  if (!isEmbeddedInGiiS() || !window.top) {
    return false;
  }

  window.top.location.href = GIIS_BILLING_URL;
  return true;
};
