'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
// GiiS's own web app uses Hanken Grotesk as its sans-serif font (see
// Chat-v0.4-Beta-main/web/tailwind-themes/tailwind.config.js) - matched here
// instead of Postiz's original Plus Jakarta Sans so embedded Postd content
// reads consistently with the rest of the GiiS app around it.
import { Hanken_Grotesk } from 'next/font/google';
const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
import { AnnouncementBanner } from '@gitroom/frontend/components/layout/announcement.banner';
import { Title } from '@gitroom/frontend/components/layout/title';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import { TrialTracker } from '@gitroom/frontend/components/layout/gtm.component';
import { isEmbeddedInGiiS } from '@gitroom/frontend/components/billing/giis-billing-redirect';

const hankenGrotesk = Hanken_Grotesk({
  weight: ['600', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  // Embedded inside GiiS's own app (see /app/postd in the GiiS frontend): GiiS
  // already renders its own Calendar/Analytics/Media/Plugins/Integrations/
  // Settings sidebar section that drives which page loads in this iframe, so
  // this component's own icon-column nav would just be a second, disconnected
  // copy of the same navigation - clicking it wouldn't update GiiS's own
  // sidebar highlighting. Safe to check window directly: this subtree is
  // client-side.
  const isEmbedded = isEmbeddedInGiiS();
  // Reaching this iframe at all already required passing GiiS's own paid
  // entitlement check (the SSO bridge only redirects here for paying GiiS
  // users) - Postiz's own separate FREE/paid tier is a leftover artifact of
  // the SSO-provisioned account defaulting to FREE, not a real signal about
  // this user's access. Never gate or redirect on it while embedded: earlier
  // this redirected to GiiS's own billing page instead, which sounds safer
  // but was actually worse in practice - it fired on every single embedded
  // page load (since the FREE-tier default never changes) and made Postd
  // completely unreachable. Embedded users should always see the normal app.
  const shouldShowFirstBilling =
    !isEmbedded && user?.tier === 'FREE' && isGeneral && billingEnabled;

  if (!user) return null;

  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
        showDevConsole={false}
      >
        <MantineWrapper>
          <ToolTip />
          <Toaster />
          <TrialTracker />
          <CheckPayment check={searchParams.get('check') || ''} mutate={mutate}>
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <ContinueProvider />
            <div
              className={clsx(
                'flex flex-col min-h-screen min-w-screen text-newTextColor',
                // This padding (and the rounded "floating card" treatment
                // below) exists to frame Postd's own sidebar+header as a
                // distinct panel inset from the page edge. When embedded in
                // GiiS's iframe, that chrome is hidden (see isEmbedded
                // checks below) - keeping the padding then just leaves an
                // empty margin around nothing, so it's dropped here too.
                !isEmbedded && 'p-[12px]',
                hankenGrotesk.className
              )}
            >
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {shouldShowFirstBilling ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex-1 flex gap-[8px]">
                    {!isEmbedded && <Support />}
                    {!isEmbedded && (
                      <div className="flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]">
                        <div
                          id="left-menu"
                          className={clsx(
                            'fixed h-full w-[64px] start-[17px] flex flex-1 top-0',
                            user?.admin && 'pt-[60px] max-h-[1000px]:w-[500px]'
                          )}
                        >
                          <div className="flex flex-col h-full gap-[32px] flex-1 py-[12px]">
                            <Logo />
                            <TopMenu />
                          </div>
                        </div>
                      </div>
                    )}
                    <div
                      className={clsx(
                        'flex-1 overflow-hidden flex flex-col blurMe',
                        isEmbedded
                          ? 'bg-newBgColor'
                          : 'bg-newBgLineColor rounded-[12px] gap-[1px]'
                      )}
                    >
                      {!isEmbedded && (
                        <div className="flex bg-newBgColorInner h-[80px] px-[20px] items-center">
                          <div className="text-[24px] font-[600] flex flex-1">
                            <Title />
                          </div>
                          <div className="flex gap-[20px] text-textItemBlur">
                            <StreakComponent />
                            <div className="w-[1px] h-[20px] bg-blockSeparator" />
                            <OrganizationSelector />
                            <div className="hover:text-newTextColor">
                              <ModeComponent />
                            </div>
                            <div className="w-[1px] h-[20px] bg-blockSeparator" />
                            <LanguageComponent />
                            <ChromeExtensionComponent />
                            <div className="w-[1px] h-[20px] bg-blockSeparator" />
                            <AttachToFeedbackIcon />
                            <NotificationComponent />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-1 gap-[1px]">{children}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
