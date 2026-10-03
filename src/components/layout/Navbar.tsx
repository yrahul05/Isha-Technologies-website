'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ChevronRight, LockKeyhole, Menu, Phone } from 'lucide-react';
import { Logo } from '../ui/logo';
import { getServicesByCategory } from '@/data/services';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { useState } from 'react';
import { isAnyRouteActive, isRouteActive } from '@/lib/nav-active';

const topLevelLinkClass = (active: boolean) =>
  cn(
    'border-b-2 border-transparent px-2 py-1 text-base font-medium transition-colors duration-200 ease-out',
    active ? 'border-brand font-semibold text-brand' : 'text-black hover:text-brand'
  );

const triggerLinkClass = (active: boolean) =>
  cn(
    'border-b-2 bg-transparent px-2 py-1 text-base font-medium transition-colors duration-200 ease-out',
    active
      ? 'border-brand font-semibold text-brand'
      : 'border-transparent text-black hover:text-brand'
  );

const dropdownItemClass = (active: boolean) =>
  cn(
    'px-6 py-1 text-base text-nowrap rounded transition-colors duration-200 ease-out hover:bg-gray-50',
    active ? 'bg-brand/10 text-brand font-semibold' : 'text-black hover:text-brand'
  );

// Services mega-menu link style — deliberately NOT `text-nowrap` (that was
// the root cause of the original overlap bug: long titles like "Cloud Cost
// Optimization & FinOps" were forced onto one line and overflowed past
// their grid column, visually bleeding into the next one). `block` +
// `min-w-0` + `break-words` let each link wrap naturally within its own
// grid cell instead of escaping it.
const megaMenuLinkClass = (active: boolean) =>
  cn(
    'block min-w-0 rounded-lg px-3 py-2.5 text-[17px] font-medium leading-[1.5] whitespace-normal break-words transition-colors duration-200 ease-out hover:bg-gray-50',
    active ? 'bg-brand/10 text-brand font-semibold' : 'text-black hover:text-brand'
  );

// Resources' dropdown (`w-48`, plain/unprefixed) "just works" for a
// reason that isn't obvious from reading its className alone: the shared
// `NavigationMenuContent` component's base classes set `width: auto` at
// >=768px via `md:w-auto`, and any override only wins if Tailwind's
// compiled stylesheet happens to place it AFTER `md:w-auto` — which is
// NOT decided by which order classes are written in, but by Tailwind's
// own internal utility ordering. Verified directly in the compiled CSS:
// even an `md:w-[...]` arbitrary-value override (matching modifier, as
// it should) is emitted BEFORE `md:w-auto` in the stylesheet, so
// `md:w-auto` still wins the cascade and silently overrides it. Resources
// never notices this, because `width: auto` on an absolutely-positioned
// element with no explicit width shrinks to fit its own content — and
// two short links ("Blogs", "Our Journey") are narrow anyway, so
// shrink-to-fit and the intended `w-48` look almost identical by
// coincidence.
//
// For Services, "shrink to fit" was the actual bug: with no width
// override that can reliably win, the browser sized the panel to fit
// inside the narrow `Services` trigger's own box (its positioned
// ancestor), and the 4-column grid had nowhere to go but to wrap text
// one character at a time.
//
// Because the shared wrapper's own width rule cannot be reliably
// overridden by any class-based technique (confirmed empirically, not
// assumed), the mega-menu renders `NavigationMenuPrimitive.Content`
// directly — the exact same underlying Radix primitive Resources uses
// (identical open/close, focus and dismiss behavior, identical
// `data-motion`/`data-state`-driven animations, reproduced below) — just
// without the shared wrapper's un-overridable base classes standing in
// the way. Every visual value here (border, background, shadow, corner
// radius, padding) is copied directly from Resources' own className so
// the two dropdowns look identical. The one deliberate difference is
// positioning: `fixed` + two symmetric viewport insets, centered with
// `mx-auto`, instead of Resources' `absolute` anchored to the trigger.
// A 1000px, 4-column panel anchored the way Resources' 192px panel is
// (flush against the left edge of the "Services" trigger, which sits
// left-of-center in the nav) would run off one edge of the viewport at
// common desktop widths — centering it in the viewport instead is the
// only way to satisfy "stays within the viewport" for content this wide.
const megaMenuContentClass = cn(
  'data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200',
  'fixed inset-x-4 top-16 z-50 mx-auto grid max-w-[1000px] grid-cols-4 gap-x-8 gap-y-6 rounded-lg border border-black/5 bg-white p-6 shadow-lg'
);

const mobileLinkClass = (active: boolean) =>
  cn(
    'rounded text-base transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
    active ? 'font-semibold text-brand' : 'text-black hover:text-brand'
  );

// Grouped once at module scope — pure data derived from the canonical
// service list, identical on every render.
const serviceCategories = getServicesByCategory();

export const Navbar = () => {
  const [isShow, setIsShow] = useState<boolean>(false);
  const pathname = usePathname();

  const isHomeActive = isRouteActive(pathname, '/');
  const isAboutActive = isRouteActive(pathname, '/about');
  const isServicesActive = isRouteActive(pathname, '/services');
  const isResourcesActive = isAnyRouteActive(pathname, ['/resources', '/our-journey']);
  const isBlogsActive = isRouteActive(pathname, '/resources/blogs');
  const isOurJourneyActive = isRouteActive(pathname, '/our-journey');
  const isCaseStudiesActive = isRouteActive(pathname, '/case-studies');
  const isContactActive = isRouteActive(pathname, '/contact');

  return (
    <>
      <header data-public-chrome className="w-full border-b border-b-black/5 bg-white sticky top-0 z-50 transition duration-300">
        <div className="max-w-full mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo — left of the navbar */}
          <Logo src="/ISHA-TECHNO-LG.png" imgClassName="h-9 lg:h-11 w-auto" priority />

          {/* Navigation */}
          <NavigationMenu viewport={false} className="hidden lg:flex">
            <NavigationMenuList className="flex items-center gap-4">
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isHomeActive}
                  className={topLevelLinkClass(isHomeActive)}
                >
                  <Link href="/" aria-current={isHomeActive ? 'page' : undefined}>
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isAboutActive}
                  className={topLevelLinkClass(isAboutActive)}
                >
                  <Link href="/about" aria-current={isAboutActive ? 'page' : undefined}>
                    About
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className={triggerLinkClass(isServicesActive)}>
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuPrimitive.Content className={megaMenuContentClass}>
                  {serviceCategories.map((group) => (
                    <div key={group.category} className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand">
                        {group.category}
                      </span>
                      <div className="mt-2 flex flex-col gap-1">
                        {group.services.map((service) => {
                          const href = `/services/${service.slug}`;
                          const isActive = isRouteActive(pathname, href);
                          return (
                            <NavigationMenuLink
                              asChild
                              key={service.slug}
                              active={isActive}
                              className={megaMenuLinkClass(isActive)}
                            >
                              <Link href={href} aria-current={isActive ? 'page' : undefined}>
                                {service.title}
                              </Link>
                            </NavigationMenuLink>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="col-span-4 mt-2 border-t border-black/5 pt-4">
                    <NavigationMenuLink
                      asChild
                      className="flex flex-row items-center justify-center gap-1.5 rounded-lg px-6 py-3 text-center text-base font-semibold text-nowrap bg-brand text-white transition-colors duration-200 ease-out hover:bg-gray-50 hover:text-brand"
                    >
                      <Link href="/services">
                        Explore All Services
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuPrimitive.Content>
              </NavigationMenuItem>

              {/* Resources dropdown — unchanged. */}
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className={triggerLinkClass(isResourcesActive)}>
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-2 grid gap-2 border-black/5 w-48 bg-white shadow-lg rounded-lg">
                  <NavigationMenuLink
                    asChild
                    active={isBlogsActive}
                    className={dropdownItemClass(isBlogsActive)}
                  >
                    <Link
                      href="/resources/blogs"
                      aria-current={isBlogsActive ? 'page' : undefined}
                    >
                      Blogs
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    asChild
                    active={isOurJourneyActive}
                    className={dropdownItemClass(isOurJourneyActive)}
                  >
                    <Link
                      href="/our-journey"
                      aria-current={isOurJourneyActive ? 'page' : undefined}
                    >
                      Our Journey
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isCaseStudiesActive}
                  className={topLevelLinkClass(isCaseStudiesActive)}
                >
                  <Link
                    href="/case-studies"
                    aria-current={isCaseStudiesActive ? 'page' : undefined}
                  >
                    Case Studies
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  active={isContactActive}
                  className={topLevelLinkClass(isContactActive)}
                >
                  <Link href="/contact" aria-current={isContactActive ? 'page' : undefined}>
                    Contact
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Contact Button */}
          <div className="flex items-center gap-2">
            <Link
              href="https://portal.ishatechnologies.in/login"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-brand/5 hover:text-brand lg:inline-flex"
            >
              <LockKeyhole className="h-4 w-4" strokeWidth={1.75} />
              Client Login
            </Link>
            <Link
              href="/free-cloud-assessment"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand/5 xl:inline-flex"
            >
              Free Cloud Assessment
            </Link>
            <Button
              asChild
              variant="primary"
              className="h-10 rounded-lg px-5"
            >
              <Link href="/contact" className="flex items-center">
                <Phone />
                Talk to an Expert
              </Link>
            </Button>

            {/* Mobile Sheet */}
            <Sheet open={isShow} onOpenChange={setIsShow}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="lg:hidden text-black hover:text-brand"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-white gap-0 space-y-0 overflow-y-auto"
              >
                <SheetHeader className="bg-brand/5 py-5">
                  <Logo src="/ISHA-TECHNO-LG.png" imgClassName="h-10 w-auto" />
                </SheetHeader>
                <nav className="flex flex-col gap-6 p-6 border-t border-t-black/5">
                  <Link
                    href="/contact"
                    className="w-full text-center bg-brand text-white rounded-lg px-5 py-3 text-base font-semibold hover:bg-brand/90 transition-colors"
                    onClick={() => setIsShow(false)}
                  >
                    Talk to an Expert
                  </Link>
                  <Link
                    href="/free-cloud-assessment"
                    className="w-full text-center rounded-lg border border-brand px-5 py-3 text-base font-semibold text-brand hover:bg-brand/5 transition-colors"
                    onClick={() => setIsShow(false)}
                  >
                    Get Free Cloud Assessment
                  </Link>
                  <Link
                    href="https://portal.ishatechnologies.in/login"
                    className="flex items-center justify-center gap-2 text-base font-medium text-slate-600 hover:text-brand transition-colors"
                    onClick={() => setIsShow(false)}
                  >
                    <LockKeyhole className="h-4 w-4" strokeWidth={1.75} />
                    Client Login
                  </Link>
                  <Link
                    href="/"
                    className={mobileLinkClass(isHomeActive)}
                    aria-current={isHomeActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Home
                  </Link>
                  <Link
                    href="/about"
                    className={mobileLinkClass(isAboutActive)}
                    aria-current={isAboutActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    About
                  </Link>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="services">
                      <AccordionTrigger
                        className={cn(
                          'py-0 text-base font-medium transition-colors duration-200 ease-out',
                          isServicesActive ? 'text-brand' : 'text-black hover:text-brand'
                        )}
                      >
                        Services
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-5 mt-2">
                          {serviceCategories.map((group) => (
                            <div key={group.category}>
                              <span className="text-xs font-semibold uppercase tracking-wide text-brand/70">
                                {group.category}
                              </span>
                              <div className="mt-1.5 flex flex-col gap-1">
                                {group.services.map((service) => {
                                  const href = `/services/${service.slug}`;
                                  const isActive = isRouteActive(pathname, href);
                                  return (
                                    <Link
                                      key={service.slug}
                                      href={href}
                                      aria-current={isActive ? 'page' : undefined}
                                      className={cn(
                                        'flex items-center justify-between text-sm rounded p-2 transition-colors duration-200 ease-out hover:bg-gray-50',
                                        isActive
                                          ? 'bg-brand/10 text-brand font-semibold'
                                          : 'text-black hover:text-brand'
                                      )}
                                      onClick={() => setIsShow(false)}
                                    >
                                      {service.title}
                                      <ChevronRight className="h-4 w-4" />
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          <hr className="my-1 border-black/5" />
                          <Link
                            href="/services"
                            className="px-3 py-2 text-center text-base bg-brand text-white transition-colors duration-200 ease-out hover:bg-gray-50 hover:text-brand rounded"
                            onClick={() => setIsShow(false)}
                          >
                            Explore All Services
                          </Link>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Link
                    href="/resources/blogs"
                    className={mobileLinkClass(isBlogsActive)}
                    aria-current={isBlogsActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Blogs
                  </Link>
                  <Link
                    href="/our-journey"
                    className={mobileLinkClass(isOurJourneyActive)}
                    aria-current={isOurJourneyActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Our Journey
                  </Link>
                  <Link
                    href="/case-studies"
                    className={mobileLinkClass(isCaseStudiesActive)}
                    aria-current={isCaseStudiesActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Case Studies
                  </Link>
                  <Link
                    href="/contact"
                    className={mobileLinkClass(isContactActive)}
                    aria-current={isContactActive ? 'page' : undefined}
                    onClick={() => setIsShow(false)}
                  >
                    Contact
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
};
